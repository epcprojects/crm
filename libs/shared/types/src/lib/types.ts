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


export * from './tickets.types';
