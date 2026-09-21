import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as webPush from 'web-push';
import { NotificationEntityType } from '@epc-crm/types';
import { PushSubscription } from './entities/push-subscription.entity';
import { Notification } from '../entities/notification.entity';
import { SubscribePushDto } from './dto/push-subscription.dto';

export interface PushPayload {
  title: string;
  body: string;
  /** In-app path opened when the notification is tapped. */
  url: string;
  /** Same tag replaces an earlier notification instead of stacking. */
  tag: string;
  notificationId?: string;
  unreadCount: number;
}

const PUSH_TTL_SECONDS = 60 * 60 * 24;
const MAX_BODY_LENGTH = 180;

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;
  private publicKey: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(PushSubscription)
    private readonly subscriptionsRepo: Repository<PushSubscription>,
  ) {}

  onModuleInit() {
    const config = this.configService.get<{
      vapidPublicKey?: string;
      vapidPrivateKey?: string;
      vapidSubject?: string;
    }>('push');

    if (
      !config?.vapidPublicKey ||
      !config?.vapidPrivateKey ||
      !config?.vapidSubject
    ) {
      this.logger.warn(
        'VAPID keys are not configured -- push notifications are disabled.',
      );
      return;
    }

    try {
      webPush.setVapidDetails(
        config.vapidSubject,
        config.vapidPublicKey,
        config.vapidPrivateKey,
      );
      this.publicKey = config.vapidPublicKey;
      this.enabled = true;
    } catch (err) {
      this.logger.error(
        `Invalid VAPID configuration -- push notifications are disabled: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  getPublicKey(): { publicKey: string | null } {
    return { publicKey: this.enabled ? this.publicKey : null };
  }

  async subscribe(userId: string, dto: SubscribePushDto): Promise<void> {
    // Upsert on endpoint: a shared device that signs in as someone else moves
    // to the new account instead of leaving a stale row for the old one.
    await this.subscriptionsRepo.upsert(
      {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent ?? null,
      },
      ['endpoint'],
    );
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await this.subscriptionsRepo.delete({ userId, endpoint });
  }

  /**
   * Fire-and-forget entry point for NotificationsService. Never throws and is
   * never awaited by the caller, so a push failure cannot affect the
   * notification flow.
   */
  sendForNotifications(
    notifications: Notification[],
    unreadCounts: Map<string, number>,
  ): void {
    if (!this.enabled || notifications.length === 0) return;

    void this.dispatch(notifications, unreadCounts).catch((err) => {
      this.logger.error(
        `Push dispatch failed: ${err instanceof Error ? err.message : err}`,
      );
    });
  }

  private async dispatch(
    notifications: Notification[],
    unreadCounts: Map<string, number>,
  ): Promise<void> {
    const recipientIds = [...new Set(notifications.map((n) => n.recipientId))];
    const subscriptions = await this.subscriptionsRepo.find({
      where: { userId: In(recipientIds) },
    });
    if (subscriptions.length === 0) {
      this.logger.log(
        `Push: no subscribed devices for ${recipientIds.length} recipient(s)`,
      );
      return;
    }

    const byUser = new Map<string, PushSubscription[]>();
    for (const sub of subscriptions) {
      const list = byUser.get(sub.userId) ?? [];
      list.push(sub);
      byUser.set(sub.userId, list);
    }

    const expiredIds: string[] = [];
    const jobs: Promise<void>[] = [];
    let delivered = 0;

    for (const notification of notifications) {
      const targets = byUser.get(notification.recipientId);
      if (!targets?.length) continue;

      const payload = JSON.stringify(
        this.buildPayload(
          notification,
          unreadCounts.get(notification.recipientId) ?? 0,
        ),
      );

      for (const sub of targets) {
        jobs.push(
          this.sendOne(sub, payload).then((result) => {
            if (result === 'gone') expiredIds.push(sub.id);
            if (result === 'sent') delivered += 1;
          }),
        );
      }
    }

    await Promise.all(jobs);
    this.logger.log(
      `Push: ${delivered}/${jobs.length} accepted by the push service`,
    );

    // 404/410 from the push service means the subscription is gone for good.
    if (expiredIds.length > 0) {
      await this.subscriptionsRepo.delete({ id: In([...new Set(expiredIds)]) });
      this.logger.debug(`Pruned ${expiredIds.length} expired subscription(s)`);
    }
  }

  /** 'gone' means the subscription is permanently invalid. */
  private async sendOne(
    sub: PushSubscription,
    payload: string,
  ): Promise<'sent' | 'gone' | 'failed'> {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: PUSH_TTL_SECONDS, urgency: 'normal' },
      );
      return 'sent';
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) return 'gone';

      this.logger.warn(
        `Push send failed (${statusCode ?? 'network'}) for subscription ${sub.id}`,
      );
      return 'failed';
    }
  }

  private buildPayload(
    notification: Notification,
    unreadCount: number,
  ): PushPayload {
    return {
      title: notification.title,
      body: toPlainText(notification.message),
      url: getNotificationUrl(notification),
      tag: `${notification.entityType}:${
        notification.ticketId ?? notification.entityId ?? notification.id
      }`,
      notificationId: notification.id,
      unreadCount,
    };
  }
}

function toPlainText(message: string | null): string {
  if (!message) return '';
  const text = message
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > MAX_BODY_LENGTH
    ? `${text.slice(0, MAX_BODY_LENGTH - 1)}…`
    : text;
}

/** Mirrors apps/frontend/src/lib/notification-navigation.ts. */
function getNotificationUrl(n: Notification): string {
  switch (n.entityType) {
    case NotificationEntityType.TICKET_REPLY:
      return `/tickets/${n.ticketId}?projectId=${n.projectId}&internal=false`;
    case NotificationEntityType.INTERNAL_MESSAGE:
      return `/tickets/${n.ticketId}?projectId=${n.projectId}&internal=true`;
    case NotificationEntityType.EVENT:
      return n.projectId ? `/projects/${n.projectId}?t=3` : '/notifications';
    case NotificationEntityType.TICKET:
      return `/tickets/${n.ticketId}?projectId=${n.projectId}`;
    case NotificationEntityType.PROJECT:
      return n.projectId ? `/projects/${n.projectId}` : '/projects';
    case NotificationEntityType.THREAD_MESSAGE:
      return n.projectId ? `/projects/${n.projectId}?t=1` : '/notifications';
    default:
      return '/notifications';
  }
}
