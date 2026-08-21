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
import { NotificationEntityType, NotificationType } from '@harperhelp/types';

@Entity('notifications')
@Index(['recipientId', 'createdAt'])
@Index(['recipientId', 'isRead'])
@Index(['recipientId', 'isActive', 'type', 'createdAt', 'id'])
@Index(['recipientId', 'isActive', 'entityType', 'createdAt', 'id']) // categorized feed pagination
@Index(['recipientId', 'entityType', 'createdAt', 'id'], {
  where: '"isActive" = true AND "isRead" = false',
})
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

  @Column({ nullable: true })
  projectId: string | null;

  @ManyToOne(() => Project, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'projectId' })
  project: Project | null;

  @Column({ type: 'varchar', length: 60 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 60 })
  entityType: NotificationEntityType;

  @Column({ nullable: true })
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
