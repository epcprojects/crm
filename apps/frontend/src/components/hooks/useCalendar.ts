'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { CalendarEvent, Ticket, GoogleCalendar } from '../types';
import {
  toDateString,
  getMonthDays,
  populateCells,
} from '../..//lib/calendar-utils';
import {
  deleteProjectEvent as apiDeleteProjectEvent,
  fetchEventsByView,
  fetchProjectEventById,
  fetchProjectEventsByView,
  fetchProjectTickets,
  fetchTicketsByView,
  createEvent as apiCreateEvent,
  createProjectEvent as apiCreateProjectEvent,
  updateEvent as apiUpdateEvent,
  updateProjectEvent as apiUpdateProjectEvent,
  deleteEvent as apiDeleteEvent,
  createTicket as apiCreateTicket,
  updateTicket as apiUpdateTicket,
  deleteTicket as apiDeleteTicket,
  ApiEvent,
  ApiTicket,
  CalendarView as ApiView,
} from '../..//lib/api-client';

function fcViewToApiView(view: 'month' | 'week' | 'day' | 'year'): ApiView {
  return view as ApiView;
}

function toCalendarEvent(event: ApiEvent): CalendarEvent {
  const date = (event.date || event.start || '').split('T')[0];

  return {
    id: event.id,
    title: event.title,
    type: event.type ?? 'event',
    date,
    description: event.description,
    color: event.color,
    allDay: event.allDay ?? true,
  };
}

function toTicket(ticket: ApiTicket): Ticket {
  return {
    id: ticket.id,
    title: ticket.title,
    dueDate: ticket.dueDate.split('T')[0],
    priority: ticket.priority,
    status: ticket.status,
    createdAt: new Date().toISOString(),
  };
}

export function useCalendar(options?: { projectId?: string }) {
  const projectId = options?.projectId?.trim() || '';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day' | 'year'>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(
    toDateString(new Date()),
  );
  const [dbEvents, setDbEvents] = useState<CalendarEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendar[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingProjectEvents, setPendingProjectEvents] = useState<CalendarEvent[]>([]);
  const pendingProjectEventsRef = useRef<CalendarEvent[]>([]);

  const events: CalendarEvent[] = useMemo(
    () => [...dbEvents, ...googleEvents],
    [dbEvents, googleEvents],
  );

  useEffect(() => {
    pendingProjectEventsRef.current = pendingProjectEvents;
  }, [pendingProjectEvents]);

  const refDateStr = useMemo(
    () => getCalendarQueryDate(currentDate, view),
    [currentDate, view],
  );

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    setError(null);

    try {
      const apiView = fcViewToApiView(view);
      const rawEvents = projectId
        ? await fetchProjectEventsByView(projectId, apiView, refDateStr)
        : await fetchEventsByView(apiView, refDateStr);
      const fetchedEvents = rawEvents.map(toCalendarEvent);

      if (!projectId) {
        setDbEvents(fetchedEvents);
        return;
      }

      const currentPendingProjectEvents = pendingProjectEventsRef.current;
      const fetchedIds = new Set(fetchedEvents.map((event) => event.id));
      const remainingPendingEvents = currentPendingProjectEvents.filter(
        (event) => !fetchedIds.has(event.id),
      );

      setPendingProjectEvents(remainingPendingEvents);
      setDbEvents(mergeCalendarEvents(fetchedEvents, remainingPendingEvents));
    } catch (fetchError: any) {
      setError(fetchError.message);
    } finally {
      setLoadingEvents(false);
    }
  }, [projectId, view, refDateStr]);

  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true);
    setError(null);

    try {
      if (projectId) {
        const rawTickets = await fetchProjectTickets(projectId);
        setTickets(rawTickets.map(toTicket));
        return;
      }

      const apiView = fcViewToApiView(view);
      const rawTickets = await fetchTicketsByView(apiView, refDateStr);
      setTickets(rawTickets.map(toTicket));
    } catch (fetchError: any) {
      setError(fetchError.message);
    } finally {
      setLoadingTickets(false);
    }
  }, [projectId, view, refDateStr]);

  useEffect(() => {
    fetchEvents();
    fetchTickets();
  }, [fetchEvents, fetchTickets]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const rawCells = useMemo(() => getMonthDays(year, month), [year, month]);
  const cells = useMemo(
    () => populateCells(rawCells, events, tickets, selectedDate),
    [rawCells, events, tickets, selectedDate],
  );

  const navigatePrev = useCallback(() => {
    setCurrentDate((date) => {
      const nextDate = new Date(date);

      if (view === 'month') nextDate.setMonth(date.getMonth() - 1);
      else if (view === 'week') nextDate.setDate(date.getDate() - 7);
      else if (view === 'year') nextDate.setFullYear(date.getFullYear() - 1);
      else nextDate.setDate(date.getDate() - 1);

      return nextDate;
    });
  }, [view]);

  const navigateNext = useCallback(() => {
    setCurrentDate((date) => {
      const nextDate = new Date(date);

      if (view === 'month') nextDate.setMonth(date.getMonth() + 1);
      else if (view === 'week') nextDate.setDate(date.getDate() + 7);
      else if (view === 'year') nextDate.setFullYear(date.getFullYear() + 1);
      else nextDate.setDate(date.getDate() + 1);

      return nextDate;
    });
  }, [view]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDate(toDateString(new Date()));
  }, []);

  const setCalendarContext = useCallback(
    (nextView: 'month' | 'week' | 'day' | 'year', nextDate: string) => {
      const nextCurrentDate = new Date(`${nextDate}T00:00:00`);

      setView((currentView) => (currentView === nextView ? currentView : nextView));
      setCurrentDate((currentValue) =>
        formatLocalDate(currentValue) === nextDate ? currentValue : nextCurrentDate,
      );
      setSelectedDate((currentValue) => {
        if (nextView === 'day') {
          return currentValue === nextDate ? currentValue : nextDate;
        }

        return currentValue === null ? currentValue : null;
      });
    },
    [],
  );

  const addEvent = useCallback(async (event: Omit<CalendarEvent, 'id'>) => {
    const payload = {
      title: event.title,
      type: event.type as any,
      date: event.date,
      description: event.description,
      color: event.color,
    };
    const created = projectId
      ? await apiCreateProjectEvent(projectId, payload)
      : await apiCreateEvent(payload);
    const mapped = toCalendarEvent(created);
    setDbEvents((previous) => mergeCalendarEvents(previous, [mapped]));
    if (projectId) {
      setPendingProjectEvents((previous) => mergeCalendarEvents(previous, [mapped]));
    }
    return mapped;
  }, [projectId]);

  const deleteEvent = useCallback(async (id: string) => {
    if (projectId) {
      await apiDeleteProjectEvent(projectId, id);
    } else {
      await apiDeleteEvent(id);
    }
    setDbEvents((previous) => previous.filter((event) => event.id !== id));
    setPendingProjectEvents((previous) => previous.filter((event) => event.id !== id));
  }, [projectId]);

  const updateEventDate = useCallback(async (id: string, newDate: string) => {
    const updated = projectId
      ? await apiUpdateProjectEvent(projectId, id, { date: newDate })
      : await apiUpdateEvent(id, { date: newDate });
    setDbEvents((previous) =>
      previous.map((event) => (event.id === id ? toCalendarEvent(updated) : event)),
    );
    if (projectId) {
      setPendingProjectEvents((previous) =>
        previous.map((event) => (event.id === id ? toCalendarEvent(updated) : event)),
      );
    }
  }, [projectId]);

  const getProjectEvent = useCallback(async (id: string) => {
    if (!projectId) {
      return null;
    }

    const event = await fetchProjectEventById(projectId, id);
    return toCalendarEvent(event);
  }, [projectId]);

  const updateCalendarEvent = useCallback(
    async (id: string, event: Omit<CalendarEvent, 'id'>) => {
      const payload = {
        title: event.title,
        type: event.type as any,
        date: event.date,
        description: event.description,
        color: event.color,
      };
      const updated = projectId
        ? await apiUpdateProjectEvent(projectId, id, payload)
        : await apiUpdateEvent(id, payload);
      const mapped = toCalendarEvent(updated);
      setDbEvents((previous) =>
        previous.map((item) => (item.id === id ? mapped : item)),
      );
      if (projectId) {
        setPendingProjectEvents((previous) =>
          previous.map((item) => (item.id === id ? mapped : item)),
        );
      }
      return mapped;
    },
    [projectId],
  );

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
      setTickets((previous) => [...previous, mapped]);
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
      setTickets((previous) => previous.map((ticket) => (ticket.id === id ? mapped : ticket)));
    },
    [],
  );

  const deleteTicket = useCallback(async (id: string) => {
    await apiDeleteTicket(id);
    setTickets((previous) => previous.filter((ticket) => ticket.id !== id));
  }, []);

  const addGoogleEvents = useCallback((newEvents: CalendarEvent[]) => {
    setGoogleEvents(newEvents.filter((event) => event.type === 'google'));
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
    setCalendarContext,
    addEvent,
    getProjectEvent,
    deleteEvent,
    updateCalendarEvent,
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

function mergeCalendarEvents(
  baseEvents: CalendarEvent[],
  incomingEvents: CalendarEvent[],
) {
  const byId = new Map<string, CalendarEvent>();

  baseEvents.forEach((event) => {
    byId.set(event.id, event);
  });

  incomingEvents.forEach((event) => {
    byId.set(event.id, event);
  });

  return Array.from(byId.values());
}

function getCalendarQueryDate(
  currentDate: Date,
  view: 'month' | 'week' | 'day' | 'year',
) {
  if (view === 'month') {
    return `${currentDate.getFullYear()}-${`${currentDate.getMonth() + 1}`.padStart(2, '0')}-01`;
  }

  if (view === 'year') {
    return `${currentDate.getFullYear()}-01-01`;
  }

  return formatLocalDate(currentDate);
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
