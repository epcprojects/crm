import {
  Entity,
  // PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  // CreateDateColumn,
  // UpdateDateColumn,
  // DeleteDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { NotificationEntityType, NotificationType } from '@harperhelp/types';
import { TimestampedEntityWithSoftDelete } from '@harperhelp/interfaces';

@Entity('activity_logs')
@Index(['createdAt'])
@Index(['projectId', 'createdAt'])
@Index(['actorId', 'createdAt'])
export class ActivityLog extends TimestampedEntityWithSoftDelete {
  /**
   * User who performed the action.
   */
  @Column({ nullable: true })
  actorId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor: User | null;

  @Column({ nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'projectId' })
  project: Project | null;

  @Column({ nullable: true })
  ticketId: string | null;

  @ManyToOne(() => Ticket, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket | null;

  @Column({ type: 'varchar', length: 60 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'varchar', length: 60 })
  entityType: NotificationEntityType;

  @Column({ type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
}
