import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { User } from 'src/modules/users/entities/user.entity';
import { MailService } from 'src/modules/mail';
import { HashingService } from '../hashing/hashing.service';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { ChangePasswordDto } from 'src/modules/users/dto/change-password.dto';
import jwtConfig, { JwtConfig } from '../config/jwt.config';
import {
  InvalidatedRefreshTokenError,
  SessionExpiredError,
} from 'src/shared/errors';
import { maskEmail } from 'src/shared/utils';
import { ActiveUserData, RefreshTokenPayload } from '../interfaces';
import { RefreshTokenIdsStorage } from './refresh-token-ids.storage/refresh-token-ids.storage';
import { AccessTokenBlacklistStorage } from './access-token-blacklist/access-token-blacklist.storage';
import { RolesService } from '../authorization/services/roles.service';
import { OtpAuthenticationService } from './otp/otp-authentication.service';
import { PasswordLockoutStorage } from './password-lockout';
import { SessionTimeoutStorage } from './session-timeout';
import sessionTimeoutConfig, {
  SessionTimeoutConfig,
} from './session-timeout/session-timeout.config';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: JwtConfig,
    private readonly refreshTokenIdsStorage: RefreshTokenIdsStorage,
    private readonly accessTokenBlacklist: AccessTokenBlacklistStorage,
    private readonly rolesService: RolesService,
    private readonly otpAuthenticationService: OtpAuthenticationService,
    private readonly passwordLockoutStorage: PasswordLockoutStorage,
    private readonly mailService: MailService,
    private readonly sessionTimeoutStorage: SessionTimeoutStorage,
    @Inject(sessionTimeoutConfig.KEY)
    private readonly sessionTimeoutConfig: SessionTimeoutConfig,
  ) {}

  async signIn(signInDto: SignInDto) {
    const email = signInDto.email.toLowerCase().trim();

    // Check password lockout BEFORE any database or password operations
    // This prevents timing attacks and reduces load during brute force attempts
    if (await this.passwordLockoutStorage.isLockedOut(email)) {
      this.logger.warn({
        event: 'SIGN_IN_BLOCKED_BY_LOCKOUT',
        email: maskEmail(email),
      });
      throw new UnauthorizedException(
        'Too many failed attempts. Try again later.',
      );
    }

    const user = await this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'isActive',
        'isLocked',
        'isTfaEnabled',
        'tfaSecret',
        'failedLoginAttempts',
      ],
      relations: ['role'],
    });

    if (!user) {
      await this.passwordLockoutStorage.recordFailure(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive || user.isLocked) {
      this.logger.warn({
        event: user.isLocked
          ? 'SIGN_IN_ACCOUNT_LOCKED'
          : 'SIGN_IN_ACCOUNT_INACTIVE',
        userId: user.id,
      });
      await this.passwordLockoutStorage.recordFailure(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      await this.passwordLockoutStorage.recordFailure(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isEqual = await this.hashingService.compare(
      signInDto.password,
      user.password,
    );

    if (!isEqual) {
      await this.recordLoginFailure(user.id, email);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isTfaEnabled) {
      const isOtpLockedOut = await this.otpAuthenticationService.isLockedOut(
        user.id,
      );
      if (isOtpLockedOut) {
        throw new UnauthorizedException(
          'Too many failed attempts. Try again later.',
        );
      }

      if (signInDto.recoveryCode) {
        const isValidRecovery =
          await this.otpAuthenticationService.verifyRecoveryCode(
            user.id,
            signInDto.recoveryCode,
          );
        if (!isValidRecovery) {
          throw new UnauthorizedException('Invalid recovery code');
        }
        await this.recordLoginSuccess(user.id, email);
        return await this.generateTokens(user);
      }

      if (!signInDto.tfaCode) {
        throw new UnauthorizedException('OTP code is required');
      }

      const result = await this.otpAuthenticationService.verifyCode(
        user.id,
        user.tfaSecret!,
        signInDto.tfaCode,
      );

      if (result.lockedOut) {
        throw new UnauthorizedException(
          'Too many failed attempts. Try again later.',
        );
      }

      if (!result.valid) {
        throw new UnauthorizedException('Invalid OTP code');
      }
    }

    await this.recordLoginSuccess(user.id, email);
    return await this.generateTokens(user);
  }

  private async recordLoginFailure(
    userId: string,
    email: string,
  ): Promise<void> {
    const { locked } = await this.passwordLockoutStorage.recordFailure(email);

    await this.userRepository.increment(
      { id: userId },
      'failedLoginAttempts',
      1,
    );

    if (locked) {
      this.logger.warn({
        event: 'ACCOUNT_LOCKED_BY_PASSWORD_FAILURES',
        userId,
      });

      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'email', 'firstName'],
      });

      if (user) {
        await this.mailService.sendAccountLocked(user.email, {
          firstName: user.firstName ?? undefined,
          email: user.email,
          lockReason: 'Too many failed login attempts',
        });
      }

      throw new UnauthorizedException(
        'Too many failed attempts. Try again later.',
      );
    }
  }

  private async recordLoginSuccess(
    userId: string,
    email: string,
  ): Promise<void> {
    await Promise.all([
      this.passwordLockoutStorage.clearFailures(email),
      this.userRepository.update(userId, {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
      }),
    ]);
  }

  async disable2fa(userId: string, dto: Disable2faDto): Promise<void> {
    const user = await this.userRepository.findOneOrFail({
      where: { id: userId },
      select: ['id', 'password', 'tfaSecret', 'isTfaEnabled'],
    });

    if (!user.isTfaEnabled) {
      throw new UnauthorizedException('2FA is not enabled');
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid password');
    }

    const isPasswordValid = await this.hashingService.compare(
      dto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const result = await this.otpAuthenticationService.verifyCode(
      userId,
      user.tfaSecret!,
      dto.code,
    );

    if (!result.valid) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    await this.otpAuthenticationService.disableTfa(userId);
    await this.signOutAll(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'password'],
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isCurrentPasswordValid = await this.hashingService.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      this.logger.warn({
        event: 'PASSWORD_CHANGE_INVALID_CURRENT_PASSWORD',
        userId: user.id,
      });
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException(
        'New password and confirmation do not match',
      );
    }

    const isSamePassword = await this.hashingService.compare(
      dto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedPassword = await this.hashingService.hash(dto.newPassword);
    await this.userRepository.update(userId, { password: hashedPassword });

    await this.passwordLockoutStorage.clearFailures(user.email);

    await this.signOutAll(userId);

    this.logger.log({
      event: 'PASSWORD_CHANGED_SUCCESSFULLY',
      userId: user.id,
    });
  }

  async signOut(activeUser: ActiveUserData): Promise<void> {
    const { sub: userId, jti: accessTokenId, refreshTokenId } = activeUser;

    await Promise.all([
      this.accessTokenBlacklist.blacklist(
        accessTokenId,
        userId,
        this.jwtConfiguration.accessTokenTtl,
      ),
      this.refreshTokenIdsStorage.invalidate(userId, refreshTokenId),
      this.sessionTimeoutStorage.deleteSession(userId, refreshTokenId),
    ]);
  }

  async signOutAll(userId: string): Promise<void> {
    const trackedTokens =
      await this.accessTokenBlacklist.getTrackedTokens(userId);

    if (trackedTokens.length > 0) {
      await this.accessTokenBlacklist.blacklistAllForUser(
        userId,
        trackedTokens,
        this.jwtConfiguration.accessTokenTtl,
      );
    }

    await this.accessTokenBlacklist.clearTrackedTokens(userId);
    await this.refreshTokenIdsStorage.invalidateAll(userId);
    await this.sessionTimeoutStorage.deleteAllSessions(userId);
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    let userId: string | undefined;
    let refreshTokenId: string | undefined;

    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshTokenDto.refreshToken,
        {
          secret: this.jwtConfiguration.secret,
          audience: this.jwtConfiguration.audience,
          issuer: this.jwtConfiguration.issuer,
          algorithms: [this.jwtConfiguration.algorithm],
        },
      );

      userId = payload.sub;
      refreshTokenId = payload.refreshTokenId;

      const user = await this.userRepository.findOneByOrFail({ id: userId });

      // Prevent token refresh for deactivated or locked accounts
      // This ensures admin actions take immediate effect
      if (!user.isActive || user.isLocked) {
        this.logger.warn({
          event: 'REFRESH_TOKEN_BLOCKED_INACTIVE_ACCOUNT',
          userId: user.id,
          isActive: user.isActive,
          isLocked: user.isLocked,
        });
        throw new UnauthorizedException();
      }

      await this.refreshTokenIdsStorage.validate(user.id, refreshTokenId);
      await this.sessionTimeoutStorage.validateSession(user.id, refreshTokenId);

      const sessionCreatedAt =
        await this.sessionTimeoutStorage.getSessionCreatedAt(
          user.id,
          refreshTokenId,
        );

      await this.refreshTokenIdsStorage.invalidate(user.id, refreshTokenId);
      await this.sessionTimeoutStorage.deleteSession(user.id, refreshTokenId);

      return this.generateTokens(user, sessionCreatedAt);
    } catch (err) {
      if (err instanceof SessionExpiredError && userId && refreshTokenId) {
        await this.refreshTokenIdsStorage.invalidate(userId, refreshTokenId);
        await this.sessionTimeoutStorage.deleteSession(userId, refreshTokenId);
      }
      if (err instanceof InvalidatedRefreshTokenError && userId) {
        await this.handleRefreshTokenTheft(userId);
      }
      throw new UnauthorizedException();
    }
  }

  async generateTokens(user: User, sessionCreatedAt?: number) {
    const refreshTokenId = randomUUID();
    const accessTokenId = randomUUID();

    const { role } = user;

    const [accessToken, refreshToken] = await Promise.all([
      this.signToken<Omit<ActiveUserData, 'sub'>>(
        user.id,
        this.jwtConfiguration.accessTokenTtl,
        {
          jti: accessTokenId,
          refreshTokenId,
          email: user.email,
          roleId: role?.id ?? null,
          roleName: role?.name ?? null,
        },
      ),
      this.signToken<Omit<RefreshTokenPayload, 'sub'>>(
        user.id,
        this.jwtConfiguration.refreshTokenTtl,
        { refreshTokenId },
      ),
    ]);

    await Promise.all([
      this.refreshTokenIdsStorage.insert(user.id, refreshTokenId),
      this.accessTokenBlacklist.trackToken(
        user.id,
        accessTokenId,
        this.jwtConfiguration.accessTokenTtl,
      ),
      this.sessionTimeoutStorage.createSession(
        user.id,
        refreshTokenId,
        sessionCreatedAt,
      ),
    ]);

    const now = Date.now();
    const createdAt = sessionCreatedAt ?? now;
    const absoluteRemainingMs =
      this.sessionTimeoutConfig.absoluteTimeoutSeconds * 1000 -
      (now - createdAt);

    return {
      accessToken,
      refreshToken,
      sessionExpiresAt: new Date(
        now +
          Math.min(
            absoluteRemainingMs,
            this.sessionTimeoutConfig.absoluteTimeoutSeconds * 1000,
          ),
      ).toISOString(),
      idleTimeoutSeconds: this.sessionTimeoutConfig.idleTimeoutSeconds,
    };
  }

  private async handleRefreshTokenTheft(userId: string): Promise<never> {
    let blacklistedCount = 0;

    try {
      const trackedTokens =
        await this.accessTokenBlacklist.getTrackedTokens(userId);

      if (trackedTokens.length > 0) {
        await this.accessTokenBlacklist.blacklistAllForUser(
          userId,
          trackedTokens,
          this.jwtConfiguration.accessTokenTtl,
        );
        blacklistedCount = trackedTokens.length;
      }

      await this.accessTokenBlacklist.clearTrackedTokens(userId);
      await this.refreshTokenIdsStorage.invalidateAll(userId);
    } catch (error) {
      this.logger.error(
        `Failed to invalidate sessions for user ${userId} during theft response`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    this.logger.warn(
      `Security Alert: Refresh token reuse detected for user ${userId}. ` +
        `Blacklisted ${blacklistedCount} access token(s). Possible token theft.`,
    );

    throw new UnauthorizedException('Access denied');
  }

  private async signToken<T>(userId: string, expiresIn: number, payload?: T) {
    const { algorithm, audience, issuer, secret } = this.jwtConfiguration;

    return await this.jwtService.signAsync(
      {
        sub: userId,
        ...payload,
      },
      {
        algorithm,
        audience,
        issuer,
        secret,
        expiresIn,
      },
    );
  }
}
