import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from 'src/shared/redis';
import { PasswordResetToken } from '../interfaces';

const TOKEN_PREFIX = 'pwd-reset:';
const TOKEN_TTL_SECONDS = 3600; // 1 hour

@Injectable()
export class PasswordResetTokenStorage {
  private readonly logger = new Logger(PasswordResetTokenStorage.name);

  constructor(private readonly redis: RedisService) {}

  async createToken(userId: string, email: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('base64url');
    const data: PasswordResetToken = {
      userId,
      email: email.toLowerCase(),
      createdAt: Date.now(),
    };

    await this.redis.set(
      this.getKey(token),
      JSON.stringify(data),
      TOKEN_TTL_SECONDS,
    );

    this.logger.debug(`Created password reset token for user ${userId}`);
    return token;
  }

  async validateToken(token: string): Promise<PasswordResetToken | null> {
    const data = await this.redis.get(this.getKey(token));
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as PasswordResetToken;
    } catch {
      this.logger.warn('Failed to parse password reset token data');
      return null;
    }
  }

  async invalidateToken(token: string): Promise<void> {
    await this.redis.del(this.getKey(token));
    this.logger.debug('Invalidated password reset token');
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    // TODO: This requires scanning Redis keys, which is expensive.
    // We should consider using a user-indexed approach.
    const client = this.redis.getClient();
    const pattern = `${TOKEN_PREFIX}*`;
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

      for (const key of keys) {
        const data = await client.get(key);
        if (data) {
          try {
            const parsed = JSON.parse(data) as PasswordResetToken;
            if (parsed.userId === userId) {
              await client.del(key);
            }
          } catch {
            // Skip invalid entries
          }
        }
      }
    } while (cursor !== '0');

    this.logger.debug(
      `Invalidated all password reset tokens for user ${userId}`,
    );
  }

  getExpirationMinutes(): number {
    return TOKEN_TTL_SECONDS / 60;
  }

  private getKey(token: string): string {
    return `${TOKEN_PREFIX}${token}`;
  }
}
