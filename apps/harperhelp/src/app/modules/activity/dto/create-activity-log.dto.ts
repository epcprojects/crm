import {
  NotificationEntityType,
  NotificationType,
} from '@harperhelp/types';

export class CreateActivityLogDto {
  actorId: string | null;

  projectId: string |null;

  ticketId: string | null;

  type: NotificationType;

  title: string;
  entityType: NotificationEntityType;

  entityId: string | null;

  metadata?: Record<string, unknown>;
}