import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticationGuard } from './authentication.guard';
import { AccessTokenGuard } from '../access-token/access-token.guard';
import { AuthType } from '../../enums/auth-type.enum';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { AUTH_TYPE_KEY } from '../../decorators/auth.decorator';

describe('AuthenticationGuard', () => {
  let guard: AuthenticationGuard;
  let mockReflector: { getAllAndOverride: jest.Mock; get: jest.Mock };
  let mockAccessTokenGuard: { canActivate: jest.Mock };

  const createMockExecutionContext = (): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
    };

    mockAccessTokenGuard = {
      canActivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: AccessTokenGuard, useValue: mockAccessTokenGuard },
      ],
    }).compile();

    guard = module.get<AuthenticationGuard>(AuthenticationGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    describe('@Public() decorator', () => {
      it('should allow access when @Public() decorator is present', async () => {
        const context = createMockExecutionContext();
        mockReflector.get.mockReturnValue(undefined); // No handler-level @Auth()
        mockReflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === IS_PUBLIC_KEY) return true;
          return undefined;
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockAccessTokenGuard.canActivate).not.toHaveBeenCalled();
      });

      it('should check handler auth types before isPublic', async () => {
        const context = createMockExecutionContext();
        const callOrder: string[] = [];

        mockReflector.get.mockImplementation((key: string) => {
          callOrder.push(`get:${key}`);
          return undefined;
        });
        mockReflector.getAllAndOverride.mockImplementation((key: string) => {
          callOrder.push(`getAllAndOverride:${key}`);
          if (key === IS_PUBLIC_KEY) return true;
          return undefined;
        });

        await guard.canActivate(context);

        expect(callOrder[0]).toBe(`get:${AUTH_TYPE_KEY}`);
      });

      it('should skip token validation when @Public() is set and no handler @Auth()', async () => {
        const context = createMockExecutionContext();
        mockReflector.get.mockReturnValue(undefined); // No handler-level @Auth()
        mockReflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === IS_PUBLIC_KEY) return true;
          return [AuthType.Bearer];
        });

        await guard.canActivate(context);

        expect(mockAccessTokenGuard.canActivate).not.toHaveBeenCalled();
      });

      it('should require auth when handler has @Auth() even if class has @Public()', async () => {
        const context = createMockExecutionContext();
        mockReflector.get.mockImplementation((key: string) => {
          if (key === AUTH_TYPE_KEY) return [AuthType.Bearer]; // Handler has @Auth()
          return undefined;
        });
        mockReflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === IS_PUBLIC_KEY) return true; // Class has @Public()
          return undefined;
        });
        mockAccessTokenGuard.canActivate.mockResolvedValue(true);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockAccessTokenGuard.canActivate).toHaveBeenCalledWith(context);
      });

      it('should throw UnauthorizedException when handler has @Auth() and token is invalid', async () => {
        const context = createMockExecutionContext();
        mockReflector.get.mockImplementation((key: string) => {
          if (key === AUTH_TYPE_KEY) return [AuthType.Bearer]; // Handler has @Auth()
          return undefined;
        });
        mockReflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === IS_PUBLIC_KEY) return true; // Class has @Public()
          return undefined;
        });
        mockAccessTokenGuard.canActivate.mockResolvedValue(false);

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('@Auth() decorator', () => {
      beforeEach(() => {
        mockReflector.get.mockReturnValue(undefined);
        mockReflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === IS_PUBLIC_KEY) return false;
          return undefined;
        });
      });

      it('should use Bearer auth type by default when no auth type is set', async () => {
        const context = createMockExecutionContext();
        mockReflector.get.mockReturnValue(undefined);
        mockReflector.getAllAndOverride.mockImplementation((key: string) => {
          if (key === IS_PUBLIC_KEY) return false;
          if (key === AUTH_TYPE_KEY) return undefined;
          return undefined;
        });
        mockAccessTokenGuard.canActivate.mockResolvedValue(true);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockAccessTokenGuard.canActivate).toHaveBeenCalledWith(context);
      });

      it('should allow access when AuthType.None is set on handler', async () => {
        const context = createMockExecutionContext();
        mockReflector.get.mockImplementation((key: string) => {
          if (key === AUTH_TYPE_KEY) return [AuthType.None];
          return undefined;
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockAccessTokenGuard.canActivate).not.toHaveBeenCalled();
      });

      it('should allow access when AuthType.Bearer is set and token is valid', async () => {
        const context = createMockExecutionContext();
        mockReflector.get.mockImplementation((key: string) => {
          if (key === AUTH_TYPE_KEY) return [AuthType.Bearer];
          return undefined;
        });
        mockAccessTokenGuard.canActivate.mockResolvedValue(true);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockAccessTokenGuard.canActivate).toHaveBeenCalledWith(context);
      });

      it('should throw UnauthorizedException when AuthType.Bearer is set and token is invalid', async () => {
        const context = createMockExecutionContext();
        mockReflector.get.mockImplementation((key: string) => {
          if (key === AUTH_TYPE_KEY) return [AuthType.Bearer];
          return undefined;
        });
        mockAccessTokenGuard.canActivate.mockResolvedValue(false);

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should throw the error from AccessTokenGuard when it throws', async () => {
        const context = createMockExecutionContext();
        const customError = new UnauthorizedException('Token expired');
        mockReflector.get.mockImplementation((key: string) => {
          if (key === AUTH_TYPE_KEY) return [AuthType.Bearer];
          return undefined;
        });
        mockAccessTokenGuard.canActivate.mockRejectedValue(customError);

        await expect(guard.canActivate(context)).rejects.toThrow(customError);
      });

      it('should allow access if any auth type succeeds', async () => {
        const context = createMockExecutionContext();
        mockReflector.get.mockImplementation((key: string) => {
          if (key === AUTH_TYPE_KEY) return [AuthType.Bearer, AuthType.None];
          return undefined;
        });
        mockAccessTokenGuard.canActivate.mockResolvedValue(false);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('secure by default', () => {
      it('should require Bearer auth when no decorators are present', async () => {
        const context = createMockExecutionContext();
        mockReflector.get.mockReturnValue(undefined);
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        mockAccessTokenGuard.canActivate.mockResolvedValue(false);

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should call AccessTokenGuard when no decorators are present', async () => {
        const context = createMockExecutionContext();
        mockReflector.get.mockReturnValue(undefined);
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        mockAccessTokenGuard.canActivate.mockResolvedValue(true);

        await guard.canActivate(context);

        expect(mockAccessTokenGuard.canActivate).toHaveBeenCalledWith(context);
      });
    });
  });
});
