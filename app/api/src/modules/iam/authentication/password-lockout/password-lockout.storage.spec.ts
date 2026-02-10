import { Test, TestingModule } from '@nestjs/testing';
import { PasswordLockoutStorage } from './password-lockout.storage';
import { RedisService } from 'src/shared/redis';
import passwordLockoutConfig from './password-lockout.config';

describe('PasswordLockoutStorage', () => {
  let service: PasswordLockoutStorage;

  const mockConfig = {
    maxFailures: 5,
    lockoutSeconds: 900,
    failureWindowSeconds: 900,
  };

  const mockRedisClient = {
    incr: jest.fn(),
    expire: jest.fn(),
    get: jest.fn(),
    ttl: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordLockoutStorage,
        { provide: RedisService, useValue: mockRedisService },
        { provide: passwordLockoutConfig.KEY, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<PasswordLockoutStorage>(PasswordLockoutStorage);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordFailure', () => {
    const email = 'Test@Example.com';
    const normalizedEmail = 'test@example.com';

    it('should record first failure and return remaining attempts', async () => {
      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await service.recordFailure(email);

      expect(mockRedisClient.incr).toHaveBeenCalledWith(
        `auth:password:failures:${normalizedEmail}`,
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        `auth:password:failures:${normalizedEmail}`,
        mockConfig.failureWindowSeconds,
      );
      expect(result).toEqual({
        locked: false,
        remainingAttempts: 4,
      });
    });

    it('should trigger lockout after max failures', async () => {
      mockRedisClient.incr.mockResolvedValue(5);
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await service.recordFailure(email);

      expect(result.locked).toBe(true);
      expect(result.remainingAttempts).toBe(0);
      expect(result.lockoutEndsAt).toBeInstanceOf(Date);
      // Verify lockout TTL was set
      expect(mockRedisClient.expire).toHaveBeenLastCalledWith(
        `auth:password:failures:${normalizedEmail}`,
        mockConfig.lockoutSeconds,
      );
    });

    it('should normalize email to lowercase', async () => {
      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await service.recordFailure('USER@EXAMPLE.COM');

      expect(mockRedisClient.incr).toHaveBeenCalledWith(
        'auth:password:failures:user@example.com',
      );
    });

    it('should trim whitespace from email', async () => {
      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await service.recordFailure('  user@example.com  ');

      expect(mockRedisClient.incr).toHaveBeenCalledWith(
        'auth:password:failures:user@example.com',
      );
    });

    it('should fail open on Redis error', async () => {
      mockRedisClient.incr.mockRejectedValue(
        new Error('Redis connection lost'),
      );

      const result = await service.recordFailure(email);

      expect(result).toEqual({
        locked: false,
        remainingAttempts: mockConfig.maxFailures,
      });
    });

    it('should decrement remaining attempts with each failure', async () => {
      mockRedisClient.expire.mockResolvedValue(1);

      mockRedisClient.incr.mockResolvedValue(1);
      expect((await service.recordFailure(email)).remainingAttempts).toBe(4);

      mockRedisClient.incr.mockResolvedValue(2);
      expect((await service.recordFailure(email)).remainingAttempts).toBe(3);

      mockRedisClient.incr.mockResolvedValue(3);
      expect((await service.recordFailure(email)).remainingAttempts).toBe(2);

      mockRedisClient.incr.mockResolvedValue(4);
      expect((await service.recordFailure(email)).remainingAttempts).toBe(1);

      mockRedisClient.incr.mockResolvedValue(5);
      expect((await service.recordFailure(email)).remainingAttempts).toBe(0);
    });
  });

  describe('getLockoutStatus', () => {
    const email = 'test@example.com';

    it('should return not locked when no failures', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.ttl.mockResolvedValue(-2);

      const result = await service.getLockoutStatus(email);

      expect(result).toEqual({
        isLockedOut: false,
        remainingAttempts: 5,
      });
    });

    it('should return remaining attempts when below threshold', async () => {
      mockRedisClient.get.mockResolvedValue('3');
      mockRedisClient.ttl.mockResolvedValue(600);

      const result = await service.getLockoutStatus(email);

      expect(result).toEqual({
        isLockedOut: false,
        remainingAttempts: 2,
      });
    });

    it('should return locked status with lockout end time', async () => {
      mockRedisClient.get.mockResolvedValue('5');
      mockRedisClient.ttl.mockResolvedValue(600);

      const result = await service.getLockoutStatus(email);

      expect(result.isLockedOut).toBe(true);
      expect(result.remainingAttempts).toBe(0);
      expect(result.lockoutEndsAt).toBeInstanceOf(Date);
    });

    it('should fail open on Redis error', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis timeout'));

      const result = await service.getLockoutStatus(email);

      expect(result).toEqual({
        isLockedOut: false,
        remainingAttempts: mockConfig.maxFailures,
      });
    });
  });

  describe('isLockedOut', () => {
    const email = 'test@example.com';

    it('should return false when not locked', async () => {
      mockRedisClient.get.mockResolvedValue('2');
      mockRedisClient.ttl.mockResolvedValue(600);

      const result = await service.isLockedOut(email);

      expect(result).toBe(false);
    });

    it('should return true when locked', async () => {
      mockRedisClient.get.mockResolvedValue('5');
      mockRedisClient.ttl.mockResolvedValue(600);

      const result = await service.isLockedOut(email);

      expect(result).toBe(true);
    });

    it('should return true when failures at threshold with no TTL (key persisted without expiry)', async () => {
      mockRedisClient.get.mockResolvedValue('5');
      mockRedisClient.ttl.mockResolvedValue(-1);

      const result = await service.isLockedOut(email);

      // When TTL is -1, key exists without expiry - conservative behavior keeps account locked
      expect(result).toBe(true);
    });
  });

  describe('clearFailures', () => {
    const email = 'test@example.com';

    it('should delete failure key from Redis', async () => {
      mockRedisService.del.mockResolvedValue(undefined);

      await service.clearFailures(email);

      expect(mockRedisService.del).toHaveBeenCalledWith(
        `auth:password:failures:${email}`,
      );
    });

    it('should normalize email before clearing', async () => {
      mockRedisService.del.mockResolvedValue(undefined);

      await service.clearFailures('  USER@EXAMPLE.COM  ');

      expect(mockRedisService.del).toHaveBeenCalledWith(
        'auth:password:failures:user@example.com',
      );
    });

    it('should not throw on Redis error', async () => {
      mockRedisService.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.clearFailures(email)).resolves.not.toThrow();
    });
  });

  describe('getFailureCount', () => {
    const email = 'test@example.com';

    it('should return 0 when no failures', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.getFailureCount(email);

      expect(result).toBe(0);
    });

    it('should return current failure count', async () => {
      mockRedisService.get.mockResolvedValue('3');

      const result = await service.getFailureCount(email);

      expect(result).toBe(3);
    });

    it('should return 0 on Redis error', async () => {
      mockRedisService.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.getFailureCount(email);

      expect(result).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle exactly max failures threshold', async () => {
      mockRedisClient.incr.mockResolvedValue(mockConfig.maxFailures);
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await service.recordFailure('test@example.com');

      expect(result.locked).toBe(true);
    });

    it('should handle failures exceeding max (safety check)', async () => {
      mockRedisClient.incr.mockResolvedValue(mockConfig.maxFailures + 10);
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await service.recordFailure('test@example.com');

      expect(result.locked).toBe(true);
      expect(result.remainingAttempts).toBe(0);
    });

    it('should handle empty email string', async () => {
      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      const result = await service.recordFailure('');

      expect(result.locked).toBe(false);
      expect(mockRedisClient.incr).toHaveBeenCalledWith(
        'auth:password:failures:',
      );
    });
  });
});
