import { Column, Entity } from 'typeorm';
import { TimestampEntityWithSoftDelete } from '@harperhelp/interfaces';

@Entity('ticket_priorities')
export class TicketPriority extends TimestampEntityWithSoftDelete {
  @Column({ unique: true, length: 60 })
  key: string;

  @Column({ length: 80 })
  label: string;

  @Column({ length: 7, default: '#888780' })
  color: string;

  @Column({ default: 0 })
  sortOrder: number;
}
