import {
  NotificationEntityType,
  NotificationType,
} from '@epc-crm/types';

export class CreateActivityLogDto {
  actorId: string | null;
  recipientId: string;

  projectId: string |null;

  ticketId: string | null;

  type: NotificationType;

  title: string;
  entityType: NotificationEntityType;

  entityId: string | null;

  metadata?: Record<string, unknown>;
}