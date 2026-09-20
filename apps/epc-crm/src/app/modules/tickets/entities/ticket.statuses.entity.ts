import { Column, Entity, Generated } from 'typeorm';
import { TimestampEntityWithSoftDelete } from '@epc-crm/interfaces';

@Entity('ticket_statuses')
export class TicketStatus extends TimestampEntityWithSoftDelete {
  @Column({ unique: true, length: 60 })
  key: string;

  @Column({ length: 80 })
  label: string;

  @Column({ length: 7, default: '#888780' })
  color: string;

  @Column({ default: 0 })
  sortOrder: number;

  // Closed statuses (won/lost/...) are excluded from the "Active" lead filter.
  @Column({ default: false })
  isClosed: boolean;
}
