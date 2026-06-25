export type EventType = 'ticket' | 'event' | 'google';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export type TicketStatus = 'open' | 'in_progress' | 'review' | 'closed';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  type: EventType;
  description?: string;
  color?: string;
  allDay?: boolean;
  // Google Calendar fields
  googleEventId?: string;
  googleCalendarId?: string;
  hangoutLink?: string;
  location?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // ISO date string YYYY-MM-DD
  priority: TicketPriority;
  status: TicketStatus;
  assignee?: string;
  tags?: string[];
  createdAt: string;
}

export interface CalendarState {
  currentDate: Date;
  view: 'month' | 'week' | 'day';
  selectedDate: string | null;
  events: CalendarEvent[];
  tickets: Ticket[];
  isGoogleConnected: boolean;
  googleCalendars: GoogleCalendar[];
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  backgroundColor: string;
  selected: boolean;
}

export interface DayCell {
  date: Date;
  dateString: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  tickets: Ticket[];
}
