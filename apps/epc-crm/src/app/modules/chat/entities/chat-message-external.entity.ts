import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { Project } from '../../projects/entities/project.entity';
import { MessageType } from './chat-message-internal.entity';
import { TimestampEntityWithSoftDelete } from '@epc-crm/interfaces';
import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

@Entity('chat_messages_external')
@Index(['ticketId', 'createdAt'])
@Index(['projectId', 'createdAt'])
export class ChatMessageExternal extends TimestampEntityWithSoftDelete {
  // @PrimaryGeneratedColumn('uuid')
  // id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string;

  // @Column({ name: 'receiver_id', type: 'uuid' })
  // receiverId: string;

  @Column({
    name: 'message_type',
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  messageType: MessageType;

  @Column({ type: 'text' })
  message: string;

  @ApiPropertyOptional({
    description: 'Array of user IDs mentioned in the message',
    type: [String],
  })
  @IsOptional()
  @IsUUID('loose', {
    each: true,
    message: 'Each mentioned user ID must be a valid UUID',
  })
  mentionedUserIds?: string[];

  @Column({
    name: 'attachment_urls',
    type: 'text',
    array: true,
    nullable: true,
  })
  attachmentUrls: string[] | null;

  @Column({ name: 'attachment_name', type: 'text', nullable: true })
  attachmentName: string | null;

  @Column({ name: 'attachment_size', type: 'integer', nullable: true })
  attachmentSize: number | null;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  // @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  // deletedAt: Date | null;

  // ── Relations ──────────────────────────────────
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;

  // @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  // createdAt: Date;

  // @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  // updatedAt: Date;
}
