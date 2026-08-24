export enum SystemRoles {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER',
}

export enum ProjectRoles {
  PROJECT_ADMIN = 'PROJECT_ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER',
}

export enum UserType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export enum FileSource {
  DIRECT = 'direct',

  PROJECT = 'project',

  TICKET = 'ticket',
  TICKET_REPLY = 'ticket_reply',

  THREAD = 'thread',
  THREAD_REPLY = 'thread_reply',
}

export enum FileStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  DELETED = 'deleted',
}

export enum CalendarView {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export enum NotificationType {
  PROJECT_ASSIGNED = 'project_assigned',
  PROJECT_UNASSIGNED = 'project_unassigned',
  PROJECT_UPDATED = 'project_updated',
  PROJECT_DELETED = 'project_deleted',
  TICKET_CREATED = 'ticket_created',
  TICKET_REPLY = 'ticket_reply',
  TICKET_REPLY_REACTION = 'ticket_reply_reaction',
  INTERNAL_MESSAGE_REACTION = 'internal_message_reaction',
  THREAD_MESSAGE_REACTION = 'thread_message_reaction',
  TICKET_STATUS_CHANGED = 'ticket_status_changed',
  TICKET_PRIORITY_CHANGED = 'ticket_priority_changed',
  TICKET_ASSIGNEE_CHANGED = 'ticket_assignee_changed',
  TICKET_TITLE_CHANGED = 'ticket_title_changed',
  TICKET_DESCRIPTION_CHANGED = 'ticket_description_changed',
  TICKET_DUE_DATE_CHANGED = 'ticket_due_date_changed',
  TICKET_DELETED = 'ticket_deleted',
  THREAD_DELETED = 'thread_deleted',
  THREAD_CREATED = 'thread_created',
  THREAD_REPLY = 'thread_reply',
  EVENT_CREATED = 'event_created',
  EVENT_UPDATED = 'event_updated',
  EVENT_DELETED = 'event_deleted',
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
  MEMBER_UPDATED = 'member_updated',
  INTERNAL_MESSAGE = 'internal_message',
  MENTIONED_IN_TICKET_REPLY = 'mentioned_in_ticket_reply',
  MENTIONED_IN_THREAD_MESSAGE = 'mentioned_in_thread_message',
  MENTIONED_IN_INTERNAL_MESSAGE = 'mentioned_in_internal_message',
}

export enum NotificationEntityType {
  PROJECT = 'project',
  TICKET = 'ticket',
  TICKET_REPLY = 'ticket_reply',
  THREAD_MESSAGE = 'thread_message',
  EVENT = 'event',
  MEMBER = 'member',
  INTERNAL_MESSAGE = 'internal_message',
}

export enum EmailNotificationEntityType {
  PROJECT = 'project',
  THREAD = 'thread',
  TICKET = 'ticket',
}

export * from './tickets.types';
