'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { CalendarEvent, Ticket, GoogleCalendar } from '../types';
import {
  toDateString,
  getMonthDays,
  populateCells,
} from '../..//lib/calendar-utils';
import {
  fetchEventsByView,
  fetchTicketsByView,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
  createTicket as apiCreateTicket,
  updateTicket as apiUpdateTicket,
  deleteTicket as apiDeleteTicket,
  ApiEvent,
  ApiTicket,
  CalendarView as ApiView,
} from '../..//lib/api-client';

// Map FullCalendar view names → API view param
function fcViewToApiView(view: 'month' | 'week' | 'day' | 'year'): ApiView {
  return view as ApiView;
}

// Convert API event → internal CalendarEvent
function toCalendarEvent(e: ApiEvent): CalendarEvent {
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    date: e.date,
    description: e.description,
    color: e.color,
    allDay: true,
  };
}

// Convert API ticket → internal Ticket
function toTicket(t: ApiTicket): Ticket {
  return {
    id: t.id,
    title: t.title,
    dueDate: t.dueDate,
    priority: t.priority,
    status: t.status,
    createdAt: new Date().toISOString(),
  };
}

export function useCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day' | 'year'>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(
    toDateString(new Date()),
  );

  // Separate state: DB-backed + Google events
  const [dbEvents, setDbEvents] = useState<CalendarEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendar[]>([]);

  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All events combined
  const events: CalendarEvent[] = useMemo(
    () => [...dbEvents, ...googleEvents],
    [dbEvents, googleEvents],
  );

  // Reference date string for the API (always the 1st of month for month view, etc.)
  const refDateStr = useMemo(() => toDateString(currentDate), [currentDate]);

  // ── Fetch from API whenever view or date changes ────────────────────────

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setError(null);
    try {
      const apiView = fcViewToApiView(view === 'year' ? 'year' : view);
      const raw = await fetchEventsByView(apiView, refDateStr);
      setDbEvents(raw.map(toCalendarEvent));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingEvents(false);
    }
  }, [view, refDateStr]);

  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true);
    setError(null);
    try {
      const apiView = fcViewToApiView(view === 'year' ? 'year' : view);
      const raw = await fetchTicketsByView(apiView, refDateStr);
      setTickets(raw.map(toTicket));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingTickets(false);
    }
  }, [view, refDateStr]);

  useEffect(() => {
    fetchEvents();
    fetchTickets();
  }, [fetchEvents, fetchTickets]);

  // ── Month grid cells (used when rendering month view manually) ───────────

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const rawCells = useMemo(() => getMonthDays(year, month), [year, month]);
  const cells = useMemo(
    () => populateCells(rawCells, events, tickets, selectedDate),
    [rawCells, events, tickets, selectedDate],
  );

  // ── Navigation ────────────────────────────────────────────────────────────

  const navigatePrev = useCallback(() => {
    setCurrentDate((d) => {
      const nd = new Date(d);
      if (view === 'month') nd.setMonth(d.getMonth() - 1);
      else if (view === 'week') nd.setDate(d.getDate() - 7);
      else if (view === 'year') nd.setFullYear(d.getFullYear() - 1);
      else nd.setDate(d.getDate() - 1);
      return nd;
    });
  }, [view]);

  const navigateNext = useCallback(() => {
    setCurrentDate((d) => {
      const nd = new Date(d);
      if (view === 'month') nd.setMonth(d.getMonth() + 1);
      else if (view === 'week') nd.setDate(d.getDate() + 7);
      else if (view === 'year') nd.setFullYear(d.getFullYear() + 1);
      else nd.setDate(d.getDate() + 1);
      return nd;
    });
  }, [view]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDate(toDateString(new Date()));
  }, []);

  // ── Event CRUD (API-backed) ───────────────────────────────────────────────

  const addEvent = useCallback(async (event: Omit<CalendarEvent, 'id'>) => {
    const created = await apiCreateEvent({
      title: event.title,
      type: event.type as any,
      date: event.date,
      description: event.description,
      color: event.color,
    });
    const mapped = toCalendarEvent(created);
    setDbEvents((prev) => [...prev, mapped]);
    return mapped;
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    await apiDeleteEvent(id);
    setDbEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateEventDate = useCallback(async (id: string, newDate: string) => {
    const updated = await apiUpdateEvent(id, { date: newDate });
    setDbEvents((prev) =>
      prev.map((e) => (e.id === id ? toCalendarEvent(updated) : e)),
    );
  }, []);

  // ── Ticket CRUD (API-backed) ──────────────────────────────────────────────

  const addTicket = useCallback(
    async (ticket: Omit<Ticket, 'id' | 'createdAt'>) => {
      const created = await apiCreateTicket({
        title: ticket.title,
        description: ticket.description,
        dueDate: ticket.dueDate,
        priority: ticket.priority,
        status: ticket.status,
        assignee: ticket.assignee,
        tags: ticket.tags,
      });
      const mapped = toTicket(created);
      setTickets((prev) => [...prev, mapped]);
      return mapped;
    },
    [],
  );

  const updateTicket = useCallback(
    async (id: string, updates: Partial<Ticket>) => {
      const updated = await apiUpdateTicket(id, {
        title: updates.title,
        dueDate: updates.dueDate,
        priority: updates.priority as any,
        status: updates.status as any,
      });
      const mapped = toTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === id ? mapped : t)));
    },
    [],
  );

  const deleteTicket = useCallback(async (id: string) => {
    await apiDeleteTicket(id);
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Google events (not DB-backed) ────────────────────────────────────────

  const addGoogleEvents = useCallback((newEvents: CalendarEvent[]) => {
    setGoogleEvents(newEvents.filter((e) => e.type === 'google'));
  }, []);

  return {
    currentDate,
    setCurrentDate,
    view,
    setView,
    selectedDate,
    setSelectedDate,
    cells,
    events,
    tickets,
    isGoogleConnected,
    setIsGoogleConnected,
    googleCalendars,
    setGoogleCalendars,
    loadingEvents,
    loadingTickets,
    error,
    navigatePrev,
    navigateNext,
    goToToday,
    addEvent,
    deleteEvent,
    updateEventDate,
    addTicket,
    updateTicket,
    deleteTicket,
    addGoogleEvents,
    refetch: () => {
      fetchEvents();
      fetchTickets();
    },
  };
}
