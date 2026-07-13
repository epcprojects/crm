'use client';

import { useRef, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
  DateSelectArg,
} from '@fullcalendar/core';
import { CalendarEvent, Ticket } from '../types';
import { PRIORITY_COLORS } from '../../lib/calendar-utils';
import { PROJECT_EVENT_TYPE_COLORS } from './eventTypeOptions';

interface FullCalendarViewProps {
  events: CalendarEvent[];
  tickets: Ticket[];
  onDateClick: (dateStr: string) => void;
  onEventClick: (id: string) => void;
  onEventDrop: (id: string, newDate: string) => void;
  onSelect: (dateStr: string) => void;
  onViewChange?: (
    view: 'month' | 'week' | 'day' | 'year',
    dateStr: string,
  ) => void;
  editable?: boolean;
  selectable?: boolean;
  navLinks?: boolean;
  allowedViews?: Array<'month' | 'week' | 'day'>;
  showAddEventButton?: boolean;
  onAddEvent?: () => void;
}

function ticketsToFCEvents(tickets: Ticket[]): EventInput[] {
  return tickets.map((t) => ({
    id: `ticket_${t.id}`,
    title: t.title,
    start: t.dueDate,
    allDay: true,
    extendedProps: {
      type: 'ticket',
      priority: t.priority,
      status: t.status,
      description: t.description,
      tags: t.tags,
      originalId: t.id,
    },
    backgroundColor: t.priority ? PRIORITY_COLORS[t.priority] : '#9ca3af',
    borderColor: t.priority ? PRIORITY_COLORS[t.priority] : '#9ca3af',
    textColor: '#ffffff',
    classNames: ['fc-ticket-event'],
  }));
}

function calendarEventsToFC(events: CalendarEvent[]): EventInput[] {
  return events.map((e) => {
    const bgColor =
      e.color ||
      (e.type === 'google'
        ? '#4285f4'
        : e.type === 'launch' || e.type === 'meeting' || e.type === 'milestone'
          ? PROJECT_EVENT_TYPE_COLORS[e.type]
          : '#0f6e56');

    const start =
      e.startTime && !e.allDay ? `${e.date}T${e.startTime}` : e.date;
    const end = e.endTime && !e.allDay ? `${e.date}T${e.endTime}` : undefined;

    return {
      id: e.id,
      title: e.title,
      start,
      end,
      allDay: e.allDay || !e.startTime,
      backgroundColor: bgColor,
      borderColor: bgColor,
      textColor: '#ffffff',
      extendedProps: {
        type: e.type,
        description: e.description,
        location: e.location,
        hangoutLink: e.hangoutLink,
        originalId: e.id,
      },
      classNames: [e.type === 'google' ? 'fc-google-event' : 'fc-custom-event'],
    };
  });
}

function EventContent({ info }: { info: EventContentArg }) {
  const { event } = info;
  const extendedProps = event.extendedProps ?? {};
  const isTicket = extendedProps.type === 'ticket';
  const isGoogle = extendedProps.type === 'google';

  return (
    <div className="fc-event-inner">
      {isTicket && <span className="fc-event-icon ticket-icon">🎫</span>}
      {isGoogle && <span className="fc-event-icon google-icon">G</span>}
      <span className="fc-event-label">{event.title}</span>
    </div>
  );
}

export default function FullCalendarView({
  events,
  tickets,
  onDateClick,
  onEventClick,
  onEventDrop,
  onSelect,
  onViewChange,
  editable = true,
  selectable = true,
  navLinks = true,
  allowedViews = ['month', 'week', 'day'],
  showAddEventButton = false,
  onAddEvent,
}: FullCalendarViewProps) {
  const calRef = useRef<FullCalendar>(null);

  const fcEvents = useMemo(
    () => [...calendarEventsToFC(events), ...ticketsToFCEvents(tickets)],
    [events, tickets],
  );
  const headerRight = useMemo(() => {
    if (allowedViews.length <= 1) {
      return showAddEventButton ? 'addEventButton' : '';
    }

    const viewButtons = allowedViews
      .map((view) => {
        if (view === 'month') return 'dayGridMonth';
        if (view === 'week') return 'timeGridWeek';
        return 'timeGridDay';
      })
      .join(',');

    return showAddEventButton
      ? `${viewButtons},addEventButton`
      : viewButtons;
  }, [allowedViews, showAddEventButton]);

  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      onDateClick(arg.dateStr);
    },
    [onDateClick],
  );

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const originalId = arg.event.extendedProps.originalId as string;
      onEventClick(originalId || arg.event.id);
    },
    [onEventClick],
  );

  const handleEventDrop = useCallback(
    (arg: EventDropArg) => {
      const originalId = arg.event.extendedProps.originalId as string;
      const newDate = arg.event.startStr.split('T')[0];
      onEventDrop(originalId || arg.event.id, newDate);
    },
    [onEventDrop],
  );

  const handleSelect = useCallback(
    (arg: DateSelectArg) => {
      onSelect(arg.startStr.split('T')[0]);
    },
    [onSelect],
  );

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      if (!onViewChange) {
        return;
      }

      const nextView =
        arg.view.type === 'dayGridMonth'
          ? 'month'
          : arg.view.type === 'timeGridWeek' || arg.view.type === 'dayGridWeek'
            ? 'week'
            : arg.view.type === 'timeGridDay' || arg.view.type === 'dayGridDay'
              ? 'day'
              : arg.view.type.includes('multiMonth')
                ? 'year'
                : arg.view.type.startsWith('list')
                  ? 'week'
                  : 'month';

      onViewChange(nextView, formatLocalDate(arg.view.currentStart));
    },
    [onViewChange],
  );

  return (
    <div className="fc-wrapper">
      <FullCalendar
        ref={calRef}
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin,
          multiMonthPlugin,
        ]}
        customButtons={{
          addEventButton: {
            text: '+ Event',
            click: () => {
              onAddEvent?.();
            },
          },
        }}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: headerRight,
        }}
        buttonText={{
          today: 'Today',
          month: 'Month',
          week: 'Week',
          day: 'Day',
        }}
        events={fcEvents}
        editable={editable}
        selectable={selectable}
        selectMirror={true}
        dayMaxEvents={4}
        weekends={true}
        nowIndicator={true}
        navLinks={navLinks}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        select={handleSelect}
        datesSet={handleDatesSet}
        eventContent={(info) => <EventContent info={info} />}
        height="100%"
        stickyHeaderDates={true}
        eventTimeFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short',
        }}
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short',
        }}
        navLinkDayClick={(date) => {
          onDateClick(formatLocalDate(date));
        }}
      />
    </div>
  );
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
