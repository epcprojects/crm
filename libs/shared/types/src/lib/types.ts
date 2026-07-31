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
  PROJECT_UPDATED = 'project_updated',
  PROJECT_DELETED = 'project_deleted',
  TICKET_CREATED = 'ticket_created',
  TICKET_REPLY = 'ticket_reply',
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
}

export enum NotificationEntityType {
  PROJECT = 'project',
  TICKET = 'ticket',
  TICKET_REPLY = 'ticket_reply',
  THREAD_MESSAGE = 'thread_message',
  EVENT = 'event',
  MEMBER = 'member',
}

export * from './tickets.types';
