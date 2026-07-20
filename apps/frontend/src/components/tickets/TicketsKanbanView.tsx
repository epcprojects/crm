'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RecentTicket } from '../tables/RecentTicketsTable';

type TicketStatusOption = {
  id: string;
  label: string;
  value: string;
  color?: string;
};

type TicketsKanbanViewProps = {
  tickets: RecentTicket[];
  statusOptions: TicketStatusOption[];
  onTicketClick?: (ticket: RecentTicket) => void;
  onMoveTicket?: (ticket: RecentTicket, nextStatusKey: string) => void;
  onReorderColumn?: (statusId: string, newIndex: number) => void;
  canDragTickets?: boolean;
  movingTicketId?: string | null;
  canDragColumns?: boolean;
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
  onReorderColumn,
  canDragTickets = false,
  movingTicketId = null,
  canDragColumns = true,
}: TicketsKanbanViewProps) {
  const [draggingTicketId, setDraggingTicketId] = useState<string | null>(null);
  const [hoveredColumnKey, setHoveredColumnKey] = useState<string | null>(null);
  const [draggingColumnKey, setDraggingColumnKey] = useState<string | null>(
    null,
  );

  const generatedColumns = useMemo(() => {
    const normalizedOptions = statusOptions.map((status) => ({
      key: status.value,
      id: status.id as string | null,
      label: status.label,
      color: status.color,
      isCustom: false,
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
        id: null,
        label: status,
        color: undefined,
        isCustom: true,
      }));

    return [...normalizedOptions, ...extraStatuses].map((column) => ({
      ...column,
      tickets: tickets.filter((ticket) => ticket.status === column.label),
    }));
  }, [statusOptions, tickets]);

  // Real (backend-backed) statuses keep the order given by the API — the
  // user's saved order, or the global fallback. Custom/unmatched-status
  // columns are display-only and always render after them; they can't be
  // reordered because they have no statusId to persist against.
  const realColumns = useMemo(
    () => generatedColumns.filter((column) => !column.isCustom),
    [generatedColumns],
  );
  const customColumns = useMemo(
    () => generatedColumns.filter((column) => column.isCustom),
    [generatedColumns],
  );
  const columns = useMemo(
    () => [...realColumns, ...customColumns],
    [realColumns, customColumns],
  );

  const moveColumn = (draggedColumnKey: string, targetColumnKey: string) => {
    if (draggedColumnKey === targetColumnKey) {
      return;
    }

    const draggedColumn = realColumns.find(
      (column) => column.key === draggedColumnKey,
    );
    const targetIndex = realColumns.findIndex(
      (column) => column.key === targetColumnKey,
    );

    if (!draggedColumn?.id || targetIndex === -1) {
      return;
    }

    onReorderColumn?.(draggedColumn.id, targetIndex);
  };

  if (!columns.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No statuses available.
      </div>
    );
  }

  return (
    <div className="h-full max-h-full min-h-0 w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-contain scrollbar-hide">
      <div className="flex h-full min-h-0 min-w-max items-stretch gap-4 pb-2">
        {columns.map((column) => {
          const tone = getStatusTone(column.color);
          const isDraggableColumn = canDragColumns && !column.isCustom;

          return (
            <section
              key={column.key}
              draggable={isDraggableColumn}
              onDragStart={(event) => {
                if (
                  !isDraggableColumn ||
                  event.dataTransfer.types.includes('application/x-ticket-id')
                ) {
                  return;
                }

                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData(
                  'application/x-column-key',
                  column.key,
                );
                setDraggingColumnKey(column.key);
              }}
              onDragEnd={() => {
                setDraggingColumnKey(null);
                setHoveredColumnKey(null);
              }}
              className={`flex h-full min-h-0 w-[350px] p-2 shrink-0 flex-col rounded-2xl transition ${
                hoveredColumnKey === column.key ? 'bg-gray-50/80' : ''
              } ${
                draggingColumnKey === column.key
                  ? 'cursor-grabbing opacity-60 ring-2 ring-primary/20'
                  : isDraggableColumn
                    ? 'cursor-grab'
                    : ''
              }`}
              onDragOver={(event) => {
                const isTicketDrag = event.dataTransfer.types.includes(
                  'application/x-ticket-id',
                );
                const isColumnDrag = event.dataTransfer.types.includes(
                  'application/x-column-key',
                );

                if (
                  (isTicketDrag && canDragTickets) ||
                  (isColumnDrag && isDraggableColumn)
                ) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setHoveredColumnKey(column.key);
                }
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) {
                  return;
                }

                if (hoveredColumnKey === column.key) {
                  setHoveredColumnKey(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();

                const draggedColumnKey = event.dataTransfer.getData(
                  'application/x-column-key',
                );

                if (draggedColumnKey && isDraggableColumn) {
                  moveColumn(draggedColumnKey, column.key);
                  setDraggingColumnKey(null);
                  setHoveredColumnKey(null);
                  return;
                }

                const draggedTicketId =
                  event.dataTransfer.getData('application/x-ticket-id') ||
                  draggingTicketId;

                if (!canDragTickets || !draggedTicketId) {
                  return;
                }

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
              style={{
                backgroundColor: tone.background,
              }}
            >
              <div
                className="sticky top-0 z-10 relative flex items-center gap-2 rounded-lg px-3 py-3"
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
              </div>

              <div
                className={`mt-5 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto scrollbar-hide rounded-xl transition ${
                  hoveredColumnKey === column.key
                    ? 'border border-dashed border-gray-200 bg-primary/5'
                    : ''
                }`}
              >
                {column.tickets.length ? (
                  column.tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      data-ticket-card="true"
                      type="button"
                      draggable={canDragTickets && movingTicketId !== ticket.id}
                      onDragStart={(event) => {
                        if (!canDragTickets) {
                          return;
                        }

                        event.stopPropagation();
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData(
                          'application/x-ticket-id',
                          ticket.id,
                        );

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
