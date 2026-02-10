import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ImplementationsController } from '../implementations.controller';
import { ImplementationsService } from '../services/implementations.service';
import { Implementation } from '../entities/implementation.entity';
import { CreateImplementationDto } from '../dto/create-implementation.dto';
import { UpdateImplementationDto } from '../dto/update-implementation.dto';
import { ImplementationResponseDto } from '../dto/implementation-response.dto';
import { ActiveUserData } from '../../iam/interfaces/active-user-data.interface';
import { AuthenticationGuard } from '../../iam/authentication/guards/authentication/authentication.guard';
import { RolesGuard } from '../../iam/authorization/guards/roles.guard';

describe('ImplementationsController', () => {
  let controller: ImplementationsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockUserId = '01912345-6789-7abc-def0-123456789abc';
  const mockImplementationId = '01912345-0000-7abc-def0-123456789abc';

  const mockActiveUser: ActiveUserData = {
    jti: 'jwt-id-123',
    refreshTokenId: 'refresh-token-id-123',
    sub: mockUserId,
    email: 'admin@example.com',
    roleId: 1,
    roleName: 'admin',
  };

  const mockImplementation: Implementation = {
    id: mockImplementationId,
    name: 'Ministry of Health Kenya',
    country: 'Kenya',
    contactEmail: 'admin@health.go.ke',
    contactPhone: '+254-20-271-7077',
    description: 'Kenya MOH DHIS2 implementation',
    dhis2InstanceUrl: 'https://dhis2.health.go.ke',
    dhis2Version: '2.40.2',
    isActive: true,
    createdById: mockUserId,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    generateId: jest.fn(),
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImplementationsController],
      providers: [{ provide: ImplementationsService, useValue: service }],
    })
      .overrideGuard(AuthenticationGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ImplementationsController>(
      ImplementationsController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateImplementationDto = {
      name: 'Ministry of Health Kenya',
      country: 'Kenya',
      contactEmail: 'admin@health.go.ke',
      contactPhone: '+254-20-271-7077',
      description: 'Kenya MOH DHIS2 implementation',
      dhis2InstanceUrl: 'https://dhis2.health.go.ke',
      dhis2Version: '2.40.2',
    };

    it('should create an implementation and return response DTO', async () => {
      service.create.mockResolvedValue(mockImplementation);

      const result = await controller.create(createDto, mockActiveUser);

      expect(service.create).toHaveBeenCalledWith(createDto, mockUserId);
      expect(result).toBeInstanceOf(ImplementationResponseDto);
      expect(result.id).toBe(mockImplementationId);
      expect(result.name).toBe(mockImplementation.name);
    });

    it('should pass user.sub as userId to service', async () => {
      service.create.mockResolvedValue(mockImplementation);

      await controller.create(createDto, mockActiveUser);

      expect(service.create).toHaveBeenCalledWith(
        createDto,
        mockActiveUser.sub,
      );
    });

    it('should propagate ConflictException from service', async () => {
      service.create.mockRejectedValue(
        new ConflictException('Implementation with this name already exists'),
      );

      await expect(
        controller.create(createDto, mockActiveUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    const mockImplementations = [
      mockImplementation,
      { ...mockImplementation, id: 'impl-2', name: 'Implementation B' },
    ];

    it('should return all implementations as response DTOs', async () => {
      service.findAll.mockResolvedValue(mockImplementations);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith({});
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(ImplementationResponseDto);
      expect(result[0].id).toBe(mockImplementationId);
    });

    it('should pass isActive filter when provided', async () => {
      service.findAll.mockResolvedValue([mockImplementation]);

      await controller.findAll(true);

      expect(service.findAll).toHaveBeenCalledWith({ isActive: true });
    });

    it('should pass isActive=false when explicitly set', async () => {
      const inactiveImplementation = { ...mockImplementation, isActive: false };
      service.findAll.mockResolvedValue([inactiveImplementation]);

      const result = await controller.findAll(false);

      expect(service.findAll).toHaveBeenCalledWith({ isActive: false });
      expect(result[0].isActive).toBe(false);
    });

    it('should return empty array when no implementations found', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return implementation as response DTO', async () => {
      service.findOne.mockResolvedValue(mockImplementation);

      const result = await controller.findOne(mockImplementationId);

      expect(service.findOne).toHaveBeenCalledWith(mockImplementationId);
      expect(result).toBeInstanceOf(ImplementationResponseDto);
      expect(result.id).toBe(mockImplementationId);
      expect(result.name).toBe(mockImplementation.name);
    });

    it('should propagate NotFoundException from service', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException(
          `Implementation with ID ${mockImplementationId} not found`,
        ),
      );

      await expect(controller.findOne(mockImplementationId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return implementation regardless of isActive status', async () => {
      const inactiveImplementation = { ...mockImplementation, isActive: false };
      service.findOne.mockResolvedValue(inactiveImplementation);

      const result = await controller.findOne(mockImplementationId);

      expect(result.isActive).toBe(false);
    });
  });

  describe('update', () => {
    const updateDto: UpdateImplementationDto = {
      name: 'Updated Implementation Name',
      dhis2Version: '2.41.0',
    };

    it('should update implementation and return response DTO', async () => {
      const updatedImplementation = {
        ...mockImplementation,
        name: updateDto.name,
        dhis2Version: updateDto.dhis2Version,
      };
      service.update.mockResolvedValue(updatedImplementation);

      const result = await controller.update(
        mockImplementationId,
        updateDto,
        mockActiveUser,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockImplementationId,
        updateDto,
        mockUserId,
      );
      expect(result).toBeInstanceOf(ImplementationResponseDto);
      expect(result.name).toBe(updateDto.name);
      expect(result.dhis2Version).toBe(updateDto.dhis2Version);
    });

    it('should pass user.sub as userId to service', async () => {
      service.update.mockResolvedValue(mockImplementation);

      await controller.update(mockImplementationId, updateDto, mockActiveUser);

      expect(service.update).toHaveBeenCalledWith(
        mockImplementationId,
        updateDto,
        mockActiveUser.sub,
      );
    });

    it('should propagate NotFoundException from service', async () => {
      service.update.mockRejectedValue(
        new NotFoundException(
          `Implementation with ID ${mockImplementationId} not found`,
        ),
      );

      await expect(
        controller.update(mockImplementationId, updateDto, mockActiveUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle partial update', async () => {
      const partialUpdate: UpdateImplementationDto = { country: 'Tanzania' };
      const updatedImplementation = {
        ...mockImplementation,
        country: 'Tanzania',
      };
      service.update.mockResolvedValue(updatedImplementation);

      const result = await controller.update(
        mockImplementationId,
        partialUpdate,
        mockActiveUser,
      );

      expect(result.country).toBe('Tanzania');
      expect(result.name).toBe(mockImplementation.name);
    });
  });

  describe('remove', () => {
    it('should call service.remove with correct parameters', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockImplementationId, mockActiveUser);

      expect(service.remove).toHaveBeenCalledWith(
        mockImplementationId,
        mockUserId,
      );
    });

    it('should pass user.sub as userId to service', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockImplementationId, mockActiveUser);

      expect(service.remove).toHaveBeenCalledWith(
        mockImplementationId,
        mockActiveUser.sub,
      );
    });

    it('should propagate NotFoundException from service', async () => {
      service.remove.mockRejectedValue(
        new NotFoundException(
          `Implementation with ID ${mockImplementationId} not found`,
        ),
      );

      await expect(
        controller.remove(mockImplementationId, mockActiveUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return void on successful removal', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(
        mockImplementationId,
        mockActiveUser,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('response DTO transformation', () => {
    it('should transform entity to response DTO correctly', async () => {
      service.findOne.mockResolvedValue(mockImplementation);

      const result = await controller.findOne(mockImplementationId);

      expect(result).toEqual({
        id: mockImplementation.id,
        name: mockImplementation.name,
        country: mockImplementation.country,
        contactEmail: mockImplementation.contactEmail,
        contactPhone: mockImplementation.contactPhone,
        description: mockImplementation.description,
        dhis2InstanceUrl: mockImplementation.dhis2InstanceUrl,
        dhis2Version: mockImplementation.dhis2Version,
        isActive: mockImplementation.isActive,
        createdAt: mockImplementation.createdAt,
        updatedAt: mockImplementation.updatedAt,
      });
    });

    it('should not include createdById in response', async () => {
      service.findOne.mockResolvedValue(mockImplementation);

      const result = await controller.findOne(mockImplementationId);

      expect(result).not.toHaveProperty('createdById');
      expect(result).not.toHaveProperty('generateId');
    });
  });
});
