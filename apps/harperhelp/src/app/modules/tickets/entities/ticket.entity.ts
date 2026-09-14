import { BaseEntity } from '@harperhelp/interfaces';
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { Contact } from '../../contacts/entities/contact.entity';
import { TicketStatus } from './ticket.statuses.entity';
import { TicketPriority } from './ticket.priority.entity';
import { SYSTEM_TICKET_STATUS } from '@harperhelp/types';
import { TicketType } from '../enum/ticket-type.enum';

@Entity('tickets')
@Index('IDX_TICKET_PROJECT_ID', ['projectId'])
@Index('IDX_TICKET_REPORTER_ID', ['reporterId'])
@Index('IDX_TICKET_ASSIGNEE_ID', ['assigneeId'])
@Index('IDX_TICKET_STATUS_KEY', ['statusKey'])
@Index('IDX_TICKET_PRIORITY_KEY', ['priorityKey'])
@Index('IDX_TICKET_CONTACT_ID', ['contactId'])
@Index('IDX_TICKET_PROJECT_STATUS_CREATED', ['projectId', 'statusKey', 'createdAt', 'id'])
export class Ticket extends BaseEntity {
  @Column({
    type: 'uuid',
  })
  projectId: string;

  @ManyToOne(() => Project, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  ticketRefNo: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  title: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'varchar',
    length: 60,
    default: SYSTEM_TICKET_STATUS.OPEN,
  })
  statusKey: string;

  @ManyToOne(() => TicketStatus, {
    nullable: false,
  })
  @JoinColumn({
    name: 'statusKey',
    referencedColumnName: 'key',
  })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketType,
    nullable: true,
  })
  ticketType: TicketType | null;
  
  @Column({
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  priorityKey?: string;

  @ManyToOne(() => TicketPriority, {
    nullable: true,
  })
  @JoinColumn({
    name: 'priorityKey',
    referencedColumnName: 'key',
  })
  priority?: TicketPriority;

  @Column({
    type: 'uuid',
  })
  reporterId: string;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  assigneeId?: string;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: User;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'createdBy' }) // reuses the existing FK column from BaseEntity
  submitter?: User;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  dueDate?: string;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  contactId?: string | null;

  @ManyToOne(() => Contact, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'contactId' })
  contact?: Contact | null;
}
