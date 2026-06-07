import { Entity, Index, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from './project.entity';
import { BaseEntity } from '@harperhelp/interfaces';

@Entity('thread_messages')
@Index(['projectId'])
export class ThreadMessage extends BaseEntity {
  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column('uuid')
  authorId: string;

  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column('text')
  message: string;
}
