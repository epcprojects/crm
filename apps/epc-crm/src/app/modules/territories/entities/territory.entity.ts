import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@epc-crm/interfaces';

export enum TerritoryType {
  PROVINCE = 'province',
  CITY = 'city',
}

@Entity('territories')
@Index('IDX_TERRITORY_PARENT_ID', ['parentId'])
export class Territory extends BaseEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ type: 'enum', enum: TerritoryType })
  type: TerritoryType;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Territory, (t) => t.children, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent?: Territory | null;

  @OneToMany(() => Territory, (t) => t.parent)
  children?: Territory[];
}
