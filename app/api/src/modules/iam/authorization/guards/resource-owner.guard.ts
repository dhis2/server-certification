import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUEST_USER_KEY } from 'src/modules/iam/iam.constants';
import { ActiveUserData } from 'src/modules/iam/interfaces';

export const RESOURCE_OWNER_KEY = 'resourceOwner';
export const BYPASS_ROLES_KEY = 'bypassRoles';

export interface ResourceOwnerOptions {
  idParam?: string;
  bypassRoles?: string[];
}

@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<ResourceOwnerOptions>(
      RESOURCE_OWNER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as unknown as Record<string, unknown>)[
      REQUEST_USER_KEY
    ] as ActiveUserData;

    if (!user?.sub) {
      throw new ForbiddenException('Access denied');
    }

    const bypassRoles = options.bypassRoles ?? ['admin'];
    if (user.roleName && bypassRoles.includes(user.roleName)) {
      return true;
    }

    const idParam = options.idParam ?? 'id';
    const resourceId = request.params[idParam];

    if (!resourceId || user.sub !== resourceId) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
