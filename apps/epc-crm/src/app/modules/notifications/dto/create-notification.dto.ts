import { NotificationEntityType, NotificationType } from '@epc-crm/types';

export class NotifyProjectMembersDto {
  projectId?: string;
  actorId: string; // user who triggered the event -- always excluded from recipients
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId?: string;

  ticketId?: string;

  title: string;
  message?: string;
  metadata?: Record<string, unknown>;

  requiredClaimValue?: string;

  explicitRecipientIds?: string[];

  skipCreate?: boolean;
}
