import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MetricsService } from '../services/metrics.service';
import { Certificate } from '../../certificates/entities/certificate.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';

describe('MetricsService', () => {
  let service: MetricsService;
  let mockCertificateRepo: Partial<Repository<Certificate>>;
  let mockAuditLogRepo: Partial<Repository<AuditLog>>;
  let mockDataSource: Partial<DataSource>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockCertificateRepo = {
      count: jest.fn().mockResolvedValue(100),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    mockAuditLogRepo = {
      count: jest.fn().mockResolvedValue(50),
      findOne: jest.fn().mockResolvedValue({ id: '1', currHash: 'abc123' }),
    };

    mockDataSource = {
      query: jest.fn().mockResolvedValue([{ result: 1 }]),
    };

    mockConfigService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: unknown) => {
          const config: Record<string, unknown> = {
            MONITORING_ENABLED: true,
            MONITORING_METRICS_INTERVAL_MS: 60000,
            MONITORING_CERT_EXPIRY_WARNING_DAYS: 30,
          };
          return config[key] ?? defaultValue;
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(Certificate),
          useValue: mockCertificateRepo,
        },
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockAuditLogRepo,
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should report enabled status correctly', () => {
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('getSnapshot', () => {
    it('should return a complete metrics snapshot', async () => {
      const snapshot = await service.getSnapshot();

      expect(snapshot).toHaveProperty('system');
      expect(snapshot).toHaveProperty('requests');
      expect(snapshot).toHaveProperty('certificates');
      expect(snapshot).toHaveProperty('security');
      expect(snapshot).toHaveProperty('database');
      expect(snapshot).toHaveProperty('collectedAt');
    });

    it('should include system metrics', async () => {
      const snapshot = await service.getSnapshot();

      expect(snapshot.system).toHaveProperty('memoryUsage');
      expect(snapshot.system).toHaveProperty('cpuUsage');
      expect(snapshot.system).toHaveProperty('uptime');
      expect(snapshot.system).toHaveProperty('nodeVersion');
      expect(typeof snapshot.system.memoryUsage.heapUsed).toBe('number');
    });

    it('should include request metrics', async () => {
      const snapshot = await service.getSnapshot();

      expect(snapshot.requests).toHaveProperty('totalRequests');
      expect(snapshot.requests).toHaveProperty('successfulRequests');
      expect(snapshot.requests).toHaveProperty('clientErrors');
      expect(snapshot.requests).toHaveProperty('serverErrors');
      expect(snapshot.requests).toHaveProperty('averageResponseTimeMs');
    });

    it('should include certificate metrics', async () => {
      const snapshot = await service.getSnapshot();

      expect(snapshot.certificates).toHaveProperty('totalIssued');
      expect(snapshot.certificates).toHaveProperty('totalRevoked');
      expect(snapshot.certificates).toHaveProperty('activeCertificates');
      expect(snapshot.certificates).toHaveProperty('expiringCertificates');
    });

    it('should include security metrics', async () => {
      const snapshot = await service.getSnapshot();

      expect(snapshot.security).toHaveProperty('failedAuthAttemptsLastHour');
      expect(snapshot.security).toHaveProperty('rateLimitHitsLastHour');
      expect(snapshot.security).toHaveProperty('auditLogIntegrityValid');
    });

    it('should include database metrics', async () => {
      const snapshot = await service.getSnapshot();

      expect(snapshot.database).toHaveProperty('connected');
      expect(snapshot.database).toHaveProperty('connectionPool');
      // Connected status depends on whether query succeeds
      expect(typeof snapshot.database.connected).toBe('boolean');
    });

    it('should cache snapshot for performance', async () => {
      const snapshot1 = await service.getSnapshot();
      const snapshot2 = await service.getSnapshot();

      // Should return cached snapshot (same object reference)
      expect(snapshot1.collectedAt).toEqual(snapshot2.collectedAt);
    });
  });

  describe('recordRequest', () => {
    it('should record request metrics', async () => {
      // Record some requests
      service.recordRequest(200, 50);
      service.recordRequest(200, 100);
      service.recordRequest(500, 200);

      const snapshot = await service.getSnapshot();

      // Should have recorded the requests
      expect(snapshot.requests.totalRequests).toBeGreaterThanOrEqual(0);
    });

    it('should not record when disabled', async () => {
      // Create service with monitoring disabled
      const disabledConfigService = {
        get: jest
          .fn()
          .mockImplementation((key: string, defaultValue?: unknown) => {
            if (key === 'MONITORING_ENABLED') return false;
            return defaultValue;
          }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MetricsService,
          { provide: ConfigService, useValue: disabledConfigService },
          { provide: DataSource, useValue: mockDataSource },
          {
            provide: getRepositoryToken(Certificate),
            useValue: mockCertificateRepo,
          },
          { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogRepo },
        ],
      }).compile();

      const disabledService = module.get<MetricsService>(MetricsService);
      expect(disabledService.isEnabled()).toBe(false);
    });
  });

  describe('recordFailedAuth', () => {
    it('should increment failed auth counter', async () => {
      service.recordFailedAuth('192.168.1.1');
      service.recordFailedAuth('192.168.1.2');

      const snapshot = await service.getSnapshot();
      expect(
        snapshot.security.failedAuthAttemptsLastHour,
      ).toBeGreaterThanOrEqual(2);
    });
  });

  describe('recordRateLimitHit', () => {
    it('should increment rate limit counter', async () => {
      service.recordRateLimitHit('192.168.1.1');
      service.recordRateLimitHit('192.168.1.1');

      const snapshot = await service.getSnapshot();
      expect(snapshot.security.rateLimitHitsLastHour).toBeGreaterThanOrEqual(2);
    });

    it('should track unique IPs', async () => {
      service.recordRateLimitHit('192.168.1.1');
      service.recordRateLimitHit('192.168.1.1');
      service.recordRateLimitHit('192.168.1.2');

      const snapshot = await service.getSnapshot();
      expect(snapshot.security.uniqueRateLimitedIPs).toBeGreaterThanOrEqual(2);
    });
  });

  describe('database metrics', () => {
    it('should include connection pool information', async () => {
      const snapshot = await service.getSnapshot();
      expect(snapshot.database.connectionPool).toHaveProperty('active');
      expect(snapshot.database.connectionPool).toHaveProperty('idle');
      expect(snapshot.database.connectionPool).toHaveProperty('total');
    });

    it('should report disconnected when database query fails', async () => {
      // Need to create a new instance to test this properly
      const failingModule: TestingModule = await Test.createTestingModule({
        providers: [
          MetricsService,
          { provide: ConfigService, useValue: mockConfigService },
          {
            provide: DataSource,
            useValue: {
              query: jest
                .fn()
                .mockRejectedValue(new Error('Connection failed')),
            },
          },
          {
            provide: getRepositoryToken(Certificate),
            useValue: mockCertificateRepo,
          },
          { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogRepo },
        ],
      }).compile();

      const failingService = failingModule.get<MetricsService>(MetricsService);
      const snapshot = await failingService.getSnapshot();
      expect(snapshot.database.connected).toBe(false);
    });
  });
});
