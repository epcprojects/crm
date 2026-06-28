'use client';

import { useState } from 'react';
import ConfirmActionModal from '../modals/ConfirmActionModal';
import { CalendarEvent, Ticket } from '../types';
import { formatTime, PRIORITY_COLORS } from '../../lib/calendar-utils';
import ThemeButton from '../ui/ThemeButton';

interface DaySidebarProps {
  title: string;
  events: CalendarEvent[];
  tickets: Ticket[];
  onDeleteEvent: (id: string) => void | Promise<void>;
  onUpdateTicket: (id: string, updates: Partial<Ticket>) => void;
  onDeleteTicket: (id: string) => void;
  onTicketClick?: (ticket: Ticket) => void;
  onAddEvent: () => void;
  onAddTicket: () => void;
  showAddEventAction?: boolean;
  showAddTicketAction?: boolean;
  showTicketsSection?: boolean;
}

export default function DaySidebar({
  title,
  events,
  tickets,
  onDeleteEvent,
  onUpdateTicket,
  onDeleteTicket,
  onTicketClick,
  onAddEvent,
  onAddTicket,
  showAddEventAction = true,
  showAddTicketAction = true,
  showTicketsSection = true,
}: DaySidebarProps) {
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(
    null,
  );
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  async function handleConfirmDelete() {
    if (!eventToDelete) {
      return;
    }

    try {
      setIsDeletingEvent(true);
      await onDeleteEvent(eventToDelete.id);
      setEventToDelete(null);
    } finally {
      setIsDeletingEvent(false);
    }
  }

  return (
    <>
      <aside className="day-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-date">{title}</h2>
          {showAddEventAction || showAddTicketAction ? (
            <div className="sidebar-actions">
              {showAddEventAction ? (
                <ThemeButton className="w-full" onClick={onAddEvent}>
                  + Event
                </ThemeButton>
              ) : null}
              {showAddTicketAction ? (
                <ThemeButton
                  className="sb-action-btn ticket"
                  onClick={onAddTicket}
                >
                  + Ticket
                </ThemeButton>
              ) : null}
            </div>
          ) : null}
        </div>

        <section className="sidebar-section">
          <h3 className="section-label">
            Events
            <span className="count-badge">{events.length}</span>
          </h3>

          {events.length === 0 ? (
            <p className="empty-section">No events</p>
          ) : (
            <div className="item-list">
              {events.map((event) => (
                <div key={event.id} className="sidebar-event-card">
                  <div className="sec-left">
                    <div
                      className="sec-dot"
                      style={{
                        background:
                          event.type === 'google'
                            ? '#4285f4'
                            : event.type === 'ticket'
                              ? '#8b5cf6'
                              : '#0f6e56',
                      }}
                    />
                    <div className="sec-body">
                      <div className="sec-title">{event.title}</div>
                      {event.startTime ? (
                        <div className="sec-meta">
                          {formatTime(event.startTime)}
                          {event.endTime
                            ? ` â€“ ${formatTime(event.endTime)}`
                            : ''}
                        </div>
                      ) : null}
                      {event.location ? (
                        <div className="sec-meta">ðŸ“ {event.location}</div>
                      ) : null}
                      {event.description ? (
                        <div className="sec-desc">{event.description}</div>
                      ) : null}
                      {event.type === 'google' ? (
                        <div className="google-badge">Google Calendar</div>
                      ) : null}
                      {event.hangoutLink ? (
                        <a
                          href={event.hangoutLink}
                          target="_blank"
                          rel="noreferrer"
                          className="meet-link"
                        >
                          Join Google Meet
                        </a>
                      ) : null}
                    </div>
                  </div>
                  {event.type !== 'google' ? (
                    <button
                      className="delete-btn"
                      onClick={() => setEventToDelete(event)}
                      aria-label="Delete event"
                    >
                      x
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {showTicketsSection ? (
          <section className="sidebar-section">
            <h3 className="section-label">
              Tickets Due
              <span className="count-badge">{tickets.length}</span>
            </h3>

            {tickets.length === 0 ? (
              <p className="empty-section">No tickets due</p>
            ) : (
              <div className="item-list">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="sidebar-ticket-card">
                    <div
                      className="priority-stripe"
                      style={{ background: PRIORITY_COLORS[ticket.priority] }}
                    />
                    <div className="stc-body">
                      <div className="stc-top">
                        <button
                          type="button"
                          className="stc-title text-left"
                          onClick={() => onTicketClick?.(ticket)}
                        >
                          {ticket.title}
                        </button>
                        {/* <button
                          className="delete-btn"
                          onClick={() => onDeleteTicket(ticket.id)}
                          aria-label="Delete ticket"
                        >
                          x
                        </button> */}
                      </div>
                      {ticket.description ? (
                        <div className="sec-desc">{ticket.description}</div>
                      ) : null}
                      <div className="stc-meta">
                        <span
                          className="badge"
                          style={{
                            background: `${PRIORITY_COLORS[ticket.priority]}22`,
                            color: PRIORITY_COLORS[ticket.priority],
                            borderColor: `${PRIORITY_COLORS[ticket.priority]}44`,
                          }}
                        >
                          {ticket.priority}
                        </span>
                        {/* <select
                          className="status-select"
                          value={ticket.status}
                          onChange={(event) =>
                            onUpdateTicket(ticket.id, {
                              status: event.target.value as Ticket['status'],
                            })
                          }
                          style={{ color: STATUS_COLORS[ticket.status] }}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="closed">Closed</option>
                        </select> */}
                      </div>
                      {ticket.tags?.length ? (
                        <div className="tag-list">
                          {ticket.tags.map((tag) => (
                            <span key={tag} className="tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </aside>

      <ConfirmActionModal
        isOpen={Boolean(eventToDelete)}
        title="Delete event?"
        message="This event will be permanently removed from the calendar."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isSubmitting={isDeletingEvent}
        variant="danger"
        onClose={() => {
          if (!isDeletingEvent) {
            setEventToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
