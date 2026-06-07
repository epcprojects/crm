import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@harperhelp/interfaces';

import { Ticket } from './ticket.entity';
import { User } from '../../users/entities/user.entity';

@Entity('ticket_replies')
@Index(['ticketId'])
export class TicketReply extends BaseEntity {
  @Column('uuid')
  ticketId: string;

  @ManyToOne(() => Ticket, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column('uuid')
  authorId: string;

  @ManyToOne(() => User, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({
    type: 'text',
  })
  message: string;

  /**
   * Optional: internal notes vs public comment
   */
  @Column({
    type: 'boolean',
    default: false,
  })
  isInternal: boolean;
}
