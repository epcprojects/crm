import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
} from 'typeorm';
import { UserRole } from '../../users/entities/user.roles.entity';
import { RoleClaim } from './role.claim.entity';
import { TimestampEntityWithSoftDelete } from '@epc-crm/interfaces';

@Entity('roles')
export class Role extends TimestampEntityWithSoftDelete{
  // @PrimaryGeneratedColumn('uuid')
  // id: string;

  @Column({ unique: true, length: 50 })
  name: string;

  @Column({ unique: true, length: 50 })
  normalizedName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => UserRole, (ur) => ur.role)
  userRoles: UserRole[];

  @OneToMany(() => RoleClaim, (rc) => rc.role)
  roleClaims: RoleClaim[];

  // @CreateDateColumn()
  // createdAt: Date;

  // @UpdateDateColumn()
  // updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalise() {
    this.normalizedName = this.name.toUpperCase();
  }
}
