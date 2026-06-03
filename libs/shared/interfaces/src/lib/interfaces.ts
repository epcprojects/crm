import { Column, CreateDateColumn } from 'typeorm';

export class CreatedBaseEntity {
  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;
}

export class UpdatedBaseEntity {
  @CreateDateColumn()
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;
}

export class BaseEntity extends CreatedBaseEntity {
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string;
}