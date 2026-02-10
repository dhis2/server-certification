import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { User } from 'src/modules/users/entities/user.entity';
import { HashingService } from '../hashing/hashing.service';
import { RefreshTokenIdsStorage } from './refresh-token-ids.storage/refresh-token-ids.storage';
import { AccessTokenBlacklistStorage } from './access-token-blacklist/access-token-blacklist.storage';
import { PasswordLockoutStorage } from './password-lockout';
import { SessionTimeoutStorage } from './session-timeout';
import sessionTimeoutConfig from './session-timeout/session-timeout.config';
import { RolesService } from '../authorization/services/roles.service';
import { OtpAuthenticationService } from './otp/otp-authentication.service';
import { MailService } from 'src/modules/mail';
import jwtConfig from '../config/jwt.config';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  InvalidatedRefreshTokenError,
  SessionExpiredError,
} from 'src/shared/errors';
import { ActiveUserData } from '../interfaces';

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  const mockJwtConfig = {
    secret: 'test-secret',
    audience: 'test-audience',
    issuer: 'test-issuer',
    accessTokenTtl: 3600,
    refreshTokenTtl: 86400,
    algorithm: 'HS256' as const,
  };

  const mockUser = {
    id: '01912345-6789-7abc-8def-0123456789ab',
    email: 'test@example.com',
    password: 'hashed-password',
    isTfaEnabled: false,
    tfaSecret: null as string | null,
    googleId: null as string | null,
    isActive: true,
    isLocked: false,
    failedLoginAttempts: 0,
    lastLoginAt: null as Date | null,
    role: {
      id: 1,
      name: 'user',
      description: 'Regular user',
      isDefault: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    generateId: jest.fn(),
  } as unknown as User;

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  const mockUserRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    findOneOrFail: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
  };

  const mockHashingService = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockRefreshTokenStorage = {
    insert: jest.fn(),
    validate: jest.fn(),
    invalidate: jest.fn(),
    invalidateAll: jest.fn(),
  };

  const mockAccessTokenBlacklist = {
    trackToken: jest.fn(),
    getTrackedTokens: jest.fn(),
    blacklist: jest.fn(),
    blacklistAllForUser: jest.fn(),
    clearTrackedTokens: jest.fn(),
  };

  const mockRolesService = {
    findDefault: jest.fn(),
  };

  const mockOtpService = {
    verifyCode: jest.fn(),
    verifyRecoveryCode: jest.fn(),
    isLockedOut: jest.fn(),
    disableTfa: jest.fn(),
  };

  const mockPasswordLockoutStorage = {
    isLockedOut: jest.fn(),
    recordFailure: jest.fn(),
    clearFailures: jest.fn(),
    getLockoutStatus: jest.fn(),
  };

  const mockMailService = {
    sendAccountLocked: jest.fn(),
    sendPasswordReset: jest.fn(),
    sendWelcome: jest.fn(),
  };

  const mockSessionTimeoutStorage = {
    createSession: jest.fn().mockResolvedValue(undefined),
    validateSession: jest.fn().mockResolvedValue(undefined),
    getSessionCreatedAt: jest.fn().mockResolvedValue(undefined),
    deleteSession: jest.fn().mockResolvedValue(undefined),
    deleteAllSessions: jest.fn().mockResolvedValue(undefined),
  };

  const mockSessionTimeoutConfig = {
    idleTimeoutSeconds: 1800,
    absoluteTimeoutSeconds: 43200,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: HashingService, useValue: mockHashingService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: jwtConfig.KEY, useValue: mockJwtConfig },
        { provide: RefreshTokenIdsStorage, useValue: mockRefreshTokenStorage },
        {
          provide: AccessTokenBlacklistStorage,
          useValue: mockAccessTokenBlacklist,
        },
        { provide: RolesService, useValue: mockRolesService },
        { provide: OtpAuthenticationService, useValue: mockOtpService },
        {
          provide: PasswordLockoutStorage,
          useValue: mockPasswordLockoutStorage,
        },
        { provide: MailService, useValue: mockMailService },
        {
          provide: SessionTimeoutStorage,
          useValue: mockSessionTimeoutStorage,
        },
        {
          provide: sessionTimeoutConfig.KEY,
          useValue: mockSessionTimeoutConfig,
        },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
    jest.clearAllMocks();

    mockPasswordLockoutStorage.isLockedOut.mockResolvedValue(false);
    mockPasswordLockoutStorage.recordFailure.mockResolvedValue({
      locked: false,
      remainingAttempts: 4,
    });
    mockPasswordLockoutStorage.clearFailures.mockResolvedValue(undefined);

    mockUserRepository.update.mockResolvedValue({ affected: 1 });
    mockUserRepository.increment.mockResolvedValue({ affected: 1 });

    mockMailService.sendAccountLocked.mockResolvedValue(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    const signInDto: SignInDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should return tokens on valid credentials', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

      const result = await service.signIn(signInDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: signInDto.email.toLowerCase().trim() },
        }),
      );
      expect(mockHashingService.compare).toHaveBeenCalledWith(
        signInDto.password,
        mockUser.password,
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should allow multiple sessions (not invalidate previous tokens)', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

      await service.signIn(signInDto);

      expect(
        mockAccessTokenBlacklist.blacklistAllForUser,
      ).not.toHaveBeenCalled();
      expect(mockRefreshTokenStorage.invalidateAll).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException on invalid email', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException on invalid password', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(false);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should require OTP when 2FA is enabled', async () => {
      const userWith2FA = {
        ...mockUser,
        isTfaEnabled: true,
        tfaSecret: 'encrypted-secret',
      };
      mockUserRepository.findOne.mockResolvedValue(userWith2FA);
      mockHashingService.compare.mockResolvedValue(true);
      mockOtpService.isLockedOut.mockResolvedValue(false);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        new UnauthorizedException('OTP code is required'),
      );
    });

    it('should validate OTP when provided', async () => {
      const userWith2FA = {
        ...mockUser,
        isTfaEnabled: true,
        tfaSecret: 'encrypted-secret',
      };
      const signInWith2FA = { ...signInDto, tfaCode: '123456' };

      mockUserRepository.findOne.mockResolvedValue(userWith2FA);
      mockHashingService.compare.mockResolvedValue(true);
      mockOtpService.isLockedOut.mockResolvedValue(false);
      mockOtpService.verifyCode.mockResolvedValue({ valid: true });
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

      const result = await service.signIn(signInWith2FA);

      expect(mockOtpService.verifyCode).toHaveBeenCalledWith(
        userWith2FA.id,
        'encrypted-secret',
        '123456',
      );
      expect(result).toHaveProperty('accessToken');
    });

    it('should reject when OTP code is invalid', async () => {
      const userWith2FA = {
        ...mockUser,
        isTfaEnabled: true,
        tfaSecret: 'encrypted-secret',
      };
      const signInWith2FA = { ...signInDto, tfaCode: '000000' };

      mockUserRepository.findOne.mockResolvedValue(userWith2FA);
      mockHashingService.compare.mockResolvedValue(true);
      mockOtpService.isLockedOut.mockResolvedValue(false);
      mockOtpService.verifyCode.mockResolvedValue({
        valid: false,
        lockedOut: false,
        remainingAttempts: 2,
      });

      await expect(service.signIn(signInWith2FA)).rejects.toThrow(
        new UnauthorizedException('Invalid OTP code'),
      );
    });

    it('should reject when user is locked out', async () => {
      const userWith2FA = {
        ...mockUser,
        isTfaEnabled: true,
        tfaSecret: 'encrypted-secret',
      };
      const signInWith2FA = { ...signInDto, tfaCode: '123456' };

      mockUserRepository.findOne.mockResolvedValue(userWith2FA);
      mockHashingService.compare.mockResolvedValue(true);
      mockOtpService.isLockedOut.mockResolvedValue(true);

      await expect(service.signIn(signInWith2FA)).rejects.toThrow(
        new UnauthorizedException('Too many failed attempts. Try again later.'),
      );
    });

    it('should accept valid recovery code', async () => {
      const userWith2FA = {
        ...mockUser,
        isTfaEnabled: true,
        tfaSecret: 'encrypted-secret',
      };
      const signInWithRecovery = { ...signInDto, recoveryCode: 'ABCD1234' };

      mockUserRepository.findOne.mockResolvedValue(userWith2FA);
      mockHashingService.compare.mockResolvedValue(true);
      mockOtpService.isLockedOut.mockResolvedValue(false);
      mockOtpService.verifyRecoveryCode.mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

      const result = await service.signIn(signInWithRecovery);

      expect(mockOtpService.verifyRecoveryCode).toHaveBeenCalledWith(
        userWith2FA.id,
        'ABCD1234',
      );
      expect(result).toHaveProperty('accessToken');
    });

    it('should reject invalid recovery code', async () => {
      const userWith2FA = {
        ...mockUser,
        isTfaEnabled: true,
        tfaSecret: 'encrypted-secret',
      };
      const signInWithRecovery = { ...signInDto, recoveryCode: 'WRONGCOD' };

      mockUserRepository.findOne.mockResolvedValue(userWith2FA);
      mockHashingService.compare.mockResolvedValue(true);
      mockOtpService.isLockedOut.mockResolvedValue(false);
      mockOtpService.verifyRecoveryCode.mockResolvedValue(false);

      await expect(service.signIn(signInWithRecovery)).rejects.toThrow(
        new UnauthorizedException('Invalid recovery code'),
      );
    });

    it('should clear password failures on successful login', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

      await service.signIn(signInDto);

      expect(mockPasswordLockoutStorage.clearFailures).toHaveBeenCalledWith(
        signInDto.email.toLowerCase(),
      );
    });

    it('should clear password failures on successful 2FA login with recovery code', async () => {
      const userWith2FA = {
        ...mockUser,
        isTfaEnabled: true,
        tfaSecret: 'encrypted-secret',
      };
      const signInWithRecovery = { ...signInDto, recoveryCode: 'ABCD1234' };

      mockUserRepository.findOne.mockResolvedValue(userWith2FA);
      mockHashingService.compare.mockResolvedValue(true);
      mockOtpService.isLockedOut.mockResolvedValue(false);
      mockOtpService.verifyRecoveryCode.mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

      await service.signIn(signInWithRecovery);

      expect(mockPasswordLockoutStorage.clearFailures).toHaveBeenCalledWith(
        signInDto.email.toLowerCase(),
      );
    });
  });

  describe('signIn - password lockout', () => {
    const signInDto: SignInDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should check lockout status before processing login', async () => {
      mockPasswordLockoutStorage.isLockedOut.mockResolvedValue(true);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        new UnauthorizedException('Too many failed attempts. Try again later.'),
      );

      // Should not attempt to find user or compare password when locked out
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
      expect(mockHashingService.compare).not.toHaveBeenCalled();
    });

    it('should record failure for non-existent user (prevents enumeration)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPasswordLockoutStorage.recordFailure).toHaveBeenCalledWith(
        signInDto.email.toLowerCase(),
      );
    });

    it('should record failure for invalid password', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(false);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPasswordLockoutStorage.recordFailure).toHaveBeenCalledWith(
        signInDto.email.toLowerCase(),
      );
    });

    it('should trigger lockout after max failures reached', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(false);
      mockPasswordLockoutStorage.recordFailure.mockResolvedValue({
        locked: true,
        remainingAttempts: 0,
        lockoutEndsAt: new Date(Date.now() + 900000),
      });

      await expect(service.signIn(signInDto)).rejects.toThrow(
        new UnauthorizedException('Too many failed attempts. Try again later.'),
      );
    });

    it('should normalize email to lowercase before lockout check', async () => {
      const upperCaseEmailDto = {
        ...signInDto,
        email: 'TEST@EXAMPLE.COM',
      };
      mockPasswordLockoutStorage.isLockedOut.mockResolvedValue(true);

      await expect(service.signIn(upperCaseEmailDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPasswordLockoutStorage.isLockedOut).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should trim whitespace from email before lockout check', async () => {
      const whitespaceEmailDto = {
        ...signInDto,
        email: '  test@example.com  ',
      };
      mockPasswordLockoutStorage.isLockedOut.mockResolvedValue(true);

      await expect(service.signIn(whitespaceEmailDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockPasswordLockoutStorage.isLockedOut).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should not record failure when password is valid', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

      await service.signIn(signInDto);

      expect(mockPasswordLockoutStorage.recordFailure).not.toHaveBeenCalled();
    });
  });

  describe('signIn - account status checks', () => {
    const signInDto: SignInDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should reject when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );

      expect(mockPasswordLockoutStorage.recordFailure).toHaveBeenCalledWith(
        signInDto.email.toLowerCase(),
      );
      expect(mockHashingService.compare).not.toHaveBeenCalled();
    });

    it('should reject when user is locked', async () => {
      const lockedUser = { ...mockUser, isLocked: true };
      mockUserRepository.findOne.mockResolvedValue(lockedUser);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );

      expect(mockPasswordLockoutStorage.recordFailure).toHaveBeenCalledWith(
        signInDto.email.toLowerCase(),
      );
      expect(mockHashingService.compare).not.toHaveBeenCalled();
    });

    it('should allow login when user is active and not locked', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

      const result = await service.signIn(signInDto);

      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('signIn - login tracking', () => {
    const signInDto: SignInDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should increment failedLoginAttempts on invalid password', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(false);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockUserRepository.increment).toHaveBeenCalledWith(
        { id: mockUser.id },
        'failedLoginAttempts',
        1,
      );
    });

    it('should reset failedLoginAttempts and update lastLoginAt on successful login', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

      await service.signIn(signInDto);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          failedLoginAttempts: 0,
          lastLoginAt: expect.any(Date) as unknown as Date,
        }),
      );
    });

    it('should update lastLoginAt on successful 2FA login', async () => {
      const userWith2FA = {
        ...mockUser,
        isTfaEnabled: true,
        tfaSecret: 'encrypted-secret',
      };
      const signInWith2FA = { ...signInDto, tfaCode: '123456' };

      mockUserRepository.findOne.mockResolvedValue(userWith2FA);
      mockHashingService.compare.mockResolvedValue(true);
      mockOtpService.isLockedOut.mockResolvedValue(false);
      mockOtpService.verifyCode.mockResolvedValue({ valid: true });
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

      await service.signIn(signInWith2FA);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          failedLoginAttempts: 0,
          lastLoginAt: expect.any(Date) as unknown as Date,
        }),
      );
    });
  });

  describe('disable2fa', () => {
    const disable2faDto = { code: '123456', password: 'Password123!' };

    it('should disable 2FA when password and code are valid', async () => {
      const userWith2FA = {
        ...mockUser,
        isTfaEnabled: true,
        tfaSecret: 'encrypted-secret',
      };

      mockUserRepository.findOneOrFail.mockResolvedValue(userWith2FA);
      mockHashingService.compare.mockResolvedValue(true);
      mockOtpService.verifyCode.mockResolvedValue({ valid: true });
      mockOtpService.disableTfa.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.getTrackedTokens.mockResolvedValue([]);
      mockAccessTokenBlacklist.clearTrackedTokens.mockResolvedValue(undefined);
      mockRefreshTokenStorage.invalidateAll.mockResolvedValue(undefined);

      await service.disable2fa(mockUser.id, disable2faDto);

      expect(mockOtpService.disableTfa).toHaveBeenCalledWith(mockUser.id);
    });

    it('should reject when 2FA is not enabled', async () => {
      mockUserRepository.findOneOrFail.mockResolvedValue(mockUser);

      await expect(
        service.disable2fa(mockUser.id, disable2faDto),
      ).rejects.toThrow(new UnauthorizedException('2FA is not enabled'));
    });

    it('should reject when password is invalid', async () => {
      const userWith2FA = {
        ...mockUser,
        isTfaEnabled: true,
        tfaSecret: 'encrypted-secret',
      };

      mockUserRepository.findOneOrFail.mockResolvedValue(userWith2FA);
      mockHashingService.compare.mockResolvedValue(false);

      await expect(
        service.disable2fa(mockUser.id, disable2faDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid password'));
    });

    it('should reject when OTP code is invalid', async () => {
      const userWith2FA = {
        ...mockUser,
        isTfaEnabled: true,
        tfaSecret: 'encrypted-secret',
      };

      mockUserRepository.findOneOrFail.mockResolvedValue(userWith2FA);
      mockHashingService.compare.mockResolvedValue(true);
      mockOtpService.verifyCode.mockResolvedValue({ valid: false });

      await expect(
        service.disable2fa(mockUser.id, disable2faDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid OTP code'));
    });
  });

  describe('signOut', () => {
    const activeUser: ActiveUserData = {
      sub: mockUser.id,
      jti: 'access-token-jti',
      refreshTokenId: 'refresh-token-id',
      email: mockUser.email,
      roleId: 1,
      roleName: 'user',
    };

    it('should blacklist access token and invalidate refresh token', async () => {
      mockAccessTokenBlacklist.blacklist.mockResolvedValue(undefined);
      mockRefreshTokenStorage.invalidate.mockResolvedValue(undefined);

      await service.signOut(activeUser);

      expect(mockAccessTokenBlacklist.blacklist).toHaveBeenCalledWith(
        activeUser.jti,
        activeUser.sub,
        mockJwtConfig.accessTokenTtl,
      );
      expect(mockRefreshTokenStorage.invalidate).toHaveBeenCalledWith(
        activeUser.sub,
        activeUser.refreshTokenId,
      );
    });
  });

  describe('signOutAll', () => {
    it('should blacklist all tokens and invalidate all refresh tokens', async () => {
      const trackedTokens = ['jti-1', 'jti-2', 'jti-3'];
      mockAccessTokenBlacklist.getTrackedTokens.mockResolvedValue(
        trackedTokens,
      );
      mockAccessTokenBlacklist.blacklistAllForUser.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.clearTrackedTokens.mockResolvedValue(undefined);
      mockRefreshTokenStorage.invalidateAll.mockResolvedValue(undefined);

      await service.signOutAll(mockUser.id);

      expect(mockAccessTokenBlacklist.getTrackedTokens).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(mockAccessTokenBlacklist.blacklistAllForUser).toHaveBeenCalledWith(
        mockUser.id,
        trackedTokens,
        mockJwtConfig.accessTokenTtl,
      );
      expect(mockAccessTokenBlacklist.clearTrackedTokens).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(mockRefreshTokenStorage.invalidateAll).toHaveBeenCalledWith(
        mockUser.id,
      );
    });

    it('should handle case with no active sessions', async () => {
      mockAccessTokenBlacklist.getTrackedTokens.mockResolvedValue([]);
      mockAccessTokenBlacklist.clearTrackedTokens.mockResolvedValue(undefined);
      mockRefreshTokenStorage.invalidateAll.mockResolvedValue(undefined);

      await service.signOutAll(mockUser.id);

      expect(
        mockAccessTokenBlacklist.blacklistAllForUser,
      ).not.toHaveBeenCalled();
      expect(mockRefreshTokenStorage.invalidateAll).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });

  describe('refreshTokens', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    const mockPayload = {
      sub: mockUser.id,
      refreshTokenId: 'refresh-token-id',
    };

    it('should return new tokens on valid refresh token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockUserRepository.findOneByOrFail.mockResolvedValue(mockUser);
      mockRefreshTokenStorage.validate.mockResolvedValue(true);
      mockRefreshTokenStorage.invalidate.mockResolvedValue(undefined);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

      const result = await service.refreshTokens(refreshTokenDto);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
        expect.objectContaining({
          secret: mockJwtConfig.secret,
          audience: mockJwtConfig.audience,
          issuer: mockJwtConfig.issuer,
        }),
      );
      expect(mockRefreshTokenStorage.invalidate).toHaveBeenCalledWith(
        mockUser.id,
        mockPayload.refreshTokenId,
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException on invalid refresh token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle token theft detection and invalidate all sessions', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockUserRepository.findOneByOrFail.mockResolvedValue(mockUser);
      mockRefreshTokenStorage.validate.mockRejectedValue(
        new InvalidatedRefreshTokenError(),
      );
      mockAccessTokenBlacklist.getTrackedTokens.mockResolvedValue([
        'jti-1',
        'jti-2',
      ]);
      mockAccessTokenBlacklist.blacklistAllForUser.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.clearTrackedTokens.mockResolvedValue(undefined);
      mockRefreshTokenStorage.invalidateAll.mockResolvedValue(undefined);

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockAccessTokenBlacklist.getTrackedTokens).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(mockAccessTokenBlacklist.blacklistAllForUser).toHaveBeenCalled();
      expect(mockRefreshTokenStorage.invalidateAll).toHaveBeenCalledWith(
        mockUser.id,
      );
    });

    it('should reject refresh for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockUserRepository.findOneByOrFail.mockResolvedValue(inactiveUser);

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );

      // Should not attempt to validate or generate new tokens
      expect(mockRefreshTokenStorage.validate).not.toHaveBeenCalled();
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should reject refresh for locked user', async () => {
      const lockedUser = { ...mockUser, isLocked: true };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockUserRepository.findOneByOrFail.mockResolvedValue(lockedUser);

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );

      // Should not attempt to validate or generate new tokens
      expect(mockRefreshTokenStorage.validate).not.toHaveBeenCalled();
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const changePasswordDto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    };

    beforeEach(() => {
      mockUserRepository.findOne = jest.fn();
    });

    it('should change password successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare
        .mockResolvedValueOnce(true) // current password valid
        .mockResolvedValueOnce(false); // new password is different
      mockHashingService.hash.mockResolvedValue('new-hashed-password');
      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      mockPasswordLockoutStorage.clearFailures.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.getTrackedTokens.mockResolvedValue([]);
      mockAccessTokenBlacklist.clearTrackedTokens.mockResolvedValue(undefined);
      mockRefreshTokenStorage.invalidateAll.mockResolvedValue(undefined);

      await service.changePassword(mockUser.id, changePasswordDto);

      expect(mockHashingService.compare).toHaveBeenCalledWith(
        changePasswordDto.currentPassword,
        mockUser.password,
      );
      expect(mockHashingService.hash).toHaveBeenCalledWith(
        changePasswordDto.newPassword,
      );
      expect(mockUserRepository.update).toHaveBeenCalledWith(mockUser.id, {
        password: 'new-hashed-password',
      });
      expect(mockPasswordLockoutStorage.clearFailures).toHaveBeenCalledWith(
        mockUser.email,
      );
    });

    it('should reject when current password is incorrect', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(false);

      await expect(
        service.changePassword(mockUser.id, changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject when new password and confirmation do not match', async () => {
      const mismatchDto = {
        ...changePasswordDto,
        confirmPassword: 'DifferentPassword123!',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare.mockResolvedValue(true);

      await expect(
        service.changePassword(mockUser.id, mismatchDto),
      ).rejects.toThrow('New password and confirmation do not match');
    });

    it('should reject when new password is same as current', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare
        .mockResolvedValueOnce(true) // current password valid
        .mockResolvedValueOnce(true); // new password is same as current

      await expect(
        service.changePassword(mockUser.id, changePasswordDto),
      ).rejects.toThrow('New password must be different from current password');
    });

    it('should invalidate all sessions after password change', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockHashingService.compare
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      mockHashingService.hash.mockResolvedValue('new-hashed-password');
      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      mockPasswordLockoutStorage.clearFailures.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.getTrackedTokens.mockResolvedValue(['jti-1']);
      mockAccessTokenBlacklist.blacklistAllForUser.mockResolvedValue(undefined);
      mockAccessTokenBlacklist.clearTrackedTokens.mockResolvedValue(undefined);
      mockRefreshTokenStorage.invalidateAll.mockResolvedValue(undefined);

      await service.changePassword(mockUser.id, changePasswordDto);

      expect(mockRefreshTokenStorage.invalidateAll).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });

  describe('session timeout integration', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    const mockPayload = {
      sub: mockUser.id,
      refreshTokenId: 'refresh-token-id',
    };

    const activeUser: ActiveUserData = {
      sub: mockUser.id,
      jti: 'access-token-jti',
      refreshTokenId: 'refresh-token-id',
      email: mockUser.email,
      roleId: 1,
      roleName: 'user',
    };

    describe('generateTokens', () => {
      beforeEach(() => {
        mockJwtService.signAsync
          .mockResolvedValueOnce(mockTokens.accessToken)
          .mockResolvedValueOnce(mockTokens.refreshToken);
        mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
        mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);
      });

      it('should create a session when generating tokens', async () => {
        await service.generateTokens(mockUser);

        expect(mockSessionTimeoutStorage.createSession).toHaveBeenCalledWith(
          mockUser.id,
          expect.any(String),
          undefined,
        );
      });

      it('should pass inherited createdAt to createSession', async () => {
        const inheritedCreatedAt = Date.now() - 60000;

        await service.generateTokens(mockUser, inheritedCreatedAt);

        expect(mockSessionTimeoutStorage.createSession).toHaveBeenCalledWith(
          mockUser.id,
          expect.any(String),
          inheritedCreatedAt,
        );
      });

      it('should return sessionExpiresAt and idleTimeoutSeconds', async () => {
        const result = await service.generateTokens(mockUser);

        expect(result).toHaveProperty('sessionExpiresAt');
        expect(result).toHaveProperty('idleTimeoutSeconds', 1800);
        expect(typeof result.sessionExpiresAt).toBe('string');
      });
    });

    describe('refreshTokens - session validation', () => {
      it('should validate session timeout during token refresh', async () => {
        mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
        mockUserRepository.findOneByOrFail.mockResolvedValue(mockUser);
        mockRefreshTokenStorage.validate.mockResolvedValue(true);
        mockRefreshTokenStorage.invalidate.mockResolvedValue(undefined);
        mockJwtService.signAsync
          .mockResolvedValueOnce(mockTokens.accessToken)
          .mockResolvedValueOnce(mockTokens.refreshToken);
        mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
        mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

        await service.refreshTokens(refreshTokenDto);

        expect(
          mockSessionTimeoutStorage.validateSession,
        ).toHaveBeenCalledWith(mockUser.id, mockPayload.refreshTokenId);
      });

      it('should carry over session createdAt on refresh', async () => {
        const createdAt = Date.now() - 60000;
        mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
        mockUserRepository.findOneByOrFail.mockResolvedValue(mockUser);
        mockRefreshTokenStorage.validate.mockResolvedValue(true);
        mockRefreshTokenStorage.invalidate.mockResolvedValue(undefined);
        mockSessionTimeoutStorage.getSessionCreatedAt.mockResolvedValue(
          createdAt,
        );
        mockJwtService.signAsync
          .mockResolvedValueOnce(mockTokens.accessToken)
          .mockResolvedValueOnce(mockTokens.refreshToken);
        mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
        mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

        await service.refreshTokens(refreshTokenDto);

        expect(
          mockSessionTimeoutStorage.getSessionCreatedAt,
        ).toHaveBeenCalledWith(mockUser.id, mockPayload.refreshTokenId);
        expect(mockSessionTimeoutStorage.createSession).toHaveBeenCalledWith(
          mockUser.id,
          expect.any(String),
          createdAt,
        );
      });

      it('should delete old session metadata on refresh', async () => {
        mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
        mockUserRepository.findOneByOrFail.mockResolvedValue(mockUser);
        mockRefreshTokenStorage.validate.mockResolvedValue(true);
        mockRefreshTokenStorage.invalidate.mockResolvedValue(undefined);
        mockJwtService.signAsync
          .mockResolvedValueOnce(mockTokens.accessToken)
          .mockResolvedValueOnce(mockTokens.refreshToken);
        mockRefreshTokenStorage.insert.mockResolvedValue(undefined);
        mockAccessTokenBlacklist.trackToken.mockResolvedValue(undefined);

        await service.refreshTokens(refreshTokenDto);

        expect(mockSessionTimeoutStorage.deleteSession).toHaveBeenCalledWith(
          mockUser.id,
          mockPayload.refreshTokenId,
        );
      });

      it('should throw UnauthorizedException on session timeout and clean up', async () => {
        mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
        mockUserRepository.findOneByOrFail.mockResolvedValue(mockUser);
        mockRefreshTokenStorage.validate.mockResolvedValue(true);
        mockSessionTimeoutStorage.validateSession.mockRejectedValue(
          new SessionExpiredError('Session idle timeout exceeded'),
        );

        await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
          UnauthorizedException,
        );

        expect(mockRefreshTokenStorage.invalidate).toHaveBeenCalledWith(
          mockUser.id,
          mockPayload.refreshTokenId,
        );
        expect(mockSessionTimeoutStorage.deleteSession).toHaveBeenCalledWith(
          mockUser.id,
          mockPayload.refreshTokenId,
        );
      });
    });

    describe('signOut - session cleanup', () => {
      it('should delete session metadata on sign out', async () => {
        mockAccessTokenBlacklist.blacklist.mockResolvedValue(undefined);
        mockRefreshTokenStorage.invalidate.mockResolvedValue(undefined);

        await service.signOut(activeUser);

        expect(mockSessionTimeoutStorage.deleteSession).toHaveBeenCalledWith(
          activeUser.sub,
          activeUser.refreshTokenId,
        );
      });
    });

    describe('signOutAll - session cleanup', () => {
      it('should delete all session metadata on sign out all', async () => {
        mockAccessTokenBlacklist.getTrackedTokens.mockResolvedValue([]);
        mockAccessTokenBlacklist.clearTrackedTokens.mockResolvedValue(
          undefined,
        );
        mockRefreshTokenStorage.invalidateAll.mockResolvedValue(undefined);

        await service.signOutAll(mockUser.id);

        expect(
          mockSessionTimeoutStorage.deleteAllSessions,
        ).toHaveBeenCalledWith(mockUser.id);
      });
    });
  });
});
