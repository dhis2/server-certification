import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { OtpAuthenticationService } from './otp-authentication.service';
import { EncryptionService } from 'src/shared/crypto';
import { RedisService } from 'src/shared/redis';
import { HashingService } from '../../hashing/hashing.service';
import { MailService } from 'src/modules/mail';
import { User } from 'src/modules/users/entities/user.entity';
import otpConfig from './otp.config';
import * as otplib from 'otplib';

jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'MOCKSECRETBASE32KEY'),
  generateURI: jest.fn(
    ({ issuer, label, secret }) =>
      `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}`,
  ),
  verifySync: jest.fn(() => ({ valid: true })),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mockQrCode')),
}));

describe('OtpAuthenticationService', () => {
  let service: OtpAuthenticationService;
  let mockRedisService: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    getClient: jest.Mock;
  };
  let mockEncryptionService: jest.Mocked<EncryptionService>;
  let mockHashingService: jest.Mocked<HashingService>;
  let mockUserRepository: {
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let mockRedisClient: { incr: jest.Mock; expire: jest.Mock };

  const mockOtpConfig = {
    appName: 'TestApp',
    epochTolerance: 1,
    codeWindowSeconds: 30,
    maxFailures: 3,
    lockoutSeconds: 300,
    pendingSecretTtlSeconds: 600,
    recoveryCodeCount: 10,
  };

  const testUserId = 'user-uuid-123';
  const testEmail = 'test@example.com';
  const testSecret = 'JBSWY3DPEHPK3PXP';
  const testEncryptedSecret = 'encrypted:JBSWY3DPEHPK3PXP';

  beforeEach(async () => {
    mockRedisClient = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };

    mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getClient: jest.fn(() => mockRedisClient),
    };

    mockEncryptionService = {
      encrypt: jest.fn((val) => `encrypted:${val}`),
      decrypt: jest.fn((val) => val.replace('encrypted:', '')),
    } as unknown as jest.Mocked<EncryptionService>;

    mockHashingService = {
      hash: jest.fn((val) => Promise.resolve(`hashed:${val}`)),
      compare: jest.fn(),
    } as unknown as jest.Mocked<HashingService>;

    mockUserRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockMailService = {
      send2faEnabled: jest.fn().mockResolvedValue(true),
      send2faDisabled: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpAuthenticationService,
        { provide: otpConfig.KEY, useValue: mockOtpConfig },
        { provide: EncryptionService, useValue: mockEncryptionService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: HashingService, useValue: mockHashingService },
        { provide: MailService, useValue: mockMailService },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<OtpAuthenticationService>(OtpAuthenticationService);
    jest.clearAllMocks();
  });

  describe('generateTotpSecret', () => {
    it('should generate secret and URI with correct parameters', () => {
      const result = service.generateTotpSecret(testEmail);

      expect(result.secret).toBe('MOCKSECRETBASE32KEY');
      expect(result.uri).toContain('otpauth://totp/TestApp:');
      expect(result.uri).toContain(testEmail);
      expect(otplib.generateSecret).toHaveBeenCalled();
      expect(otplib.generateURI).toHaveBeenCalledWith({
        issuer: 'TestApp',
        label: testEmail,
        secret: 'MOCKSECRETBASE32KEY',
      });
    });
  });

  describe('initiateTfaSetup', () => {
    it('should store pending secret and return URI, QR code, and recovery codes', async () => {
      const result = await service.initiateTfaSetup(testUserId, testEmail);

      expect(result.uri).toContain('otpauth://totp/');
      expect(result.qrCode).toBe('data:image/png;base64,mockQrCode');
      expect(result.recoveryCodes).toHaveLength(10);
      expect(result.recoveryCodes[0]).toMatch(/^[A-F0-9]{8}$/);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `otp:pending:${testUserId}`,
        expect.any(String),
        mockOtpConfig.pendingSecretTtlSeconds,
      );
    });
  });

  describe('verifyAndEnableTfa', () => {
    const pendingData = JSON.stringify({
      secret: testSecret,
      recoveryCodes: ['ABCD1234', 'EFGH5678'],
    });

    it('should enable TFA when code is valid', async () => {
      mockRedisService.get.mockResolvedValue(
        mockEncryptionService.encrypt(pendingData),
      );
      (otplib.verifySync as jest.Mock).mockReturnValue({ valid: true });

      await service.verifyAndEnableTfa(testUserId, '123456');

      expect(mockUserRepository.update).toHaveBeenCalledWith(testUserId, {
        tfaSecret: expect.any(String),
        tfaRecoveryCodes: expect.any(Array),
        isTfaEnabled: true,
      });
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `otp:pending:${testUserId}`,
      );
    });

    it('should throw UnauthorizedException when pending secret expired', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        service.verifyAndEnableTfa(testUserId, '123456'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when code is invalid', async () => {
      mockRedisService.get.mockResolvedValue(
        mockEncryptionService.encrypt(pendingData),
      );
      (otplib.verifySync as jest.Mock).mockReturnValue({ valid: false });

      await expect(
        service.verifyAndEnableTfa(testUserId, '000000'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('verifyCode', () => {
    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null);
      (otplib.verifySync as jest.Mock).mockReturnValue({ valid: true });
    });

    it('should return valid when code is correct and not replayed', async () => {
      const result = await service.verifyCode(
        testUserId,
        testEncryptedSecret,
        '123456',
      );

      expect(result.valid).toBe(true);
      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
        testEncryptedSecret,
      );
      expect(otplib.verifySync).toHaveBeenCalledWith({
        secret: testSecret,
        token: '123456',
        epochTolerance: mockOtpConfig.epochTolerance,
      });
    });

    it('should mark code as used after successful verification', async () => {
      await service.verifyCode(testUserId, testEncryptedSecret, '123456');

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `otp:used:${testUserId}:123456`,
        '1',
        mockOtpConfig.codeWindowSeconds * 2,
      );
    });

    it('should detect replay attack when code was already used', async () => {
      mockRedisService.get
        .mockResolvedValueOnce(null) // No failures
        .mockResolvedValueOnce('1'); // Code already used

      const result = await service.verifyCode(
        testUserId,
        testEncryptedSecret,
        '123456',
      );

      expect(result.valid).toBe(false);
    });

    it('should return lockedOut when max failures reached', async () => {
      mockRedisService.get.mockResolvedValue('3'); // At max failures

      const result = await service.verifyCode(
        testUserId,
        testEncryptedSecret,
        '123456',
      );

      expect(result.valid).toBe(false);
      expect(result.lockedOut).toBe(true);
      expect(result.remainingAttempts).toBe(0);
    });

    it('should increment failure count on invalid code', async () => {
      mockRedisService.get.mockResolvedValue('1'); // 1 previous failure
      (otplib.verifySync as jest.Mock).mockReturnValue({ valid: false });

      const result = await service.verifyCode(
        testUserId,
        testEncryptedSecret,
        '000000',
      );

      expect(result.valid).toBe(false);
      expect(result.remainingAttempts).toBe(1);
      expect(mockRedisClient.incr).toHaveBeenCalled();
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        `otp:failures:${testUserId}`,
        mockOtpConfig.lockoutSeconds,
      );
    });

    it('should clear failures on successful verification', async () => {
      mockRedisService.get
        .mockResolvedValueOnce('1') // failures count
        .mockResolvedValueOnce(null); // used code check
      (otplib.verifySync as jest.Mock).mockReturnValue({ valid: true });

      await service.verifyCode(testUserId, testEncryptedSecret, '123456');

      expect(mockRedisService.del).toHaveBeenCalledWith(
        `otp:failures:${testUserId}`,
      );
    });
  });

  describe('verifyRecoveryCode', () => {
    const hashedCodes = ['hashed:ABCD1234', 'hashed:EFGH5678'];

    it('should return true and remove code when valid', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: testUserId,
        tfaRecoveryCodes: hashedCodes,
      });
      mockHashingService.compare.mockResolvedValueOnce(true);

      const result = await service.verifyRecoveryCode(testUserId, 'abcd1234');

      expect(result).toBe(true);
      expect(mockUserRepository.update).toHaveBeenCalledWith(testUserId, {
        tfaRecoveryCodes: ['hashed:EFGH5678'],
      });
    });

    it('should return false when code does not match', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: testUserId,
        tfaRecoveryCodes: hashedCodes,
      });
      mockHashingService.compare.mockResolvedValue(false);

      const result = await service.verifyRecoveryCode(testUserId, 'WRONGCODE');

      expect(result).toBe(false);
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it('should return false when no recovery codes exist', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: testUserId,
        tfaRecoveryCodes: null,
      });

      const result = await service.verifyRecoveryCode(testUserId, 'ABCD1234');

      expect(result).toBe(false);
    });
  });

  describe('disableTfa', () => {
    it('should clear TFA fields', async () => {
      await service.disableTfa(testUserId);

      expect(mockUserRepository.update).toHaveBeenCalledWith(testUserId, {
        tfaSecret: null,
        tfaRecoveryCodes: null,
        isTfaEnabled: false,
      });
    });
  });

  describe('regenerateRecoveryCodes', () => {
    it('should generate and store new recovery codes', async () => {
      const result = await service.regenerateRecoveryCodes(testUserId);

      expect(result).toHaveLength(10);
      expect(result[0]).toMatch(/^[A-F0-9]{8}$/);
      expect(mockUserRepository.update).toHaveBeenCalledWith(testUserId, {
        tfaRecoveryCodes: expect.any(Array),
      });
    });
  });

  describe('isLockedOut', () => {
    it('should return true when failures >= maxFailures', async () => {
      mockRedisService.get.mockResolvedValue('3');

      const result = await service.isLockedOut(testUserId);

      expect(result).toBe(true);
    });

    it('should return false when failures < maxFailures', async () => {
      mockRedisService.get.mockResolvedValue('2');

      const result = await service.isLockedOut(testUserId);

      expect(result).toBe(false);
    });

    it('should return false when no failures', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.isLockedOut(testUserId);

      expect(result).toBe(false);
    });
  });
});
