import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Response } from 'express';

export interface CacheControlOptions {
  maxAge?: number;
  mustRevalidate?: boolean;
  public?: boolean;
  staleWhileRevalidate?: number;
}

export const CACHE_CONTROL_KEY = 'cache-control';

export const CacheControl = (options: CacheControlOptions) =>
  SetMetadata(CACHE_CONTROL_KEY, options);

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<CacheControlOptions>(
      CACHE_CONTROL_KEY,
      context.getHandler(),
    );

    if (options) {
      const response = context.switchToHttp().getResponse<Response>();
      const directives: string[] = [];

      if (options.public) {
        directives.push('public');
      } else {
        directives.push('private');
      }

      if (options.maxAge !== undefined) {
        directives.push(`max-age=${options.maxAge}`);
      }

      if (options.mustRevalidate) {
        directives.push('must-revalidate');
      }

      if (options.staleWhileRevalidate !== undefined) {
        directives.push(
          `stale-while-revalidate=${options.staleWhileRevalidate}`,
        );
      }

      response.setHeader('Cache-Control', directives.join(', '));
    }

    return next.handle();
  }
}
