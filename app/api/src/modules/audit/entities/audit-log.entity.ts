import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',

  // User events
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',

  // Organization events
  ORGANIZATION_CREATED = 'ORGANIZATION_CREATED',
  ORGANIZATION_UPDATED = 'ORGANIZATION_UPDATED',
  ORGANIZATION_DELETED = 'ORGANIZATION_DELETED',

  // Implementation events
  IMPLEMENTATION_CREATED = 'IMPLEMENTATION_CREATED',
  IMPLEMENTATION_UPDATED = 'IMPLEMENTATION_UPDATED',
  IMPLEMENTATION_DELETED = 'IMPLEMENTATION_DELETED',

  // Template events
  TEMPLATE_CREATED = 'TEMPLATE_CREATED',
  TEMPLATE_UPDATED = 'TEMPLATE_UPDATED',
  TEMPLATE_PUBLISHED = 'TEMPLATE_PUBLISHED',
  TEMPLATE_VERSIONED = 'TEMPLATE_VERSIONED',

  // Submission events
  SUBMISSION_CREATED = 'SUBMISSION_CREATED',
  SUBMISSION_UPDATED = 'SUBMISSION_UPDATED',
  SUBMISSION_SUBMITTED = 'SUBMISSION_SUBMITTED',
  SUBMISSION_REVIEWED = 'SUBMISSION_REVIEWED',
  SUBMISSION_APPROVED = 'SUBMISSION_APPROVED',
  SUBMISSION_REJECTED = 'SUBMISSION_REJECTED',
  SUBMISSION_REVISION_REQUESTED = 'SUBMISSION_REVISION_REQUESTED',
  SUBMISSION_WITHDRAWN = 'SUBMISSION_WITHDRAWN',

  // Certificate events
  CERTIFICATE_ISSUED = 'CERTIFICATE_ISSUED',
  CERTIFICATE_REVOKED = 'CERTIFICATE_REVOKED',
  CERTIFICATE_VERIFIED = 'CERTIFICATE_VERIFIED',

  // Security events
  INTEGRITY_CHECK_FAILED = 'INTEGRITY_CHECK_FAILED',

  // Evidence events
  EVIDENCE_UPLOADED = 'EVIDENCE_UPLOADED',
  EVIDENCE_DELETED = 'EVIDENCE_DELETED',
  EVIDENCE_LINKED = 'EVIDENCE_LINKED',
  EVIDENCE_UNLINKED = 'EVIDENCE_UNLINKED',

  // Admin events
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
}

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  SUBMIT = 'SUBMIT',
  REVIEW = 'REVIEW',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REVOKE = 'REVOKE',
  ISSUE = 'ISSUE',
  VERIFY = 'VERIFY',
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD',
}

@Entity('audit_log')
@Index(['entityType', 'entityId'])
@Index(['actorId'])
@Index(['createdAt'])
@Index(['archiveAfter'])
export class AuditLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @Column({ type: 'varchar', length: 50 })
  action!: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ name: 'actor_ip', type: 'inet', nullable: true })
  actorIp!: string | null;

  @Column({ name: 'actor_user_agent', type: 'text', nullable: true })
  actorUserAgent!: string | null;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues!: Record<string, unknown> | null;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues!: Record<string, unknown> | null;

  @Column({ name: 'prev_hash', type: 'varchar', length: 64, nullable: true })
  prevHash!: string | null;

  @Column({ name: 'curr_hash', type: 'varchar', length: 64 })
  currHash!: string;

  /**
   * HMAC-SHA256 signature of the audit entry.
   *
   * Per NIST SP 800-92 and OWASP Logging Cheat Sheet:
   * - Provides cryptographic integrity verification
   * - Uses server-side secret key for tamper detection
   * - Complements hash chain for defense-in-depth
   *
   * @see NIST SP 800-92 - Guide to Computer Security Log Management
   */
  @Column({ name: 'signature', type: 'varchar', length: 64 })
  signature!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /**
   * Timestamp when this entry should be archived (based on retention policy).
   * Null means no archival scheduled (indefinite retention).
   *
   * Per NIST SP 800-92: Organizations must define log retention periods.
   */
  @Column({ name: 'archive_after', type: 'timestamptz', nullable: true })
  archiveAfter!: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor?: User;
}
