import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenGuard } from './access-token.guard';
import { AccessTokenBlacklistStorage } from '../../access-token-blacklist/access-token-blacklist.storage';
import jwtConfig from 'src/modules/iam/config/jwt.config';
import { REQUEST_USER_KEY } from 'src/modules/iam/iam.constants';

describe('AccessTokenGuard', () => {
  let guard: AccessTokenGuard;
  let mockJwtVerify: jest.Mock;
  let mockIsBlacklisted: jest.Mock;

  const mockJwtConfig = {
    secret: 'test-secret',
    audience: 'test-audience',
    issuer: 'test-issuer',
    accessTokenTtl: 3600,
    refreshTokenTtl: 86400,
    algorithm: 'HS256' as const,
  };

  const mockPayload = {
    jti: 'test-jti-123',
    sub: '01912345-6789-7abc-8def-0123456789ab', // UUIDv7 format
    email: 'test@example.com',
    roleId: 1,
    roleName: 'admin',
  };

  const createMockExecutionContext = (
    authHeader?: string,
  ): ExecutionContext => {
    const mockRequest: Record<string, unknown> = {
      headers: {
        authorization: authHeader,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    mockJwtVerify = jest.fn();
    mockIsBlacklisted = jest.fn();

    const mockJwtService = {
      verifyAsync: mockJwtVerify,
    };

    const mockBlacklistStorage = {
      isBlacklisted: mockIsBlacklisted,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessTokenGuard,
        { provide: JwtService, useValue: mockJwtService },
        { provide: jwtConfig.KEY, useValue: mockJwtConfig },
        {
          provide: AccessTokenBlacklistStorage,
          useValue: mockBlacklistStorage,
        },
      ],
    }).compile();

    guard = module.get<AccessTokenGuard>(AccessTokenGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException when no authorization header', async () => {
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when authorization header is empty', async () => {
      const context = createMockExecutionContext('');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Invalid token'));
      const context = createMockExecutionContext('Bearer invalid-token');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is blacklisted', async () => {
      mockJwtVerify.mockResolvedValue(mockPayload);
      mockIsBlacklisted.mockResolvedValue(true);
      const context = createMockExecutionContext('Bearer valid-token');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockIsBlacklisted).toHaveBeenCalledWith('test-jti-123');
    });

    it('should return true and attach payload when token is valid and not blacklisted', async () => {
      mockJwtVerify.mockResolvedValue(mockPayload);
      mockIsBlacklisted.mockResolvedValue(false);
      const context = createMockExecutionContext('Bearer valid-token');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockIsBlacklisted).toHaveBeenCalledWith('test-jti-123');

      // Verify payload was attached to request
      const request = context.switchToHttp().getRequest();
      expect(request[REQUEST_USER_KEY]).toEqual(mockPayload);
    });

    it('should verify token with correct configuration including algorithms', async () => {
      mockJwtVerify.mockResolvedValue(mockPayload);
      mockIsBlacklisted.mockResolvedValue(false);
      const context = createMockExecutionContext('Bearer test-token');

      await guard.canActivate(context);

      expect(mockJwtVerify).toHaveBeenCalledWith('test-token', {
        secret: mockJwtConfig.secret,
        audience: mockJwtConfig.audience,
        issuer: mockJwtConfig.issuer,
        algorithms: [mockJwtConfig.algorithm],
      });
    });
  });

  describe('security scenarios', () => {
    it('should block access after token theft detection', async () => {
      mockJwtVerify.mockResolvedValue(mockPayload);

      // First request: token not blacklisted
      mockIsBlacklisted.mockResolvedValueOnce(false);
      const context1 = createMockExecutionContext('Bearer token-1');
      const result1 = await guard.canActivate(context1);
      expect(result1).toBe(true);

      // Theft detected: token now blacklisted
      mockIsBlacklisted.mockResolvedValueOnce(true);
      const context2 = createMockExecutionContext('Bearer token-1');
      await expect(guard.canActivate(context2)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should verify blacklist check happens after JWT verification', async () => {
      mockJwtVerify.mockResolvedValue(mockPayload);
      mockIsBlacklisted.mockResolvedValue(false);
      const context = createMockExecutionContext('Bearer valid-token');

      await guard.canActivate(context);

      // JWT verification should happen first
      expect(mockJwtVerify).toHaveBeenCalled();
      expect(mockIsBlacklisted).toHaveBeenCalledWith(mockPayload.jti);
    });
  });
});
