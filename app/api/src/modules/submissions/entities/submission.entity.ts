import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Implementation } from '../../implementations/entities/implementation.entity';
import { AssessmentTemplate } from '../../templates/entities/assessment-template.entity';
import { User } from '../../users/entities/user.entity';
import { SubmissionResponse } from './submission-response.entity';
import {
  ControlGroup,
  SubmissionStatus,
  CertificationResult,
} from '../../../common/enums';

/**
 * Submission entity - Represents an assessment submission for a DHIS2 server.
 *
 * Simplified workflow (no separate reviewer):
 * DRAFT → IN_PROGRESS → COMPLETED → PASSED/FAILED
 *
 * - DRAFT: Initial state when submission is created
 * - IN_PROGRESS: Assessment is being conducted
 * - COMPLETED: Assessment completed, ready for finalization
 * - PASSED: All required controls compliant, certificate issued
 * - FAILED: Some required controls non-compliant, can resume after remediation
 * - WITHDRAWN: Assessment withdrawn
 */
@Entity('submissions')
export class Submission {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'implementation_id', type: 'uuid' })
  implementationId!: string;

  @ManyToOne(() => Implementation)
  @JoinColumn({ name: 'implementation_id' })
  implementation?: Implementation;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId!: string;

  @ManyToOne(() => AssessmentTemplate)
  @JoinColumn({ name: 'template_id' })
  template?: AssessmentTemplate;

  @Column({
    name: 'target_control_group',
    type: 'enum',
    enum: ControlGroup,
    enumName: 'control_group_enum',
    default: ControlGroup.DSCP1,
  })
  targetControlGroup!: ControlGroup;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    enumName: 'submission_status_enum',
    default: SubmissionStatus.DRAFT,
  })
  status!: SubmissionStatus;

  @Column({
    name: 'assessor_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  assessorName!: string | null;

  @Column({ name: 'assessment_date', type: 'date', nullable: true })
  assessmentDate!: Date | null;

  @Column({ name: 'system_environment', type: 'text', nullable: true })
  systemEnvironment!: string | null;

  @Column({ name: 'current_category_index', type: 'int', default: 0 })
  currentCategoryIndex!: number;

  @Column({
    name: 'total_score',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  totalScore!: number | null;

  @Column({
    name: 'certification_result',
    type: 'enum',
    enum: CertificationResult,
    enumName: 'certification_result_enum',
    nullable: true,
  })
  certificationResult!: CertificationResult | null;

  @Column({ name: 'is_certified', type: 'boolean', default: false })
  isCertified!: boolean;

  @Column({
    name: 'certificate_number',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  certificateNumber!: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt!: Date | null;

  @Column({ name: 'assessor_notes', type: 'text', nullable: true })
  assessorNotes!: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;

  @OneToMany(() => SubmissionResponse, (response) => response.submission, {
    cascade: true,
  })
  responses!: SubmissionResponse[];

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
