import { Test, TestingModule } from '@nestjs/testing';
import { SessionTimeoutStorage } from './session-timeout.storage';
import { SessionExpiredError } from 'src/shared/errors';
import { RedisService } from 'src/shared/redis';
import sessionTimeoutConfig from './session-timeout.config';
import jwtConfig from '../../config/jwt.config';

describe('SessionTimeoutStorage', () => {
  let service: SessionTimeoutStorage;

  const userId = '01912345-6789-7abc-8def-0123456789ab';
  const refreshTokenId = 'refresh-token-uuid';
  const expectedKey = `session:${userId}:${refreshTokenId}`;

  const mockTimeoutConfig = {
    idleTimeoutSeconds: 1800,
    absoluteTimeoutSeconds: 43200,
  };

  const mockJwtConfig = {
    secret: 'test-secret',
    audience: 'test-audience',
    issuer: 'test-issuer',
    accessTokenTtl: 3600,
    refreshTokenTtl: 604800,
    algorithm: 'HS256' as const,
  };

  const mockRedisClient = {
    hset: jest.fn(),
    hgetall: jest.fn(),
    hget: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionTimeoutStorage,
        { provide: RedisService, useValue: mockRedisService },
        { provide: sessionTimeoutConfig.KEY, useValue: mockTimeoutConfig },
        { provide: jwtConfig.KEY, useValue: mockJwtConfig },
      ],
    }).compile();

    service = module.get<SessionTimeoutStorage>(SessionTimeoutStorage);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should store createdAt and lastActivityAt in Redis hash', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      await service.createSession(userId, refreshTokenId);

      expect(mockRedisClient.hset).toHaveBeenCalledWith(expectedKey, {
        createdAt: String(now),
        lastActivityAt: String(now),
      });
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        expectedKey,
        mockJwtConfig.refreshTokenTtl,
      );

      jest.restoreAllMocks();
    });

    it('should use inheritedCreatedAt when provided', async () => {
      const now = Date.now();
      const inheritedCreatedAt = now - 60000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      await service.createSession(userId, refreshTokenId, inheritedCreatedAt);

      expect(mockRedisClient.hset).toHaveBeenCalledWith(expectedKey, {
        createdAt: String(inheritedCreatedAt),
        lastActivityAt: String(now),
      });

      jest.restoreAllMocks();
    });

    it('should not throw on Redis error', async () => {
      mockRedisClient.hset.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.createSession(userId, refreshTokenId),
      ).resolves.not.toThrow();
    });
  });

  describe('validateSession', () => {
    it('should pass for a session within both timeouts', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      mockRedisClient.hgetall.mockResolvedValue({
        createdAt: String(now - 60000),
        lastActivityAt: String(now - 60000),
      });

      await expect(
        service.validateSession(userId, refreshTokenId),
      ).resolves.not.toThrow();

      // Should update lastActivityAt
      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        expectedKey,
        'lastActivityAt',
        String(now),
      );

      jest.restoreAllMocks();
    });

    it('should throw SessionExpiredError when idle timeout exceeded', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const idleExceeded = now - (mockTimeoutConfig.idleTimeoutSeconds + 1) * 1000;
      mockRedisClient.hgetall.mockResolvedValue({
        createdAt: String(now - 60000),
        lastActivityAt: String(idleExceeded),
      });

      await expect(
        service.validateSession(userId, refreshTokenId),
      ).rejects.toThrow(SessionExpiredError);

      jest.restoreAllMocks();
    });

    it('should throw SessionExpiredError when absolute timeout exceeded', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const absoluteExceeded =
        now - (mockTimeoutConfig.absoluteTimeoutSeconds + 1) * 1000;
      mockRedisClient.hgetall.mockResolvedValue({
        createdAt: String(absoluteExceeded),
        lastActivityAt: String(now - 1000),
      });

      await expect(
        service.validateSession(userId, refreshTokenId),
      ).rejects.toThrow(SessionExpiredError);

      jest.restoreAllMocks();
    });

    it('should create metadata for legacy sessions (no data)', async () => {
      mockRedisClient.hgetall.mockResolvedValue({});

      await service.validateSession(userId, refreshTokenId);

      expect(mockRedisClient.hset).toHaveBeenCalled();
    });

    it('should create metadata for legacy sessions (null)', async () => {
      mockRedisClient.hgetall.mockResolvedValue(null);

      await service.validateSession(userId, refreshTokenId);

      expect(mockRedisClient.hset).toHaveBeenCalled();
    });

    it('should fail open on Redis error (non-SessionExpiredError)', async () => {
      mockRedisClient.hgetall.mockRejectedValue(
        new Error('Redis connection lost'),
      );

      await expect(
        service.validateSession(userId, refreshTokenId),
      ).resolves.not.toThrow();
    });

    it('should not catch SessionExpiredError', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const idleExceeded = now - (mockTimeoutConfig.idleTimeoutSeconds + 1) * 1000;
      mockRedisClient.hgetall.mockResolvedValue({
        createdAt: String(now - 60000),
        lastActivityAt: String(idleExceeded),
      });

      await expect(
        service.validateSession(userId, refreshTokenId),
      ).rejects.toBeInstanceOf(SessionExpiredError);

      jest.restoreAllMocks();
    });

    it('should pass when idle time is exactly at the limit', async () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const exactlyAtLimit = now - mockTimeoutConfig.idleTimeoutSeconds * 1000;
      mockRedisClient.hgetall.mockResolvedValue({
        createdAt: String(now - 60000),
        lastActivityAt: String(exactlyAtLimit),
      });

      await expect(
        service.validateSession(userId, refreshTokenId),
      ).resolves.not.toThrow();

      jest.restoreAllMocks();
    });
  });

  describe('getSessionCreatedAt', () => {
    it('should return createdAt timestamp', async () => {
      const createdAt = Date.now() - 60000;
      mockRedisClient.hget.mockResolvedValue(String(createdAt));

      const result = await service.getSessionCreatedAt(
        userId,
        refreshTokenId,
      );

      expect(result).toBe(createdAt);
      expect(mockRedisClient.hget).toHaveBeenCalledWith(
        expectedKey,
        'createdAt',
      );
    });

    it('should return undefined when no session exists', async () => {
      mockRedisClient.hget.mockResolvedValue(null);

      const result = await service.getSessionCreatedAt(
        userId,
        refreshTokenId,
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined on Redis error', async () => {
      mockRedisClient.hget.mockRejectedValue(new Error('Redis error'));

      const result = await service.getSessionCreatedAt(
        userId,
        refreshTokenId,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('deleteSession', () => {
    it('should delete the session key from Redis', async () => {
      await service.deleteSession(userId, refreshTokenId);

      expect(mockRedisService.del).toHaveBeenCalledWith(expectedKey);
    });

    it('should not throw on Redis error', async () => {
      mockRedisService.del.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.deleteSession(userId, refreshTokenId),
      ).resolves.not.toThrow();
    });
  });

  describe('deleteAllSessions', () => {
    it('should scan and delete all session keys for a user', async () => {
      mockRedisClient.scan.mockResolvedValueOnce([
        '0',
        [`session:${userId}:token-1`, `session:${userId}:token-2`],
      ]);
      mockRedisClient.del.mockResolvedValue(2);

      await service.deleteAllSessions(userId);

      expect(mockRedisClient.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        `session:${userId}:*`,
        'COUNT',
        100,
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        `session:${userId}:token-1`,
        `session:${userId}:token-2`,
      );
    });

    it('should handle multiple scan iterations', async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce(['42', [`session:${userId}:token-1`]])
        .mockResolvedValueOnce(['0', [`session:${userId}:token-2`]]);
      mockRedisClient.del.mockResolvedValue(1);

      await service.deleteAllSessions(userId);

      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
    });

    it('should handle no matching keys', async () => {
      mockRedisClient.scan.mockResolvedValueOnce(['0', []]);

      await service.deleteAllSessions(userId);

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should not throw on Redis error', async () => {
      mockRedisClient.scan.mockRejectedValue(new Error('Redis error'));

      await expect(
        service.deleteAllSessions(userId),
      ).resolves.not.toThrow();
    });
  });
});
