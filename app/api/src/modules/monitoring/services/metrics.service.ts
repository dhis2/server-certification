import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan, LessThan, And } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Certificate } from '../../certificates/entities/certificate.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import {
  SystemMetrics,
  RequestMetrics,
  CertificateMetrics,
  SecurityMetrics,
  DatabaseMetrics,
  MetricsSnapshot,
} from '../interfaces';

interface RequestRecord {
  timestamp: number;
  responseTimeMs: number;
  statusCode: number;
}

/**
 * MetricsService collects and aggregates system and application metrics.
 *
 * Implements NIST SP 800-137 (Information Security Continuous Monitoring):
 * - Ongoing awareness of security state
 * - Metrics-based decision support
 * - Automated data collection
 *
 * Implements NIST SP 800-53 CA-7 (Continuous Monitoring):
 * - Monitoring of security controls
 * - Assessment of security state
 * - Reporting of security status
 *
 * @see https://csrc.nist.gov/publications/detail/sp/800-137/final
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  private readonly enabled: boolean;
  private readonly metricsIntervalMs: number;
  private readonly certExpiryWarningDays: number;

  // In-memory request tracking (circular buffer)
  private readonly requestBuffer: RequestRecord[] = [];
  private readonly maxBufferSize = 10000;
  private requestBufferIndex = 0;

  // Cached metrics
  private cachedSnapshot: MetricsSnapshot | null = null;
  private lastSnapshotTime = 0;
  private readonly snapshotCacheTtlMs = 5000; // 5 seconds

  // Security event counters (reset hourly)
  private failedAuthAttempts = 0;
  private rateLimitHits = 0;
  private rateLimitedIPs = new Set<string>();
  private lastHourlyReset = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(Certificate)
    private readonly certificateRepo: Repository<Certificate>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {
    this.enabled = this.configService.get<boolean>('MONITORING_ENABLED', true);
    this.metricsIntervalMs = this.configService.get<number>(
      'MONITORING_METRICS_INTERVAL_MS',
      60000,
    );
    this.certExpiryWarningDays = this.configService.get<number>(
      'MONITORING_CERT_EXPIRY_WARNING_DAYS',
      30,
    );
  }

  onModuleInit(): void {
    if (this.enabled) {
      this.logger.log(
        `Metrics collection enabled (interval: ${this.metricsIntervalMs.toString()}ms)`,
      );
    } else {
      this.logger.warn('Metrics collection disabled');
    }
  }

  recordRequest(statusCode: number, responseTimeMs: number): void {
    if (!this.enabled) return;

    const record: RequestRecord = {
      timestamp: Date.now(),
      responseTimeMs,
      statusCode,
    };

    this.requestBuffer[this.requestBufferIndex] = record;
    this.requestBufferIndex =
      (this.requestBufferIndex + 1) % this.maxBufferSize;
  }

  recordFailedAuth(ip?: string): void {
    if (!this.enabled) return;
    this.failedAuthAttempts++;
    if (ip) {
      this.rateLimitedIPs.add(ip);
    }
  }

  recordRateLimitHit(ip?: string): void {
    if (!this.enabled) return;
    this.rateLimitHits++;
    if (ip) {
      this.rateLimitedIPs.add(ip);
    }
  }

  async getSnapshot(): Promise<MetricsSnapshot> {
    const now = Date.now();

    if (
      this.cachedSnapshot &&
      now - this.lastSnapshotTime < this.snapshotCacheTtlMs
    ) {
      return this.cachedSnapshot;
    }

    const [system, requests, certificates, security, database] =
      await Promise.all([
        this.collectSystemMetrics(),
        this.collectRequestMetrics(),
        this.collectCertificateMetrics(),
        this.collectSecurityMetrics(),
        this.collectDatabaseMetrics(),
      ]);

    this.cachedSnapshot = {
      system,
      requests,
      certificates,
      security,
      database,
      collectedAt: new Date(),
    };
    this.lastSnapshotTime = now;

    return this.cachedSnapshot;
  }

  private collectSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const cpuPercent =
      ((cpuUsage.user + cpuUsage.system) / 1000000 / process.uptime()) * 100;

    return {
      memoryUsage: {
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
      },
      cpuUsage: Math.min(100, Math.round(cpuPercent * 100) / 100),
      uptime: Math.floor(process.uptime()),
      nodeVersion: process.version,
      timestamp: new Date(),
    };
  }

  private collectRequestMetrics(): RequestMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentRequests = this.requestBuffer.filter(
      (r) => r && r.timestamp > oneMinuteAgo,
    );

    if (recentRequests.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        clientErrors: 0,
        serverErrors: 0,
        averageResponseTimeMs: 0,
        p95ResponseTimeMs: 0,
        p99ResponseTimeMs: 0,
        requestsPerSecond: 0,
      };
    }

    const responseTimes = recentRequests
      .map((r) => r.responseTimeMs)
      .sort((a, b) => a - b);
    const successful = recentRequests.filter(
      (r) => r.statusCode >= 200 && r.statusCode < 300,
    ).length;
    const clientErrors = recentRequests.filter(
      (r) => r.statusCode >= 400 && r.statusCode < 500,
    ).length;
    const serverErrors = recentRequests.filter(
      (r) => r.statusCode >= 500,
    ).length;

    const avgTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    return {
      totalRequests: recentRequests.length,
      successfulRequests: successful,
      clientErrors,
      serverErrors,
      averageResponseTimeMs: Math.round(avgTime * 100) / 100,
      p95ResponseTimeMs: responseTimes[p95Index] ?? 0,
      p99ResponseTimeMs: responseTimes[p99Index] ?? 0,
      requestsPerSecond: Math.round((recentRequests.length / 60) * 100) / 100,
    };
  }

  private async collectCertificateMetrics(): Promise<CertificateMetrics> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const expiryWarningDate = new Date(
      now.getTime() + this.certExpiryWarningDays * 24 * 60 * 60 * 1000,
    );

    try {
      const [
        totalIssued,
        totalRevoked,
        activeCertificates,
        expiringCertificates,
        expiredCertificates,
        issuedLast24Hours,
        revokedLast24Hours,
      ] = await Promise.all([
        this.certificateRepo.count(),
        this.certificateRepo.count({ where: { isRevoked: true } }),
        this.certificateRepo.count({
          where: {
            isRevoked: false,
            validUntil: MoreThan(now),
          },
        }),
        this.certificateRepo.count({
          where: {
            isRevoked: false,
            validUntil: And(MoreThan(now), LessThan(expiryWarningDate)),
          },
        }),
        this.certificateRepo.count({
          where: {
            validUntil: LessThan(now),
          },
        }),
        this.certificateRepo.count({
          where: {
            issuedAt: MoreThan(twentyFourHoursAgo),
          },
        }),
        this.certificateRepo.count({
          where: {
            isRevoked: true,
            revokedAt: MoreThan(twentyFourHoursAgo),
          },
        }),
      ]);

      const verificationsLast24Hours = await this.auditLogRepo.count({
        where: {
          eventType: 'CERTIFICATE_VERIFIED',
          createdAt: MoreThan(twentyFourHoursAgo),
        },
      });

      return {
        totalIssued,
        totalRevoked,
        activeCertificates,
        expiringCertificates,
        expiredCertificates,
        issuedLast24Hours,
        revokedLast24Hours,
        verificationsLast24Hours,
      };
    } catch (error) {
      this.logger.error('Failed to collect certificate metrics', error);
      return {
        totalIssued: 0,
        totalRevoked: 0,
        activeCertificates: 0,
        expiringCertificates: 0,
        expiredCertificates: 0,
        issuedLast24Hours: 0,
        revokedLast24Hours: 0,
        verificationsLast24Hours: 0,
      };
    }
  }

  private async collectSecurityMetrics(): Promise<SecurityMetrics> {
    const now = Date.now();
    if (now - this.lastHourlyReset > 3600000) {
      this.failedAuthAttempts = 0;
      this.rateLimitHits = 0;
      this.rateLimitedIPs.clear();
      this.lastHourlyReset = now;
    }

    let auditLogIntegrityValid = true;
    try {
      const lastEntry = await this.auditLogRepo.findOne({
        where: {},
        order: { id: 'DESC' },
      });
      auditLogIntegrityValid = lastEntry?.currHash != null;
    } catch {
      auditLogIntegrityValid = false;
    }

    return {
      failedAuthAttemptsLastHour: this.failedAuthAttempts,
      rateLimitHitsLastHour: this.rateLimitHits,
      uniqueRateLimitedIPs: this.rateLimitedIPs.size,
      suspiciousActivityCount: 0, // Placeholder for future implementation
      lastSecurityScanAt: null, // Placeholder for future implementation
      auditLogIntegrityValid,
    };
  }

  private async collectDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      await this.dataSource.query('SELECT 1');

      const driver = this.dataSource.driver as {
        pool?: { size?: number; available?: number; pending?: number };
      };
      const pool = driver.pool;

      return {
        connectionPool: {
          active: pool?.size ? pool.size - (pool.available ?? 0) : 0,
          idle: pool?.available ?? 0,
          waiting: pool?.pending ?? 0,
          total: pool?.size ?? 0,
        },
        averageQueryTimeMs: 0, // Would need query logging to implement
        slowQueriesLastHour: 0, // Would need query logging to implement
        databaseSizeBytes: null, // Requires admin privileges
        connected: true,
      };
    } catch (error) {
      this.logger.error('Failed to collect database metrics', error);
      return {
        connectionPool: {
          active: 0,
          idle: 0,
          waiting: 0,
          total: 0,
        },
        averageQueryTimeMs: 0,
        slowQueriesLastHour: 0,
        databaseSizeBytes: null,
        connected: false,
      };
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async logMetricsSummary(): Promise<void> {
    if (!this.enabled) return;

    try {
      const snapshot = await this.getSnapshot();
      const memoryMB = Math.round(
        snapshot.system.memoryUsage.heapUsed / 1024 / 1024,
      );

      this.logger.log(
        `[Metrics] Memory: ${memoryMB.toString()}MB | ` +
          `Requests/min: ${snapshot.requests.totalRequests.toString()} | ` +
          `Errors: ${snapshot.requests.serverErrors.toString()} | ` +
          `Active certs: ${snapshot.certificates.activeCertificates.toString()} | ` +
          `Expiring: ${snapshot.certificates.expiringCertificates.toString()}`,
      );
    } catch (error) {
      this.logger.error('Failed to log metrics summary', error);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
