import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Custom throttler guard that handles proxy headers for accurate IP detection.
 * Essential for rate limiting when behind a reverse proxy (nginx, traefik, etc.)
 *
 * In development mode, rate limiting is bypassed but violations are logged
 * to help developers identify potential issues before production deployment.
 *
 * @see OWASP API Security Top 10 - API4:2019 Lack of Resources & Rate Limiting
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  private readonly logger = new Logger(ThrottlerBehindProxyGuard.name);

  protected override getTracker(req: Request): Promise<string> {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      // Get the first IP in the chain (original client)
      return Promise.resolve(
        forwarded.split(',')[0]?.trim() ?? req.ip ?? 'unknown',
      );
    }

    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string') {
      return Promise.resolve(realIp);
    }

    return Promise.resolve(req.ip ?? 'unknown');
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === 'development') {
      try {
        await super.canActivate(context);
      } catch (err) {
        if (err instanceof ThrottlerException) {
          const req = context.switchToHttp().getRequest<Request>();
          this.logger.warn(
            `[DEV] Rate limit would be exceeded for ${req.method} ${req.url} ` +
              `from IP ${req.ip} - bypassed in development mode`,
          );
        }
      }
      return true;
    }

    return super.canActivate(context);
  }
}
