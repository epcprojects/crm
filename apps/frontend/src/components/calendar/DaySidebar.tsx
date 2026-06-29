'use client';

import { useState } from 'react';
import ConfirmActionModal from '../modals/ConfirmActionModal';
import { CalendarEvent, Ticket } from '../types';
import { formatTime, PRIORITY_COLORS } from '../../lib/calendar-utils';
import ThemeButton from '../ui/ThemeButton';
import { TrashIcon } from '../../../public/icons';
import Dropdown from '../ui/ThemeDropDown';
import {
  PROJECT_EVENT_TYPE_COLORS,
  PROJECT_EVENT_TYPE_FILTER_OPTIONS,
} from './eventTypeOptions';

interface DaySidebarProps {
  title: string;
  events: CalendarEvent[];
  tickets: Ticket[];
  eventTypeFilter?: string;
  onEventTypeFilterChange?: (value: string) => void;
  onDeleteEvent: (id: string) => void | Promise<void>;
  onEventClick?: (event: CalendarEvent) => void;
  onUpdateTicket: (id: string, updates: Partial<Ticket>) => void;
  onDeleteTicket: (id: string) => void;
  onTicketClick?: (ticket: Ticket) => void;
  onAddEvent: () => void;
  onAddTicket: () => void;
  showAddEventAction?: boolean;
  showAddTicketAction?: boolean;
  showTicketsSection?: boolean;
  canDeleteEvent?: boolean;
}

export default function DaySidebar({
  title,
  events,
  tickets,
  eventTypeFilter = '',
  onEventTypeFilterChange,
  onDeleteEvent,
  onEventClick,
  onUpdateTicket,
  onDeleteTicket,
  onTicketClick,
  onAddEvent,
  onAddTicket,
  showAddEventAction = true,
  showAddTicketAction = true,
  showTicketsSection = true,
  canDeleteEvent = true,
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
          {showAddEventAction || showAddTicketAction ? (
            <div className="sidebar-actions">
              {showAddEventAction ? (
                <div className="flex flex-col gap-2 md:gap-4 w-full">
                  <ThemeButton className="" onClick={onAddEvent}>
                    + Event
                  </ThemeButton>
                  <Dropdown
                    value={eventTypeFilter}
                    label="Event Filter"
                    options={[...PROJECT_EVENT_TYPE_FILTER_OPTIONS]}
                    onChange={onEventTypeFilterChange ?? (() => undefined)}
                  />
                </div>
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

        <div className="sidebar-content-scroll">
          <section className="sidebar-section">
            <h3 className="section-label">
              Events
              <span className="rounded-full h-5 min-w-5 flex items-center justify-center text-gray-900 bg-gray-100 border border-gray-200">
                {events.length}
              </span>
            </h3>

            {events.length === 0 ? (
              <p className="empty-section">No events</p>
            ) : (
              <div className="item-list">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="border border-gray-200 rounded-xl flex ps-3 p-2 "
                  >
                    <div className="sec-left">
                      <div
                        className="sec-dot mt-1!"
                        style={{
                          background:
                            event.color ||
                            (event.type === 'google'
                              ? '#4285f4'
                              : event.type === 'ticket'
                                ? '#8b5cf6'
                                : event.type === 'launch' ||
                                    event.type === 'meeting' ||
                                    event.type === 'milestone'
                                  ? PROJECT_EVENT_TYPE_COLORS[event.type]
                                  : '#0f6e56'),
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => onEventClick?.(event)}
                        disabled={!onEventClick}
                        className="sec-body text-left disabled:cursor-default"
                      >
                        <div className="text-sm font-medium">{event.title}</div>
                        <div className="sec-meta">
                          Date: {formatTicketDate(event.date)}
                        </div>
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
                          <div className="text-xs">{event.description}</div>
                        ) : null}
                        {event.type === 'google' ? (
                          <div className="google-badge">Google Calendar</div>
                        ) : null}
                      </button>
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
                    {canDeleteEvent && event.type !== 'google' ? (
                      <button
                        className="h-6 hover:bg-red-100 rounded-md w-6 flex items-center justify-center"
                        onClick={() => setEventToDelete(event)}
                        aria-label="Delete event"
                      >
                        <TrashIcon height="12" width="12" />
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
                <span className="rounded-full h-5 min-w-5 flex items-center leading-none justify-center text-gray-900 bg-gray-100 border border-gray-200">
                  {tickets.length}
                </span>
              </h3>

              {tickets.length === 0 ? (
                <p className="empty-section">No tickets due</p>
              ) : (
                <div className="item-list border border-gray-200 rounded-xl ps-3 p-2">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="sidebar-ticket-card border-b! pb-2! border-b-gray-200! last:border-b-0!"
                    >
                      {/* <div
                      className="priority-stripe"
                      style={{ background: PRIORITY_COLORS[ticket.priority] }}
                    /> */}
                      <div className="stc-body w-full">
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
                        <div className="flex items-end justify-between gap-2 w-full">
                          <div className="sec-meta">
                            Due: {formatTicketDate(ticket.dueDate)}
                          </div>
                          <div className="stc-meta">
                            <span
                              className="badge"
                              style={{
                                background: ticket.priority
                                  ? `${PRIORITY_COLORS[ticket.priority]}22`
                                  : '#6b72800f',
                                color: ticket.priority
                                  ? PRIORITY_COLORS[ticket.priority]
                                  : '#6b7280',
                                borderColor: ticket.priority
                                  ? `${PRIORITY_COLORS[ticket.priority]}44`
                                  : '#d1d5db',
                              }}
                            >
                              {ticket.priority
                                ? ticket.priority
                                : 'No Priority'}
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
        </div>
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

function formatTicketDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
