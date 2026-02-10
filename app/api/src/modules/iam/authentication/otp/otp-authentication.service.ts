import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { randomBytes } from 'crypto';
import { toDataURL } from 'qrcode';
import { User } from 'src/modules/users/entities/user.entity';
import { EncryptionService } from 'src/shared/crypto';
import { RedisService } from 'src/shared/redis';
import { MailService } from 'src/modules/mail';
import { Repository } from 'typeorm';
import otpConfig, { OtpConfig } from './otp.config';
import { HashingService } from '../../hashing/hashing.service';

export interface OtpVerificationResult {
  valid: boolean;
  lockedOut?: boolean;
  remainingAttempts?: number;
}

export interface TfaSetupResult {
  uri: string;
  qrCode: string;
  recoveryCodes: string[];
}

@Injectable()
export class OtpAuthenticationService {
  private readonly logger = new Logger(OtpAuthenticationService.name);
  private readonly USED_OTP_PREFIX = 'otp:used:';
  private readonly PENDING_SECRET_PREFIX = 'otp:pending:';
  private readonly FAILURE_PREFIX = 'otp:failures:';

  constructor(
    @Inject(otpConfig.KEY)
    private readonly config: OtpConfig,
    private readonly encryptionService: EncryptionService,
    private readonly redisService: RedisService,
    private readonly hashingService: HashingService,
    private readonly mailService: MailService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  generateTotpSecret(email: string): { uri: string; secret: string } {
    const secret = generateSecret();
    const uri = generateURI({
      issuer: this.config.appName,
      label: email,
      secret,
    });
    return { uri, secret };
  }

  async initiateTfaSetup(
    userId: string,
    email: string,
  ): Promise<TfaSetupResult> {
    const { uri, secret } = this.generateTotpSecret(email);
    const recoveryCodes = this.generateRecoveryCodes();
    const qrCode = await toDataURL(uri);

    const pendingKey = `${this.PENDING_SECRET_PREFIX}${userId}`;
    const pendingData = JSON.stringify({ secret, recoveryCodes });
    await this.redisService.set(
      pendingKey,
      this.encryptionService.encrypt(pendingData),
      this.config.pendingSecretTtlSeconds,
    );

    this.logger.log({
      event: 'TFA_SETUP_INITIATED',
      userId,
    });

    return { uri, qrCode, recoveryCodes };
  }

  async verifyAndEnableTfa(userId: string, code: string): Promise<void> {
    const pendingKey = `${this.PENDING_SECRET_PREFIX}${userId}`;
    const encryptedData = await this.redisService.get(pendingKey);

    if (!encryptedData) {
      this.logger.warn({
        event: 'TFA_SETUP_EXPIRED',
        userId,
      });
      throw new UnauthorizedException(
        'Invalid verification code or setup expired',
      );
    }

    const { secret, recoveryCodes } = JSON.parse(
      this.encryptionService.decrypt(encryptedData),
    ) as { secret: string; recoveryCodes: string[] };

    const result = verifySync({
      secret,
      token: code,
      epochTolerance: this.config.epochTolerance,
    });

    if (!result.valid) {
      this.logger.warn({
        event: 'TFA_SETUP_VERIFICATION_FAILED',
        userId,
      });
      throw new UnauthorizedException(
        'Invalid verification code or setup expired',
      );
    }

    const hashedRecoveryCodes = await Promise.all(
      recoveryCodes.map((c) => this.hashingService.hash(c)),
    );

    await this.userRepository.update(userId, {
      tfaSecret: this.encryptionService.encrypt(secret),
      tfaRecoveryCodes: hashedRecoveryCodes,
      isTfaEnabled: true,
    });

    await this.redisService.del(pendingKey);

    this.logger.log({
      event: 'TFA_ENABLED',
      userId,
    });

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName'],
    });

    if (user) {
      await this.mailService.sendTfaEnabled(user.email, {
        firstName: user.firstName ?? undefined,
      });
    }
  }

  async verifyCode(
    userId: string,
    encryptedSecret: string,
    code: string,
  ): Promise<OtpVerificationResult> {
    const failureKey = `${this.FAILURE_PREFIX}${userId}`;
    const failures = parseInt(
      (await this.redisService.get(failureKey)) || '0',
      10,
    );

    if (failures >= this.config.maxFailures) {
      this.logger.warn({
        event: 'OTP_VERIFICATION_LOCKED_OUT',
        userId,
      });
      return { valid: false, lockedOut: true, remainingAttempts: 0 };
    }

    const secret = this.encryptionService.decrypt(encryptedSecret);
    const result = verifySync({
      secret,
      token: code,
      epochTolerance: this.config.epochTolerance,
    });

    if (!result.valid) {
      await this.recordFailure(userId, failureKey, failures);
      return {
        valid: false,
        lockedOut: false,
        remainingAttempts: this.config.maxFailures - failures - 1,
      };
    }

    const usedKey = `${this.USED_OTP_PREFIX}${userId}:${code}`;
    const alreadyUsed = await this.redisService.get(usedKey);

    if (alreadyUsed) {
      this.logger.warn({
        event: 'OTP_REPLAY_ATTACK_DETECTED',
        userId,
      });
      return { valid: false, lockedOut: false };
    }

    await this.redisService.set(
      usedKey,
      '1',
      this.config.codeWindowSeconds * 2,
    );

    await this.redisService.del(failureKey);

    this.logger.log({
      event: 'OTP_VERIFICATION_SUCCESS',
      userId,
    });

    return { valid: true };
  }

  async verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'tfaRecoveryCodes'],
    });

    if (!user?.tfaRecoveryCodes?.length) {
      return false;
    }

    for (let i = 0; i < user.tfaRecoveryCodes.length; i++) {
      const isMatch = await this.hashingService.compare(
        code.toUpperCase(),
        user.tfaRecoveryCodes[i],
      );

      if (isMatch) {
        const updatedCodes = [...user.tfaRecoveryCodes];
        updatedCodes.splice(i, 1);

        await this.userRepository.update(userId, {
          tfaRecoveryCodes: updatedCodes,
        });

        this.logger.log({
          event: 'RECOVERY_CODE_USED',
          userId,
          remainingCodes: updatedCodes.length,
        });

        return true;
      }
    }

    this.logger.warn({
      event: 'RECOVERY_CODE_VERIFICATION_FAILED',
      userId,
    });

    return false;
  }

  async disableTfa(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName'],
    });

    await this.userRepository.update(userId, {
      tfaSecret: null,
      tfaRecoveryCodes: null,
      isTfaEnabled: false,
    });

    this.logger.log({
      event: 'TFA_DISABLED',
      userId,
    });

    if (user) {
      await this.mailService.sendTfaDisabled(user.email, {
        firstName: user.firstName ?? undefined,
      });
    }
  }

  async regenerateRecoveryCodes(userId: string): Promise<string[]> {
    const recoveryCodes = this.generateRecoveryCodes();
    const hashedCodes = await Promise.all(
      recoveryCodes.map((c) => this.hashingService.hash(c)),
    );

    await this.userRepository.update(userId, {
      tfaRecoveryCodes: hashedCodes,
    });

    this.logger.log({
      event: 'RECOVERY_CODES_REGENERATED',
      userId,
    });

    return recoveryCodes;
  }

  async isLockedOut(userId: string): Promise<boolean> {
    const failureKey = `${this.FAILURE_PREFIX}${userId}`;
    const failures = parseInt(
      (await this.redisService.get(failureKey)) || '0',
      10,
    );
    return failures >= this.config.maxFailures;
  }

  private generateRecoveryCodes(): string[] {
    return Array.from({ length: this.config.recoveryCodeCount }, () =>
      randomBytes(4).toString('hex').toUpperCase(),
    );
  }

  private async recordFailure(
    userId: string,
    failureKey: string,
    currentFailures: number,
  ): Promise<void> {
    const client = this.redisService.getClient();
    await client.incr(failureKey);
    await client.expire(failureKey, this.config.lockoutSeconds);

    this.logger.warn({
      event: 'OTP_VERIFICATION_FAILED',
      userId,
      failureCount: currentFailures + 1,
      maxFailures: this.config.maxFailures,
    });
  }
}
