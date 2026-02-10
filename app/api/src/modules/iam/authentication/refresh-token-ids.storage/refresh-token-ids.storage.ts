import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/shared/redis';
import { InvalidatedRefreshTokenError } from 'src/shared/errors';
import jwtConfig, { JwtConfig } from '../../config/jwt.config';

const MAX_SESSIONS_PER_USER = 5;

@Injectable()
export class RefreshTokenIdsStorage {
  private readonly logger = new Logger(RefreshTokenIdsStorage.name);
  private readonly KEY_PREFIX = 'refresh-tokens:user:';

  constructor(
    private readonly redisService: RedisService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: JwtConfig,
  ) {}

  async insert(userId: string, tokenId: string): Promise<void> {
    const key = this.getKey(userId);
    const client = this.redisService.getClient();
    const ttl = this.jwtConfiguration.refreshTokenTtl;

    const pipeline = client.pipeline();
    pipeline.sadd(key, tokenId);
    pipeline.expire(key, ttl);
    await pipeline.exec();

    await this.enforceMaxSessions(userId);
  }

  async validate(userId: string, tokenId: string): Promise<boolean> {
    const client = this.redisService.getClient();
    const isMember = await client.sismember(this.getKey(userId), tokenId);

    if (!isMember) {
      throw new InvalidatedRefreshTokenError();
    }

    return true;
  }

  async invalidate(userId: string, tokenId: string): Promise<void> {
    const client = this.redisService.getClient();
    await client.srem(this.getKey(userId), tokenId);
  }

  async invalidateAll(userId: string): Promise<void> {
    await this.redisService.del(this.getKey(userId));
  }

  async getSessionCount(userId: string): Promise<number> {
    const client = this.redisService.getClient();
    return client.scard(this.getKey(userId));
  }

  private async enforceMaxSessions(userId: string): Promise<void> {
    const client = this.redisService.getClient();
    const key = this.getKey(userId);
    const count = await client.scard(key);

    if (count > MAX_SESSIONS_PER_USER) {
      const tokens = await client.smembers(key);
      const tokensToRemove = tokens.slice(0, count - MAX_SESSIONS_PER_USER);

      if (tokensToRemove.length > 0) {
        await client.srem(key, ...tokensToRemove);
        this.logger.debug(
          `Removed ${tokensToRemove.length} oldest session(s) for user ${userId}`,
        );
      }
    }
  }

  private getKey(userId: string): string {
    return `${this.KEY_PREFIX}${userId}`;
  }
}
