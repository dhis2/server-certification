jest.mock('bcrypt', () => ({
  default: {
    hash: jest.fn().mockResolvedValue('hashedpassword'),
    compare: jest.fn().mockResolvedValue(true),
  },
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { AuditService } from '../services/audit.service';
import { AuditIntegrityService } from '../services/audit-integrity.service';
import { AuditRetentionService } from '../services/audit-retention.service';
import {
  AuditLog,
  AuditEventType,
  AuditAction,
} from '../entities/audit-log.entity';

const createMockQueryBuilder = () => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(null),
  getMany: jest.fn().mockResolvedValue([]),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  getCount: jest.fn().mockResolvedValue(0),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue([]),
});

const createMockRepository = () => {
  const qb = createMockQueryBuilder();
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
    _qb: qb,
  };
};

type MockRepository = ReturnType<typeof createMockRepository>;

const createMockIntegrityService = () => ({
  generateSignature: jest.fn().mockReturnValue('mocksignature123'),
  verifySignature: jest.fn().mockReturnValue({ valid: true, entryId: '1' }),
  verifyBatch: jest
    .fn()
    .mockReturnValue({ valid: true, entriesChecked: 0, invalidEntries: [] }),
  isConfigured: jest.fn().mockReturnValue(true),
  getKeyFingerprint: jest.fn().mockReturnValue('abc123'),
});

const createMockRetentionService = () => ({
  calculateArchiveDate: jest.fn().mockReturnValue(new Date('2026-04-27')),
  getPolicy: jest.fn().mockReturnValue({
    defaultRetentionDays: 90,
    securityEventRetentionDays: 365,
    certificateEventRetentionDays: 730,
    archiveBeforeDelete: true,
    cleanupBatchSize: 1000,
    autoCleanupEnabled: true,
  }),
});

type MockIntegrityService = ReturnType<typeof createMockIntegrityService>;
type MockRetentionService = ReturnType<typeof createMockRetentionService>;

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepo: MockRepository;
  let mockIntegrityService: MockIntegrityService;
  let mockRetentionService: MockRetentionService;

  beforeEach(async () => {
    auditLogRepo = createMockRepository();
    mockIntegrityService = createMockIntegrityService();
    mockRetentionService = createMockRetentionService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: auditLogRepo,
        },
        {
          provide: AuditIntegrityService,
          useValue: mockIntegrityService,
        },
        {
          provide: AuditRetentionService,
          useValue: mockRetentionService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('log', () => {
    it('should create an audit log entry with hash chain, signature, and archive date', async () => {
      const dto = {
        eventType: AuditEventType.USER_CREATED,
        entityType: 'User',
        entityId: '01234567-89ab-cdef-0123-456789abcdef',
        action: AuditAction.CREATE,
        newValues: { email: 'test@example.com' },
      };

      const context = {
        actorId: 'actor-123',
        actorIp: '192.168.1.1',
        actorUserAgent: 'Test/1.0',
      };

      const qb = auditLogRepo.createQueryBuilder();
      qb.getOne.mockResolvedValue(null);

      const savedEntry = {
        id: '1',
        ...dto,
        ...context,
        prevHash: null,
        currHash: 'somehash',
        signature: 'mocksignature123',
        archiveAfter: new Date('2026-04-27'),
        createdAt: new Date(),
      };

      auditLogRepo.save.mockResolvedValue(savedEntry);

      const result = await service.log(dto, context);

      expect(result).toBeDefined();
      expect(result.eventType).toBe(dto.eventType);
      expect(result.entityType).toBe(dto.entityType);
      expect(result.entityId).toBe(dto.entityId);
      expect(auditLogRepo.save).toHaveBeenCalled();

      // Verify integrity service was called
      expect(mockIntegrityService.generateSignature).toHaveBeenCalled();

      // Verify retention service was called
      expect(mockRetentionService.calculateArchiveDate).toHaveBeenCalled();
    });

    it('should chain hash from previous entry', async () => {
      const previousEntry = {
        id: '1',
        currHash: 'previoushash123',
        eventType: AuditEventType.USER_CREATED,
      } as AuditLog;

      const qb = auditLogRepo.createQueryBuilder();
      qb.getOne.mockResolvedValue(previousEntry);

      const dto = {
        eventType: AuditEventType.USER_UPDATED,
        entityType: 'User',
        entityId: 'user-123',
        action: AuditAction.UPDATE,
      };

      auditLogRepo.save.mockImplementation((entry: AuditLog) => {
        return Promise.resolve(
          Object.assign({}, entry, {
            id: '2',
            createdAt: new Date(),
          }) as AuditLog,
        );
      });

      const result = await service.log(dto);

      expect(result.prevHash).toBe('previoushash123');
      expect(result.currHash).toBeDefined();
      expect(result.currHash).not.toBe('previoushash123');
    });

    it('should calculate consistent hash for same input', async () => {
      const qb = auditLogRepo.createQueryBuilder();
      qb.getOne.mockResolvedValue(null);

      const dto = {
        eventType: AuditEventType.LOGIN_SUCCESS,
        entityType: 'User',
        entityId: 'user-456',
        action: AuditAction.LOGIN,
      };

      let capturedHash: string | undefined;

      auditLogRepo.save.mockImplementation((entry: AuditLog) => {
        capturedHash = entry.currHash;
        return Promise.resolve(
          Object.assign({}, entry, {
            id: '1',
            createdAt: new Date(),
          }) as AuditLog,
        );
      });

      await service.log(dto);

      const expectedData = {
        eventType: dto.eventType,
        entityType: dto.entityType,
        entityId: dto.entityId,
        action: dto.action,
        actorId: null,
        oldValues: null,
        newValues: null,
        prevHash: null,
      };

      const expectedHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(expectedData))
        .digest('hex');

      expect(capturedHash).toBe(expectedHash);
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const logs = [
        { id: '1', eventType: AuditEventType.USER_CREATED } as AuditLog,
        { id: '2', eventType: AuditEventType.USER_UPDATED } as AuditLog,
      ];

      const qb = auditLogRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([logs, 2]);

      const result = await service.findAll({ first: 10 });

      expect(result.edges).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('should filter by entity type', async () => {
      const qb = auditLogRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ entityType: 'Certificate' });

      expect(qb.where).toHaveBeenCalledWith('audit.entityType = :entityType', {
        entityType: 'Certificate',
      });
    });

    it('should filter by date range', async () => {
      const qb = auditLogRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      await service.findAll({ startDate, endDate });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'audit.createdAt BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    });
  });

  describe('findByEntity', () => {
    it('should find logs for specific entity', async () => {
      const logs = [{ id: '1' } as AuditLog];
      auditLogRepo.find.mockResolvedValue(logs);

      const result = await service.findByEntity('Certificate', 'cert-123');

      expect(result).toEqual(logs);
      expect(auditLogRepo.find).toHaveBeenCalledWith({
        where: { entityType: 'Certificate', entityId: 'cert-123' },
        relations: ['actor'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('validateHashChain', () => {
    it('should validate valid hash chain', async () => {
      const entry1 = new AuditLog();
      entry1.id = '1';
      entry1.eventType = AuditEventType.USER_CREATED;
      entry1.entityType = 'User';
      entry1.entityId = 'user-1';
      entry1.action = AuditAction.CREATE;
      entry1.actorId = null;
      entry1.oldValues = null;
      entry1.newValues = null;
      entry1.prevHash = null;

      const data1 = {
        eventType: entry1.eventType,
        entityType: entry1.entityType,
        entityId: entry1.entityId,
        action: entry1.action,
        actorId: entry1.actorId,
        oldValues: entry1.oldValues,
        newValues: entry1.newValues,
        prevHash: entry1.prevHash,
      };
      entry1.currHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(data1))
        .digest('hex');

      const entry2 = new AuditLog();
      entry2.id = '2';
      entry2.eventType = AuditEventType.USER_UPDATED;
      entry2.entityType = 'User';
      entry2.entityId = 'user-1';
      entry2.action = AuditAction.UPDATE;
      entry2.actorId = null;
      entry2.oldValues = null;
      entry2.newValues = null;
      entry2.prevHash = entry1.currHash;

      const data2 = {
        eventType: entry2.eventType,
        entityType: entry2.entityType,
        entityId: entry2.entityId,
        action: entry2.action,
        actorId: entry2.actorId,
        oldValues: entry2.oldValues,
        newValues: entry2.newValues,
        prevHash: entry2.prevHash,
      };
      entry2.currHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(data2))
        .digest('hex');

      const qb = auditLogRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([entry1, entry2]);

      const result = await service.validateHashChain();

      expect(result.valid).toBe(true);
      expect(result.entriesChecked).toBe(2);
    });

    it('should detect invalid hash chain', async () => {
      // Entry 1 has a valid hash
      const entry1 = new AuditLog();
      entry1.id = '1';
      entry1.eventType = AuditEventType.USER_CREATED;
      entry1.entityType = 'User';
      entry1.entityId = 'user-1';
      entry1.action = AuditAction.CREATE;
      entry1.actorId = null;
      entry1.oldValues = null;
      entry1.newValues = null;
      entry1.prevHash = null;

      // Calculate the real hash for entry1
      const data1 = {
        eventType: entry1.eventType,
        entityType: entry1.entityType,
        entityId: entry1.entityId,
        action: entry1.action,
        actorId: entry1.actorId,
        oldValues: entry1.oldValues,
        newValues: entry1.newValues,
        prevHash: entry1.prevHash,
      };
      entry1.currHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(data1))
        .digest('hex');

      // Entry 2 has an INVALID prevHash (doesn't match entry1.currHash)
      const entry2 = new AuditLog();
      entry2.id = '2';
      entry2.eventType = AuditEventType.USER_UPDATED;
      entry2.entityType = 'User';
      entry2.entityId = 'user-1';
      entry2.action = AuditAction.UPDATE;
      entry2.actorId = null;
      entry2.oldValues = null;
      entry2.newValues = null;
      entry2.prevHash = 'wronghash'; // This doesn't match entry1.currHash

      const qb = auditLogRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([entry1, entry2]);

      const result = await service.validateHashChain();

      expect(result.valid).toBe(false);
      expect(result.firstInvalidEntry).toBe('2');
    });

    it('should return valid for empty log', async () => {
      const qb = auditLogRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([]);

      const result = await service.validateHashChain();

      expect(result.valid).toBe(true);
      expect(result.entriesChecked).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return aggregated statistics', async () => {
      const qb = auditLogRepo.createQueryBuilder();
      qb.getCount.mockResolvedValue(100);
      qb.getRawMany
        .mockResolvedValueOnce([
          { eventType: 'USER_CREATED', count: '50' },
          { eventType: 'USER_UPDATED', count: '50' },
        ])
        .mockResolvedValueOnce([
          { entityType: 'User', count: '80' },
          { entityType: 'Certificate', count: '20' },
        ])
        .mockResolvedValueOnce([
          { action: 'CREATE', count: '60' },
          { action: 'UPDATE', count: '40' },
        ]);

      const result = await service.getStatistics();

      expect(result.totalEntries).toBe(100);
      expect(result.byEventType).toEqual({
        USER_CREATED: 50,
        USER_UPDATED: 50,
      });
      expect(result.byEntityType).toEqual({
        User: 80,
        Certificate: 20,
      });
      expect(result.byAction).toEqual({
        CREATE: 60,
        UPDATE: 40,
      });
    });
  });

  describe('validateIntegrity', () => {
    it('should return combined hash chain and signature validation results', async () => {
      // Create valid entries with proper hash chain
      const entry1 = new AuditLog();
      entry1.id = '1';
      entry1.eventType = AuditEventType.USER_CREATED;
      entry1.entityType = 'User';
      entry1.entityId = 'user-1';
      entry1.action = AuditAction.CREATE;
      entry1.actorId = null;
      entry1.oldValues = null;
      entry1.newValues = null;
      entry1.prevHash = null;
      entry1.signature = 'sig1';

      const data1 = {
        eventType: entry1.eventType,
        entityType: entry1.entityType,
        entityId: entry1.entityId,
        action: entry1.action,
        actorId: entry1.actorId,
        oldValues: entry1.oldValues,
        newValues: entry1.newValues,
        prevHash: entry1.prevHash,
      };
      entry1.currHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(data1))
        .digest('hex');

      const qb = auditLogRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([entry1]);

      mockIntegrityService.verifyBatch.mockReturnValue({
        valid: true,
        entriesChecked: 1,
        invalidEntries: [],
      });

      const result = await service.validateIntegrity();

      expect(result.overallValid).toBe(true);
      expect(result.hashChain.valid).toBe(true);
      expect(result.hashChain.entriesChecked).toBe(1);
      expect(result.signatures?.valid).toBe(true);
      expect(mockIntegrityService.verifyBatch).toHaveBeenCalled();
    });

    it('should return invalid when signature verification fails', async () => {
      const entry1 = new AuditLog();
      entry1.id = '1';
      entry1.eventType = AuditEventType.USER_CREATED;
      entry1.entityType = 'User';
      entry1.entityId = 'user-1';
      entry1.action = AuditAction.CREATE;
      entry1.actorId = null;
      entry1.oldValues = null;
      entry1.newValues = null;
      entry1.prevHash = null;
      entry1.signature = 'invalid-sig';

      const data1 = {
        eventType: entry1.eventType,
        entityType: entry1.entityType,
        entityId: entry1.entityId,
        action: entry1.action,
        actorId: entry1.actorId,
        oldValues: entry1.oldValues,
        newValues: entry1.newValues,
        prevHash: entry1.prevHash,
      };
      entry1.currHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(data1))
        .digest('hex');

      const qb = auditLogRepo.createQueryBuilder();
      qb.getMany.mockResolvedValue([entry1]);

      mockIntegrityService.verifyBatch.mockReturnValue({
        valid: false,
        entriesChecked: 1,
        invalidEntries: [
          {
            valid: false,
            entryId: '1',
            errorMessage: 'Signature mismatch',
          },
        ],
        errorMessage: '1 of 1 entries have invalid signatures',
      });

      const result = await service.validateIntegrity();

      expect(result.overallValid).toBe(false);
      expect(result.hashChain.valid).toBe(true);
      expect(result.signatures?.valid).toBe(false);
    });
  });
});
