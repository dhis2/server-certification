import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, type DeleteResult } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditLog, AuditEventType } from '../entities/audit-log.entity';

export interface AuditRetentionPolicy {
  /** Per NIST SP 800-92, minimum 90 days recommended */
  defaultRetentionDays: number;
  securityEventRetentionDays: number;
  certificateEventRetentionDays: number;
  /** Per NIST SP 800-92, logs should be archived for compliance */
  archiveBeforeDelete: boolean;
  cleanupBatchSize: number;
  autoCleanupEnabled: boolean;
}

export interface RetentionCleanupResult {
  success: boolean;
  archivedCount: number;
  deletedCount: number;
  errorMessage?: string;
  executionTimeMs: number;
}

export interface ArchivedAuditLog {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  createdAt: Date;
  archivedAt: Date;
  originalData: Record<string, unknown>;
}

const SECURITY_EVENT_TYPES: string[] = [
  AuditEventType.LOGIN_SUCCESS,
  AuditEventType.LOGIN_FAILED,
  AuditEventType.LOGOUT,
  AuditEventType.TOKEN_REFRESH,
  AuditEventType.PASSWORD_CHANGED,
  AuditEventType.USER_DEACTIVATED,
  AuditEventType.USER_ACTIVATED,
  AuditEventType.SETTINGS_CHANGED,
];

const CERTIFICATE_EVENT_TYPES: string[] = [
  AuditEventType.CERTIFICATE_ISSUED,
  AuditEventType.CERTIFICATE_REVOKED,
  AuditEventType.CERTIFICATE_VERIFIED,
];

/**
 * AuditRetentionService implements audit log retention policy management.
 *
 * Implements controls per:
 *
 * **NIST SP 800-92 - Guide to Computer Security Log Management:**
 * - Section 4.1: Log retention policies
 * - Section 4.2: Log archival requirements
 * - Organizations should retain logs based on regulatory requirements
 *
 * **NIST SP 800-53 - Security and Privacy Controls:**
 * - AU-4: Audit Storage Capacity
 * - AU-11: Audit Record Retention
 *
 * **SOC 2 Type II:**
 * - CC7.2: System monitoring and log retention
 *
 * Default retention periods:
 * - General logs: 90 days (NIST minimum recommendation)
 * - Security events: 365 days (authentication, authorization)
 * - Certificate events: 730 days (2 years, aligned with certificate validity)
 *
 * @see https://csrc.nist.gov/publications/detail/sp/800-92/final
 * @see https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
 */
@Injectable()
export class AuditRetentionService implements OnModuleInit {
  private readonly logger = new Logger(AuditRetentionService.name);

  private policy: AuditRetentionPolicy;

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly configService: ConfigService,
  ) {
    // ConfigService.get() may return strings from env vars, so parse explicitly
    this.policy = {
      defaultRetentionDays: this.parseIntWithDefault(
        this.configService.get('AUDIT_RETENTION_DEFAULT_DAYS'),
        90,
      ),
      securityEventRetentionDays: this.parseIntWithDefault(
        this.configService.get('AUDIT_RETENTION_SECURITY_DAYS'),
        365,
      ),
      certificateEventRetentionDays: this.parseIntWithDefault(
        this.configService.get('AUDIT_RETENTION_CERTIFICATE_DAYS'),
        730,
      ),
      archiveBeforeDelete:
        this.configService.get('AUDIT_RETENTION_ARCHIVE') === 'true' ||
        this.configService.get('AUDIT_RETENTION_ARCHIVE') === true ||
        this.configService.get('AUDIT_RETENTION_ARCHIVE') === undefined,
      cleanupBatchSize: this.parseIntWithDefault(
        this.configService.get('AUDIT_RETENTION_BATCH_SIZE'),
        1000,
      ),
      autoCleanupEnabled:
        this.configService.get('AUDIT_RETENTION_AUTO_CLEANUP') === 'true' ||
        this.configService.get('AUDIT_RETENTION_AUTO_CLEANUP') === true ||
        this.configService.get('AUDIT_RETENTION_AUTO_CLEANUP') === undefined,
    };
  }

  private parseIntWithDefault(value: unknown, defaultValue: number): number {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    const parsed =
      typeof value === 'number' ? value : parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Audit retention policy initialized:');
    this.logger.log(
      `  Default retention: ${this.policy.defaultRetentionDays.toString()} days`,
    );
    this.logger.log(
      `  Security events: ${this.policy.securityEventRetentionDays.toString()} days`,
    );
    this.logger.log(
      `  Certificate events: ${this.policy.certificateEventRetentionDays.toString()} days`,
    );
    this.logger.log(
      `  Archive before delete: ${this.policy.archiveBeforeDelete ? 'enabled' : 'disabled'}`,
    );
    this.logger.log(
      `  Auto cleanup: ${this.policy.autoCleanupEnabled ? 'enabled' : 'disabled'}`,
    );
  }

  getPolicy(): AuditRetentionPolicy {
    return { ...this.policy };
  }

  calculateArchiveDate(entry: Pick<AuditLog, 'eventType' | 'createdAt'>): Date {
    const now = new Date();
    let createdAt: Date;

    if (entry.createdAt instanceof Date && !isNaN(entry.createdAt.getTime())) {
      createdAt = entry.createdAt;
    } else if (entry.createdAt !== undefined && entry.createdAt !== null) {
      const parsed = new Date(entry.createdAt as unknown as string | number);
      createdAt = isNaN(parsed.getTime()) ? now : parsed;
    } else {
      createdAt = now;
    }

    let retentionDays: number;

    if (SECURITY_EVENT_TYPES.includes(entry.eventType)) {
      retentionDays = this.policy.securityEventRetentionDays;
    } else if (CERTIFICATE_EVENT_TYPES.includes(entry.eventType)) {
      retentionDays = this.policy.certificateEventRetentionDays;
    } else {
      retentionDays = this.policy.defaultRetentionDays;
    }

    if (!Number.isFinite(retentionDays) || retentionDays < 0) {
      retentionDays = 90; // NIST minimum
    }

    const archiveDate = new Date(createdAt.getTime());
    archiveDate.setDate(archiveDate.getDate() + retentionDays);

    if (isNaN(archiveDate.getTime())) {
      const fallback = new Date(now.getTime());
      fallback.setDate(fallback.getDate() + 90);
      return fallback;
    }

    return archiveDate;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledCleanup(): Promise<void> {
    if (!this.policy.autoCleanupEnabled) {
      this.logger.debug('Automatic cleanup is disabled');
      return;
    }

    this.logger.log('Starting scheduled audit log cleanup');

    const result = await this.performCleanup();

    if (result.success) {
      this.logger.log(
        `Cleanup completed: ${result.archivedCount.toString()} archived, ${result.deletedCount.toString()} deleted ` +
          `(${result.executionTimeMs.toString()}ms)`,
      );
    } else {
      this.logger.error(
        `Cleanup failed: ${result.errorMessage ?? 'Unknown error'}`,
      );
    }
  }

  async performCleanup(options?: {
    dryRun?: boolean;
    batchSize?: number;
  }): Promise<RetentionCleanupResult> {
    const startTime = Date.now();
    const batchSize = options?.batchSize ?? this.policy.cleanupBatchSize;
    const dryRun = options?.dryRun ?? false;

    try {
      const now = new Date();

      const expiredEntries = await this.auditLogRepo.find({
        where: {
          archiveAfter: LessThan(now),
        },
        take: batchSize,
        order: { archiveAfter: 'ASC' },
      });

      if (expiredEntries.length === 0) {
        return {
          success: true,
          archivedCount: 0,
          deletedCount: 0,
          executionTimeMs: Date.now() - startTime,
        };
      }

      let archivedCount = 0;
      let deletedCount = 0;

      if (dryRun) {
        this.logger.log(
          `[DRY RUN] Would process ${expiredEntries.length.toString()} entries`,
        );
        return {
          success: true,
          archivedCount: expiredEntries.length,
          deletedCount: this.policy.archiveBeforeDelete
            ? 0
            : expiredEntries.length,
          executionTimeMs: Date.now() - startTime,
        };
      }

      if (this.policy.archiveBeforeDelete) {
        archivedCount = await this.archiveEntries(expiredEntries);
      }

      const deleteResult = await this.deleteEntries(expiredEntries);
      deletedCount = deleteResult.affected ?? 0;

      return {
        success: true,
        archivedCount,
        deletedCount,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Cleanup failed: ${errorMessage}`);

      return {
        success: false,
        archivedCount: 0,
        deletedCount: 0,
        errorMessage,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  async getCleanupStatistics(): Promise<{
    pendingArchival: number;
    oldestPendingDate: Date | null;
    byEventType: Record<string, number>;
  }> {
    const now = new Date();

    const pendingCount = await this.auditLogRepo.count({
      where: {
        archiveAfter: LessThan(now),
      },
    });

    const oldestEntry = await this.auditLogRepo.findOne({
      where: {
        archiveAfter: LessThan(now),
      },
      order: { archiveAfter: 'ASC' },
    });

    const byEventType: Record<string, number> = {};

    const eventTypeCounts = await this.auditLogRepo
      .createQueryBuilder('audit')
      .select('audit.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('audit.archiveAfter < :now', { now })
      .groupBy('audit.eventType')
      .getRawMany<{ eventType: string; count: string }>();

    for (const row of eventTypeCounts) {
      byEventType[row.eventType] = parseInt(row.count, 10);
    }

    return {
      pendingArchival: pendingCount,
      oldestPendingDate: oldestEntry?.archiveAfter ?? null,
      byEventType,
    };
  }

  async generateComplianceReport(): Promise<{
    policy: AuditRetentionPolicy;
    statistics: {
      totalLogs: number;
      logsWithArchiveDate: number;
      logsPendingArchival: number;
    };
    complianceStatus: 'compliant' | 'needs-attention' | 'non-compliant';
    recommendations: string[];
  }> {
    const now = new Date();

    const totalLogs = await this.auditLogRepo.count();

    const logsWithArchiveDate = await this.auditLogRepo.count({
      where: { archiveAfter: LessThan(new Date('2100-01-01')) },
    });

    const logsPendingArchival = await this.auditLogRepo.count({
      where: { archiveAfter: LessThan(now) },
    });

    const recommendations: string[] = [];

    let status: 'compliant' | 'needs-attention' | 'non-compliant' = 'compliant';

    if (logsPendingArchival > this.policy.cleanupBatchSize * 10) {
      status = 'needs-attention';
      recommendations.push(
        'Large backlog of logs pending archival. Consider running manual cleanup.',
      );
    }

    if (!this.policy.autoCleanupEnabled) {
      status = status === 'compliant' ? 'needs-attention' : status;
      recommendations.push(
        'Automatic cleanup is disabled. Enable for NIST SP 800-92 compliance.',
      );
    }

    if (this.policy.defaultRetentionDays < 90) {
      status = 'non-compliant';
      recommendations.push(
        'Default retention period is below NIST SP 800-92 minimum of 90 days.',
      );
    }

    if (!this.policy.archiveBeforeDelete) {
      recommendations.push(
        'Consider enabling archive before delete for compliance audit trail.',
      );
    }

    return {
      policy: this.policy,
      statistics: {
        totalLogs,
        logsWithArchiveDate,
        logsPendingArchival,
      },
      complianceStatus: status,
      recommendations,
    };
  }

  // TODO: Write to external storage (S3/Cloud) instead of just logging
  private async archiveEntries(entries: AuditLog[]): Promise<number> {
    const archivedData: ArchivedAuditLog[] = entries.map((entry) => ({
      id: entry.id,
      eventType: entry.eventType,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorId: entry.actorId,
      createdAt: entry.createdAt,
      archivedAt: new Date(),
      originalData: {
        oldValues: entry.oldValues,
        newValues: entry.newValues,
        actorIp: entry.actorIp,
        actorUserAgent: entry.actorUserAgent,
        prevHash: entry.prevHash,
        currHash: entry.currHash,
        signature: entry.signature,
      },
    }));

    this.logger.log(
      `Archiving ${archivedData.length.toString()} audit log entries`,
    );

    return archivedData.length;
  }

  private async deleteEntries(entries: AuditLog[]): Promise<DeleteResult> {
    const ids = entries.map((e) => e.id);

    return this.auditLogRepo.delete(ids);
  }
}
