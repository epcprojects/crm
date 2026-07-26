import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';


export enum NotificationType {
  PROJECT_ASSIGNED = 'project_assigned',
  TICKET_CREATED = 'ticket_created',
  TICKET_REPLY = 'ticket_reply',
  TICKET_STATUS_CHANGED = 'ticket_status_changed',
  TICKET_PRIORITY_CHANGED = 'ticket_priority_changed',
  TICKET_ASSIGNEE_CHANGED = 'ticket_assignee_changed',
  THREAD_CREATED = 'thread_created',
  THREAD_REPLY = 'thread_reply',
}

export enum NotificationEntityType {
  PROJECT = 'project',
  TICKET = 'ticket',
  TICKET_REPLY = 'ticket_reply',
  THREAD_MESSAGE = 'thread_message',
}

@Entity('notifications')
@Index(['recipientId', 'createdAt'])
@Index(['recipientId', 'isRead'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ default: true })
  isActive: boolean;

  // Null for system-generated notifications (e.g. a scheduled digest, not a user action)
  @Column({ nullable: true })
  createdBy: string | null;

  @Column({ nullable: true })
  updatedBy: string | null;

  @Column()
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  // The user whose action triggered this notification -- excluded from recipients,
  // shown in the UI as "Ali replied on..." etc.
  @Column({ nullable: true })
  actorId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor: User | null;

  @Column()
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'varchar', length: 60 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 60 })
  entityType: NotificationEntityType;

  @Column()
  entityId: string;

  // Denormalized so the notifications page can deep-link straight to a ticket
  // without joining through ticket_replies -- null for project/thread events.
  @Column({ nullable: true })
  ticketId: string | null;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;
}
