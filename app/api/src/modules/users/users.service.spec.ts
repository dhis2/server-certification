import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { HashingService } from 'src/modules/iam/hashing/hashing.service';
import { RolesService } from 'src/modules/iam/authorization/services/roles.service';
import { PasswordLockoutStorage } from 'src/modules/iam/authentication/password-lockout';
import { MailService, PasswordResetTokenStorage } from 'src/modules/mail';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Partial<Record<keyof Repository<User>, jest.Mock>>;
  let hashingService: { hash: jest.Mock };
  let rolesService: { findOne: jest.Mock; findDefault: jest.Mock };
  let passwordLockoutStorage: { clearFailures: jest.Mock };
  let mailService: {
    sendWelcome: jest.Mock;
    sendPasswordReset: jest.Mock;
    sendAccountUnlocked: jest.Mock;
  };
  let passwordResetTokenStorage: {
    createToken: jest.Mock;
    getExpirationMinutes: jest.Mock;
  };

  const mockRole = {
    id: 1,
    name: 'user',
    description: 'Regular user',
    isDefault: true,
  };

  const mockUser = {
    id: '01912345-6789-7abc-8def-0123456789ab',
    email: 'test@example.com',
    password: 'hashed-password',
    firstName: null,
    lastName: null,
    isActive: true,
    isLocked: false,
    failedLoginAttempts: 0,
    role: mockRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as User;

  beforeEach(async () => {
    userRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    hashingService = {
      hash: jest.fn(),
    };

    rolesService = {
      findOne: jest.fn(),
      findDefault: jest.fn(),
    };

    passwordLockoutStorage = {
      clearFailures: jest.fn(),
    };

    mailService = {
      sendWelcome: jest.fn().mockResolvedValue(true),
      sendPasswordReset: jest.fn().mockResolvedValue(true),
      sendAccountUnlocked: jest.fn().mockResolvedValue(true),
    };

    passwordResetTokenStorage = {
      createToken: jest.fn().mockResolvedValue('test-token'),
      getExpirationMinutes: jest.fn().mockReturnValue(60),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'APP_BASE_URL') return 'http://localhost:3000';
              return undefined;
            }),
          },
        },
        { provide: HashingService, useValue: hashingService },
        { provide: RolesService, useValue: rolesService },
        { provide: PasswordLockoutStorage, useValue: passwordLockoutStorage },
        { provide: MailService, useValue: mailService },
        {
          provide: PasswordResetTokenStorage,
          useValue: passwordResetTokenStorage,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      firstName: 'Test',
      lastName: 'User',
      email: 'new@example.com',
      password: 'Password123!',
    };

    it('should create a user with default role and send welcome email', async () => {
      hashingService.hash.mockResolvedValue('hashed-password');
      rolesService.findDefault.mockResolvedValue(mockRole);
      userRepository.save?.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(hashingService.hash).toHaveBeenCalledWith(createUserDto.password);
      expect(rolesService.findDefault).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
      expect(mailService.sendWelcome).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should skip welcome email when sendWelcomeEmail is false', async () => {
      hashingService.hash.mockResolvedValue('hashed-password');
      rolesService.findDefault.mockResolvedValue(mockRole);
      userRepository.save?.mockResolvedValue(mockUser);

      await service.create(createUserDto, { sendWelcomeEmail: false });

      expect(mailService.sendWelcome).not.toHaveBeenCalled();
    });

    it('should create a user with specified role', async () => {
      const dtoWithRole: CreateUserDto = { ...createUserDto, roleId: '1' };
      hashingService.hash.mockResolvedValue('hashed-password');
      rolesService.findOne.mockResolvedValue(mockRole);
      userRepository.save?.mockResolvedValue(mockUser);

      await service.create(dtoWithRole);

      expect(rolesService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw ConflictException on duplicate email', async () => {
      hashingService.hash.mockResolvedValue('hashed-password');
      rolesService.findDefault.mockResolvedValue(null);
      userRepository.save?.mockRejectedValue({ code: '23505' });

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    const createMockQb = (users: User[], totalCount: number) => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([users, totalCount]),
    });

    it('should return users with cursor-based pagination', async () => {
      const users = [mockUser];
      const mockQb = createMockQb(users, 1);
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      const result = await service.findAll();

      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node).toEqual(mockUser);
      expect(result.totalCount).toBe(1);
      expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it('should apply search filter with sanitization', async () => {
      const users = [mockUser];
      const mockQb = createMockQb(users, 1);
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      await service.findAll({ search: 'test%_' });

      expect(mockQb.where).toHaveBeenCalledWith(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: '%test\\%\\_%' },
      );
    });

    it('should limit page size to max 100', async () => {
      const mockQb = createMockQb([], 0);
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      await service.findAll({ first: 500 });

      expect(mockQb.take).toHaveBeenCalledWith(101);
    });

    it('should handle cursor-based pagination with after parameter', async () => {
      const cursor = Buffer.from(mockUser.id, 'utf8').toString('base64url');
      const mockQb = createMockQb([], 0);
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      await service.findAll({ after: cursor });

      expect(mockQb.andWhere).toHaveBeenCalledWith('user.id < :afterId', {
        afterId: mockUser.id,
      });
    });

    it('should indicate hasNextPage when more results exist', async () => {
      const users = [mockUser, { ...mockUser, id: 'another-id' }] as User[];
      const mockQb = createMockQb(users, 5);
      userRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      const result = await service.findAll({ first: 1 });

      expect(result.pageInfo.hasNextPage).toBe(true);
      expect(result.edges).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      userRepository.findOne?.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne?.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      userRepository.findOne?.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: mockUser.email },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      userRepository.findOne?.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    const updateProfileDto: UpdateProfileDto = {
      firstName: 'Updated',
      lastName: 'User',
    };

    it('should update user profile fields', async () => {
      userRepository.findOne?.mockResolvedValue({ ...mockUser });
      userRepository.save?.mockResolvedValue({
        ...mockUser,
        ...updateProfileDto,
      });

      const result = await service.updateProfile(mockUser.id, updateProfileDto);

      expect(result.firstName).toBe(updateProfileDto.firstName);
      expect(result.lastName).toBe(updateProfileDto.lastName);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne?.mockResolvedValue(null);

      await expect(
        service.updateProfile('non-existent-id', updateProfileDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update non-sensitive user fields', async () => {
      userRepository.findOne?.mockResolvedValue({ ...mockUser });
      userRepository.save?.mockResolvedValue({
        ...mockUser,
        ...updateUserDto,
      });

      const result = await service.update(mockUser.id, updateUserDto);

      expect(result.firstName).toBe(updateUserDto.firstName);
    });
  });

  describe('adminUpdate', () => {
    it('should update user role', async () => {
      const dto: AdminUpdateUserDto = { roleId: '2' };
      const newRole = { ...mockRole, id: 2, name: 'admin' };
      userRepository.findOne?.mockResolvedValue({ ...mockUser });
      rolesService.findOne.mockResolvedValue(newRole);
      userRepository.save?.mockResolvedValue({ ...mockUser, role: newRole });

      const result = await service.adminUpdate(mockUser.id, dto);

      expect(rolesService.findOne).toHaveBeenCalledWith(2);
      expect(result.role).toEqual(newRole);
    });

    it('should update user active status', async () => {
      const dto: AdminUpdateUserDto = { isActive: false };
      userRepository.findOne?.mockResolvedValue({ ...mockUser });
      userRepository.save?.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.adminUpdate(mockUser.id, dto);

      expect(result.isActive).toBe(false);
    });

    it('should update user locked status', async () => {
      const dto: AdminUpdateUserDto = { isLocked: true };
      userRepository.findOne?.mockResolvedValue({ ...mockUser });
      userRepository.save?.mockResolvedValue({ ...mockUser, isLocked: true });

      const result = await service.adminUpdate(mockUser.id, dto);

      expect(result.isLocked).toBe(true);
    });
  });

  describe('unlockUser', () => {
    it('should unlock user, clear failed attempts, and send notification', async () => {
      const lockedUser = {
        ...mockUser,
        isLocked: true,
        failedLoginAttempts: 5,
      };
      userRepository.findOne?.mockResolvedValue({ ...lockedUser });
      passwordLockoutStorage.clearFailures.mockResolvedValue(undefined);
      userRepository.save?.mockResolvedValue({
        ...lockedUser,
        isLocked: false,
        failedLoginAttempts: 0,
      });

      const result = await service.unlockUser(mockUser.id);

      expect(result.isLocked).toBe(false);
      expect(result.failedLoginAttempts).toBe(0);
      expect(passwordLockoutStorage.clearFailures).toHaveBeenCalledWith(
        mockUser.email,
      );
      expect(mailService.sendAccountUnlocked).toHaveBeenCalled();
    });
  });

  describe('triggerPasswordReset', () => {
    it('should create token, send email, and return success message', async () => {
      userRepository.findOne?.mockResolvedValue({ ...mockUser });

      const result = await service.triggerPasswordReset(mockUser.id);

      expect(passwordResetTokenStorage.createToken).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
      );
      expect(mailService.sendPasswordReset).toHaveBeenCalled();
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Password reset email sent');
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne?.mockResolvedValue(null);

      await expect(
        service.triggerPasswordReset('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      userRepository.findOne?.mockResolvedValue(mockUser);
      userRepository.remove?.mockResolvedValue(mockUser);

      await service.remove(mockUser.id);

      expect(userRepository.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne?.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
