import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import jwtConfig, { JwtConfig } from 'src/modules/iam/config/jwt.config';
import { REQUEST_USER_KEY } from 'src/modules/iam/iam.constants';
import { ActiveUserData } from 'src/modules/iam/interfaces/active-user-data.interface';
import { AccessTokenBlacklistStorage } from '../../access-token-blacklist/access-token-blacklist.storage';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: JwtConfig,
    private readonly accessTokenBlacklist: AccessTokenBlacklistStorage,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync<ActiveUserData>(token, {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        algorithms: [this.jwtConfiguration.algorithm],
      });

      const isBlacklisted = await this.accessTokenBlacklist.isBlacklisted(
        payload.jti,
      );

      if (isBlacklisted) {
        throw new UnauthorizedException('Invalid token');
      }

      (request as unknown as Record<string, unknown>)[REQUEST_USER_KEY] =
        payload;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
