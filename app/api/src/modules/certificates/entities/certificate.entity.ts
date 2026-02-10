import {
  Entity,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  PrimaryColumn,
  BeforeInsert,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Implementation } from '../../implementations/entities/implementation.entity';
import { Submission } from '../../submissions/entities/submission.entity';
import { User } from '../../users/entities/user.entity';
import { CertificationResult, ControlGroup } from '../../../common/enums';
import type { DHIS2ServerCredential } from '../interfaces';

@Entity('certificates')
export class Certificate {
  @PrimaryColumn('uuid')
  id!: string;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = uuidv7();
    }
  }

  @Column({ name: 'submission_id', type: 'uuid', unique: true })
  submissionId!: string;

  @OneToOne(() => Submission)
  @JoinColumn({ name: 'submission_id' })
  submission?: Submission;

  @Column({ name: 'implementation_id', type: 'uuid' })
  implementationId!: string;

  @ManyToOne(() => Implementation)
  @JoinColumn({ name: 'implementation_id' })
  implementation?: Implementation;

  @Column({
    name: 'certificate_number',
    type: 'varchar',
    length: 100,
    unique: true,
  })
  certificateNumber!: string;

  @Column({
    name: 'certification_result',
    type: 'enum',
    enum: CertificationResult,
    enumName: 'certification_result_enum',
  })
  certificationResult!: CertificationResult;

  @Column({
    name: 'control_group',
    type: 'enum',
    enum: ControlGroup,
    enumName: 'control_group_enum',
  })
  controlGroup!: ControlGroup;

  @Column({ name: 'final_score', type: 'decimal', precision: 10, scale: 4 })
  finalScore!: number;

  @Column({ name: 'valid_from', type: 'date' })
  validFrom!: Date;

  @Column({ name: 'valid_until', type: 'date' })
  validUntil!: Date;

  @Column({ name: 'certificate_hash', type: 'varchar', length: 64 })
  certificateHash!: string;

  @Column({ type: 'text' })
  signature!: string;

  @Column({ name: 'signing_key_version', type: 'int' })
  signingKeyVersion!: number;

  @Column({
    name: 'verification_code',
    type: 'varchar',
    length: 50,
    unique: true,
    nullable: true,
  })
  verificationCode!: string | null;

  @Column({ name: 'vc_json', type: 'jsonb' })
  vcJson!: DHIS2ServerCredential;

  @Column({ name: 'is_revoked', type: 'boolean', default: false })
  isRevoked!: boolean;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'revoked_by', type: 'uuid', nullable: true })
  revokedById!: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'revoked_by' })
  revokedBy?: User | null;

  @Column({ name: 'revocation_reason', type: 'text', nullable: true })
  revocationReason!: string | null;

  @Column({
    name: 'status_list_index',
    type: 'int',
    unique: true,
    nullable: true,
  })
  statusListIndex!: number | null;

  @Column({ name: 'issued_at', type: 'timestamptz', default: () => 'NOW()' })
  issuedAt!: Date;

  @Column({ name: 'issued_by', type: 'uuid', nullable: true })
  issuedById!: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'issued_by' })
  issuedBy?: User | null;
}
