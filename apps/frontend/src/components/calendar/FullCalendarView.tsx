'use client';

import { useRef, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import {
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
  DateSelectArg,
} from '@fullcalendar/core';
import { CalendarEvent, Ticket } from '../types';
import { PRIORITY_COLORS } from '../../lib/calendar-utils';

interface FullCalendarViewProps {
  events: CalendarEvent[];
  tickets: Ticket[];
  onDateClick: (dateStr: string) => void;
  onEventClick: (id: string) => void;
  onEventDrop: (id: string, newDate: string) => void;
  onSelect: (dateStr: string) => void;
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
    backgroundColor: PRIORITY_COLORS[t.priority],
    borderColor: PRIORITY_COLORS[t.priority],
    textColor: '#ffffff',
    classNames: ['fc-ticket-event'],
  }));
}

function calendarEventsToFC(events: CalendarEvent[]): EventInput[] {
  return events.map((e) => {
    const bgColor = e.type === 'google' ? '#4285f4' : '#0f6e56';

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
  const isListView = info.view.type.startsWith('list');

  if (isListView) {
    return (
      <div className="fc-list-event-inner">
        {isTicket && (
          <span
            className="fc-list-badge"
            style={{ background: event.backgroundColor as string }}
          >
            {extendedProps.priority?.toUpperCase()}
          </span>
        )}
        {isGoogle && <span className="fc-list-badge google">G</span>}
        <span className="fc-list-title">{event.title}</span>
        {extendedProps.status && (
          <span className="fc-list-status">
            {extendedProps.status.replace('_', ' ')}
          </span>
        )}
      </div>
    );
  }

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
}: FullCalendarViewProps) {
  const calRef = useRef<FullCalendar>(null);

  const fcEvents = useMemo(
    () => [...calendarEventsToFC(events), ...ticketsToFCEvents(tickets)],
    [events, tickets],
  );

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

  return (
    <div className="fc-wrapper">
      <FullCalendar
        ref={calRef}
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          listPlugin,
          interactionPlugin,
          multiMonthPlugin,
        ]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        buttonText={{
          today: 'Today',
          month: 'Month',
          week: 'Week',
          day: 'Day',
          list: 'List',
        }}
        events={fcEvents}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={4}
        weekends={true}
        nowIndicator={true}
        navLinks={true}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        select={handleSelect}
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
          onDateClick(date.toISOString().split('T')[0]);
        }}
      />
    </div>
  );
}
