import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Role } from 'src/modules/iam/authorization/entities/role.entity';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  @Index('IDX_USER_EMAIL', { unique: true })
  email: string;

  @Column('varchar', { nullable: true })
  firstName: string | null;

  @Column('varchar', { nullable: true })
  lastName: string | null;

  @Column('varchar', { nullable: true, select: false })
  @Exclude()
  password: string | null;

  @VersionColumn()
  version: number;

  @ManyToOne(() => Role, { eager: true, nullable: true })
  @JoinColumn({ name: 'role_id' })
  role: Role | null;

  @Column({ default: false })
  isTfaEnabled: boolean;

  @Column('varchar', { nullable: true, select: false })
  @Exclude()
  tfaSecret: string | null;

  @Column('text', { array: true, nullable: true, select: false })
  @Exclude()
  tfaRecoveryCodes: string[] | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isLocked: boolean;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
