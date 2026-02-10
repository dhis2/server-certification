import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUEST_USER_KEY } from 'src/modules/iam/iam.constants';
import { ActiveUserData } from 'src/modules/iam/interfaces';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../../../common/enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as unknown as Record<string, unknown>)[
      REQUEST_USER_KEY
    ] as ActiveUserData;

    if (!user?.roleName) {
      return false;
    }

    return requiredRoles.some((role) => user.roleName === role);
  }
}
