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
  showEventTypeFilter?: boolean;
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
  showEventTypeFilter = false,
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
          {showAddEventAction || showAddTicketAction || showEventTypeFilter ? (
            <div className="sidebar-actions">
              {showAddEventAction ? (
                <div className="flex flex-col gap-2 w-full">
                  <ThemeButton className="" onClick={onAddEvent}>
                    + Event
                  </ThemeButton>
                </div>
              ) : null}
              {showEventTypeFilter ? (
                <Dropdown
                  value={eventTypeFilter}
                  label="Event Type"
                  options={[...PROJECT_EVENT_TYPE_FILTER_OPTIONS]}
                  onChange={onEventTypeFilterChange ?? (() => undefined)}
                />
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

        <div className="sidebar-content-scroll scrollbar-hide">
          <section className="sidebar-section">
            <h3 className="section-label">
              Events
              <span className="rounded-full h-5 min-w-5 flex items-center justify-center text-gray-900 bg-gray-100 border border-gray-200">
                {events.length}
              </span>
            </h3>

            {events.length === 0 ? (
              <div className="flex items-center py-4 justify-center flex-col bg-gray-100 rounded-lg gap-2">
                <svg
                  width="35"
                  height="35"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    opacity="0.4"
                    d="M43 25.5135V24.4865C43 21.0277 43 18.2553 42.8434 16H5.15657C5 18.2553 5 21.0277 5 24.4865V25.5135C5 34.2281 5 38.5854 7.50424 41.2927C10.0085 44 14.039 44 22.1 44H25.9C33.961 44 37.9915 44 40.4958 41.2927C43 38.5854 43 34.2281 43 25.5135Z"
                    fill="#6B7280"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M13.5 4C13.5 3.17157 12.8284 2.5 12 2.5C11.1716 2.5 10.5 3.17157 10.5 4V5.26958C8.89049 5.72576 7.533 6.4672 6.40309 7.68872C4.84727 9.37069 4.1557 11.4958 3.8245 14.159C3.49996 16.7686 3.49998 20.1129 3.5 24.3801V25.6199C3.49998 29.8871 3.49996 33.2314 3.8245 35.841C4.1557 38.5042 4.84727 40.6293 6.40309 42.3113C7.97429 44.0099 9.98553 44.7801 12.5026 45.146C14.9386 45.5001 18.0511 45.5 21.9785 45.5H22.1C22.9284 45.5 23.6 44.8284 23.6 44C23.6 43.1716 22.9284 42.5 22.1 42.5C18.0238 42.5 15.1295 42.4963 12.9341 42.1772C10.7946 41.8662 9.53843 41.2828 8.60539 40.2742C7.65697 39.2488 7.09642 37.8417 6.80156 35.4707C6.50273 33.0679 6.5 29.9101 6.5 25.5135V24.4865C6.5 21.7016 6.5011 19.4138 6.57785 17.5H41.4221C41.4943 19.2993 41.4997 21.4318 41.5 24.0002C41.5001 24.8286 42.1717 25.5001 43.0001 25.5C43.8286 25.4999 44.5001 24.8283 44.5 23.9998C44.4996 19.8394 44.4906 16.5693 44.1564 14.0089C43.8179 11.4159 43.1234 9.33902 41.5969 7.68872C40.467 6.4672 39.1095 5.72576 37.5 5.26958V4C37.5 3.17157 36.8284 2.5 36 2.5C35.1716 2.5 34.5 3.17157 34.5 4V4.73179C32.2279 4.49994 29.432 4.49997 26.0215 4.5H21.9785C18.568 4.49997 15.7721 4.49994 13.5 4.73179V4ZM41.1948 14.5H6.80522C7.10105 12.1467 7.66088 10.7469 8.60539 9.72585C9.12406 9.16512 9.74258 8.73582 10.5572 8.41169C10.7361 9.03995 11.3143 9.5 12 9.5C12.8284 9.5 13.5 8.82843 13.5 8V7.74917C15.622 7.50312 18.3647 7.5 22.1 7.5H25.9C29.6353 7.5 32.378 7.50312 34.5 7.74917V8C34.5 8.82843 35.1716 9.5 36 9.5C36.6857 9.5 37.2639 9.03995 37.4428 8.41169C38.2574 8.73583 38.8759 9.16512 39.3946 9.72585C40.3253 10.732 40.8825 12.1058 41.1816 14.3972L41.1948 14.5Z"
                    fill="#6B7280"
                  />
                  <path
                    d="M30.0607 28.9393C29.4749 28.3536 28.5251 28.3536 27.9393 28.9393C27.3536 29.5251 27.3536 30.4749 27.9393 31.0607L33.8787 37L27.9393 42.9393C27.3536 43.5251 27.3536 44.4749 27.9393 45.0607C28.5251 45.6464 29.4749 45.6464 30.0607 45.0607L36 39.1213L41.9393 45.0607C42.5251 45.6464 43.4749 45.6464 44.0607 45.0607C44.6464 44.4749 44.6464 43.5251 44.0607 42.9393L38.1213 37L44.0607 31.0607C44.6464 30.4749 44.6464 29.5251 44.0607 28.9393C43.4749 28.3536 42.5251 28.3536 41.9393 28.9393L36 34.8787L30.0607 28.9393Z"
                    fill="#6B7280"
                  />
                </svg>
                <p className=" text-sm">No Events found</p>
              </div>
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
                <div className="flex py-4 items-center justify-center bg-gray-100 rounded-lg flex-col gap-2">
                  <svg
                    width="35"
                    height="35"
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      opacity="0.4"
                      d="M37.2869 32.2089L32.2102 37.2856C28.0482 41.4476 25.9673 43.5285 23.3988 43.9102C22.4485 44.0514 21.4713 44.0236 20.5115 43.828C18.8432 43.4881 17.3368 42.4559 15.3025 40.5909C14.9547 40.272 14.9868 39.7298 15.3015 39.4151C17.0539 37.6627 16.9706 34.7383 15.1155 32.8833C13.2604 31.0282 10.336 30.9449 8.58367 32.6973C8.26902 33.0119 7.72682 33.0441 7.40791 32.6962C5.54291 30.662 4.51072 29.1556 4.17077 27.4873C3.97518 26.5275 3.94736 25.5503 4.08857 24.6C4.47025 22.0315 6.55121 19.9505 10.7131 15.7886L10.7131 15.7886L15.7898 10.7119C16.3034 10.1984 16.7852 9.71651 17.2402 9.26563L38.851 30.6395C38.3668 31.129 37.8462 31.6496 37.2881 32.2077L37.2869 32.2089Z"
                      fill="#6B7280"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M27.788 2.70022C26.6603 2.47044 25.5072 2.4367 24.3807 2.6041C22.7303 2.84934 21.3235 3.63831 19.8565 4.81076C18.4295 5.95127 16.8198 7.56095 14.7935 9.58735L9.58804 14.7928C7.56163 16.8191 5.95194 18.4288 4.81143 19.8558C3.63897 21.3228 2.85001 22.7297 2.60477 24.38C2.43737 25.5065 2.4711 26.6597 2.70089 27.7873C3.12769 29.8818 4.40868 31.645 6.30215 33.7104C7.27439 34.7708 8.80863 34.594 9.64424 33.7584C10.7547 32.6479 12.7277 32.6174 14.0548 33.9444C15.3818 35.2714 15.3512 37.2444 14.2407 38.3549C13.4051 39.1905 13.2283 40.7248 14.2888 41.697C16.3541 43.5905 18.1174 44.8715 20.2119 45.2983C21.3395 45.528 22.4926 45.5618 23.6192 45.3944C25.2695 45.1491 26.6764 44.3602 28.1433 43.1877C29.5703 42.0472 31.18 40.4376 33.2063 38.4112L38.4118 33.2057C40.4382 31.1793 42.0479 29.5697 43.1884 28.1427C44.3608 26.6757 45.1498 25.2688 45.3951 23.6185C45.5625 22.492 45.5287 21.3388 45.2989 20.2112C44.8721 18.1165 43.5909 16.3531 41.697 14.2874C40.7253 13.2275 39.1917 13.4039 38.3563 14.2393C37.2459 15.3498 35.2728 15.3804 33.9458 14.0534C32.6188 12.7263 32.6493 10.7533 33.7598 9.64283C34.5952 8.80743 34.7716 7.27387 33.7117 6.30213C31.6461 4.4083 29.8827 3.12707 27.788 2.70022ZM24.8216 5.57152C25.5957 5.4565 26.3969 5.4784 27.189 5.63981C28.3212 5.87054 29.4597 6.54196 31.1697 8.05016C29.283 10.456 29.6097 13.9599 31.8245 16.1747C34.0392 18.3894 37.5431 18.7161 39.949 16.8295C41.4572 18.5395 42.1286 19.6779 42.3593 20.8102C42.5208 21.6023 42.5427 22.4035 42.4276 23.1775C42.2912 24.0957 41.8488 25.0136 40.8449 26.2697C40.2878 26.9668 39.5927 27.7265 38.7356 28.6136L19.3856 9.26358C20.2726 8.40645 21.0324 7.71136 21.7295 7.15425C22.9856 6.15032 23.9034 5.70797 24.8216 5.57152ZM17.2515 11.3721C17.1203 11.5032 16.9866 11.6368 16.8504 11.773L11.7737 16.8497C9.66849 18.955 8.17875 20.4478 7.15492 21.7288C6.151 22.9849 5.70863 23.9028 5.57219 24.821C5.45716 25.595 5.47907 26.3962 5.64048 27.1883C5.87119 28.3205 6.54259 29.459 8.05074 31.1689C10.4566 29.2815 13.9611 29.6081 16.1761 31.8231C18.3911 34.0381 18.7176 37.5425 16.8303 39.9484C18.5402 41.4566 19.6786 42.128 20.8109 42.3587C21.603 42.5201 22.4042 42.542 23.1782 42.427C24.0964 42.2905 25.0142 41.8482 26.2704 40.8442C27.5514 39.8204 29.0442 38.3307 31.1494 36.2254L36.2261 31.1487C36.3623 31.0125 36.496 30.8789 36.627 30.7477L17.2515 11.3721Z"
                      fill="#6B7280"
                    />
                  </svg>

                  <p className="empty-section">Tickets not found</p>
                </div>
              ) : (
                <div className="item-list border border-gray-200 rounded-xl ps-3 p-2">
                  {tickets.map((ticket) => {
                    const dueDateValue = toDateInputValue(ticket.dueDate);
                    const isOverdue = Boolean(
                      dueDateValue && dueDateValue < getTodayInputValue(),
                    );

                    return (
                      <div
                        key={ticket.id}
                        className="sidebar-ticket-card border-b! pb-2! border-b-gray-200! last:border-b-0!"
                      >
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
                            <div
                              className={`sec-meta flex items-center justify-between w-full gap-2 ${isOverdue ? 'text-[#B42318]' : ''}`}
                            >
                              <span>
                                Due: {formatTicketDate(ticket.dueDate)}
                              </span>
                              {isOverdue ? (
                                <span className="rounded-full bg-[#F04438] px-2.5 py-0.5 text-xs font-medium text-white">
                                  Overdue
                                </span>
                              ) : null}
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
                    );
                  })}
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

function toDateInputValue(value: string) {
  return value.split('T')[0] ?? '';
}

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
