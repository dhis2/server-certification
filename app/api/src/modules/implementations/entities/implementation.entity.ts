import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { User } from '../../users/entities/user.entity';

@Entity('implementations')
export class Implementation {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country!: string | null;

  @Column({
    name: 'contact_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  contactEmail!: string | null;

  @Column({
    name: 'contact_phone',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  contactPhone!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    name: 'dhis2_instance_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  dhis2InstanceUrl!: string | null;

  @Column({
    name: 'dhis2_version',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  dhis2Version!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User | null;

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
