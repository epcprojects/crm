import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

// import { BaseEntity } from '@epc-crm/interfaces';
import { EmailNotificationEntityType } from '@epc-crm/types';

import { EmailEventType } from '../notifications.types';

@Entity('email_notification_preferences')
@Unique('UQ_email_notification_preference_user_type', [
  'userId',
  'notificationType',
])
@Index('IDX_email_notification_preference_user_id', ['userId'])
export class EmailNotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: EmailNotificationEntityType,
    enumName: 'email_notification_entity_type_enum',
  })
  entityType: EmailNotificationEntityType;

  @Column({
    type: 'enum',
    enum: EmailEventType,
    enumName: 'email_event_type_enum',
  })
  notificationType: EmailEventType;

  @Column({
    type: 'boolean',
    default: true,
  })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
