import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { CreatedBaseEntity } from '@harperhelp/interfaces';

@Entity('role_claims')
export class RoleClaim extends CreatedBaseEntity {
  @PrimaryGeneratedColumn() id: number;

  @Column({ type: 'uuid' }) 
  roleId: string;

  @ManyToOne(() => Role, (r) => r.roleClaims, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ length: 200 }) 
  claimType: string;

  @Column({ length: 500 }) 
  claimValue: string;
 
}
