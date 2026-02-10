import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { AssessmentTemplate } from './assessment-template.entity';
import { Criterion } from './criterion.entity';

@Entity('assessment_categories')
export class AssessmentCategory {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  weight!: number;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => AssessmentTemplate, (template) => template.categories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template!: AssessmentTemplate;

  @OneToMany(() => Criterion, (criterion) => criterion.category, {
    cascade: true,
  })
  criteria!: Criterion[];

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
