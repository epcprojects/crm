'use client';

import { CalendarEvent, Ticket } from '../types';
import {
  formatDisplayDate,
  formatTime,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from '../../lib/calendar-utils';

interface DaySidebarProps {
  selectedDate: string | null;
  events: CalendarEvent[];
  tickets: Ticket[];
  onDeleteEvent: (id: string) => void;
  onUpdateTicket: (id: string, updates: Partial<Ticket>) => void;
  onDeleteTicket: (id: string) => void;
  onAddEvent: () => void;
  onAddTicket: () => void;
}

export default function DaySidebar({
  selectedDate,
  events,
  tickets,
  onDeleteEvent,
  onUpdateTicket,
  onDeleteTicket,
  onAddEvent,
  onAddTicket,
}: DaySidebarProps) {
  if (!selectedDate) {
    return (
      <aside className="day-sidebar empty">
        <p className="sidebar-empty-msg">Select a day to see details</p>
      </aside>
    );
  }

  const dayEvents = events.filter((e) => e.date === selectedDate);
  const dayTickets = tickets.filter((t) => t.dueDate === selectedDate);

  return (
    <aside className="day-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-date">{formatDisplayDate(selectedDate)}</h2>
        <div className="sidebar-actions">
          <button className="sb-action-btn" onClick={onAddEvent}>
            + Event
          </button>
          <button className="sb-action-btn ticket" onClick={onAddTicket}>
            + Ticket
          </button>
        </div>
      </div>

      {/* Events section */}
      <section className="sidebar-section">
        <h3 className="section-label">
          Events
          <span className="count-badge">{dayEvents.length}</span>
        </h3>

        {dayEvents.length === 0 ? (
          <p className="empty-section">No events</p>
        ) : (
          <div className="item-list">
            {dayEvents.map((event) => (
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
                    {event.startTime && (
                      <div className="sec-meta">
                        {formatTime(event.startTime)}
                        {event.endTime && ` – ${formatTime(event.endTime)}`}
                      </div>
                    )}
                    {event.location && (
                      <div className="sec-meta">📍 {event.location}</div>
                    )}
                    {event.description && (
                      <div className="sec-desc">{event.description}</div>
                    )}
                    {event.type === 'google' && (
                      <div className="google-badge">Google Calendar</div>
                    )}
                    {event.hangoutLink && (
                      <a
                        href={event.hangoutLink}
                        target="_blank"
                        rel="noreferrer"
                        className="meet-link"
                      >
                        Join Google Meet
                      </a>
                    )}
                  </div>
                </div>
                {event.type !== 'google' && (
                  <button
                    className="delete-btn"
                    onClick={() => onDeleteEvent(event.id)}
                    aria-label="Delete event"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tickets section */}
      <section className="sidebar-section">
        <h3 className="section-label">
          Tickets Due
          <span className="count-badge">{dayTickets.length}</span>
        </h3>

        {dayTickets.length === 0 ? (
          <p className="empty-section">No tickets due</p>
        ) : (
          <div className="item-list">
            {dayTickets.map((ticket) => (
              <div key={ticket.id} className="sidebar-ticket-card">
                <div
                  className="priority-stripe"
                  style={{ background: PRIORITY_COLORS[ticket.priority] }}
                />
                <div className="stc-body">
                  <div className="stc-top">
                    <span className="stc-title">{ticket.title}</span>
                    <button
                      className="delete-btn"
                      onClick={() => onDeleteTicket(ticket.id)}
                      aria-label="Delete ticket"
                    >
                      ×
                    </button>
                  </div>
                  {ticket.description && (
                    <div className="sec-desc">{ticket.description}</div>
                  )}
                  <div className="stc-meta">
                    <span
                      className="badge"
                      style={{
                        background: PRIORITY_COLORS[ticket.priority] + '22',
                        color: PRIORITY_COLORS[ticket.priority],
                        borderColor: PRIORITY_COLORS[ticket.priority] + '44',
                      }}
                    >
                      {ticket.priority}
                    </span>
                    <select
                      className="status-select"
                      value={ticket.status}
                      onChange={(e) =>
                        onUpdateTicket(ticket.id, {
                          status: e.target.value as any,
                        })
                      }
                      style={{ color: STATUS_COLORS[ticket.status] }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  {ticket.tags && ticket.tags.length > 0 && (
                    <div className="tag-list">
                      {ticket.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
