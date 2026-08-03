import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// ATOMIC
export abstract class HasPrimaryKey {
  @PrimaryGeneratedColumn('uuid') id!: string;
}

export abstract class HasTimestamps {
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn({ nullable: true }) updatedAt?: Date | null
}

export abstract class HasSoftDelete {
  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date | null;
}

export abstract class HasIsActive {
  @Column({ default: true }) isActive!: boolean;
}

export abstract class HasAuditUser {
  @Column({ type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ type: 'uuid', nullable: true }) updatedBy!: string | null;
}

export abstract class BaseEntity extends HasPrimaryKey {
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn({ nullable: true }) updatedAt?: Date | null
  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date | null;
  @Column({ default: true }) isActive!: boolean;
  @Column({ type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ type: 'uuid', nullable: true }) updatedBy!: string | null;
}

export abstract class AuditableEntity extends HasPrimaryKey {
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn({ nullable: true }) updatedAt?: Date | null
  @Column({ type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ type: 'uuid', nullable: true }) updatedBy!: string | null;
}

export abstract class TimestampEntity extends HasPrimaryKey {
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn({ nullable: true }) updatedAt?: Date | null
}

export abstract class TimestampedEntityWithSoftDelete extends TimestampEntity {
  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date | null;
}

export abstract class TimestampEntityWithSoftDelete extends TimestampEntity {
  @DeleteDateColumn({ nullable: true })
  deletedAt: Date | null | undefined;
}

export abstract class JoinEntity {
  @CreateDateColumn() assignedAt!: Date;
}
