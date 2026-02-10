import { Test, TestingModule } from '@nestjs/testing';
import { AccessTokenBlacklistStorage } from './access-token-blacklist.storage';
import { RedisService } from 'src/shared/redis';
import blacklistConfig, { BlacklistFallbackMode } from './blacklist.config';

describe('AccessTokenBlacklistStorage', () => {
  let storage: AccessTokenBlacklistStorage;
  let mockGet: jest.Mock;
  let mockSet: jest.Mock;
  let mockDel: jest.Mock;
  let mockSadd: jest.Mock;
  let mockSmembers: jest.Mock;
  let mockExpire: jest.Mock;
  let mockSetex: jest.Mock;
  let mockPipelineExec: jest.Mock;

  const testUserId = '01912345-6789-7abc-8def-0123456789ab'; // UUIDv7 format

  const mockConfig = {
    fallbackMode: BlacklistFallbackMode.FAIL_CLOSED,
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeoutMs: 30000,
    },
    localCache: {
      maxEntries: 10000,
      cleanupIntervalMs: 60000,
    },
  };

  beforeEach(async () => {
    mockGet = jest.fn();
    mockSet = jest.fn();
    mockDel = jest.fn();
    mockSadd = jest.fn();
    mockSmembers = jest.fn();
    mockExpire = jest.fn();
    mockSetex = jest.fn();
    mockPipelineExec = jest.fn().mockResolvedValue([]);

    const mockPipeline = {
      sadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      setex: mockSetex.mockReturnThis(),
      exec: mockPipelineExec,
    };

    const mockRedisClient = {
      sadd: mockSadd,
      smembers: mockSmembers,
      expire: mockExpire,
      pipeline: () => mockPipeline,
    };

    const mockRedisService = {
      get: mockGet,
      set: mockSet,
      del: mockDel,
      getClient: () => mockRedisClient,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessTokenBlacklistStorage,
        { provide: RedisService, useValue: mockRedisService },
        { provide: blacklistConfig.KEY, useValue: mockConfig },
      ],
    }).compile();

    storage = module.get<AccessTokenBlacklistStorage>(
      AccessTokenBlacklistStorage,
    );
  });

  afterEach(() => {
    // Clean up interval
    storage.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(storage).toBeDefined();
  });

  describe('blacklist', () => {
    it('should store jti in blacklist with TTL', async () => {
      await storage.blacklist('token-jti-123', testUserId, 3600);

      expect(mockSet).toHaveBeenCalledWith(
        'blacklist:access-token:token-jti-123',
        testUserId,
        3600,
      );
    });

    it('should throw error when Redis fails (token revocation requires persistence)', async () => {
      mockSet.mockRejectedValue(new Error('Redis connection failed'));

      await expect(
        storage.blacklist('token-jti-123', testUserId, 3600),
      ).rejects.toThrow('Redis connection failed');

      // Local cache should still be populated for faster reads until restart
      const isBlacklisted = await storage.isBlacklisted('token-jti-123');
      expect(isBlacklisted).toBe(true);
    });
  });

  describe('isBlacklisted', () => {
    it('should return true when token is blacklisted in Redis', async () => {
      mockGet.mockResolvedValue('1');

      const result = await storage.isBlacklisted('token-jti-123');

      expect(result).toBe(true);
      expect(mockGet).toHaveBeenCalledWith(
        'blacklist:access-token:token-jti-123',
      );
    });

    it('should return false when token is not blacklisted', async () => {
      mockGet.mockResolvedValue(null);

      const result = await storage.isBlacklisted('token-jti-456');

      expect(result).toBe(false);
    });

    it('should check local cache first', async () => {
      await storage.blacklist('local-jti', testUserId, 3600);
      mockGet.mockClear();

      const result = await storage.isBlacklisted('local-jti');

      expect(result).toBe(true);
    });
  });

  describe('blacklistAllForUser', () => {
    it('should blacklist multiple tokens using pipeline', async () => {
      const jtis = ['jti-1', 'jti-2', 'jti-3'];

      await storage.blacklistAllForUser(testUserId, jtis, 3600);

      expect(mockPipelineExec).toHaveBeenCalled();
    });

    it('should handle empty array gracefully', async () => {
      await storage.blacklistAllForUser(testUserId, [], 3600);

      expect(mockPipelineExec).not.toHaveBeenCalled();
    });
  });

  describe('trackToken', () => {
    it('should use pipeline for atomic operation', async () => {
      await storage.trackToken(testUserId, 'token-jti-123', 3600);

      expect(mockPipelineExec).toHaveBeenCalled();
    });
  });

  describe('getTrackedTokens', () => {
    it('should return all tracked tokens for a user', async () => {
      mockSmembers.mockResolvedValue(['jti-1', 'jti-2', 'jti-3']);

      const result = await storage.getTrackedTokens(testUserId);

      expect(result).toEqual(['jti-1', 'jti-2', 'jti-3']);
      expect(mockSmembers).toHaveBeenCalledWith(`user-tokens:${testUserId}`);
    });

    it('should return empty array when no tokens tracked', async () => {
      mockSmembers.mockResolvedValue([]);

      const result = await storage.getTrackedTokens(testUserId);

      expect(result).toEqual([]);
    });

    it('should return empty array on Redis failure', async () => {
      mockSmembers.mockRejectedValue(new Error('Redis error'));

      const result = await storage.getTrackedTokens(testUserId);

      expect(result).toEqual([]);
    });
  });

  describe('clearTrackedTokens', () => {
    it('should delete the user tokens set', async () => {
      await storage.clearTrackedTokens(testUserId);

      expect(mockDel).toHaveBeenCalledWith(`user-tokens:${testUserId}`);
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit after threshold failures', async () => {
      mockSet.mockRejectedValue(new Error('Redis down'));

      for (let i = 0; i < 5; i++) {
        await expect(
          storage.blacklist(`jti-${i}`, testUserId, 3600),
        ).rejects.toThrow('Redis down');
      }

      const state = storage.getCircuitState();
      expect(state.isOpen).toBe(true);
      expect(state.failures).toBe(5);
    });

    it('should reset circuit on success', async () => {
      mockSet.mockRejectedValueOnce(new Error('Redis down'));
      mockSet.mockRejectedValueOnce(new Error('Redis down'));

      await expect(
        storage.blacklist('jti-1', testUserId, 3600),
      ).rejects.toThrow();
      await expect(
        storage.blacklist('jti-2', testUserId, 3600),
      ).rejects.toThrow();

      let state = storage.getCircuitState();
      expect(state.failures).toBe(2);

      mockSet.mockResolvedValueOnce(undefined);
      await storage.blacklist('jti-3', testUserId, 3600);

      state = storage.getCircuitState();
      expect(state.failures).toBe(0);
      expect(state.isOpen).toBe(false);
    });

    it('should throw when circuit is open for write operations', async () => {
      mockSmembers.mockRejectedValue(new Error('Redis down'));
      for (let i = 0; i < 5; i++) {
        await storage.getTrackedTokens(testUserId);
      }
      expect(storage.getCircuitState().isOpen).toBe(true);

      await expect(
        storage.blacklist('jti-new', testUserId, 3600),
      ).rejects.toThrow('Circuit open: cannot persist blacklist to Redis');
    });

    it('should skip Redis operations for reads when circuit is open', async () => {
      mockSmembers.mockRejectedValue(new Error('Redis down'));
      for (let i = 0; i < 5; i++) {
        await storage.getTrackedTokens(testUserId);
      }

      expect(storage.getCircuitState().isOpen).toBe(true);

      mockSmembers.mockClear();

      await storage.getTrackedTokens(testUserId);

      expect(mockSmembers).not.toHaveBeenCalled();
    });
  });

  describe('fail-closed mode', () => {
    it('should treat tokens as blacklisted when Redis fails', async () => {
      mockGet.mockRejectedValue(new Error('Redis error'));

      const result = await storage.isBlacklisted('unknown-jti');

      expect(result).toBe(true);
    });
  });

  describe('local cache', () => {
    it('should use local cache when Redis is down', async () => {
      await storage.blacklist('cached-jti', testUserId, 3600);

      mockGet.mockRejectedValue(new Error('Redis down'));

      const result = await storage.isBlacklisted('cached-jti');
      expect(result).toBe(true);
    });

    it('should expire local cache entries', async () => {
      await storage.blacklist('expiring-jti', testUserId, 0);

      await new Promise((resolve) => setTimeout(resolve, 10));

      mockGet.mockResolvedValue(null);
      const result = await storage.isBlacklisted('expiring-jti');

      expect(result).toBe(false);
    });

    it('should provide cache stats', () => {
      const stats = storage.getLocalCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats.maxSize).toBe(10000);
    });
  });

  describe('integration: token theft detection', () => {
    it('should blacklist all tokens when theft detected', async () => {
      mockSmembers.mockResolvedValue(['jti-session1', 'jti-session2']);

      const trackedTokens = await storage.getTrackedTokens(testUserId);
      expect(trackedTokens).toHaveLength(2);

      await storage.blacklistAllForUser(testUserId, trackedTokens, 3600);
      expect(mockPipelineExec).toHaveBeenCalled();

      await storage.clearTrackedTokens(testUserId);
      expect(mockDel).toHaveBeenCalledWith(`user-tokens:${testUserId}`);
    });

    it('should throw when Redis fails during theft response (revocation requires persistence)', async () => {
      mockSmembers.mockResolvedValue(['jti-1', 'jti-2']);
      mockPipelineExec.mockRejectedValue(new Error('Redis write failed'));

      const trackedTokens = await storage.getTrackedTokens(testUserId);

      await expect(
        storage.blacklistAllForUser(testUserId, trackedTokens, 3600),
      ).rejects.toThrow('Redis write failed');

      const isBlacklisted1 = await storage.isBlacklisted('jti-1');
      const isBlacklisted2 = await storage.isBlacklisted('jti-2');

      expect(isBlacklisted1).toBe(true);
      expect(isBlacklisted2).toBe(true);
    });
  });
});
