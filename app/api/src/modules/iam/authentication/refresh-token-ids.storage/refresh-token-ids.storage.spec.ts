import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenIdsStorage } from './refresh-token-ids.storage';
import { RedisService } from 'src/shared/redis';
import { InvalidatedRefreshTokenError } from 'src/shared/errors';
import jwtConfig from '../../config/jwt.config';

describe('RefreshTokenIdsStorage', () => {
  let storage: RefreshTokenIdsStorage;
  let mockPipeline: {
    sadd: jest.Mock;
    expire: jest.Mock;
    exec: jest.Mock;
  };
  let mockClient: {
    pipeline: jest.Mock;
    sismember: jest.Mock;
    srem: jest.Mock;
    scard: jest.Mock;
    smembers: jest.Mock;
  };
  let mockDel: jest.Mock;

  const testUserId = '01912345-6789-7abc-8def-0123456789ab';
  const testTokenId = 'test-token-id';
  const refreshTokenTtl = 86400;

  beforeEach(async () => {
    mockPipeline = {
      sadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    mockClient = {
      pipeline: jest.fn().mockReturnValue(mockPipeline),
      sismember: jest.fn(),
      srem: jest.fn().mockResolvedValue(1),
      scard: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue([]),
    };

    mockDel = jest.fn().mockResolvedValue(1);

    const mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockClient),
      del: mockDel,
    };

    const mockJwtConfig = {
      refreshTokenTtl,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenIdsStorage,
        { provide: RedisService, useValue: mockRedisService },
        { provide: jwtConfig.KEY, useValue: mockJwtConfig },
      ],
    }).compile();

    storage = module.get<RefreshTokenIdsStorage>(RefreshTokenIdsStorage);
  });

  it('should be defined', () => {
    expect(storage).toBeDefined();
  });

  describe('insert', () => {
    it('should add token to user set with TTL', async () => {
      mockClient.scard.mockResolvedValue(1);

      await storage.insert(testUserId, testTokenId);

      expect(mockClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.sadd).toHaveBeenCalledWith(
        `refresh-tokens:user:${testUserId}`,
        testTokenId,
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith(
        `refresh-tokens:user:${testUserId}`,
        refreshTokenTtl,
      );
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should enforce max sessions when limit exceeded', async () => {
      mockClient.scard.mockResolvedValue(6);
      mockClient.smembers.mockResolvedValue([
        'old-token-1',
        'token-2',
        'token-3',
        'token-4',
        'token-5',
        testTokenId,
      ]);

      await storage.insert(testUserId, testTokenId);

      expect(mockClient.srem).toHaveBeenCalledWith(
        `refresh-tokens:user:${testUserId}`,
        'old-token-1',
      );
    });
  });

  describe('validate', () => {
    it('should return true when token exists in set', async () => {
      mockClient.sismember.mockResolvedValue(1);

      const result = await storage.validate(testUserId, testTokenId);

      expect(result).toBe(true);
      expect(mockClient.sismember).toHaveBeenCalledWith(
        `refresh-tokens:user:${testUserId}`,
        testTokenId,
      );
    });

    it('should throw InvalidatedRefreshTokenError when token not in set', async () => {
      mockClient.sismember.mockResolvedValue(0);

      await expect(storage.validate(testUserId, testTokenId)).rejects.toThrow(
        InvalidatedRefreshTokenError,
      );
    });
  });

  describe('invalidate', () => {
    it('should remove specific token from user set', async () => {
      await storage.invalidate(testUserId, testTokenId);

      expect(mockClient.srem).toHaveBeenCalledWith(
        `refresh-tokens:user:${testUserId}`,
        testTokenId,
      );
    });
  });

  describe('invalidateAll', () => {
    it('should delete entire user token set', async () => {
      await storage.invalidateAll(testUserId);

      expect(mockDel).toHaveBeenCalledWith(`refresh-tokens:user:${testUserId}`);
    });
  });

  describe('getSessionCount', () => {
    it('should return number of active sessions', async () => {
      mockClient.scard.mockResolvedValue(3);

      const count = await storage.getSessionCount(testUserId);

      expect(count).toBe(3);
      expect(mockClient.scard).toHaveBeenCalledWith(
        `refresh-tokens:user:${testUserId}`,
      );
    });
  });
});
