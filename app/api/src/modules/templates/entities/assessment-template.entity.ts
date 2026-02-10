import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { User } from '../../users/entities/user.entity';
import { AssessmentCategory } from './assessment-category.entity';

@Entity('assessment_templates')
@Unique(['name', 'version'])
export class AssessmentTemplate {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished!: boolean;

  @Column({ name: 'parent_version_id', type: 'uuid', nullable: true })
  parentVersionId!: string | null;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom!: Date | null;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo!: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => AssessmentTemplate, { nullable: true })
  @JoinColumn({ name: 'parent_version_id' })
  parentVersion!: AssessmentTemplate | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User | null;

  @OneToMany(() => AssessmentCategory, (category) => category.template, {
    cascade: true,
  })
  categories!: AssessmentCategory[];

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
