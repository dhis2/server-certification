import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { REQUEST_USER_KEY } from '../iam.constants';
import { ActiveUserData } from '../interfaces';
import { Request } from 'express';

export const ActiveUser = createParamDecorator(
  (field: keyof ActiveUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as unknown as Record<string, unknown>)[
      REQUEST_USER_KEY
    ] as ActiveUserData | undefined;

    return field ? user?.[field] : user;
  },
);
