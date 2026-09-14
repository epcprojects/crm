import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@harperhelp/interfaces';
import { Territory } from '../../territories/entities/territory.entity';

@Entity('contacts')
@Index('IDX_CONTACT_PHONE', ['phone'], { unique: true })
@Index('IDX_CONTACT_TERRITORY_ID', ['territoryId'])
export class Contact extends BaseEntity {
  @Column({ length: 150, nullable: true })
  fullName?: string;

  @Column({ length: 30 })
  phone: string;

  @Column({ length: 150, nullable: true })
  email?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ type: 'uuid', nullable: true })
  territoryId?: string | null;

  @ManyToOne(() => Territory, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'territoryId' })
  territory?: Territory | null;

  @Column({ length: 100, nullable: true })
  source?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
