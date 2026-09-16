import { NotificationEntityType, NotificationType } from "@epc-crm/types";

export enum NotificationCategory {
  PROJECTS = 'projects',
  THREADS = 'threads',
  TICKETS = 'tickets',
  TICKET_REPLIES = 'ticket_replies',
  INTERNAL_MESSAGES = 'internal_messages',
  MENTIONS = 'mentions',
  MEMBERS = 'members',
  EVENTS = 'events',
}

export const MENTION_TYPES: NotificationType[] = [
  NotificationType.MENTIONED_IN_TICKET_REPLY,
  NotificationType.MENTIONED_IN_THREAD_MESSAGE,
  NotificationType.MENTIONED_IN_INTERNAL_MESSAGE,
];

// entityType -> category, for everything that ISN'T a mention.
// Mentions are resolved separately via `type`, never through this map.
export const ENTITY_TYPE_TO_CATEGORY: Record<NotificationEntityType, NotificationCategory> = {
  [NotificationEntityType.PROJECT]: NotificationCategory.PROJECTS,
  [NotificationEntityType.THREAD_MESSAGE]: NotificationCategory.THREADS,
  [NotificationEntityType.TICKET]: NotificationCategory.TICKETS,
  [NotificationEntityType.TICKET_REPLY]: NotificationCategory.TICKET_REPLIES,
  [NotificationEntityType.INTERNAL_MESSAGE]: NotificationCategory.INTERNAL_MESSAGES,
  [NotificationEntityType.EVENT]: NotificationCategory.EVENTS,
  [NotificationEntityType.MEMBER]: NotificationCategory.MEMBERS,
};

export const CATEGORY_TO_ENTITY_TYPES: Record<NotificationCategory, NotificationEntityType[]> = {
  [NotificationCategory.PROJECTS]: [NotificationEntityType.PROJECT],
  [NotificationCategory.THREADS]: [NotificationEntityType.THREAD_MESSAGE],
  [NotificationCategory.TICKETS]: [NotificationEntityType.TICKET],
  [NotificationCategory.TICKET_REPLIES]: [NotificationEntityType.TICKET_REPLY],
  [NotificationCategory.INTERNAL_MESSAGES]: [NotificationEntityType.INTERNAL_MESSAGE],
  [NotificationCategory.MEMBERS]: [NotificationEntityType.MEMBER],
  [NotificationCategory.EVENTS]: [NotificationEntityType.EVENT],
  [NotificationCategory.MENTIONS]: [], // unused — mentions filter by `type`, not entityType
};

/** Single source of truth for "which category does this row belong to". */
export function resolveCategory(
  entityType: NotificationEntityType,
  type: NotificationType,
): NotificationCategory {
  if (MENTION_TYPES.includes(type)) return NotificationCategory.MENTIONS;
  return ENTITY_TYPE_TO_CATEGORY[entityType];
}