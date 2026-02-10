import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { OtpAuthenticationService } from './otp/otp-authentication.service';
import { UsersService } from 'src/modules/users/users.service';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Verify2faSetupDto } from './dto/verify-2fa-setup.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { UpdateProfileDto } from 'src/modules/users/dto/update-profile.dto';
import { ChangePasswordDto } from 'src/modules/users/dto/change-password.dto';
import { User } from 'src/modules/users/entities/user.entity';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let authService: jest.Mocked<AuthenticationService>;
  let otpService: jest.Mocked<OtpAuthenticationService>;
  let usersService: jest.Mocked<UsersService>;

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    sessionExpiresAt: new Date(Date.now() + 43200000).toISOString(),
    idleTimeoutSeconds: 1800,
  };

  const mockActiveUser = {
    sub: 'user-uuid-123',
    email: 'test@example.com',
    jti: 'access-token-jti',
    refreshTokenId: 'refresh-token-id',
    roleId: 1,
    roleName: 'user',
  };

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    const mockAuthService = {
      signIn: jest.fn(),
      signOut: jest.fn(),
      signOutAll: jest.fn(),
      refreshTokens: jest.fn(),
      disable2fa: jest.fn(),
      changePassword: jest.fn(),
    };

    const mockOtpAuthService = {
      initiateTfaSetup: jest.fn(),
      verifyAndEnableTfa: jest.fn(),
      regenerateRecoveryCodes: jest.fn(),
    };

    const mockUsersService = {
      updateProfile: jest.fn(),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        { provide: AuthenticationService, useValue: mockAuthService },
        { provide: OtpAuthenticationService, useValue: mockOtpAuthService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
    authService = module.get(AuthenticationService);
    otpService = module.get(OtpAuthenticationService);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should return tokens on successful sign in', async () => {
      const signInDto: SignInDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      authService.signIn.mockResolvedValue(mockTokens);

      const result = await controller.signIn(signInDto);

      expect(authService.signIn).toHaveBeenCalledWith(signInDto);
      expect(result).toEqual(mockTokens);
    });
  });

  describe('signOut', () => {
    it('should call signOut service method', async () => {
      authService.signOut.mockResolvedValue(undefined);

      await controller.signOut(mockActiveUser);

      expect(authService.signOut).toHaveBeenCalledWith(mockActiveUser);
    });
  });

  describe('signOutAll', () => {
    it('should call signOutAll service method', async () => {
      authService.signOutAll.mockResolvedValue(undefined);

      await controller.signOutAll(mockActiveUser);

      expect(authService.signOutAll).toHaveBeenCalledWith(mockActiveUser.sub);
    });
  });

  describe('setup2fa', () => {
    it('should return QR code and recovery codes', async () => {
      const mockSetupResult = {
        uri: 'otpauth://totp/TestApp:test@example.com?secret=ABC123',
        qrCode: 'data:image/png;base64,mockQrCodeData',
        recoveryCodes: ['ABCD1234', 'EFGH5678'],
      };

      otpService.initiateTfaSetup.mockResolvedValue(mockSetupResult);

      const result = await controller.setup2fa(mockActiveUser);

      expect(otpService.initiateTfaSetup).toHaveBeenCalledWith(
        mockActiveUser.sub,
        mockActiveUser.email,
      );
      expect(result).toEqual({
        otpauthUrl: mockSetupResult.uri,
        qrCode: mockSetupResult.qrCode,
        recoveryCodes: mockSetupResult.recoveryCodes,
        message: 'Scan QR code with authenticator app, then verify with a code',
      });
    });
  });

  describe('verify2faSetup', () => {
    const verifyDto: Verify2faSetupDto = { code: '123456' };

    it('should return success message when code is valid', async () => {
      otpService.verifyAndEnableTfa.mockResolvedValue(undefined);

      const result = await controller.verify2faSetup(mockActiveUser, verifyDto);

      expect(otpService.verifyAndEnableTfa).toHaveBeenCalledWith(
        mockActiveUser.sub,
        verifyDto.code,
      );
      expect(result).toEqual({ message: '2FA enabled successfully' });
    });

    it('should throw UnauthorizedException when code is invalid', async () => {
      otpService.verifyAndEnableTfa.mockRejectedValue(
        new UnauthorizedException('Invalid verification code or setup expired'),
      );

      await expect(
        controller.verify2faSetup(mockActiveUser, verifyDto),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('disable2fa', () => {
    const disableDto: Disable2faDto = {
      code: '123456',
      password: 'Password123!',
    };

    it('should return success message when disabled', async () => {
      authService.disable2fa.mockResolvedValue(undefined);

      const result = await controller.disable2fa(mockActiveUser, disableDto);

      expect(authService.disable2fa).toHaveBeenCalledWith(
        mockActiveUser.sub,
        disableDto,
      );
      expect(result).toEqual({ message: '2FA disabled successfully' });
    });
  });

  describe('regenerateRecoveryCodes', () => {
    it('should return new recovery codes', async () => {
      const mockCodes = ['ABCD1234', 'EFGH5678'];
      otpService.regenerateRecoveryCodes.mockResolvedValue(mockCodes);

      const result = await controller.regenerateRecoveryCodes(mockActiveUser);

      expect(otpService.regenerateRecoveryCodes).toHaveBeenCalledWith(
        mockActiveUser.sub,
      );
      expect(result).toEqual({ recoveryCodes: mockCodes });
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens on successful refresh', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      authService.refreshTokens.mockResolvedValue(mockTokens);

      const result = await controller.refreshTokens(refreshTokenDto);

      expect(authService.refreshTokens).toHaveBeenCalledWith(refreshTokenDto);
      expect(result).toEqual(mockTokens);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile and return updated data', async () => {
      const updateDto: UpdateProfileDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      usersService.updateProfile.mockResolvedValue({
        ...mockUser,
        firstName: updateDto.firstName,
        lastName: updateDto.lastName,
      } as User);

      const result = await controller.updateProfile(mockActiveUser, updateDto);

      expect(usersService.updateProfile).toHaveBeenCalledWith(
        mockActiveUser.sub,
        updateDto,
      );
      expect(result).toHaveProperty('firstName', 'Updated');
      expect(result).toHaveProperty('lastName', 'Name');
    });
  });

  describe('changePassword', () => {
    it('should change password and return success message', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      };

      authService.changePassword.mockResolvedValue(undefined);

      const result = await controller.changePassword(
        mockActiveUser,
        changePasswordDto,
      );

      expect(authService.changePassword).toHaveBeenCalledWith(
        mockActiveUser.sub,
        changePasswordDto,
      );
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Password changed successfully');
    });
  });
});
