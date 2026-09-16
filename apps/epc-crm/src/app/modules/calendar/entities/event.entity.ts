import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EventType {
  LAUNCH = 'launch',
  MEETING = 'meeting',
  MILESTONE = 'milestone',
}
import { TimestampEntityWithSoftDelete } from '@epc-crm/interfaces';

@Entity('events')
export class Event extends TimestampEntityWithSoftDelete {
  // @PrimaryGeneratedColumn('uuid')
  // id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'enum', enum: EventType, default: EventType.LAUNCH })
  type: EventType;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string;

  // @CreateDateColumn({ name: 'created_at' })
  // createdAt: Date;

  // @UpdateDateColumn({ name: 'updated_at' })
  // updatedAt: Date;
}
