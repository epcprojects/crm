import { Entity, Index, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from './project.entity';
import { BaseEntity } from '@epc-crm/interfaces';

@Entity('thread_messages')
@Index(['projectId'])
@Index(['projectId', 'parentId', 'createdAt', 'id'])
@Index(['parentId', 'createdAt', 'id'])
export class ThreadMessage extends BaseEntity {
  @Column('uuid')
  projectId: string;

  @Column({ type: 'uuid', nullable: true })
  parentId: string;

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

  @Column({
    type: 'text',
    nullable: true,
  })
  message: string;

    @Column('uuid', {
    array: true,
    default: () => "'{}'",
  })
  mentionedUserIds: string[];

  @Column({
    type: 'bigint',
    default: 0,
  })
  replyCount: number;
}
