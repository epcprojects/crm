import { NotificationEntityType } from "@harperhelp/types";

export enum NotificationCategory {
  PROJECTS = 'projects',
  THREADS = 'threads',
  TICKETS = 'tickets',
  TICKET_REPLIES = 'ticket_replies',
  OTHER = 'other',
}

export const ENTITY_TYPE_TO_CATEGORY: Record<NotificationEntityType, NotificationCategory> = {
  [NotificationEntityType.PROJECT]: NotificationCategory.PROJECTS,
  [NotificationEntityType.THREAD_MESSAGE]: NotificationCategory.THREADS,
  [NotificationEntityType.TICKET]: NotificationCategory.TICKETS,
  [NotificationEntityType.TICKET_REPLY]: NotificationCategory.TICKET_REPLIES,
  [NotificationEntityType.INTERNAL_MESSAGE]: NotificationCategory.TICKET_REPLIES,
  [NotificationEntityType.EVENT]: NotificationCategory.OTHER,
  [NotificationEntityType.MEMBER]: NotificationCategory.OTHER,
};

// Reverse lookup: category -> the entity types that feed it
export const CATEGORY_TO_ENTITY_TYPES: Record<NotificationCategory, NotificationEntityType[]> = {
  [NotificationCategory.PROJECTS]: [NotificationEntityType.PROJECT],
  [NotificationCategory.THREADS]: [NotificationEntityType.THREAD_MESSAGE],
  [NotificationCategory.TICKETS]: [NotificationEntityType.TICKET],
  [NotificationCategory.TICKET_REPLIES]: [
    NotificationEntityType.TICKET_REPLY,
    NotificationEntityType.INTERNAL_MESSAGE,
  ],
  [NotificationCategory.OTHER]: [
    NotificationEntityType.EVENT,
    NotificationEntityType.MEMBER,
  ],
};