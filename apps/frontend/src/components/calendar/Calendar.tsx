'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useCalendar } from '../hooks/useCalendar';
import DaySidebar from './DaySidebar';
import AddModal from './AddModal';
import GoogleModal from './GoogleModal';
import { toDateString } from '../../lib/calendar-utils';

const FullCalendarView = dynamic(() => import('./FullCalendarView'), {
  ssr: false,
  loading: () => (
    <div className="fc-loading">
      <div className="fc-loading-spinner" />
      <span>Loading calendar…</span>
    </div>
  ),
});

type ModalType = 'event' | 'ticket' | 'google' | null;

export default function Calendar() {
  const cal = useCalendar();
  const [modal, setModal] = useState<ModalType>(null);

  // Drag-and-drop: update date in DB then refetch
  const handleEventDrop = useCallback(
    async (id: string, newDate: string) => {
      try {
        const rawId = id.replace(/^ticket_/, '');
        const isTicket = cal.tickets.some((t) => t.id === rawId);
        if (isTicket) {
          await cal.updateTicket(rawId, { dueDate: newDate });
        } else {
          await cal.updateEventDate(id, newDate);
        }
      } catch (e) {
        console.error('Drag update failed:', e);
        cal.refetch();
      }
    },
    [cal],
  );

  const handleEventClick = useCallback(
    (id: string) => {
      const event = cal.events.find((e) => e.id === id);
      if (event) {
        cal.setSelectedDate(event.date);
        return;
      }
      const rawId = id.replace(/^ticket_/, '');
      const ticket = cal.tickets.find((t) => t.id === rawId);
      if (ticket) cal.setSelectedDate(ticket.dueDate);
    },
    [cal],
  );

  function handleGoogleConnect() {
    cal.setIsGoogleConnected(true);
    cal.setGoogleCalendars([
      {
        id: 'primary',
        summary: 'My Calendar',
        backgroundColor: '#4285f4',
        selected: true,
      },
      {
        id: 'work',
        summary: 'Work',
        backgroundColor: '#0f9d58',
        selected: true,
      },
      {
        id: 'holidays',
        summary: 'Holidays in Pakistan',
        backgroundColor: '#f4b400',
        selected: false,
      },
    ]);
    const today = new Date();
    const offset = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return toDateString(d);
    };
    cal.addGoogleEvents([
      {
        id: 'google_1',
        title: 'Product Review Meeting',
        date: offset(4),
        startTime: '11:00',
        endTime: '12:00',
        type: 'google',
        googleCalendarId: 'primary',
      },
      {
        id: 'google_2',
        title: 'Team Lunch',
        date: offset(6),
        startTime: '13:00',
        endTime: '14:00',
        type: 'google',
        googleCalendarId: 'work',
      },
      {
        id: 'google_3',
        title: 'Client Call — AUDITi',
        date: offset(9),
        startTime: '15:00',
        endTime: '16:00',
        type: 'google',
        googleCalendarId: 'primary',
      },
    ]);
    setModal(null);
  }

  function handleGoogleDisconnect() {
    cal.setIsGoogleConnected(false);
    cal.setGoogleCalendars([]);
    cal.addGoogleEvents([]);
    setModal(null);
  }

  return (
    <div className="calendar-app">
      {/* Top bar */}
      <div className="app-topbar">
        <div className="topbar-left">
          <h1 className="app-title">Calendar</h1>
          <div className="topbar-legend">
            <span className="leg-item">
              <span className="leg-dot" style={{ background: '#0f6e56' }} />
              Events
            </span>
            <span className="leg-item">
              <span className="leg-dot ticket-dot" />
              Tickets
            </span>
            <span className="leg-item">
              <span className="leg-dot" style={{ background: '#4285f4' }} />
              Google
            </span>
          </div>
          {(cal.loadingEvents || cal.loadingTickets) && (
            <span className="loading-pill">Syncing…</span>
          )}
          {cal.error && (
            <span className="error-pill" title={cal.error}>
              API error — running in offline mode
            </span>
          )}
        </div>
        <div className="topbar-right">
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
          <button
            className={`tb-btn google-btn ${cal.isGoogleConnected ? 'connected' : ''}`}
            onClick={() => setModal('google')}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {cal.isGoogleConnected ? 'Google Connected' : 'Connect Google'}
          </button>
        </div>
      </div>

      {/* Priority legend */}
      <div className="priority-legend">
        <span className="pri-label">Ticket priority:</span>
        {[
          { label: 'Critical', color: '#ef4444' },
          { label: 'High', color: '#f97316' },
          { label: 'Medium', color: '#eab308' },
          { label: 'Low', color: '#22c55e' },
        ].map((p) => (
          <span key={p.label} className="leg-item">
            <span className="leg-dot" style={{ background: p.color }} />
            {p.label}
          </span>
        ))}
        <span className="pri-tip">
          Drag events to reschedule · Click to view details · Auto-saves to DB
        </span>
      </div>

      {/* Main layout */}
      <div className="calendar-body">
        <div className="calendar-main">
          <FullCalendarView
            events={cal.events}
            tickets={cal.tickets}
            onDateClick={cal.setSelectedDate}
            onEventClick={handleEventClick}
            onEventDrop={handleEventDrop}
            onSelect={cal.setSelectedDate}
          />
        </div>

        <DaySidebar
          selectedDate={cal.selectedDate}
          events={cal.events.filter((e) => e.date === cal.selectedDate)}
          tickets={cal.tickets.filter((t) => t.dueDate === cal.selectedDate)}
          onDeleteEvent={cal.deleteEvent}
          onUpdateTicket={cal.updateTicket}
          onDeleteTicket={cal.deleteTicket}
          onAddEvent={() => setModal('event')}
          onAddTicket={() => setModal('ticket')}
        />
      </div>

      {(modal === 'event' || modal === 'ticket') && (
        <AddModal
          mode={modal}
          selectedDate={cal.selectedDate}
          onClose={() => setModal(null)}
          onAddEvent={cal.addEvent}
          onAddTicket={cal.addTicket}
        />
      )}

      {modal === 'google' && (
        <GoogleModal
          isConnected={cal.isGoogleConnected}
          calendars={cal.googleCalendars}
          onClose={() => setModal(null)}
          onConnect={handleGoogleConnect}
          onDisconnect={handleGoogleDisconnect}
          onToggleCalendar={(id) =>
            cal.setGoogleCalendars((prev: any) =>
              prev.map((c: any) =>
                c.id === id ? { ...c, selected: !c.selected } : c,
              ),
            )
          }
        />
      )}
    </div>
  );
}
