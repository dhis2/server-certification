import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { User } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser = {
    id: '01912345-6789-7abc-8def-0123456789ab',
    email: 'test@example.com',
    password: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    isLocked: false,
    failedLoginAttempts: 0,
    role: {
      id: 1,
      name: 'user',
      description: 'Regular user',
      isDefault: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as User;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    adminUpdate: jest.fn(),
    unlockUser: jest.fn(),
    triggerPasswordReset: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createDto: CreateUserDto = {
        firstName: 'New',
        lastName: 'User',
        email: 'new@example.com',
        password: 'Password123!',
      };

      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    const mockConnection = {
      edges: [{ node: mockUser, cursor: 'abc123' }],
      pageInfo: { hasNextPage: false, endCursor: 'abc123' },
      totalCount: 1,
    };

    it('should return cursor-based paginated list of users', async () => {
      mockUsersService.findAll.mockResolvedValue(mockConnection);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith({
        search: undefined,
        first: undefined,
        after: undefined,
      });
      expect(result).toEqual(mockConnection);
    });

    it('should pass cursor pagination parameters', async () => {
      mockUsersService.findAll.mockResolvedValue(mockConnection);

      await controller.findAll(undefined, '50', 'cursor123');

      expect(service.findAll).toHaveBeenCalledWith({
        search: undefined,
        first: 50,
        after: 'cursor123',
      });
    });

    it('should pass search parameter', async () => {
      mockUsersService.findAll.mockResolvedValue(mockConnection);

      await controller.findAll('test@example.com');

      expect(service.findAll).toHaveBeenCalledWith({
        search: 'test@example.com',
        first: undefined,
        after: undefined,
      });
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(mockUser.id);

      expect(service.findOne).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should update a user profile', async () => {
      const updateDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const updatedUser = { ...mockUser, ...updateDto } as User;

      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUser.id, updateDto);

      expect(service.update).toHaveBeenCalledWith(mockUser.id, updateDto);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('adminUpdate', () => {
    it('should update user role and status', async () => {
      const adminDto: AdminUpdateUserDto = {
        isActive: false,
        isLocked: true,
      };
      const updatedUser = { ...mockUser, ...adminDto } as User;

      mockUsersService.adminUpdate.mockResolvedValue(updatedUser);

      const result = await controller.adminUpdate(mockUser.id, adminDto);

      expect(service.adminUpdate).toHaveBeenCalledWith(mockUser.id, adminDto);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('unlockUser', () => {
    it('should unlock a user', async () => {
      const unlockedUser = {
        ...mockUser,
        isLocked: false,
        failedLoginAttempts: 0,
      } as User;

      mockUsersService.unlockUser.mockResolvedValue(unlockedUser);

      const result = await controller.unlockUser(mockUser.id);

      expect(service.unlockUser).toHaveBeenCalledWith(mockUser.id);
      expect(result.isLocked).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('should trigger password reset', async () => {
      const message = { message: 'Password reset initiated' };
      mockUsersService.triggerPasswordReset.mockResolvedValue(message);

      const result = await controller.resetPassword(mockUser.id);

      expect(service.triggerPasswordReset).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(message);
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove(mockUser.id);

      expect(service.remove).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
