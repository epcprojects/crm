import { CreatedBaseEntity } from '@harperhelp/interfaces';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Role } from '../../roles/entities/role.entity';

@Entity('user_roles')
export class UserRole extends CreatedBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  roleId: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ type: 'uuid', nullable: true })
  assignedBy: string;

  @CreateDateColumn()
  assignedAt: Date;
}
