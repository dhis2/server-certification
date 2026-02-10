import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RedisService } from '../../../shared/redis';
import type { BitstringStatusListCredential } from './status-list.service';

const STATUS_LIST_CACHE_PREFIX = 'status-list:';
const STATUS_LIST_VERSION_PREFIX = 'status-list-version:';

/**
 * Service for caching BitstringStatusList credentials with proper invalidation.
 *
 * Implements W3C VC Status List 2021 caching best practices:
 * - Cache status lists to reduce database load
 * - Invalidate cache immediately on revocation (per W3C recommendation)
 * - Use ETag headers for client-side cache validation
 * - Track revisions for cache coherence
 *
 * Per OWASP Caching Guidelines:
 * - Sensitive revocation data must be invalidated promptly
 * - Cache TTL should balance performance vs. freshness
 *
 * @see https://www.w3.org/TR/vc-status-list/
 * @see https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html#caching
 */
@Injectable()
export class StatusListCacheService {
  private readonly logger = new Logger(StatusListCacheService.name);
  private readonly cacheTtl: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.cacheTtl = this.configService.get<number>(
      'STATUS_LIST_CACHE_TTL',
      300,
    );
  }

  async get(year: number): Promise<{
    credential: BitstringStatusListCredential;
    etag: string;
  } | null> {
    const cacheKey = this.getCacheKey(year);

    try {
      const cached = await this.redisService.get(cacheKey);
      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached) as {
        credential: BitstringStatusListCredential;
        etag: string;
        cachedAt: string;
      };

      this.logger.debug(`Cache hit for status list year ${year.toString()}`);
      return { credential: parsed.credential, etag: parsed.etag };
    } catch (error) {
      this.logger.warn(
        `Failed to read cache for year ${year.toString()}`,
        error,
      );
      return null;
    }
  }

  async set(
    year: number,
    credential: BitstringStatusListCredential,
  ): Promise<string> {
    const cacheKey = this.getCacheKey(year);
    const etag = this.generateETag(credential);

    const cacheEntry = {
      credential,
      etag,
      cachedAt: new Date().toISOString(),
    };

    try {
      await this.redisService.set(
        cacheKey,
        JSON.stringify(cacheEntry),
        this.cacheTtl,
      );
      this.logger.debug(
        `Cached status list for year ${year.toString()} (TTL: ${this.cacheTtl.toString()}s)`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to cache status list for year ${year.toString()}`,
        error,
      );
    }

    return etag;
  }

  async invalidate(year: number): Promise<void> {
    const cacheKey = this.getCacheKey(year);

    try {
      await this.redisService.del(cacheKey);
      await this.incrementVersion(year);
      this.logger.log(
        `Invalidated status list cache for year ${year.toString()} due to revocation`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache for year ${year.toString()}`,
        error,
      );
      // Cache invalidation failure shouldn't block revocation
    }
  }

  async invalidateAll(): Promise<void> {
    const currentYear = new Date().getFullYear();
    // Invalidate current year and previous 2 years
    const years = [
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1,
    ];

    for (const year of years) {
      await this.invalidate(year);
    }

    this.logger.log('Invalidated all status list caches');
  }

  async getVersion(year: number): Promise<number> {
    const versionKey = this.getVersionKey(year);

    try {
      const version = await this.redisService.get(versionKey);
      return version ? parseInt(version, 10) : 1;
    } catch {
      return 1;
    }
  }

  private async incrementVersion(year: number): Promise<void> {
    const versionKey = this.getVersionKey(year);
    const client = this.redisService.getClient();

    try {
      await client.incr(versionKey);
    } catch {
      // Best effort - version tracking is supplementary
    }
  }

  private generateETag(credential: BitstringStatusListCredential): string {
    const content = JSON.stringify(credential);
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    return `"${hash.substring(0, 16)}"`;
  }

  async validateETag(year: number, clientETag: string): Promise<boolean> {
    const cached = await this.get(year);
    if (!cached) {
      return false;
    }

    const normalizedClient = clientETag.replace(/"/g, '');
    const normalizedCached = cached.etag.replace(/"/g, '');

    return normalizedClient === normalizedCached;
  }

  getCacheTtl(): number {
    return this.cacheTtl;
  }

  private getCacheKey(year: number): string {
    return `${STATUS_LIST_CACHE_PREFIX}${year.toString()}`;
  }

  private getVersionKey(year: number): string {
    return `${STATUS_LIST_VERSION_PREFIX}${year.toString()}`;
  }
}
