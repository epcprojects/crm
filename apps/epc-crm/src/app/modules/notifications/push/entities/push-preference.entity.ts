import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * One row per user: the account-level "do I want push" switch, independent
 * of any single device's subscription. Only written when the user has
 * explicitly opted in (via /push/subscribe) or out (via the settings
 * toggle) -- no row means "never decided" so a new device still shows the
 * normal opt-in prompt instead of silently doing nothing.
 */
@Entity('push_preferences')
export class PushPreference {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @Column({ type: 'boolean' })
  enabled: boolean;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
