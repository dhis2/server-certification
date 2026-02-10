import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AlertingService } from '../services/alerting.service';
import { MetricsService } from '../services/metrics.service';
import { AlertSeverity, AlertCategory } from '../interfaces';

describe('AlertingService', () => {
  let service: AlertingService;
  let mockMetricsService: Partial<MetricsService>;
  let mockConfigService: Partial<ConfigService>;

  const createMockSnapshot = (overrides: Record<string, unknown> = {}) => ({
    system: {
      memoryUsage: {
        heapTotal: 100 * 1024 * 1024,
        heapUsed: 50 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 120 * 1024 * 1024,
      },
      cpuUsage: 25,
      uptime: 3600,
      nodeVersion: 'v20.0.0',
      timestamp: new Date(),
    },
    requests: {
      totalRequests: 1000,
      successfulRequests: 950,
      clientErrors: 40,
      serverErrors: 10,
      averageResponseTimeMs: 150,
      p95ResponseTimeMs: 300,
      p99ResponseTimeMs: 500,
      requestsPerSecond: 16.67,
    },
    certificates: {
      totalIssued: 500,
      totalRevoked: 10,
      activeCertificates: 450,
      expiringCertificates: 0,
      expiredCertificates: 40,
      issuedLast24Hours: 5,
      revokedLast24Hours: 0,
      verificationsLast24Hours: 100,
    },
    security: {
      failedAuthAttemptsLastHour: 5,
      rateLimitHitsLastHour: 10,
      uniqueRateLimitedIPs: 3,
      suspiciousActivityCount: 0,
      lastSecurityScanAt: null,
      auditLogIntegrityValid: true,
    },
    database: {
      connectionPool: {
        active: 5,
        idle: 15,
        waiting: 0,
        total: 20,
      },
      averageQueryTimeMs: 10,
      slowQueriesLastHour: 0,
      databaseSizeBytes: null,
      connected: true,
    },
    collectedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    mockMetricsService = {
      getSnapshot: jest.fn().mockResolvedValue(createMockSnapshot()),
      isEnabled: jest.fn().mockReturnValue(true),
    };

    mockConfigService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: unknown) => {
          const config: Record<string, unknown> = {
            MONITORING_ENABLED: true,
            NODE_ENV: 'test',
            MONITORING_ERROR_RATE_THRESHOLD: 5,
            MONITORING_CERT_EXPIRY_WARNING_DAYS: 30,
            MONITORING_ALERT_WEBHOOK_URL: undefined,
            MONITORING_SLACK_WEBHOOK_URL: undefined,
          };
          return config[key] ?? defaultValue;
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertingService,
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AlertingService>(AlertingService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default alert rules', () => {
      const rules = service.getAlertRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should have configured thresholds', () => {
      const thresholds = service.getThresholds();
      expect(thresholds).toHaveProperty('errorRatePercent');
      expect(thresholds).toHaveProperty('memoryUsagePercent');
      expect(thresholds).toHaveProperty('certificateExpiryDays');
    });
  });

  describe('getAlertSummary', () => {
    it('should return empty summary when no alerts', () => {
      const summary = service.getAlertSummary();

      expect(summary.totalActive).toBe(0);
      expect(summary.mostRecent).toBeNull();
      expect(summary.bySeverity[AlertSeverity.CRITICAL]).toBe(0);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return empty array when no active alerts', () => {
      const alerts = service.getActiveAlerts();
      expect(alerts).toEqual([]);
    });
  });

  describe('evaluateAlerts', () => {
    it('should not trigger alerts when metrics are within thresholds', async () => {
      await service.evaluateAlerts();

      const alerts = service.getActiveAlerts();
      expect(alerts.length).toBe(0);
    });

    it('should trigger alert when error rate exceeds threshold', async () => {
      // Set up high error rate
      jest.mocked(mockMetricsService.getSnapshot!).mockResolvedValue(
        createMockSnapshot({
          requests: {
            totalRequests: 100,
            successfulRequests: 80,
            clientErrors: 5,
            serverErrors: 15, // 15% error rate
            averageResponseTimeMs: 150,
            p95ResponseTimeMs: 300,
            p99ResponseTimeMs: 500,
            requestsPerSecond: 1.67,
          },
        }),
      );

      await service.evaluateAlerts();

      const alerts = service.getActiveAlerts();
      const errorRateAlert = alerts.find((a) => a.ruleId === 'high-error-rate');
      expect(errorRateAlert).toBeDefined();
    });

    it('should trigger alert when database disconnected', async () => {
      jest.mocked(mockMetricsService.getSnapshot!).mockResolvedValue(
        createMockSnapshot({
          database: {
            connectionPool: { active: 0, idle: 0, waiting: 0, total: 0 },
            averageQueryTimeMs: 0,
            slowQueriesLastHour: 0,
            databaseSizeBytes: null,
            connected: false,
          },
        }),
      );

      await service.evaluateAlerts();

      const alerts = service.getActiveAlerts();
      const dbAlert = alerts.find((a) => a.ruleId === 'db-connection-error');
      expect(dbAlert).toBeDefined();
      expect(dbAlert?.severity).toBe(AlertSeverity.EMERGENCY);
    });

    it('should trigger alert when certificates are expiring', async () => {
      jest.mocked(mockMetricsService.getSnapshot!).mockResolvedValue(
        createMockSnapshot({
          certificates: {
            totalIssued: 500,
            totalRevoked: 10,
            activeCertificates: 450,
            expiringCertificates: 25, // Some certificates expiring
            expiredCertificates: 40,
            issuedLast24Hours: 5,
            revokedLast24Hours: 0,
            verificationsLast24Hours: 100,
          },
        }),
      );

      await service.evaluateAlerts();

      const alerts = service.getActiveAlerts();
      const expiryAlert = alerts.find(
        (a) => a.ruleId === 'certificates-expiring',
      );
      expect(expiryAlert).toBeDefined();
      expect(expiryAlert?.category).toBe(AlertCategory.CERTIFICATE);
    });

    it('should trigger alert when failed auth attempts are high', async () => {
      jest.mocked(mockMetricsService.getSnapshot!).mockResolvedValue(
        createMockSnapshot({
          security: {
            failedAuthAttemptsLastHour: 150, // Exceeds threshold of 100
            rateLimitHitsLastHour: 10,
            uniqueRateLimitedIPs: 3,
            suspiciousActivityCount: 0,
            lastSecurityScanAt: null,
            auditLogIntegrityValid: true,
          },
        }),
      );

      await service.evaluateAlerts();

      const alerts = service.getActiveAlerts();
      const authAlert = alerts.find((a) => a.ruleId === 'high-failed-auth');
      expect(authAlert).toBeDefined();
      expect(authAlert?.severity).toBe(AlertSeverity.CRITICAL);
      expect(authAlert?.category).toBe(AlertCategory.SECURITY);
    });

    it('should trigger alert when audit log integrity fails', async () => {
      jest.mocked(mockMetricsService.getSnapshot!).mockResolvedValue(
        createMockSnapshot({
          security: {
            failedAuthAttemptsLastHour: 5,
            rateLimitHitsLastHour: 10,
            uniqueRateLimitedIPs: 3,
            suspiciousActivityCount: 0,
            lastSecurityScanAt: null,
            auditLogIntegrityValid: false, // Integrity failure!
          },
        }),
      );

      await service.evaluateAlerts();

      const alerts = service.getActiveAlerts();
      const integrityAlert = alerts.find(
        (a) => a.ruleId === 'audit-log-integrity',
      );
      expect(integrityAlert).toBeDefined();
      expect(integrityAlert?.severity).toBe(AlertSeverity.EMERGENCY);
      expect(integrityAlert?.category).toBe(AlertCategory.COMPLIANCE);
    });
  });

  describe('triggerManualAlert', () => {
    it('should create manual alert', async () => {
      const alert = await service.triggerManualAlert(
        'Test Alert',
        'This is a test alert message',
        AlertSeverity.WARNING,
        AlertCategory.SYSTEM,
      );

      expect(alert).toBeDefined();
      expect(alert.title).toBe('Test Alert');
      expect(alert.message).toBe('This is a test alert message');
      expect(alert.severity).toBe(AlertSeverity.WARNING);
      expect(alert.category).toBe(AlertCategory.SYSTEM);
      expect(alert.ruleId).toBe('manual');
      expect(alert.isActive).toBe(true);
    });

    it('should include environment metadata', async () => {
      const alert = await service.triggerManualAlert(
        'Test',
        'Test message',
        AlertSeverity.INFO,
        AlertCategory.APPLICATION,
      );

      expect(alert.metadata).toHaveProperty('manual', true);
      expect(alert.metadata).toHaveProperty('environment', 'test');
    });
  });

  describe('alert rules', () => {
    it('should have system category rules', () => {
      const rules = service.getAlertRules();
      const systemRules = rules.filter(
        (r) => r.category === AlertCategory.SYSTEM,
      );
      expect(systemRules.length).toBeGreaterThan(0);
    });

    it('should have security category rules', () => {
      const rules = service.getAlertRules();
      const securityRules = rules.filter(
        (r) => r.category === AlertCategory.SECURITY,
      );
      expect(securityRules.length).toBeGreaterThan(0);
    });

    it('should have certificate category rules', () => {
      const rules = service.getAlertRules();
      const certRules = rules.filter(
        (r) => r.category === AlertCategory.CERTIFICATE,
      );
      expect(certRules.length).toBeGreaterThan(0);
    });

    it('should have database category rules', () => {
      const rules = service.getAlertRules();
      const dbRules = rules.filter(
        (r) => r.category === AlertCategory.DATABASE,
      );
      expect(dbRules.length).toBeGreaterThan(0);
    });

    it('should have compliance category rules', () => {
      const rules = service.getAlertRules();
      const complianceRules = rules.filter(
        (r) => r.category === AlertCategory.COMPLIANCE,
      );
      expect(complianceRules.length).toBeGreaterThan(0);
    });

    it('all rules should have required properties', () => {
      const rules = service.getAlertRules();

      for (const rule of rules) {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('description');
        expect(rule).toHaveProperty('category');
        expect(rule).toHaveProperty('severity');
        expect(rule).toHaveProperty('enabled');
        expect(rule).toHaveProperty('metric');
        expect(rule).toHaveProperty('operator');
        expect(rule).toHaveProperty('threshold');
        expect(rule).toHaveProperty('cooldownSeconds');
        expect(rule).toHaveProperty('channels');
      }
    });
  });
});
