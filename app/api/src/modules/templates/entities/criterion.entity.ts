import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
  BeforeInsert,
  Unique,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { AssessmentCategory } from './assessment-category.entity';
import { ControlGroup, ControlType } from '../../../common/enums';

@Entity('criteria')
@Unique(['categoryId', 'code'])
export class Criterion {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  guidance!: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  weight!: number;

  @Column({ name: 'is_mandatory', type: 'boolean', default: false })
  isMandatory!: boolean;

  @Column({ name: 'is_critical_fail', type: 'boolean', default: false })
  isCriticalFail!: boolean;

  @Column({ name: 'min_passing_score', type: 'int', default: 0 })
  minPassingScore!: number;

  @Column({ name: 'max_score', type: 'int', default: 100 })
  maxScore!: number;

  @Column({ name: 'evidence_required', type: 'boolean', default: false })
  evidenceRequired!: boolean;

  @Column({ name: 'evidence_description', type: 'text', nullable: true })
  evidenceDescription!: string | null;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder!: number;

  @Column({
    name: 'control_group',
    type: 'enum',
    enum: ControlGroup,
    enumName: 'control_group_enum',
    default: ControlGroup.DSCP1,
  })
  controlGroup!: ControlGroup;

  @Column({
    name: 'control_type',
    type: 'enum',
    enum: ControlType,
    enumName: 'control_type_enum',
    default: ControlType.TECHNICAL,
  })
  controlType!: ControlType;

  @Column({ name: 'cis_mapping', type: 'varchar', length: 50, nullable: true })
  cisMapping!: string | null;

  @Column({ name: 'verification_method', type: 'text', nullable: true })
  verificationMethod!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => AssessmentCategory, (category) => category.criteria, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category!: AssessmentCategory;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
