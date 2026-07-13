'use client';

import { useMemo, useState } from 'react';
import type { RecentTicket } from '../tables/RecentTicketsTable';

type TicketStatusOption = {
  label: string;
  value: string;
  color?: string;
};

type TicketsKanbanViewProps = {
  tickets: RecentTicket[];
  statusOptions: TicketStatusOption[];
  onTicketClick?: (ticket: RecentTicket) => void;
  onMoveTicket?: (ticket: RecentTicket, nextStatusKey: string) => void;
  canDragTickets?: boolean;
  movingTicketId?: string | null;
};

const defaultStatusTone = {
  background: '#f3f4f6',
  border: '#e5e7eb',
  dot: '#9ca3af',
  text: '#374151',
};

export default function TicketsKanbanView({
  tickets,
  statusOptions,
  onTicketClick,
  onMoveTicket,
  canDragTickets = false,
  movingTicketId = null,
}: TicketsKanbanViewProps) {
  const [draggingTicketId, setDraggingTicketId] = useState<string | null>(null);
  const [hoveredColumnKey, setHoveredColumnKey] = useState<string | null>(null);
  const columns = useMemo(() => {
    const normalizedOptions = statusOptions.map((status) => ({
      key: status.value,
      label: status.label,
      color: status.color,
    }));

    const existingLabels = new Set(
      normalizedOptions.map((status) => status.label.trim().toLowerCase()),
    );
    const extraStatuses = Array.from(
      new Set(
        tickets
          .map((ticket) => ticket.status?.trim())
          .filter((status): status is string => Boolean(status)),
      ),
    )
      .filter((status) => !existingLabels.has(status.trim().toLowerCase()))
      .map((status) => ({
        key: `custom:${status}`,
        label: status,
        color: undefined,
      }));

    const allColumns = [...normalizedOptions, ...extraStatuses];

    return allColumns.map((column) => ({
      ...column,
      tickets: tickets.filter((ticket) => ticket.status === column.label),
    }));
  }, [statusOptions, tickets]);

  if (!columns.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No statuses available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-6">
        {columns.map((column) => {
          const tone = getStatusTone(column.color);

          return (
            <section
              key={column.key}
              className={`flex w-[350px] shrink-0 flex-col gap-5 rounded-2xl transition ${
                hoveredColumnKey === column.key ? 'bg-gray-50/80' : ''
              }`}
              onDragOver={(event) => {
                if (!canDragTickets) {
                  return;
                }

                event.preventDefault();
                setHoveredColumnKey(column.key);
              }}
              onDragLeave={() => {
                if (hoveredColumnKey === column.key) {
                  setHoveredColumnKey(null);
                }
              }}
              onDrop={(event) => {
                if (!canDragTickets) {
                  return;
                }

                event.preventDefault();
                const draggedTicketId =
                  event.dataTransfer.getData('text/plain') || draggingTicketId;
                const draggedTicket = tickets.find(
                  (ticket) => ticket.id === draggedTicketId,
                );

                setHoveredColumnKey(null);
                setDraggingTicketId(null);

                if (!draggedTicket || draggedTicket.status === column.label) {
                  return;
                }

                onMoveTicket?.(draggedTicket, column.key);
              }}
            >
              <div
                className="relative flex items-center gap-2 rounded-lg px-3 py-3"
                style={{
                  backgroundColor: tone.background,
                }}
              >
                <span
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                  style={{ backgroundColor: tone.dot }}
                />
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tone.dot }}
                />
                <span
                  className="text-base font-semibold leading-none"
                  style={{ color: tone.text }}
                >
                  {column.label}
                </span>
                {/* <span
                  className="ml-auto inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-2 text-xs font-medium"
                  style={{
                    color: tone.text,
                    borderColor: tone.border,
                    backgroundColor: '#ffffffcc',
                  }}
                >
                  {column.tickets.length}
                </span> */}
              </div>

              <div
                className={`flex min-h-40 flex-1 flex-col gap-5 rounded-xl transition ${
                  hoveredColumnKey === column.key
                    ? 'border border-dashed border-gray-200 bg-primary/5'
                    : ''
                }`}
              >
                {column.tickets.length ? (
                  column.tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      draggable={canDragTickets && movingTicketId !== ticket.id}
                      onDragStart={(event) => {
                        if (!canDragTickets) {
                          return;
                        }

                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', ticket.id);
                        setDraggingTicketId(ticket.id);
                      }}
                      onDragEnd={() => {
                        setDraggingTicketId(null);
                        setHoveredColumnKey(null);
                      }}
                      onClick={() => onTicketClick?.(ticket)}
                      className={`rounded-xl border border-gray-200 bg-white p-3  text-left shadow-xs transition hover:border-gray-300 hover:shadow-sm ${
                        draggingTicketId === ticket.id
                          ? 'opacity-60 ring-2 ring-primary/20'
                          : ''
                      } ${
                        movingTicketId === ticket.id
                          ? 'cursor-wait opacity-70'
                          : ''
                      } ${canDragTickets ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      <div className="space-y-2.5">
                        <p className="line-clamp-2 text-base font-semibold  text-gray-900">
                          {ticket.title}
                        </p>

                        <div className="space-y-1.5 text-sm text-gray-700">
                          <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                            <span className="text-sm text-gray-900">
                              Reference No:
                            </span>
                            <span className="truncate text-right text-sm text-gray-900">
                              {ticket.ticketRefNo ?? ticket.id}
                            </span>
                          </div>
                          <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                            <span className="text-sm text-gray-900">Date:</span>
                            <span className="text-right text-sm text-gray-900">
                              {ticket.date}
                            </span>
                          </div>
                          <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                            <span className="text-sm text-gray-900">
                              Project:
                            </span>

                            <div className="flex justify-end">
                              <span className="flex w-fit justify-end items-center gap-2 whitespace-nowrap rounded-full bg-purple-100 py-0.75 pr-2.5 pl-0.75 text-xs font-medium text-purple-700">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-medium">
                                  {ticket.project.initials}
                                </span>
                                {ticket.project.name}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                            <span className="text-sm text-gray-900">
                              Priority:
                            </span>
                            <div className="flex justify-end">
                              {renderPriorityBadge(ticket)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-400">
                    No tickets
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function renderPriorityBadge(ticket: RecentTicket) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-sm font-medium text-gray-700 shadow-xs">
      <span
        className="h-1.5 min-w-1.5 rounded-full"
        style={{
          backgroundColor: ticket.priorityColor ?? getPriorityDotColor(ticket),
        }}
      />
      {ticket.priority ?? 'No Priority'}
    </span>
  );
}

function getPriorityDotColor(ticket: RecentTicket) {
  switch (ticket.priority) {
    case 'High':
      return '#f04438';
    case 'Medium':
      return '#f79009';
    case 'Low':
      return '#22c55e';
    case 'Critical':
      return '#7c3aed';
    default:
      return '#9ca3af';
  }
}

function getStatusTone(color?: string) {
  if (!color) {
    return defaultStatusTone;
  }

  return {
    background: `${color}14`,
    border: `${color}2b`,
    dot: color,
    text: color,
  };
}
