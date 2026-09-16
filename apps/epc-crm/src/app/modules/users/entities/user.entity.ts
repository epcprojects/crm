import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinTable,
  ManyToMany,
  BeforeUpdate,
  BeforeInsert,
} from 'typeorm';
import { BaseEntity } from '@epc-crm/interfaces';
import { Project } from '../../projects/entities/project.entity';
import { UserType } from '@epc-crm/types';

@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, length: 255 })
  normalizedEmail: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ length: 100 })
  normalizedFullName: string;

  @Column({ nullable: true })
  inviteToken: string;

  @Column({ nullable: true })
  inviteExpiresAt: Date;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  resetPasswordToken: string;

  @Column({ nullable: true })
  resetPasswordExpiresAt: Date;

  @Column({ default: false })
  isInvitationAccepted: boolean;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @ManyToMany(() => Project, (p) => p.members)
  @JoinTable({ name: 'user_projects_join' })
  projects: Project[];

  @Column({ nullable: true, enum: UserType, default: UserType.INTERNAL })
  userType: string;

  @BeforeInsert()
  @BeforeUpdate()
  normalise() {
    if (this.email) this.normalizedEmail = this.email.toUpperCase();
    if (this.fullName) this.normalizedFullName = this.fullName.toUpperCase();
  }
}
