import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from 'src/shared/redis';
import blacklistConfig, {
  BlacklistConfig,
  BlacklistFallbackMode,
} from './blacklist.config';

interface CircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailure: number;
  lastSuccess: number;
}

interface CacheEntry {
  expiresAt: number;
}

@Injectable()
export class AccessTokenBlacklistStorage
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AccessTokenBlacklistStorage.name);
  private readonly KEY_PREFIX = 'blacklist:access-token:';
  private readonly USER_TOKENS_PREFIX = 'user-tokens:';

  private circuitState: CircuitBreakerState = {
    isOpen: false,
    failures: 0,
    lastFailure: 0,
    lastSuccess: Date.now(),
  };

  private readonly localBlacklist = new Map<string, CacheEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly redisService: RedisService,
    @Inject(blacklistConfig.KEY)
    private readonly config: BlacklistConfig,
  ) {}

  onModuleInit(): void {
    this.startCleanupInterval();
  }

  onModuleDestroy(): void {
    this.stopCleanupInterval();
  }

  /**
   * Blacklist a single access token.
   * This is a security-critical operation - Redis persistence is mandatory.
   * @throws Error if Redis write fails -token revocation must be persistent
   */
  async blacklist(jti: string, userId: string, ttl: number): Promise<void> {
    this.addToLocalBlacklist(jti, ttl);

    if (this.isCircuitOpen()) {
      const errorMsg = `Circuit open: cannot persist blacklist to Redis for ${jti}. Token revocation requires Redis.`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      await this.redisService.set(this.getKey(jti), String(userId), ttl);
      this.recordSuccess();
    } catch (error) {
      this.recordFailure(error);
      this.logger.error(`Failed to blacklist token in Redis: ${jti}`, error);
      // Re-throw: token revocation MUST persist to Redis to survive restarts
      throw error;
    }
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    if (this.isInLocalBlacklist(jti)) {
      return true;
    }

    if (this.isCircuitOpen()) {
      return this.handleCircuitOpenRead(jti);
    }

    try {
      const result = await this.redisService.get(this.getKey(jti));
      this.recordSuccess();
      return result !== null;
    } catch (error) {
      this.recordFailure(error);
      return this.handleRedisFailure(jti, error);
    }
  }

  /**
   * Blacklist all access tokens for a user - used during token theft response.
   * Redis persistence is mandatory.
   * @throws Error if Redis write fails - token revocation must be persistent
   */
  async blacklistAllForUser(
    userId: string,
    jtis: string[],
    ttl: number,
  ): Promise<void> {
    if (jtis.length === 0) return;

    for (const jti of jtis) {
      this.addToLocalBlacklist(jti, ttl);
    }

    if (this.isCircuitOpen()) {
      const errorMsg = `Circuit open: cannot persist blacklist to Redis for ${jtis.length} tokens. Token revocation requires Redis.`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      const client = this.redisService.getClient();
      const pipeline = client.pipeline();

      for (const jti of jtis) {
        pipeline.setex(this.getKey(jti), ttl, String(userId));
      }

      await pipeline.exec();
      this.recordSuccess();
    } catch (error) {
      this.recordFailure(error);
      this.logger.error(
        `Failed to blacklist ${jtis.length} tokens in Redis`,
        error,
      );
      throw error;
    }
  }

  async trackToken(userId: string, jti: string, ttl: number): Promise<void> {
    if (this.isCircuitOpen()) {
      this.logger.warn(`Circuit open: token tracking skipped for ${jti}`);
      return;
    }

    try {
      const key = this.getUserTokensKey(userId);
      const client = this.redisService.getClient();

      const pipeline = client.pipeline();
      pipeline.sadd(key, jti);
      pipeline.expire(key, ttl);
      await pipeline.exec();

      this.recordSuccess();
    } catch (error) {
      this.recordFailure(error);
      this.logger.error(`Failed to track token: ${jti}`, error);
    }
  }

  async getTrackedTokens(userId: string): Promise<string[]> {
    if (this.isCircuitOpen()) {
      this.logger.warn(
        `Circuit open: cannot get tracked tokens for user ${userId}`,
      );
      return [];
    }

    try {
      const key = this.getUserTokensKey(userId);
      const client = this.redisService.getClient();
      const result = await client.smembers(key);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      this.logger.error(
        `Failed to get tracked tokens for user ${userId}`,
        error,
      );
      return [];
    }
  }

  async clearTrackedTokens(userId: string): Promise<void> {
    if (this.isCircuitOpen()) {
      return;
    }

    try {
      await this.redisService.del(this.getUserTokensKey(userId));
      this.recordSuccess();
    } catch (error) {
      this.recordFailure(error);
      this.logger.error(
        `Failed to clear tracked tokens for user ${userId}`,
        error,
      );
    }
  }

  getCircuitState(): { isOpen: boolean; failures: number } {
    return {
      isOpen: this.circuitState.isOpen,
      failures: this.circuitState.failures,
    };
  }

  getLocalCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.localBlacklist.size,
      maxSize: this.config.localCache.maxEntries,
    };
  }

  private isCircuitOpen(): boolean {
    if (!this.circuitState.isOpen) {
      return false;
    }

    const timeSinceLastFailure = Date.now() - this.circuitState.lastFailure;
    if (timeSinceLastFailure >= this.config.circuitBreaker.recoveryTimeoutMs) {
      this.logger.log('Circuit breaker: attempting recovery');
      this.circuitState.isOpen = false;
      this.circuitState.failures = 0;
      return false;
    }

    return true;
  }

  private recordSuccess(): void {
    this.circuitState.failures = 0;
    this.circuitState.isOpen = false;
    this.circuitState.lastSuccess = Date.now();
  }

  private recordFailure(error: unknown): void {
    this.circuitState.failures++;
    this.circuitState.lastFailure = Date.now();

    if (
      this.circuitState.failures >= this.config.circuitBreaker.failureThreshold
    ) {
      this.circuitState.isOpen = true;
      this.logger.error(
        `Circuit breaker opened after ${this.circuitState.failures} failures`,
        error,
      );
    }
  }

  private handleCircuitOpenRead(jti: string): boolean {
    if (this.config.fallbackMode === BlacklistFallbackMode.FAIL_CLOSED) {
      this.logger.warn(
        `Circuit open, fail-closed mode: denying access for ${jti}`,
      );
      return true;
    }

    this.logger.warn(
      `Circuit open, fail-open mode: allowing access for ${jti}`,
    );
    return false;
  }

  private handleRedisFailure(jti: string, error: unknown): boolean {
    this.logger.error(`Redis failure checking blacklist for ${jti}`, error);

    if (this.config.fallbackMode === BlacklistFallbackMode.FAIL_CLOSED) {
      return true;
    }

    return false;
  }

  private addToLocalBlacklist(jti: string, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.localBlacklist.set(jti, { expiresAt });
  }

  private isInLocalBlacklist(jti: string): boolean {
    const entry = this.localBlacklist.get(jti);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.localBlacklist.delete(jti);
      return false;
    }

    return true;
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.localCache.cleanupIntervalMs);
  }

  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let removed = 0;

    for (const [jti, entry] of this.localBlacklist) {
      if (now > entry.expiresAt) {
        this.localBlacklist.delete(jti);
        removed++;
      }
    }

    // Enforce max size by removing oldest entries
    const maxEntries = this.config.localCache.maxEntries;
    if (this.localBlacklist.size > maxEntries) {
      const excess = this.localBlacklist.size - maxEntries;
      const keys = Array.from(this.localBlacklist.keys()).slice(0, excess);

      for (const key of keys) {
        this.localBlacklist.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.debug(`Local cache cleanup: removed ${removed} entries`);
    }
  }

  private getKey(jti: string): string {
    return `${this.KEY_PREFIX}${jti}`;
  }

  private getUserTokensKey(userId: string): string {
    return `${this.USER_TOKENS_PREFIX}${userId}`;
  }
}
