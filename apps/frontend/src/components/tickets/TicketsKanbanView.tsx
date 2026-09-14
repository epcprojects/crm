/* eslint-disable @nx/enforce-module-boundaries */
'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import type { RecentTicket } from '../tables/RecentTicketsTable';
import Tooltip from '../tooltip';
import { TrashIcon } from 'apps/frontend/public/icons';
import { usePermissions } from '../../app/providers/PermissionProvider';

type TicketStatusOption = {
  id: string;
  label: string;
  value: string;
  color?: string;
};

type TicketsKanbanViewProps = {
  tickets: RecentTicket[];
  statusOptions: TicketStatusOption[];
  statusCountsByKey?: Record<string, number>;

  hasMoreByStatus?: Record<string, boolean>;
  loadingByStatus?: Record<string, boolean>;
  onLoadMoreStatus?: (statusKey: string) => void;

  onTicketClick?: (ticket: RecentTicket) => void;
  onDeleteTicket?: (ticket: RecentTicket) => void;
  onMoveTicket?: (ticket: RecentTicket, nextStatusKey: string) => void;
  onReorderColumn?: (statusId: string, newIndex: number) => void;
  canDragTickets?: boolean;
  movingTicketId?: string | null;
  canDragColumns?: boolean;
};

type DropPosition = 'before' | 'after';

const defaultStatusTone = {
  background: '#f3f4f6',
  border: '#e5e7eb',
  dot: '#9ca3af',
  text: '#374151',
};

export default function TicketsKanbanView({
  tickets,
  statusOptions,
  statusCountsByKey = {},

  hasMoreByStatus = {},
  loadingByStatus = {},
  onLoadMoreStatus,

  onTicketClick,
  onDeleteTicket,
  onMoveTicket,
  onReorderColumn,
  canDragTickets = false,
  movingTicketId = null,
  canDragColumns = true,
}: TicketsKanbanViewProps) {
  const { hasPermission } = usePermissions();
  const [draggingTicketId, setDraggingTicketId] = useState<string | null>(null);

  const [hoveredColumnKey, setHoveredColumnKey] = useState<string | null>(null);

  const [draggingColumnKey, setDraggingColumnKey] = useState<string | null>(
    null,
  );

  const canDeleteTicket = hasPermission('tickets.delete');

  /*
   * Null means column has been picked up, but the user has not
   * selected a drop position yet.
   */
  const [previewColumnOrder, setPreviewColumnOrder] = useState<string[] | null>(
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
      count: statusCountsByKey[column.key],
      tickets: tickets.filter((ticket) => ticket.status === column.label),
    }));
  }, [statusCountsByKey, statusOptions, tickets]);

  /*
   * Backend-backed columns can be reordered.
   * Custom/unmatched columns remain at the end.
   */
  const realColumns = useMemo(
    () => generatedColumns.filter((column) => !column.isCustom),
    [generatedColumns],
  );

  const customColumns = useMemo(
    () => generatedColumns.filter((column) => column.isCustom),
    [generatedColumns],
  );

  /*
   * During drag, apply the temporary preview order.
   */
  const orderedRealColumns = useMemo(() => {
    if (!previewColumnOrder) {
      return realColumns;
    }

    const columnsByKey = new Map(
      realColumns.map((column) => [column.key, column]),
    );

    return previewColumnOrder
      .map((columnKey) => columnsByKey.get(columnKey))
      .filter((column): column is (typeof realColumns)[number] =>
        Boolean(column),
      );
  }, [previewColumnOrder, realColumns]);

  const columns = useMemo(
    () => [...orderedRealColumns, ...customColumns],
    [orderedRealColumns, customColumns],
  );

  const resetColumnDrag = () => {
    setDraggingColumnKey(null);
    setPreviewColumnOrder(null);
    setHoveredColumnKey(null);
  };

  const getDropPosition = (event: DragEvent<HTMLElement>): DropPosition => {
    const bounds = event.currentTarget.getBoundingClientRect();

    const middlePoint = bounds.left + bounds.width / 2;

    return event.clientX < middlePoint ? 'before' : 'after';
  };

  const previewColumnMove = (
    draggedColumnKey: string,
    targetColumnKey: string,
    position: DropPosition,
  ) => {
    if (draggedColumnKey === targetColumnKey) {
      return;
    }

    setPreviewColumnOrder((currentOrder) => {
      const baseOrder = currentOrder ?? realColumns.map((column) => column.key);

      const orderWithoutDraggedColumn = baseOrder.filter(
        (columnKey) => columnKey !== draggedColumnKey,
      );

      const targetIndex = orderWithoutDraggedColumn.indexOf(targetColumnKey);

      if (targetIndex === -1) {
        return currentOrder;
      }

      const insertionIndex =
        position === 'after' ? targetIndex + 1 : targetIndex;

      const nextOrder = [...orderWithoutDraggedColumn];

      nextOrder.splice(insertionIndex, 0, draggedColumnKey);

      if (
        currentOrder &&
        currentOrder.length === nextOrder.length &&
        currentOrder.every((columnKey, index) => columnKey === nextOrder[index])
      ) {
        return currentOrder;
      }

      return nextOrder;
    });
  };

  const commitColumnMove = (draggedColumnKey: string) => {
    if (!previewColumnOrder) {
      return;
    }

    const draggedColumn = realColumns.find(
      (column) => column.key === draggedColumnKey,
    );

    if (!draggedColumn?.id) {
      return;
    }

    const originalIndex = realColumns.findIndex(
      (column) => column.key === draggedColumnKey,
    );

    const finalIndex = previewColumnOrder.indexOf(draggedColumnKey);

    if (
      originalIndex === -1 ||
      finalIndex === -1 ||
      originalIndex === finalIndex
    ) {
      return;
    }

    onReorderColumn?.(draggedColumn.id, finalIndex);
  };

  const handleColumnDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const draggedColumnKey =
      event.dataTransfer.getData('application/x-column-key') ||
      draggingColumnKey;

    if (!draggedColumnKey) {
      resetColumnDrag();
      return;
    }

    commitColumnMove(draggedColumnKey);
    resetColumnDrag();
  };

  if (!columns.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No statuses available.
      </div>
    );
  }

  return (
    <div className="h-full max-h-full min-h-0 w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-contain scrollbar-thin">
      <div className="flex h-full min-h-0 min-w-max items-stretch gap-3 pb-2">
        {columns.map((column) => {
          const tone = getStatusTone(column.color);

          const isDraggableColumn = canDragColumns && !column.isCustom;

          /*
           * A column only becomes a placeholder after the user
           * hovers another valid column. At drag start,
           * previewColumnOrder is null, so no placeholder is shown
           * at the original location.
           */
          const isColumnPlaceholder =
            draggingColumnKey === column.key && previewColumnOrder !== null;

          const isPickedUpAtSource =
            draggingColumnKey === column.key && previewColumnOrder === null;

          return (
            <section
              key={column.key}
              draggable={isDraggableColumn}
              onDragStart={(event) => {
                if (!isDraggableColumn) {
                  return;
                }

                event.dataTransfer.effectAllowed = 'move';

                event.dataTransfer.setData(
                  'application/x-column-key',
                  column.key,
                );

                setDraggingColumnKey(column.key);

                /*
                 * Do not set preview order here.
                 * This prevents a placeholder from appearing
                 * immediately at the source position.
                 */
                setPreviewColumnOrder(null);
                setHoveredColumnKey(null);
              }}
              onDragEnd={() => {
                resetColumnDrag();
              }}
              onDragEnter={(event) => {
                const isTicketDrag = event.dataTransfer.types.includes(
                  'application/x-ticket-id',
                );

                const isColumnDrag = event.dataTransfer.types.includes(
                  'application/x-column-key',
                );

                if (isTicketDrag && canDragTickets) {
                  event.preventDefault();
                  setHoveredColumnKey(column.key);
                  return;
                }

                if (
                  !isColumnDrag ||
                  !isDraggableColumn ||
                  !draggingColumnKey ||
                  draggingColumnKey === column.key
                ) {
                  return;
                }

                event.preventDefault();

                previewColumnMove(
                  draggingColumnKey,
                  column.key,
                  getDropPosition(event),
                );
              }}
              onDragOver={(event) => {
                const isTicketDrag = event.dataTransfer.types.includes(
                  'application/x-ticket-id',
                );

                const isColumnDrag = event.dataTransfer.types.includes(
                  'application/x-column-key',
                );

                if (isTicketDrag && canDragTickets) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';

                  setHoveredColumnKey(column.key);
                  return;
                }

                if (!isColumnDrag || !isDraggableColumn || !draggingColumnKey) {
                  return;
                }

                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';

                /*
                 * Once the dragged column has moved to the preview
                 * position, the pointer can be over its placeholder.
                 * Preserve the existing order in that case.
                 */
                if (draggingColumnKey === column.key) {
                  return;
                }

                previewColumnMove(
                  draggingColumnKey,
                  column.key,
                  getDropPosition(event),
                );
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
                const draggedColumnKey = event.dataTransfer.getData(
                  'application/x-column-key',
                );

                if (draggedColumnKey && isDraggableColumn) {
                  /*
                   * If the drop happens directly on a regular target
                   * before React has rendered the preview, create the
                   * final preview order first.
                   */
                  if (draggedColumnKey !== column.key && !previewColumnOrder) {
                    const position = getDropPosition(event);

                    const orderWithoutDraggedColumn = realColumns
                      .map((statusColumn) => statusColumn.key)
                      .filter((columnKey) => columnKey !== draggedColumnKey);

                    const targetIndex = orderWithoutDraggedColumn.indexOf(
                      column.key,
                    );

                    if (targetIndex !== -1) {
                      const insertionIndex =
                        position === 'after' ? targetIndex + 1 : targetIndex;

                      orderWithoutDraggedColumn.splice(
                        insertionIndex,
                        0,
                        draggedColumnKey,
                      );

                      const draggedColumn = realColumns.find(
                        (statusColumn) => statusColumn.key === draggedColumnKey,
                      );

                      const originalIndex = realColumns.findIndex(
                        (statusColumn) => statusColumn.key === draggedColumnKey,
                      );

                      if (
                        draggedColumn?.id &&
                        originalIndex !== insertionIndex
                      ) {
                        onReorderColumn?.(draggedColumn.id, insertionIndex);
                      }
                    }

                    resetColumnDrag();
                    return;
                  }

                  handleColumnDrop(event);
                  return;
                }

                event.preventDefault();

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
              className={`flex h-full min-h-0 w-[350px] shrink-0 flex-col rounded-2xl p-2 transition ${
                hoveredColumnKey === column.key && !draggingColumnKey
                  ? 'bg-gray-50/80'
                  : ''
              } ${
                isColumnPlaceholder
                  ? 'cursor-grabbing border-2 border-dashed border-gray-300 bg-gray-50!'
                  : isPickedUpAtSource
                    ? 'cursor-grabbing opacity-60 ring-2 ring-primary/20'
                    : isDraggableColumn
                      ? 'cursor-grab'
                      : ''
              }`}
              style={{
                backgroundColor: isColumnPlaceholder
                  ? '#f9fafb'
                  : tone.background,
              }}
            >
              {isColumnPlaceholder ? (
                <div className="flex h-full min-h-40 w-full items-center justify-center rounded-xl bg-white/60">
                  <span className="text-sm font-medium text-gray-400">
                    Drop column here
                  </span>
                </div>
              ) : (
                <>
                  <div
                    className="relative sticky top-0 z-10 flex items-center gap-2 rounded-lg px-3 py-3"
                    style={{
                      backgroundColor: tone.background,
                    }}
                  >
                    <span
                      className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full"
                      style={{
                        backgroundColor: tone.dot,
                      }}
                    />

                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: tone.dot,
                      }}
                    />

                    <span
                      className="text-base leading-none font-semibold"
                      style={{
                        color: tone.text,
                      }}
                    >
                      {column.label}
                    </span>
                    <span
                      className="ml-auto text-sm font-semibold"
                      style={{
                        color: tone.text,
                      }}
                    >
                      {column.count ?? column.tickets.length}
                    </span>
                  </div>

                  <div
                    className={`mt-3.5 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-xl transition scrollbar-hide ${
                      hoveredColumnKey === column.key && !draggingColumnKey
                        ? 'border border-dashed border-gray-200 bg-primary/5'
                        : ''
                    }`}
                  >
                    {column.tickets.length ? (
                      column.tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="group/ticket relative shrink-0"
                        >
                          <button
                            data-ticket-card="true"
                            type="button"
                            draggable={
                              canDragTickets && movingTicketId !== ticket.id
                            }
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

                              setDraggingColumnKey(null);
                              setPreviewColumnOrder(null);
                            }}
                            onDragEnd={() => {
                              setDraggingTicketId(null);
                              setHoveredColumnKey(null);
                            }}
                            onClick={() => onTicketClick?.(ticket)}
                            className={`w-full rounded-xl border shrink-0 border-gray-200 bg-white p-3 text-left shadow-xs transition hover:border-gray-300 hover:shadow-sm ${
                              draggingTicketId === ticket.id
                                ? 'opacity-60 ring-2 ring-primary/20'
                                : ''
                            } ${
                              movingTicketId === ticket.id
                                ? 'cursor-wait opacity-70'
                                : ''
                            } ${
                              canDragTickets
                                ? 'cursor-grab active:cursor-grabbing'
                                : ''
                            }`}
                          >
                            <div className="space-y-2.5">
                              <p
                                className={`line-clamp-2 text-base font-semibold text-gray-900 ${onDeleteTicket ? 'pr-8' : ''}`}
                              >
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
                                  <span className="text-sm text-gray-900">
                                    Date:
                                  </span>

                                  <span className="text-right text-sm text-gray-900">
                                    {ticket.date}
                                  </span>
                                </div>

                                <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                                  <span className="text-sm text-gray-900">
                                    Project:
                                  </span>

                                  <Tooltip
                                    content={''}
                                    heading={ticket.project.name}
                                  >
                                    <div className="flex justify-end w-full max-w-56">
                                      <span className="flex w-fit  truncate text-ellipsis items-center justify-start gap-2 whitespace-nowrap rounded-full bg-purple-100 py-0.75 pr-2.5 pl-0.75 text-xs font-medium text-purple-700">
                                        <span className="flex shrink-0 h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-medium">
                                          {ticket.project.initials}
                                        </span>

                                        <span className="truncate">
                                          {' '}
                                          {ticket.project.name}
                                        </span>
                                      </span>
                                    </div>
                                  </Tooltip>
                                </div>

                                {ticket.contact ? (
                                  <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                                    <span className="text-sm text-gray-900">
                                      Contact:
                                    </span>

                                    <span className="truncate text-right text-sm text-gray-900">
                                      {ticket.contact.fullName ||
                                        ticket.contact.phone}
                                    </span>
                                  </div>
                                ) : null}

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
                          {onDeleteTicket && canDeleteTicket ? (
                            <button
                              type="button"
                              aria-label={`Delete lead ${ticket.title}`}
                              disabled={movingTicketId === ticket.id}
                              draggable={false}
                              onPointerDown={(event) => event.stopPropagation()}
                              onDragStart={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeleteTicket(ticket);
                              }}
                              className="pointer-events-none absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md opacity-0 transition group-hover/ticket:pointer-events-auto group-hover/ticket:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-500 disabled:cursor-wait disabled:opacity-50"
                            >
                              <TrashIcon width="16" height="16" />
                            </button>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-5 text-center text-sm text-gray-400">
                        No leads
                      </div>
                    )}
                    <KanbanLoadMoreTrigger
                      hasMore={Boolean(hasMoreByStatus[column.key])}
                      isLoading={Boolean(loadingByStatus[column.key])}
                      onLoadMore={() => {
                        onLoadMoreStatus?.(column.key);
                      }}
                    />
                  </div>
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function TicketsKanbanSkeleton() {
  return (
    <div
      className="h-auto min-h-0 w-full min-w-0 animate-pulse overflow-x-auto overflow-y-hidden scrollbar-thin xl:h-full xl:max-h-full"
      aria-hidden="true"
    >
      <div className="flex h-auto min-h-0 min-w-max items-stretch gap-3 pb-2 xl:h-full">
        {Array.from({ length: 7 }).map((_, columnIndex) => (
          <section
            key={columnIndex}
            className="flex h-auto min-h-0 w-[280px] shrink-0 flex-col rounded-2xl bg-gray-100/80 p-2 sm:w-[320px] xl:h-full xl:w-[350px]"
          >
            {/* Column heading */}
            <div className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-3">
              <div className="h-2 w-2 rounded-full bg-gray-300" />

              <div
                className={`h-4 rounded bg-gray-300 ${
                  columnIndex % 2 === 0 ? 'w-24' : 'w-20'
                }`}
              />

              <div className="ml-auto h-4 w-6 rounded bg-gray-300" />
            </div>

            {/* Cards */}
            <div className="mt-3.5 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-xl">
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <div
                  key={cardIndex}
                  className="shrink-0 rounded-xl border border-gray-200 bg-white p-3 shadow-xs"
                >
                  {/* Title */}
                  <div
                    className={`h-4 rounded bg-gray-200 ${
                      cardIndex % 2 === 0 ? 'w-4/5' : 'w-2/3'
                    }`}
                  />

                  <div className="mt-3 space-y-2.5">
                    {/* Reference */}
                    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                      <div className="h-3 w-20 rounded bg-gray-100" />
                      <div className="ml-auto h-3 w-16 rounded bg-gray-200" />
                    </div>

                    {/* Date */}
                    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                      <div className="h-3 w-10 rounded bg-gray-100" />
                      <div className="ml-auto h-3 w-20 rounded bg-gray-200" />
                    </div>

                    {/* Project */}
                    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                      <div className="h-3 w-12 rounded bg-gray-100" />

                      <div className="ml-auto flex h-7 w-28 items-center gap-2 rounded-full bg-purple-50 p-0.5">
                        <div className="h-6 w-6 shrink-0 rounded-full bg-white" />
                        <div className="h-3 w-16 rounded bg-purple-100" />
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                      <div className="h-3 w-12 rounded bg-gray-100" />
                      <div className="ml-auto h-6 w-20 rounded-lg bg-gray-200" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
function KanbanLoadMoreTrigger({
  hasMore,
  isLoading,
  onLoadMore,
}: {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  /*
   * Latest callback ref mein rakhein taa-ke observer har parent
   * render par recreate na ho.
   */
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const triggerElement = triggerRef.current;

    if (!triggerElement || !hasMore || isLoading) {
      return;
    }

    const scrollContainer = triggerElement.parentElement;

    if (!scrollContainer) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onLoadMoreRef.current();
        }
      },
      {
        root: scrollContainer,
        rootMargin: '0px 0px 100px 0px',
        threshold: 0,
      },
    );

    observer.observe(triggerElement);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading]);

  if (!hasMore && !isLoading) {
    return null;
  }

  return (
    <div
      ref={triggerRef}
      className="flex min-h-8 shrink-0 items-center justify-center py-2 text-xs text-gray-500"
    >
      {isLoading ? 'Loading more leads...' : null}
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
