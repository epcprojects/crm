'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCalendar } from '../hooks/useCalendar';
import DaySidebar from './DaySidebar';
import AddModal from './AddModal';
import { formatDisplayDate } from '../../lib/calendar-utils';
import { appToast } from '../toast/AppToast';
import type { CalendarEvent } from '../types';

const FullCalendarView = dynamic(() => import('./FullCalendarView'), {
  ssr: false,
  loading: () => (
    <div className="fc-loading">
      <div className="fc-loading-spinner" />
      <span>Loading calendar...</span>
    </div>
  ),
});

type ModalType = 'event' | 'ticket' | null;

type CalendarProps = {
  projectId?: string;
};

export default function Calendar({ projectId }: CalendarProps) {
  const router = useRouter();
  const isProjectCalendar = Boolean(projectId);
  const cal = useCalendar({ projectId });
  const [modal, setModal] = useState<ModalType>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [, setIsFetchingEventDetail] = useState(false);

  const handleEventDrop = useCallback(
    async (id: string, newDate: string) => {
      try {
        const rawId = id.replace(/^ticket_/, '');
        const isTicket = cal.tickets.some((ticket) => ticket.id === rawId);

        if (isTicket) {
          await cal.updateTicket(rawId, { dueDate: newDate });
        } else {
          await cal.updateEventDate(id, newDate);
        }
      } catch (error) {
        console.error('Drag update failed:', error);
        cal.refetch();
      }
    },
    [cal],
  );

  const handleEventClick = useCallback(
    async (id: string) => {
      const event = cal.events.find((calendarEvent) => calendarEvent.id === id);

      if (event) {
        cal.setSelectedDate(event.date);

        if (!isProjectCalendar) {
          return;
        }

        try {
          setIsFetchingEventDetail(true);
          const detailedEvent = await cal.getProjectEvent(id);
          setEditingEvent(detailedEvent ?? event);
          setModal('event');
        } catch (error) {
          appToast.error(
            error instanceof Error
              ? error.message
              : 'Failed to load event details.',
          );
        } finally {
          setIsFetchingEventDetail(false);
        }

        return;
      }

      const rawId = id.replace(/^ticket_/, '');
      const ticket = cal.tickets.find((item) => item.id === rawId);

      if (ticket) {
        const ticketDetailUrl = projectId
          ? `/tickets/${ticket.id}?projectId=${projectId}`
          : `/tickets/${ticket.id}`;
        router.push(ticketDetailUrl);
      }
    },
    [cal, isProjectCalendar, projectId, router],
  );

  const sidebarData = useMemo(() => {
    const currentDateKey = formatLocalDate(cal.currentDate);

    if (cal.selectedDate) {
      return {
        title: formatDisplayDate(cal.selectedDate),
        events: cal.events.filter((event) => event.date === cal.selectedDate),
        tickets: cal.tickets.filter(
          (ticket) => ticket.dueDate === cal.selectedDate,
        ),
      };
    }

    if (cal.view === 'month') {
      const year = cal.currentDate.getFullYear();
      const month = cal.currentDate.getMonth();

      return {
        title: cal.currentDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
        events: cal.events.filter((event) => {
          const eventDate = new Date(`${event.date}T00:00:00`);
          return (
            eventDate.getFullYear() === year && eventDate.getMonth() === month
          );
        }),
        tickets: cal.tickets.filter((ticket) => {
          const ticketDate = new Date(`${ticket.dueDate}T00:00:00`);
          return (
            ticketDate.getFullYear() === year && ticketDate.getMonth() === month
          );
        }),
      };
    }

    if (cal.view === 'week') {
      const startOfWeek = new Date(cal.currentDate);
      startOfWeek.setDate(cal.currentDate.getDate() - cal.currentDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return {
        title: `${formatDisplayDate(formatLocalDate(startOfWeek))} - ${formatDisplayDate(
          formatLocalDate(endOfWeek),
        )}`,
        events: cal.events.filter((event) =>
          isDateWithinRange(event.date, startOfWeek, endOfWeek),
        ),
        tickets: cal.tickets.filter((ticket) =>
          isDateWithinRange(ticket.dueDate, startOfWeek, endOfWeek),
        ),
      };
    }

    return {
      title: formatDisplayDate(currentDateKey),
      events: cal.events.filter((event) => event.date === currentDateKey),
      tickets: cal.tickets.filter(
        (ticket) => ticket.dueDate === currentDateKey,
      ),
    };
  }, [cal.currentDate, cal.events, cal.selectedDate, cal.tickets, cal.view]);

  return (
    <div className="calendar-app ">
      <div className="app-topbar">
        <div className="topbar-left" />
        {/* <div className="topbar-right">
          {!isProjectCalendar ? (
            <>
              <button
                className="tb-btn ticket-btn"
                onClick={() => setModal('ticket')}
              >
                + Ticket
              </button>
              <button
                className="tb-btn event-btn"
                onClick={() => setModal('event')}
              >
                + Event
              </button>
            </>
          ) : (
            <button
              className="tb-btn event-btn"
              onClick={() => setModal('event')}
            >
              + Event
            </button>
          )}
        </div> */}
      </div>

      {!isProjectCalendar ? (
        <div className="priority-legend">
          <span className="pri-label">Ticket priority:</span>
          {[
            { label: 'Critical', color: '#ef4444' },
            { label: 'High', color: '#f97316' },
            { label: 'Medium', color: '#eab308' },
            { label: 'Low', color: '#22c55e' },
          ].map((priority) => (
            <span key={priority.label} className="leg-item">
              <span
                className="leg-dot"
                style={{ background: priority.color }}
              />
              {priority.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="calendar-body">
        <div className="calendar-main">
          <FullCalendarView
            events={cal.events}
            tickets={cal.tickets}
            onDateClick={cal.setSelectedDate}
            onEventClick={handleEventClick}
            onEventDrop={handleEventDrop}
            onSelect={cal.setSelectedDate}
            onViewChange={cal.setCalendarContext}
          />
        </div>

        <DaySidebar
          title={sidebarData.title}
          events={sidebarData.events}
          tickets={sidebarData.tickets}
          onDeleteEvent={cal.deleteEvent}
          onUpdateTicket={cal.updateTicket}
          onDeleteTicket={cal.deleteTicket}
          onTicketClick={(ticket) => {
            const ticketDetailUrl = projectId
              ? `/tickets/${ticket.id}?projectId=${projectId}`
              : `/tickets/${ticket.id}`;
            router.push(ticketDetailUrl);
          }}
          onAddEvent={() => {
            setEditingEvent(null);
            setModal('event');
          }}
          onAddTicket={() => setModal('ticket')}
          showAddEventAction={isProjectCalendar}
          showAddTicketAction={!isProjectCalendar}
          showTicketsSection
        />
      </div>

      {modal ? (
        <AddModal
          mode={modal}
          selectedDate={cal.selectedDate}
          onClose={() => {
            setModal(null);
            setEditingEvent(null);
          }}
          onAddEvent={cal.addEvent}
          onAddTicket={cal.addTicket}
          initialEvent={editingEvent}
          onUpdateEvent={cal.updateCalendarEvent}
          onDeleteEvent={cal.deleteEvent}
        />
      ) : null}
    </div>
  );
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDateWithinRange(value: string, start: Date, end: Date) {
  const date = new Date(`${value}T00:00:00`);
  return date >= start && date <= end;
}
