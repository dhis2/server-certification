import { Test, TestingModule } from '@nestjs/testing';
import { PasswordResetTokenStorage } from '../services/password-reset-token.storage';
import { RedisService } from 'src/shared/redis';

describe('PasswordResetTokenStorage', () => {
  let storage: PasswordResetTokenStorage;
  let redisService: jest.Mocked<RedisService>;

  const mockRedisClient = {
    scan: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetTokenStorage,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            getClient: jest.fn().mockReturnValue(mockRedisClient),
          },
        },
      ],
    }).compile();

    storage = module.get<PasswordResetTokenStorage>(PasswordResetTokenStorage);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(storage).toBeDefined();
  });

  describe('createToken', () => {
    it('should create and store a token', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      const token = await storage.createToken(userId, email);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(redisService.set).toHaveBeenCalledWith(
        expect.stringContaining('pwd-reset:'),
        expect.any(String),
        3600,
      );
    });

    it('should normalize email to lowercase', async () => {
      const userId = 'user-123';
      const email = 'Test@EXAMPLE.com';

      await storage.createToken(userId, email);

      const setCall = (redisService.set as jest.Mock).mock.calls[0];
      const storedData = JSON.parse(setCall[1]);
      expect(storedData.email).toBe('test@example.com');
    });
  });

  describe('validateToken', () => {
    it('should return null for non-existent token', async () => {
      (redisService.get as jest.Mock).mockResolvedValue(null);

      const result = await storage.validateToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return token data for valid token', async () => {
      const tokenData = {
        userId: 'user-123',
        email: 'test@example.com',
        createdAt: Date.now(),
      };
      (redisService.get as jest.Mock).mockResolvedValue(
        JSON.stringify(tokenData),
      );

      const result = await storage.validateToken('valid-token');

      expect(result).toEqual(tokenData);
    });

    it('should return null for invalid JSON', async () => {
      (redisService.get as jest.Mock).mockResolvedValue('invalid-json');

      const result = await storage.validateToken('token');

      expect(result).toBeNull();
    });
  });

  describe('invalidateToken', () => {
    it('should delete the token', async () => {
      await storage.invalidateToken('token-to-delete');

      expect(redisService.del).toHaveBeenCalledWith(
        'pwd-reset:token-to-delete',
      );
    });
  });

  describe('invalidateAllForUser', () => {
    it('should scan and delete all tokens for user', async () => {
      const userId = 'user-123';
      const tokenData = JSON.stringify({
        userId,
        email: 'test@example.com',
        createdAt: Date.now(),
      });

      mockRedisClient.scan.mockResolvedValueOnce(['0', ['pwd-reset:token1']]);
      mockRedisClient.get.mockResolvedValue(tokenData);

      await storage.invalidateAllForUser(userId);

      expect(mockRedisClient.scan).toHaveBeenCalled();
      expect(mockRedisClient.del).toHaveBeenCalledWith('pwd-reset:token1');
    });

    it('should not delete tokens for other users', async () => {
      const userId = 'user-123';
      const otherTokenData = JSON.stringify({
        userId: 'other-user',
        email: 'other@example.com',
        createdAt: Date.now(),
      });

      mockRedisClient.scan.mockResolvedValueOnce(['0', ['pwd-reset:token1']]);
      mockRedisClient.get.mockResolvedValue(otherTokenData);

      await storage.invalidateAllForUser(userId);

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('getExpirationMinutes', () => {
    it('should return 60 minutes', () => {
      expect(storage.getExpirationMinutes()).toBe(60);
    });
  });
});
