import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  AuditLog,
  AuditEventType,
  AuditAction,
} from '../entities/audit-log.entity';
import {
  AuditIntegrityService,
  type BatchVerificationResult,
} from './audit-integrity.service';
import { AuditRetentionService } from './audit-retention.service';
import {
  Connection,
  CursorPaginationOptions,
  paginate,
} from 'src/shared/pagination';

export interface AuditContext {
  actorId?: string | null | undefined;
  actorIp?: string | null | undefined;
  actorUserAgent?: string | null | undefined;
}

export interface CreateAuditLogDto {
  eventType: AuditEventType | string;
  entityType: string;
  entityId: string;
  action: AuditAction | string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

export interface AuditLogQueryOptions extends CursorPaginationOptions {
  entityType?: string | undefined;
  entityId?: string | undefined;
  eventType?: string | undefined;
  actorId?: string | undefined;
  action?: string | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
}

export type AuditLogsConnection = Connection<AuditLog>;

export interface HashChainValidationResult {
  valid: boolean;
  entriesChecked: number;
  firstInvalidEntry?: string;
  errorMessage?: string;
}

/**
 * Combined integrity validation result including hash chain and signatures.
 *
 * Per NIST SP 800-92 and OWASP Logging Cheat Sheet:
 * - Both hash chain and cryptographic signatures should be verified
 * - Defense-in-depth provides multiple layers of integrity protection
 */
export interface IntegrityValidationResult {
  hashChain: HashChainValidationResult;
  signatures: BatchVerificationResult | null;
  overallValid: boolean;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @Optional()
    @Inject(AuditIntegrityService)
    private readonly integrityService?: AuditIntegrityService,
    @Optional()
    @Inject(AuditRetentionService)
    private readonly retentionService?: AuditRetentionService,
  ) {}

  /**
   * Create a new audit log entry with cryptographic integrity protection.
   *
   * Per NIST SP 800-92 and OWASP Logging Cheat Sheet:
   * - Each entry is linked to the previous via hash chain
   * - Each entry is signed with HMAC for tamper detection
   * - Archive date is calculated based on event type retention policy
   *
   * @param dto - Audit log data
   * @param context - Actor context (IP, user agent, etc.)
   * @returns Created audit log entry
   */
  async log(
    dto: CreateAuditLogDto,
    context: AuditContext = {},
  ): Promise<AuditLog> {
    const prevEntry = await this.getLastEntry();
    const prevHash = prevEntry?.currHash ?? null;

    const auditEntry = new AuditLog();
    auditEntry.eventType = dto.eventType;
    auditEntry.entityType = dto.entityType;
    auditEntry.entityId = dto.entityId;
    auditEntry.action = dto.action;
    auditEntry.actorId = context.actorId ?? null;
    auditEntry.actorIp = context.actorIp ?? null;
    auditEntry.actorUserAgent = context.actorUserAgent ?? null;
    auditEntry.oldValues = dto.oldValues ?? null;
    auditEntry.newValues = dto.newValues ?? null;
    auditEntry.prevHash = prevHash;
    auditEntry.currHash = this.calculateHash(auditEntry, prevHash);

    // Generate HMAC signature for tamper detection (NIST SP 800-92)
    auditEntry.signature = this.integrityService
      ? this.integrityService.generateSignature(auditEntry)
      : '';

    // Calculate archive date based on retention policy (NIST SP 800-92)
    auditEntry.archiveAfter = this.retentionService
      ? this.retentionService.calculateArchiveDate(auditEntry)
      : null;

    const saved = await this.auditLogRepo.save(auditEntry);

    this.logger.debug(
      `Audit log created: ${saved.eventType} on ${saved.entityType}:${saved.entityId}`,
    );

    return saved;
  }

  async findAll(
    options: AuditLogQueryOptions = {},
  ): Promise<AuditLogsConnection> {
    const qb = this.auditLogRepo
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor');

    if (options.entityType) {
      qb.where('audit.entityType = :entityType', {
        entityType: options.entityType,
      });
    }

    if (options.entityId) {
      const method = options.entityType ? 'andWhere' : 'where';
      qb[method]('audit.entityId = :entityId', { entityId: options.entityId });
    }

    if (options.eventType) {
      qb.andWhere('audit.eventType = :eventType', {
        eventType: options.eventType,
      });
    }

    if (options.actorId) {
      qb.andWhere('audit.actorId = :actorId', { actorId: options.actorId });
    }

    if (options.action) {
      qb.andWhere('audit.action = :action', { action: options.action });
    }

    if (options.startDate && options.endDate) {
      qb.andWhere('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate: options.startDate,
        endDate: options.endDate,
      });
    } else if (options.startDate) {
      qb.andWhere('audit.createdAt >= :startDate', {
        startDate: options.startDate,
      });
    } else if (options.endDate) {
      qb.andWhere('audit.createdAt <= :endDate', { endDate: options.endDate });
    }

    return paginate(qb, 'audit', {
      first: options.first ?? 50,
      after: options.after,
      sortDirection: 'DESC',
    });
  }

  async findByEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogRepo.find({
      where: { entityType, entityId },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<AuditLog | null> {
    return this.auditLogRepo.findOne({
      where: { id },
      relations: ['actor'],
    });
  }

  async validateHashChain(options?: {
    startId?: string | undefined;
    endId?: string | undefined;
    limit?: number | undefined;
  }): Promise<HashChainValidationResult> {
    const limit = options?.limit ?? 1000;

    const qb = this.auditLogRepo
      .createQueryBuilder('audit')
      .orderBy('audit.id', 'ASC')
      .take(limit);

    if (options?.startId) {
      qb.andWhere('audit.id >= :startId', { startId: options.startId });
    }

    if (options?.endId) {
      qb.andWhere('audit.id <= :endId', { endId: options.endId });
    }

    const entries = await qb.getMany();

    if (entries.length === 0) {
      return { valid: true, entriesChecked: 0 };
    }

    let previousHash: string | null = null;
    let entriesChecked = 0;

    // Get the entry before our first one to get the starting prev_hash
    const firstEntry = entries[0];

    if (firstEntry && firstEntry.prevHash !== null && options?.startId) {
      const prevEntry = await this.auditLogRepo
        .createQueryBuilder('audit')
        .where('audit.id < :id', { id: firstEntry.id })
        .orderBy('audit.id', 'DESC')
        .getOne();

      if (prevEntry) {
        previousHash = prevEntry.currHash;
      }
    }

    for (const entry of entries) {
      if (entry.prevHash !== previousHash) {
        return {
          valid: false,
          entriesChecked,
          firstInvalidEntry: entry.id,
          errorMessage: `Entry ${entry.id} has prevHash mismatch. Expected: ${previousHash ?? 'null'}, Got: ${entry.prevHash ?? 'null'}`,
        };
      }

      const expectedHash = this.calculateHash(entry, entry.prevHash);
      if (entry.currHash !== expectedHash) {
        return {
          valid: false,
          entriesChecked,
          firstInvalidEntry: entry.id,
          errorMessage: `Entry ${entry.id} has currHash mismatch. Expected: ${expectedHash}, Got: ${entry.currHash}`,
        };
      }

      previousHash = entry.currHash;
      entriesChecked++;
    }

    return { valid: true, entriesChecked };
  }

  /**
   * Perform full integrity validation including hash chain and signatures.
   *
   * Per NIST SP 800-92 and OWASP Logging Cheat Sheet:
   * - Validates hash chain integrity (tamper detection via chaining)
   * - Validates HMAC signatures (cryptographic integrity verification)
   * - Provides defense-in-depth with multiple validation mechanisms
   *
   * @param options - Validation options
   * @returns Combined integrity validation result
   */
  async validateIntegrity(options?: {
    startId?: string | undefined;
    endId?: string | undefined;
    limit?: number | undefined;
  }): Promise<IntegrityValidationResult> {
    const hashChainResult = await this.validateHashChain(options);

    let signatureResult: BatchVerificationResult | null = null;

    if (this.integrityService?.isConfigured()) {
      const limit = options?.limit ?? 1000;

      const qb = this.auditLogRepo
        .createQueryBuilder('audit')
        .orderBy('audit.id', 'ASC')
        .take(limit);

      if (options?.startId) {
        qb.andWhere('audit.id >= :startId', { startId: options.startId });
      }

      if (options?.endId) {
        qb.andWhere('audit.id <= :endId', { endId: options.endId });
      }

      const entries = await qb.getMany();
      signatureResult = this.integrityService.verifyBatch(entries);
    }

    const overallValid =
      hashChainResult.valid &&
      (signatureResult === null || signatureResult.valid);

    return {
      hashChain: hashChainResult,
      signatures: signatureResult,
      overallValid,
    };
  }

  async getStatistics(options?: {
    startDate?: Date | undefined;
    endDate?: Date | undefined;
  }): Promise<{
    totalEntries: number;
    byEventType: Record<string, number>;
    byEntityType: Record<string, number>;
    byAction: Record<string, number>;
  }> {
    const qb = this.auditLogRepo.createQueryBuilder('audit');

    if (options?.startDate) {
      qb.andWhere('audit.createdAt >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      qb.andWhere('audit.createdAt <= :endDate', { endDate: options.endDate });
    }

    const totalEntries = await qb.getCount();

    const eventTypeStats = await this.auditLogRepo
      .createQueryBuilder('audit')
      .select('audit.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.eventType')
      .getRawMany<{ eventType: string; count: string }>();

    const entityTypeStats = await this.auditLogRepo
      .createQueryBuilder('audit')
      .select('audit.entityType', 'entityType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.entityType')
      .getRawMany<{ entityType: string; count: string }>();

    const actionStats = await this.auditLogRepo
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .getRawMany<{ action: string; count: string }>();

    return {
      totalEntries,
      byEventType: Object.fromEntries(
        eventTypeStats.map((s) => [s.eventType, parseInt(s.count, 10)]),
      ),
      byEntityType: Object.fromEntries(
        entityTypeStats.map((s) => [s.entityType, parseInt(s.count, 10)]),
      ),
      byAction: Object.fromEntries(
        actionStats.map((s) => [s.action, parseInt(s.count, 10)]),
      ),
    };
  }

  private async getLastEntry(): Promise<AuditLog | null> {
    return this.auditLogRepo
      .createQueryBuilder('audit')
      .orderBy('audit.id', 'DESC')
      .getOne();
  }

  private calculateHash(entry: AuditLog, prevHash: string | null): string {
    const data = {
      eventType: entry.eventType,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorId: entry.actorId,
      oldValues: entry.oldValues,
      newValues: entry.newValues,
      prevHash,
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }
}
