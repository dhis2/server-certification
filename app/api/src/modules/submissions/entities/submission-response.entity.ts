import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Submission } from './submission.entity';
import { Criterion } from '../../templates/entities/criterion.entity';
import { ComplianceStatus } from '../../../common/enums';

@Entity('submission_responses')
@Unique(['submissionId', 'criterionId'])
export class SubmissionResponse {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'submission_id', type: 'uuid' })
  submissionId!: string;

  @ManyToOne(() => Submission, (submission) => submission.responses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submission_id' })
  submission?: Submission;

  @Column({ name: 'criterion_id', type: 'uuid' })
  criterionId!: string;

  @ManyToOne(() => Criterion)
  @JoinColumn({ name: 'criterion_id' })
  criterion?: Criterion;

  @Column({
    name: 'compliance_status',
    type: 'enum',
    enum: ComplianceStatus,
    enumName: 'compliance_status_enum',
    default: ComplianceStatus.NOT_TESTED,
  })
  complianceStatus!: ComplianceStatus;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  score!: number | null;

  @Column({ type: 'text', nullable: true })
  findings!: string | null;

  @Column({ name: 'evidence_notes', type: 'text', nullable: true })
  evidenceNotes!: string | null;

  @Column({ name: 'remediation_required', type: 'boolean', default: false })
  remediationRequired!: boolean;

  @Column({ name: 'remediation_target_date', type: 'date', nullable: true })
  remediationTargetDate!: Date | null;

  @Column({
    name: 'remediation_owner',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  remediationOwner!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
