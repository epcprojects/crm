/**
 * API client for calendar-api (NestJS on :3001)
 * Used by the Next.js frontend to fetch events and tickets.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type CalendarView = 'day' | 'week' | 'month' | 'year';

// ── Types matching the backend ──────────────────────────────────────────────

export interface ApiEvent {
  id: string;
  title: string;
  type: 'event' | 'google';
  date: string;        // YYYY-MM-DD
  description?: string;
  color?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
}

export interface ApiTicket {
  id: string;
  title: string;
  dueDate: string;     // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'review' | 'closed';
}

// ── Events ──────────────────────────────────────────────────────────────────

export async function fetchEventsByView(
  view: CalendarView,
  date: string,
): Promise<ApiEvent[]> {
  const res = await fetch(
    `${API_BASE}/calendar/events?view=${view}&date=${date}`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
  return res.json();
}

export async function fetchProjectEventsByView(
  projectId: string,
  view: CalendarView,
  date: string,
): Promise<ApiEvent[]> {
  const res = await fetch(
    `/api/projects/${projectId}/calendar/events?view=${view}&date=${date}`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`Failed to fetch project events: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.events)
          ? data.events
          : [];
}

export async function createEvent(
  data: Omit<ApiEvent, 'id'>,
): Promise<ApiEvent> {
  const res = await fetch(`${API_BASE}/calendar/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to create event');
  }
  return res.json();
}

export async function createProjectEvent(
  projectId: string,
  data: Omit<ApiEvent, 'id'>,
): Promise<ApiEvent> {
  const res = await fetch(`/api/projects/${projectId}/calendar/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to create project event');
  }
  return res.json();
}

export async function fetchProjectEventById(
  projectId: string,
  eventId: string,
): Promise<ApiEvent> {
  const res = await fetch(`/api/projects/${projectId}/calendar/events/${eventId}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to fetch project event');
  }
  return res.json();
}

export async function updateProjectEvent(
  projectId: string,
  eventId: string,
  data: Partial<Omit<ApiEvent, 'id'>>,
): Promise<ApiEvent> {
  const res = await fetch(`/api/projects/${projectId}/calendar/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to update project event');
  }
  return res.json();
}

export async function deleteProjectEvent(
  projectId: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/calendar/events/${eventId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || 'Failed to delete project event');
  }
}

export async function updateEvent(
  id: string,
  data: Partial<Omit<ApiEvent, 'id'>>,
): Promise<ApiEvent> {
  const res = await fetch(`${API_BASE}/calendar/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update event');
  return res.json();
}

export async function deleteEvent(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/calendar/events/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete event');
}

// ── Tickets ──────────────────────────────────────────────────────────────────

export async function fetchTicketsByView(
  view: CalendarView,
  date: string,
): Promise<ApiTicket[]> {
  const res = await fetch(
    `${API_BASE}/tickets?view=${view}&date=${date}`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`Failed to fetch tickets: ${res.status}`);
  return res.json();
}

export async function createTicket(
  data: Omit<ApiTicket, 'id'> & { description?: string; assignee?: string; tags?: string[] },
): Promise<ApiTicket> {
  const res = await fetch(`${API_BASE}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to create ticket');
  }
  return res.json();
}

export async function updateTicket(
  id: string,
  data: Partial<Omit<ApiTicket, 'id'>>,
): Promise<ApiTicket> {
  const res = await fetch(`${API_BASE}/tickets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update ticket');
  return res.json();
}

export async function deleteTicket(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tickets/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete ticket');
}
