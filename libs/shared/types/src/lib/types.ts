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
  TICKET_CREATED = 'ticket_created',
  TICKET_REPLY = 'ticket_reply',
  TICKET_STATUS_CHANGED = 'ticket_status_changed',
  TICKET_PRIORITY_CHANGED = 'ticket_priority_changed',
  TICKET_ASSIGNEE_CHANGED = 'ticket_assignee_changed',
  THREAD_CREATED = 'thread_created',
  THREAD_REPLY = 'thread_reply',
}

export enum NotificationEntityType {
  PROJECT = 'project',
  TICKET = 'ticket',
  TICKET_REPLY = 'ticket_reply',
  THREAD_MESSAGE = 'thread_message',
}

export * from './tickets.types';
