import { Column, Entity, Generated } from 'typeorm';
import { TimestampEntity } from '@harperhelp/interfaces';

@Entity('ticket_statuses')
export class TicketStatus extends TimestampEntity {
  @Column({ unique: true, length: 60 })
  key: string;

  @Column({ length: 80 })
  label: string;

  @Column({ length: 7, default: '#888780' })
  color: string;

  @Column({ type: 'int' })
  @Generated('increment')
  sortOrder: number;
}
