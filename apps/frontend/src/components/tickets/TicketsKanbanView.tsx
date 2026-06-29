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

    const existingKeys = new Set(normalizedOptions.map((status) => status.key));
    const extraStatuses = Array.from(
      new Set(
        tickets
          .map((ticket) => ticket.status?.trim())
          .filter((status): status is string => Boolean(status)),
      ),
    )
      .filter((status) => !existingKeys.has(status))
      .map((status) => ({
        key: status,
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
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-4 pb-2">
        {columns.map((column) => {
          const tone = getStatusTone(column.color);

          return (
            <section
              key={column.key}
              className={`flex w-[280px] shrink-0 flex-col gap-3 rounded-xl transition ${
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
                className="flex items-center gap-2 rounded-lg border px-3 py-2"
                style={{
                  backgroundColor: tone.background,
                  borderColor: tone.border,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tone.dot }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: tone.text }}
                >
                  {column.label}
                </span>
                <span
                  className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1.5 text-[11px] font-medium"
                  style={{
                    color: tone.text,
                    borderColor: tone.border,
                    backgroundColor: '#ffffffb3',
                  }}
                >
                  {column.tickets.length}
                </span>
              </div>

              <div
                className={`flex min-h-40 flex-1 flex-col gap-3 rounded-xl p-1 transition ${
                  hoveredColumnKey === column.key
                    ? 'border border-dashed border-primary/30 bg-primary/5'
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
                      className={`rounded-xl border border-gray-200 bg-white p-3 text-left shadow-xs transition hover:border-gray-300 hover:shadow-sm ${
                        draggingTicketId === ticket.id
                          ? 'opacity-60 ring-2 ring-primary/20'
                          : ''
                      } ${
                        movingTicketId === ticket.id
                          ? 'cursor-wait opacity-70'
                          : ''
                      } ${canDragTickets ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      <div className="space-y-2">
                        <p className="line-clamp-2 text-sm font-medium text-gray-900">
                          {ticket.title}
                        </p>

                        <div className="space-y-1.5 text-xs text-gray-600">
                          <div className="flex items-center justify-between gap-2">
                            <span>Reference No:</span>
                            <span className="truncate text-right text-gray-500">
                              {ticket.ticketRefNo ?? ticket.id}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>Date:</span>
                            <span className="text-gray-500">{ticket.date}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>Project:</span>
                            <span className="inline-flex max-w-[125px] items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] text-purple-700">
                                {ticket.project.initials}
                              </span>
                              <span className="truncate">{ticket.project.name}</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>Priority:</span>
                            {renderPriorityBadge(ticket)}
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
    <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-xs">
      <span
        className="h-1.5 w-1.5 rounded-full"
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
    background: `${color}1a`,
    border: `${color}33`,
    dot: color,
    text: color,
  };
}
