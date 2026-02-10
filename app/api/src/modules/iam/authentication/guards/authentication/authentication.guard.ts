import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessTokenGuard } from '../access-token/access-token.guard';
import { AuthType } from '../../enums/auth-type.enum';
import { AUTH_TYPE_KEY } from '../../decorators/auth.decorator';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  private static readonly defaultAuthType = AuthType.Bearer;

  private readonly authTypeGuardMap: Record<
    AuthType,
    CanActivate | CanActivate[]
  >;

  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokenGuard: AccessTokenGuard,
  ) {
    this.authTypeGuardMap = {
      [AuthType.Bearer]: this.accessTokenGuard,
      [AuthType.None]: { canActivate: () => true },
    };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlerAuthTypes = this.reflector.get<AuthType[]>(
      AUTH_TYPE_KEY,
      context.getHandler(),
    );

    if (handlerAuthTypes && handlerAuthTypes.length > 0) {
      return this.executeGuards(handlerAuthTypes, context);
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const classAuthTypes = this.reflector.get<AuthType[]>(
      AUTH_TYPE_KEY,
      context.getClass(),
    );

    const authTypes = classAuthTypes ?? [AuthenticationGuard.defaultAuthType];
    return this.executeGuards(authTypes, context);
  }

  private async executeGuards(
    authTypes: AuthType[],
    context: ExecutionContext,
  ): Promise<boolean> {
    const guards = authTypes.map((type) => this.authTypeGuardMap[type]).flat();

    let error: Error = new UnauthorizedException();

    for (const instance of guards) {
      const canActivate = await Promise.resolve(
        instance.canActivate(context),
      ).catch((err: unknown) => {
        if (err instanceof Error) {
          error = err;
        }
      });

      if (canActivate) {
        return true;
      }
    }

    throw error;
  }
}
