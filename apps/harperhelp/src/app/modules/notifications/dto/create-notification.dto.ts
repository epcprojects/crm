import {
  NotificationEntityType,
  NotificationType,
} from '../entities/notification.entity';

/**
 * Internal call shape used by ProjectsService / TicketsService / ThreadsService
 * to raise a notification event. Never exposed as a public REST endpoint --
 * notifications are always system-generated from real domain writes.
 */
export class NotifyProjectMembersDto {
  projectId: string;
  actorId: string; // user who triggered the event -- always excluded from recipients
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;

  /** Set for any ticket-related event so the notification can deep-link to the ticket. */
  ticketId?: string;

  title: string;
  message?: string;
  metadata?: Record<string, unknown>;

  /**
   * Restricts recipients to project members whose role has this claim
   * (checked via user_roles -> role_claims."claimValue").
   * Omit to notify every project member -- the default, since per your
   * access model every ticket/thread in a project is visible to all its members.
   */
  requiredClaimValue?: string;

  /**
   * Bypasses project-membership resolution entirely and notifies exactly
   * these users. Used for events tied to specific people rather than the
   * whole project -- e.g. "you were assigned a project", "you were made
   * assignee on a ticket".
   */
  explicitRecipientIds?: string[];
}
