import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ImplementationsService } from '../services/implementations.service';
import { Implementation } from '../entities/implementation.entity';
// Import directly from service to avoid pulling in controller with broken imports
import { AuditService } from '../../audit/services/audit.service';
import {
  AuditEventType,
  AuditAction,
} from '../../audit/entities/audit-log.entity';
import { CreateImplementationDto } from '../dto/create-implementation.dto';
import { UpdateImplementationDto } from '../dto/update-implementation.dto';

// Mock factory for TypeORM repositories
const createMockRepository = <T extends ObjectLiteral>(): Partial<
  Record<keyof Repository<T>, jest.Mock>
> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('ImplementationsService', () => {
  let service: ImplementationsService;
  let repository: ReturnType<typeof createMockRepository>;
  let auditService: { log: jest.Mock };

  const mockUserId = '01912345-6789-7abc-def0-123456789abc';
  const mockImplementationId = '01912345-0000-7abc-def0-123456789abc';

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
    repository = createMockRepository();
    auditService = { log: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImplementationsService,
        { provide: getRepositoryToken(Implementation), useValue: repository },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<ImplementationsService>(ImplementationsService);
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

    it('should create an implementation with valid input', async () => {
      const expectedImplementation = { ...mockImplementation };
      repository.findOne!.mockResolvedValue(null); // No existing org
      repository.create!.mockReturnValue(expectedImplementation);
      repository.save!.mockResolvedValue(expectedImplementation);

      const result = await service.create(createDto, mockUserId);

      expect(result).toEqual(expectedImplementation);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name, isActive: true },
      });
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          country: createDto.country,
          contactEmail: createDto.contactEmail,
          createdById: mockUserId,
        }),
      );
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if implementation name already exists', async () => {
      repository.findOne!.mockResolvedValue(mockImplementation);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name, isActive: true },
      });
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should set createdById from userId parameter', async () => {
      repository.findOne!.mockResolvedValue(null);
      repository.create!.mockReturnValue({ ...mockImplementation });
      repository.save!.mockResolvedValue({ ...mockImplementation });

      await service.create(createDto, mockUserId);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdById: mockUserId,
        }),
      );
    });

    it('should call AuditService.log after successful creation', async () => {
      repository.findOne!.mockResolvedValue(null);
      repository.create!.mockReturnValue({ ...mockImplementation });
      repository.save!.mockResolvedValue({ ...mockImplementation });

      await service.create(createDto, mockUserId);

      expect(auditService.log).toHaveBeenCalledWith(
        {
          eventType: AuditEventType.IMPLEMENTATION_CREATED,
          entityType: 'Implementation',
          entityId: mockImplementationId,
          action: AuditAction.CREATE,
          newValues: expect.objectContaining({
            name: createDto.name,
            dhis2InstanceUrl: createDto.dhis2InstanceUrl,
          }) as Record<string, unknown>,
        },
        { actorId: mockUserId },
      );
    });

    it('should create implementation with only required fields', async () => {
      const minimalDto: CreateImplementationDto = {
        name: 'Minimal Implementation',
      };
      const minimalImplementation = {
        ...mockImplementation,
        id: 'new-id',
        name: 'Minimal Implementation',
        country: null,
        contactEmail: null,
        contactPhone: null,
        description: null,
        dhis2InstanceUrl: null,
        dhis2Version: null,
      };

      repository.findOne!.mockResolvedValue(null);
      repository.create!.mockReturnValue(minimalImplementation);
      repository.save!.mockResolvedValue(minimalImplementation);

      const result = await service.create(minimalDto, mockUserId);

      expect(result.name).toBe('Minimal Implementation');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Minimal Implementation',
          createdById: mockUserId,
        }),
      );
    });
  });

  describe('findAll', () => {
    const mockImplementations = [
      mockImplementation,
      { ...mockImplementation, id: 'impl-2', name: 'Implementation B' },
    ];

    it('should return all implementations when no options provided', async () => {
      repository.find!.mockResolvedValue(mockImplementations);

      const result = await service.findAll();

      expect(result).toEqual(mockImplementations);
      expect(repository.find).toHaveBeenCalledWith({
        where: {},
        order: { name: 'ASC' },
      });
    });

    it('should filter by isActive when option provided', async () => {
      repository.find!.mockResolvedValue([mockImplementation]);

      const result = await service.findAll({ isActive: true });

      expect(result).toHaveLength(1);
      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
    });

    it('should return inactive implementations when isActive is false', async () => {
      const inactiveImplementation = { ...mockImplementation, isActive: false };
      repository.find!.mockResolvedValue([inactiveImplementation]);

      const result = await service.findAll({ isActive: false });

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(false);
      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: false },
        order: { name: 'ASC' },
      });
    });

    it('should return empty array when no implementations found', async () => {
      repository.find!.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should order implementations by name ascending', async () => {
      repository.find!.mockResolvedValue(mockImplementations);

      await service.findAll();

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { name: 'ASC' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return implementation when found', async () => {
      repository.findOne!.mockResolvedValue(mockImplementation);

      const result = await service.findOne(mockImplementationId);

      expect(result).toEqual(mockImplementation);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockImplementationId },
      });
    });

    it('should throw NotFoundException when implementation not found', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Implementation with ID non-existent-id not found',
      );
    });

    it('should return implementation regardless of isActive status', async () => {
      const inactiveImplementation = { ...mockImplementation, isActive: false };
      repository.findOne!.mockResolvedValue(inactiveImplementation);

      const result = await service.findOne(mockImplementationId);

      expect(result.isActive).toBe(false);
    });
  });

  describe('update', () => {
    const updateDto: UpdateImplementationDto = {
      name: 'Updated Implementation Name',
      dhis2Version: '2.41.0',
    };

    it('should update implementation with valid input', async () => {
      const updatedImplementation = {
        ...mockImplementation,
        name: updateDto.name,
        dhis2Version: updateDto.dhis2Version,
      };
      repository.findOne!.mockResolvedValue({ ...mockImplementation });
      repository.save!.mockResolvedValue(updatedImplementation);

      const result = await service.update(
        mockImplementationId,
        updateDto,
        mockUserId,
      );

      expect(result.name).toBe(updateDto.name);
      expect(result.dhis2Version).toBe(updateDto.dhis2Version);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if implementation does not exist', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should call AuditService.log after successful update', async () => {
      repository.findOne!.mockResolvedValue({ ...mockImplementation });
      repository.save!.mockResolvedValue({
        ...mockImplementation,
        name: updateDto.name,
      });

      await service.update(mockImplementationId, updateDto, mockUserId);

      expect(auditService.log).toHaveBeenCalledWith(
        {
          eventType: AuditEventType.IMPLEMENTATION_UPDATED,
          entityType: 'Implementation',
          entityId: mockImplementationId,
          action: AuditAction.UPDATE,
          oldValues: expect.objectContaining({
            name: mockImplementation.name,
          }) as Record<string, unknown>,
          newValues: expect.objectContaining({
            name: updateDto.name,
          }) as Record<string, unknown>,
        },
        { actorId: mockUserId },
      );
    });

    it('should only update provided fields', async () => {
      const partialUpdate: UpdateImplementationDto = {
        country: 'Tanzania',
      };
      repository.findOne!.mockResolvedValue({ ...mockImplementation });
      repository.save!.mockImplementation((entity) =>
        Promise.resolve(entity as Implementation),
      );

      const result = await service.update(
        mockImplementationId,
        partialUpdate,
        mockUserId,
      );

      expect(result.country).toBe('Tanzania');
      expect(result.name).toBe(mockImplementation.name); // Unchanged
    });

    it('should preserve existing values when updating', async () => {
      const existingImplementation = { ...mockImplementation };
      repository.findOne!.mockResolvedValue(existingOrg);
      repository.save!.mockImplementation((entity) =>
        Promise.resolve(entity as Implementation),
      );

      await service.update(mockOrgId, { name: 'New Name' }, mockUserId);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockOrgId,
          country: mockImplementation.country, // Preserved
          contactEmail: mockImplementation.contactEmail, // Preserved
        }),
      );
    });
  });

  describe('remove', () => {
    it('should soft delete implementation by setting isActive to false', async () => {
      repository.findOne!.mockResolvedValue({ ...mockImplementation });
      repository.save!.mockImplementation((entity) =>
        Promise.resolve(entity as Implementation),
      );

      await service.remove(mockOrgId, mockUserId);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockOrgId,
          isActive: false,
        }),
      );
    });

    it('should throw NotFoundException if implementation does not exist', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.remove('non-existent', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call AuditService.log after successful deletion', async () => {
      repository.findOne!.mockResolvedValue({ ...mockImplementation });
      repository.save!.mockResolvedValue({
        ...mockImplementation,
        isActive: false,
      });

      await service.remove(mockOrgId, mockUserId);

      expect(auditService.log).toHaveBeenCalledWith(
        {
          eventType: AuditEventType.IMPLEMENTATION_DELETED,
          entityType: 'Implementation',
          entityId: mockOrgId,
          action: AuditAction.DELETE,
        },
        { actorId: mockUserId },
      );
    });

    it('should not permanently delete the record', async () => {
      repository.findOne!.mockResolvedValue({ ...mockImplementation });
      repository.save!.mockResolvedValue({
        ...mockImplementation,
        isActive: false,
      });

      await service.remove(mockOrgId, mockUserId);

      expect(repository.delete).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });

    it('should return void on successful removal', async () => {
      repository.findOne!.mockResolvedValue({ ...mockImplementation });
      repository.save!.mockResolvedValue({
        ...mockImplementation,
        isActive: false,
      });

      const result = await service.remove(mockOrgId, mockUserId);

      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent create attempts for same name', async () => {
      const createDto: CreateImplementationDto = { name: 'Test Org' };

      // First findOne returns null, but second call (during concurrent request) finds it
      repository.findOne!.mockResolvedValueOnce(null);
      repository.create!.mockReturnValue({
        ...mockImplementation,
        name: 'Test Org',
      });
      repository.save!.mockRejectedValue(new Error('Duplicate entry'));

      await expect(service.create(createDto, mockUserId)).rejects.toThrow();
    });

    it('should handle implementation with special characters in name via DTO pattern match', async () => {
      // The DTO validation pattern allows these characters: a-zA-Z0-9\s\-_.
      const createDto: CreateImplementationDto = {
        name: 'Implementation-Name_v2.0',
      };

      repository.findOne!.mockResolvedValue(null);
      repository.create!.mockReturnValue({
        ...mockImplementation,
        name: createDto.name,
      });
      repository.save!.mockResolvedValue({
        ...mockImplementation,
        name: createDto.name,
      });

      const result = await service.create(createDto, mockUserId);

      expect(result.name).toBe('Implementation-Name_v2.0');
    });
  });
});
