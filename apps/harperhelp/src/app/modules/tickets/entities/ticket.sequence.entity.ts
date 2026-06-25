import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ticket_sequences')
export class TicketSequence {
  @PrimaryColumn({
    name: 'project_code',
    type: 'varchar',
    length: 20,
  })
  projectCode: string;

  @PrimaryColumn({
    name: 'date_key',
    type: 'char',
    length: 8, // YYYYMMDD
  })
  dateKey: string;

  @Column({
    name: 'last_seq',
    type: 'int',
    default: 0,
  })
  lastSeq: number;
}
