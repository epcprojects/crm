export type ProjectCalendarEventType =
  | 'due_date'
  | 'launch'
  | 'meeting'
  | 'milestone';

export type ProjectCalendarSyncStatus =
  | 'synced'
  | 'pending'
  | 'failed'
  | 'local';

export type ProjectCalendarEvent = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  type: ProjectCalendarEventType;
  googleEventId?: string;
  syncStatus: ProjectCalendarSyncStatus;
  updatedAt: string;
  lastSyncedAt?: string;
};

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
};

export type ProjectCalendarConnection = {
  selectedCalendarId?: string;
  selectedCalendarSummary?: string;
  lastSyncedAt?: string;
};

export type ProjectCalendarStoredState = {
  connection?: ProjectCalendarConnection;
  events: ProjectCalendarEvent[];
};

export type ProjectCalendarEventInput = {
  title: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  type: ProjectCalendarEventType;
};
