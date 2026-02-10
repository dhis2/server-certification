import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { HashingService } from 'src/modules/iam/hashing/hashing.service';
import { RolesService } from 'src/modules/iam/authorization/services/roles.service';
import { PasswordLockoutStorage } from 'src/modules/iam/authentication/password-lockout';
import { MailService, PasswordResetTokenStorage } from 'src/modules/mail';
import { isUniqueViolation } from 'src/shared/utils/error.utils';
import {
  Connection,
  PaginatedSearchOptions,
  createLikePattern,
  isEmptySearch,
  paginate,
} from 'src/shared/pagination';

export interface CreateUserOptions {
  sendWelcomeEmail?: boolean;
}

export type UsersPaginationOptions = PaginatedSearchOptions;

export type UsersConnection = Connection<User>;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly appBaseUrl: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly hashingService: HashingService,
    private readonly rolesService: RolesService,
    private readonly passwordLockoutStorage: PasswordLockoutStorage,
    private readonly mailService: MailService,
    private readonly passwordResetTokenStorage: PasswordResetTokenStorage,
  ) {
    this.appBaseUrl =
      this.configService.get<string>('APP_BASE_URL') ?? 'http://localhost:3000';
  }

  async create(
    createUserDto: CreateUserDto,
    options: CreateUserOptions = {},
  ): Promise<User> {
    const { sendWelcomeEmail = true } = options;

    try {
      const user = new User();
      user.firstName = createUserDto.firstName;
      user.lastName = createUserDto.lastName;
      user.email = createUserDto.email;
      user.password = await this.hashingService.hash(createUserDto.password);

      if (createUserDto.roleId) {
        const role = await this.rolesService.findOne(
          parseInt(createUserDto.roleId, 10),
        );
        user.role = role;
      } else {
        const defaultRole = await this.rolesService.findDefault();
        user.role = defaultRole;
      }

      const savedUser = await this.userRepository.save(user);

      if (sendWelcomeEmail) {
        await this.mailService.sendWelcome(savedUser.email, {
          firstName: savedUser.firstName ?? undefined,
          email: savedUser.email,
          temporaryPassword: createUserDto.password,
          loginUrl: this.appBaseUrl,
        });
      }

      return savedUser;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Email already exists');
      }
      throw err;
    }
  }

  async findAll(
    options: UsersPaginationOptions = {},
  ): Promise<UsersConnection> {
    const qb = this.userRepository.createQueryBuilder('user');

    if (!isEmptySearch(options.search)) {
      const pattern = createLikePattern(options.search!);
      qb.where(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: pattern },
      );
    }

    return paginate(qb, 'user', {
      first: options.first,
      after: options.after,
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName;
    }

    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName;
    }

    return await this.userRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    return this.updateProfile(id, updateUserDto);
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.roleId !== undefined) {
      const role = await this.rolesService.findOne(parseInt(dto.roleId, 10));
      user.role = role;
    }

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
      this.logger.log({
        event: dto.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        userId: user.id,
      });
    }

    if (dto.isLocked !== undefined) {
      user.isLocked = dto.isLocked;
      this.logger.log({
        event: dto.isLocked ? 'USER_LOCKED' : 'USER_UNLOCKED',
        userId: user.id,
      });
    }

    return await this.userRepository.save(user);
  }

  async unlockUser(id: string): Promise<User> {
    const user = await this.findOne(id);

    user.isLocked = false;
    user.failedLoginAttempts = 0;

    await this.passwordLockoutStorage.clearFailures(user.email);

    this.logger.log({
      event: 'USER_UNLOCKED_AND_RESET',
      userId: user.id,
    });

    const savedUser = await this.userRepository.save(user);

    await this.mailService.sendAccountUnlocked(savedUser.email, {
      firstName: savedUser.firstName ?? undefined,
      email: savedUser.email,
      loginUrl: this.appBaseUrl,
    });

    return savedUser;
  }

  async triggerPasswordReset(id: string): Promise<{ message: string }> {
    const user = await this.findOne(id);

    const token = await this.passwordResetTokenStorage.createToken(
      user.id,
      user.email,
    );

    const resetUrl = `${this.appBaseUrl}/reset-password?token=${token}`;
    const expiresInMinutes =
      this.passwordResetTokenStorage.getExpirationMinutes();

    await this.mailService.sendPasswordReset(user.email, {
      firstName: user.firstName ?? undefined,
      resetUrl,
      expiresInMinutes,
    });

    this.logger.log({
      event: 'PASSWORD_RESET_TRIGGERED',
      userId: user.id,
    });

    return {
      message: 'Password reset email sent successfully.',
    };
  }

  async notifyAccountLocked(user: User, reason: string): Promise<void> {
    await this.mailService.sendAccountLocked(user.email, {
      firstName: user.firstName ?? undefined,
      email: user.email,
      lockReason: reason,
    });
  }

  async notifyTfaEnabled(user: User): Promise<void> {
    await this.mailService.sendTfaEnabled(user.email, {
      firstName: user.firstName ?? undefined,
    });
  }

  async notifyTfaDisabled(user: User): Promise<void> {
    await this.mailService.sendTfaDisabled(user.email, {
      firstName: user.firstName ?? undefined,
    });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }
}
