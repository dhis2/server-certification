import { SetMetadata } from '@nestjs/common';
import type { AuditEventType, AuditAction } from '../entities/audit-log.entity';

export const AUDIT_METADATA_KEY = 'audit:metadata';

export interface AuditMetadata {
  eventType: AuditEventType | string;
  entityType: string;
  action: AuditAction | string;
  entityIdParam?: string;
  captureOldValues?: boolean;
  captureNewValues?: boolean;
}

export const Auditable = (metadata: AuditMetadata) =>
  SetMetadata(AUDIT_METADATA_KEY, metadata);
