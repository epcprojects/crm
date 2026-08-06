import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReactionEntityType } from '../enums/reaction-entity-type.enum';
import { User } from '../../users/entities/user.entity';

@Entity('reactions')
@Unique('UQ_reaction_actor_entity', ['actorId', 'entityType', 'entityId'])
@Index('IDX_reaction_entity', ['entityType', 'entityId'])
export class Reaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReactionEntityType,
  })
  entityType: ReactionEntityType;

  @Column('uuid')
  entityId: string;

  @Column('uuid')
  actorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorId' })
  actor: User | null;

  @Column({
    type: 'varchar',
    length: 20,
  })
  emoji: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
