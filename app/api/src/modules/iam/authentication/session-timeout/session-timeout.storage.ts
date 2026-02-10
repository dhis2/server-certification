import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/shared/redis';
import { SessionExpiredError } from 'src/shared/errors';
import sessionTimeoutConfig, {
  SessionTimeoutConfig,
} from './session-timeout.config';
import jwtConfig, { JwtConfig } from '../../config/jwt.config';

@Injectable()
export class SessionTimeoutStorage {
  private readonly logger = new Logger(SessionTimeoutStorage.name);
  private readonly KEY_PREFIX = 'session:';

  constructor(
    private readonly redisService: RedisService,
    @Inject(sessionTimeoutConfig.KEY)
    private readonly config: SessionTimeoutConfig,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: JwtConfig,
  ) {}

  async createSession(
    userId: string,
    refreshTokenId: string,
    inheritedCreatedAt?: number,
  ): Promise<void> {
    const key = this.getKey(userId, refreshTokenId);
    const now = Date.now();

    try {
      const client = this.redisService.getClient();
      await client.hset(key, {
        createdAt: String(inheritedCreatedAt ?? now),
        lastActivityAt: String(now),
      });
      await client.expire(key, this.jwtConfiguration.refreshTokenTtl);
    } catch (error) {
      this.logger.error(
        `Failed to create session metadata for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async validateSession(userId: string, refreshTokenId: string): Promise<void> {
    const key = this.getKey(userId, refreshTokenId);
    const now = Date.now();

    try {
      const client = this.redisService.getClient();
      const data = await client.hgetall(key);

      // Legacy session (no metadata) — create metadata and allow
      if (!data || !data.createdAt) {
        await this.createSession(userId, refreshTokenId);
        return;
      }

      const createdAt = parseInt(data.createdAt, 10);
      const lastActivityAt = parseInt(data.lastActivityAt, 10);

      const absoluteElapsed = (now - createdAt) / 1000;
      if (absoluteElapsed > this.config.absoluteTimeoutSeconds) {
        this.logger.warn({
          event: 'SESSION_ABSOLUTE_TIMEOUT',
          userId,
          elapsedSeconds: Math.round(absoluteElapsed),
        });
        throw new SessionExpiredError('Session absolute timeout exceeded');
      }

      const idleElapsed = (now - lastActivityAt) / 1000;
      if (idleElapsed > this.config.idleTimeoutSeconds) {
        this.logger.warn({
          event: 'SESSION_IDLE_TIMEOUT',
          userId,
          idleSeconds: Math.round(idleElapsed),
        });
        throw new SessionExpiredError('Session idle timeout exceeded');
      }

      await client.hset(key, 'lastActivityAt', String(now));
    } catch (error) {
      if (error instanceof SessionExpiredError) throw error;

      this.logger.error(
        `Failed to validate session for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Fail open on Redis errors
    }
  }

  async getSessionCreatedAt(
    userId: string,
    refreshTokenId: string,
  ): Promise<number | undefined> {
    const key = this.getKey(userId, refreshTokenId);

    try {
      const client = this.redisService.getClient();
      const createdAt = await client.hget(key, 'createdAt');
      return createdAt ? parseInt(createdAt, 10) : undefined;
    } catch (error) {
      this.logger.error(
        `Failed to get session createdAt for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return undefined;
    }
  }

  async deleteSession(userId: string, refreshTokenId: string): Promise<void> {
    const key = this.getKey(userId, refreshTokenId);

    try {
      await this.redisService.del(key);
    } catch (error) {
      this.logger.error(
        `Failed to delete session for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async deleteAllSessions(userId: string): Promise<void> {
    const pattern = `${this.KEY_PREFIX}${userId}:*`;

    try {
      const client = this.redisService.getClient();
      let cursor = '0';

      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.error(
        `Failed to delete all sessions for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private getKey(userId: string, refreshTokenId: string): string {
    return `${this.KEY_PREFIX}${userId}:${refreshTokenId}`;
  }
}
