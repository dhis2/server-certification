import { Inject, Injectable, Logger } from '@nestjs/common';
import { RedisService } from 'src/shared/redis';
import { maskEmail } from 'src/shared/utils';
import passwordLockoutConfig, {
  PasswordLockoutConfig,
} from './password-lockout.config';

export interface LockoutStatus {
  isLockedOut: boolean;
  remainingAttempts: number;
  lockoutEndsAt?: Date;
}

export interface FailureResult {
  locked: boolean;
  remainingAttempts: number;
  lockoutEndsAt?: Date;
}

@Injectable()
export class PasswordLockoutStorage {
  private readonly logger = new Logger(PasswordLockoutStorage.name);
  private readonly FAILURE_PREFIX = 'auth:password:failures:';

  constructor(
    private readonly redisService: RedisService,
    @Inject(passwordLockoutConfig.KEY)
    private readonly config: PasswordLockoutConfig,
  ) {}

  async recordFailure(email: string): Promise<FailureResult> {
    const normalizedEmail = this.normalizeEmail(email);
    const key = this.getKey(normalizedEmail);

    try {
      const client = this.redisService.getClient();
      const failures = await client.incr(key);

      await client.expire(key, this.config.failureWindowSeconds);

      const locked = failures >= this.config.maxFailures;
      const remainingAttempts = Math.max(0, this.config.maxFailures - failures);

      if (locked) {
        await client.expire(key, this.config.lockoutSeconds);

        this.logger.warn({
          event: 'PASSWORD_LOCKOUT_TRIGGERED',
          email: maskEmail(normalizedEmail),
          failures,
        });

        return {
          locked: true,
          remainingAttempts: 0,
          lockoutEndsAt: new Date(
            Date.now() + this.config.lockoutSeconds * 1000,
          ),
        };
      }

      this.logger.debug({
        event: 'PASSWORD_FAILURE_RECORDED',
        email: maskEmail(normalizedEmail),
        failures,
        remainingAttempts,
      });

      return { locked: false, remainingAttempts };
    } catch (error) {
      this.logger.error(
        `Failed to record password failure for ${maskEmail(normalizedEmail)}`,
        error instanceof Error ? error.stack : String(error),
      );
      // Fail open on Redis errors - don't block legitimate users
      // but log for monitoring
      return { locked: false, remainingAttempts: this.config.maxFailures };
    }
  }

  async getLockoutStatus(email: string): Promise<LockoutStatus> {
    const normalizedEmail = this.normalizeEmail(email);
    const key = this.getKey(normalizedEmail);

    try {
      const client = this.redisService.getClient();
      const [failuresStr, ttl] = await Promise.all([
        client.get(key),
        client.ttl(key),
      ]);

      const failures = parseInt(failuresStr || '0', 10);
      const isLockedOut = failures >= this.config.maxFailures;
      const remainingAttempts = Math.max(0, this.config.maxFailures - failures);

      if (isLockedOut && ttl > 0) {
        return {
          isLockedOut: true,
          remainingAttempts: 0,
          lockoutEndsAt: new Date(Date.now() + ttl * 1000),
        };
      }

      return { isLockedOut, remainingAttempts };
    } catch (error) {
      this.logger.error(
        `Failed to get lockout status for ${maskEmail(normalizedEmail)}`,
        error instanceof Error ? error.stack : String(error),
      );

      return { isLockedOut: false, remainingAttempts: this.config.maxFailures };
    }
  }

  async isLockedOut(email: string): Promise<boolean> {
    const status = await this.getLockoutStatus(email);
    return status.isLockedOut;
  }

  async clearFailures(email: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    const key = this.getKey(normalizedEmail);

    try {
      await this.redisService.del(key);

      this.logger.debug({
        event: 'PASSWORD_FAILURES_CLEARED',
        email: maskEmail(normalizedEmail),
      });
    } catch (error) {
      this.logger.error(
        `Failed to clear password failures for ${maskEmail(normalizedEmail)}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async getFailureCount(email: string): Promise<number> {
    const normalizedEmail = this.normalizeEmail(email);
    const key = this.getKey(normalizedEmail);

    try {
      const failures = await this.redisService.get(key);
      return parseInt(failures || '0', 10);
    } catch (error) {
      this.logger.error(
        `Failed to get failure count for ${maskEmail(normalizedEmail)}`,
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }

  private getKey(email: string): string {
    return `${this.FAILURE_PREFIX}${email}`;
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
}
