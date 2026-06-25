import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { BaseEntity } from '@harperhelp/interfaces';
import { User } from '../../users/entities/user.entity';

@Entity('projects')
export class Project extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ length: 100, nullable: true })
  projectCode: string;

  @Column({ length: 7, default: '#5B4FCF' })
  brandColor: string;

  @Column({ length: 5, default: 'HH' })
  logoLetter: string;

  @ManyToMany(() => User, (u) => u.projects) members: User[];
}
