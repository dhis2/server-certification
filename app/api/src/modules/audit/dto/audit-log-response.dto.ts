import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditLog } from '../entities/audit-log.entity';

export class AuditActorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;
}

export class AuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventType!: string;

  @ApiProperty()
  entityType!: string;

  @ApiProperty()
  entityId!: string;

  @ApiProperty()
  action!: string;

  @ApiPropertyOptional()
  actorId?: string | null;

  @ApiPropertyOptional({ type: AuditActorDto })
  actor?: AuditActorDto | null;

  @ApiPropertyOptional()
  actorIp?: string | null;

  @ApiPropertyOptional()
  actorUserAgent?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  oldValues?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  newValues?: Record<string, unknown> | null;

  @ApiProperty()
  currHash!: string;

  @ApiPropertyOptional()
  prevHash?: string | null;

  @ApiProperty({
    description: 'HMAC signature for tamper detection (NIST SP 800-92)',
  })
  signature!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Date after which this entry can be archived (NIST SP 800-92)',
  })
  archiveAfter?: Date | null;

  static fromEntity = (entity: AuditLog): AuditLogResponseDto => {
    const dto = new AuditLogResponseDto();
    dto.id = entity.id;
    dto.eventType = entity.eventType;
    dto.entityType = entity.entityType;
    dto.entityId = entity.entityId;
    dto.action = entity.action;
    dto.actorId = entity.actorId;
    dto.actorIp = entity.actorIp;
    dto.actorUserAgent = entity.actorUserAgent;
    dto.oldValues = entity.oldValues;
    dto.newValues = entity.newValues;
    dto.currHash = entity.currHash;
    dto.prevHash = entity.prevHash;
    dto.signature = entity.signature;
    dto.createdAt = entity.createdAt;
    dto.archiveAfter = entity.archiveAfter;

    if (entity.actor) {
      dto.actor = {
        id: entity.actor.id,
        email: entity.actor.email,
      };
    }

    return dto;
  };
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  data!: AuditLogResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class HashChainValidationResponseDto {
  @ApiProperty()
  valid!: boolean;

  @ApiProperty()
  entriesChecked!: number;

  @ApiPropertyOptional()
  firstInvalidEntry?: string;

  @ApiPropertyOptional()
  errorMessage?: string;
}

export class AuditStatisticsResponseDto {
  @ApiProperty()
  totalEntries!: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byEventType!: Record<string, number>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byEntityType!: Record<string, number>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byAction!: Record<string, number>;
}

export class SignatureVerificationResultDto {
  @ApiProperty()
  valid!: boolean;

  @ApiProperty()
  entryId!: string;

  @ApiPropertyOptional()
  errorMessage?: string;
}

/**
 * Response DTO for batch signature verification.
 */
export class BatchSignatureVerificationDto {
  @ApiProperty()
  valid!: boolean;

  @ApiProperty()
  entriesChecked!: number;

  @ApiProperty({ type: [SignatureVerificationResultDto] })
  invalidEntries!: SignatureVerificationResultDto[];

  @ApiPropertyOptional()
  errorMessage?: string;
}

/**
 * Response DTO for full integrity validation (hash chain + signatures).
 * Per NIST SP 800-92 - Defense-in-depth with multiple integrity mechanisms.
 */
export class IntegrityValidationResponseDto {
  @ApiProperty({ type: HashChainValidationResponseDto })
  hashChain!: HashChainValidationResponseDto;

  @ApiPropertyOptional({ type: BatchSignatureVerificationDto })
  signatures?: BatchSignatureVerificationDto | null;

  @ApiProperty({
    description: 'Overall integrity status (both hash chain and signatures)',
  })
  overallValid!: boolean;
}

/**
 * Response DTO for audit retention policy.
 */
export class AuditRetentionPolicyDto {
  @ApiProperty({
    description:
      'Default retention period in days (NIST SP 800-92 minimum: 90)',
  })
  defaultRetentionDays!: number;

  @ApiProperty({
    description:
      'Retention period for security events (authentication, authorization)',
  })
  securityEventRetentionDays!: number;

  @ApiProperty({
    description: 'Retention period for certificate-related events',
  })
  certificateEventRetentionDays!: number;

  @ApiProperty({ description: 'Whether logs are archived before deletion' })
  archiveBeforeDelete!: boolean;

  @ApiProperty({ description: 'Maximum entries processed per cleanup run' })
  cleanupBatchSize!: number;

  @ApiProperty({ description: 'Whether automatic cleanup is enabled' })
  autoCleanupEnabled!: boolean;
}

/**
 * Response DTO for retention cleanup operation.
 */
export class RetentionCleanupResultDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  archivedCount!: number;

  @ApiProperty()
  deletedCount!: number;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiProperty()
  executionTimeMs!: number;
}

/**
 * Response DTO for retention statistics.
 */
export class RetentionStatisticsDto {
  @ApiProperty()
  pendingArchival!: number;

  @ApiPropertyOptional()
  oldestPendingDate?: Date | null;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byEventType!: Record<string, number>;
}

/**
 * Response DTO for retention compliance report.
 */
export class RetentionComplianceReportDto {
  @ApiProperty({ type: AuditRetentionPolicyDto })
  policy!: AuditRetentionPolicyDto;

  @ApiProperty()
  statistics!: {
    totalLogs: number;
    logsWithArchiveDate: number;
    logsPendingArchival: number;
  };

  @ApiProperty({ enum: ['compliant', 'needs-attention', 'non-compliant'] })
  complianceStatus!: 'compliant' | 'needs-attention' | 'non-compliant';

  @ApiProperty({ type: [String] })
  recommendations!: string[];
}
