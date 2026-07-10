'use client';

import {
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
  type ColumnDef,
} from '@tanstack/react-table';
import { useState, type ReactNode } from 'react';
import ThemeButton from '../ui/ThemeButton';
import { ArrowUpRightIcon } from '../../../public/icons';
import { useAppSelector } from '../../app/Redux/store';

export type TicketStatus = string;
export type TicketPriority = string;

export type RecentTicket = {
  id: string;
  ticketRefNo?: string;
  title: string;
  project: {
    id?: string;
    initials: string;
    name: string;
  };
  status: TicketStatus;
  statusColor?: string;
  priority: TicketPriority | null;
  priorityColor?: string;
  assignee: {
    name: string;
    initials: string;
  };
  date: string;
};

export type TicketSortBy =
  | 'id'
  | 'title'
  | 'project'
  | 'status'
  | 'priority'
  | 'assignee'
  | 'createdAt';

export type TicketSortOrder = 'asc' | 'desc';

export type TicketSortState = {
  sortBy: TicketSortBy;
  sortOrder: TicketSortOrder;
};

const statusStyles: Record<string, string> = {
  Open: 'border-red-200 bg-red-50 text-red-500',
  'In Progress': 'border-warning-200 bg-warning-50 text-warning-500',
  Resolved: 'border-green-200 bg-green-50 text-green-600',
  Closed: 'border-sky-200 bg-sky-50 text-sky-600',
};

const priorityStyles: Record<string, string> = {
  High: 'bg-red-500',
  Medium: 'bg-warning-500',
  Low: 'bg-green-500',
  Critical: 'bg-primary',
};

const baseColumns: ColumnDef<RecentTicket>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: 'Reference No',
    cell: ({ row }) => (
      <span className="font-normal text-gray-900 text-sm">
        {row.original.ticketRefNo ?? row.original.id}
      </span>
    ),
  },
  {
    id: 'title',
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <span className="block max-w-52 whitespace-break-spaces text-sm text-gray-900">
        {row.original.title}
      </span>
    ),
  },
  {
    id: 'project',
    accessorKey: 'project.name',
    header: 'Project',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-purple-100 py-0.75 pr-2.5 pl-0.75 text-xs font-medium text-purple-700">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-medium">
          {row.original.project.initials}
        </span>
        {row.original.project.name}
      </span>
    ),
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => renderStatusBadge(row.original),
  },
  {
    id: 'priority',
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 text-sm font-meidum text-gray-700 shadow-xs">
        <span
          className={`h-1.5 w-1.5 whitespace-nowrap rounded-full ${
            row.original.priorityColor
              ? ''
              : (priorityStyles[row.original.priority ?? ''] ?? 'bg-gray-400')
          }`}
          style={
            row.original.priorityColor
              ? { backgroundColor: row.original.priorityColor }
              : undefined
          }
        />
        {row.original.priority ?? 'No Priority'}
      </span>
    ),
  },
  {
    id: 'assignee',
    accessorKey: 'assignee.name',
    header: 'Assignee',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 text-gray-900 font-normal text-sm">
        <span className="flex h-7.5 min-w-7.5 items-center justify-center rounded-full bg-linear-to-br from-orange-200 to-slate-800 text-xs font-medium text-white">
          {row.original.assignee.initials}
        </span>
        {row.original.assignee.name}
      </span>
    ),
  },
  {
    id: 'createdAt',
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => (
      <span className="text-gray-900 text-sm  whitespace-nowrap">
        {row.original.date}
      </span>
    ),
  },
];

type RecentTicketsTableProps = {
  tickets: RecentTicket[];
  onViewAll?: () => void;
  enablePagination?: boolean;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (ticket: RecentTicket) => void;
  hideProjectColumn?: boolean;
  pagination?: PaginationState;
  totalRows?: number;
  manualPagination?: boolean;
  onPaginationChange?: (pagination: PaginationState) => void;
  sortState?: TicketSortState;
  onSortChange?: (sortState: TicketSortState) => void;
};

export default function RecentTicketsTable({
  tickets,
  onViewAll,
  enablePagination = false,
  initialPageSize = 12,
  pageSizeOptions = [10, 25, 50, 100],
  onRowClick,
  hideProjectColumn = false,
  pagination: controlledPagination,
  totalRows: controlledTotalRows,
  manualPagination = false,
  onPaginationChange,
  sortState,
  onSortChange,
}: RecentTicketsTableProps) {
  const userType = useAppSelector((state) => state.auth.user?.userType);
  const isExternalUser = userType === 'EXTERNAL';
  const columns = baseColumns.filter((column) => {
    if (hideProjectColumn && column.id === 'project') {
      return false;
    }

    if (isExternalUser && column.id === 'assignee') {
      return false;
    }

    return true;
  });

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const activePagination = controlledPagination ?? pagination;
  const totalRows = controlledTotalRows ?? tickets.length;
  const pageCount = Math.max(
    1,
    Math.ceil(totalRows / Math.max(activePagination.pageSize, 1)),
  );

  const handlePaginationChange = (
    updater: PaginationState | ((old: PaginationState) => PaginationState),
  ) => {
    const nextPagination = functionalUpdate(updater, activePagination);

    onPaginationChange?.(nextPagination);

    if (!controlledPagination) {
      setPagination(nextPagination);
    }
  };

  const table = useReactTable({
    data: tickets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(enablePagination && !manualPagination
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    ...(enablePagination
      ? {
          state: { pagination: activePagination },
          onPaginationChange: handlePaginationChange,
          ...(manualPagination ? { manualPagination: true, pageCount } : {}),
        }
      : {}),
  });

  const currentPage = activePagination.pageIndex + 1;
  const totalPages = enablePagination
    ? manualPagination
      ? pageCount
      : table.getPageCount()
    : 1;
  const startRow =
    totalRows === 0
      ? 0
      : activePagination.pageIndex * activePagination.pageSize + 1;
  const endRow = enablePagination
    ? Math.min(
        (activePagination.pageIndex + 1) * activePagination.pageSize,
        totalRows,
      )
    : totalRows;
  const visiblePages = getVisiblePageNumbers(currentPage, totalPages);

  return (
    <div className="overflow-hidden rounded-xl w-[calc(100dvw-32px)] sm:w-full md:border md:border-gray-100 h-full bg-white">
      <div className="space-y-3 md:p-3 md:hidden">
        {table.getRowModel().rows.length ? (
          table
            .getRowModel()
            .rows.map((row) => (
              <TicketMobileCard
                key={row.id}
                ticket={row.original}
                onClick={onRowClick}
                showAssignee={!isExternalUser}
              />
            ))
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            No tickets found.
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full  min-w-[880px] text-left">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-b border-[#F3F4F6] px-4 py-3 text-xs font-semibold bg-[#F9FAFB] text-gray-900"
                  >
                    {header.isPlaceholder ? null : (
                      <SortHeaderButton
                        label={flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        sortBy={getColumnSortBy(header.column.id)}
                        sortState={sortState}
                        onSortChange={onSortChange}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-200 last:border-0 ${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  }`}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  No tickets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {enablePagination ? (
        <div className="flex justify-between sm:flex-col gap-3 md:border-t border-gray-200 md:px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="sm:inline-block hidden">Showing per page</span>
            <select
              value={activePagination.pageSize}
              onChange={(event) =>
                table.setPageSize(Number(event.target.value))
              }
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 outline-none"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 text-sm text-gray-600 md:flex-row md:items-center">
            <span className="sm:inline-block hidden">
              {startRow}-{endRow} of {totalRows}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeftIcon />
              </button>

              {visiblePages.map((pageNumber, index) =>
                pageNumber === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-2 text-sm text-gray-500"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => table.setPageIndex(pageNumber - 1)}
                    className={`min-w-8 rounded-md px-2 py-1 text-sm transition ${
                      currentPage === pageNumber
                        ? 'bg-gray-100 font-semibold text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        </div>
      ) : onViewAll ? (
        <div className="flex justify-center border-t border-gray-200 py-4.5">
          <ThemeButton onClick={onViewAll}>
            <div className="flex items-center gap-1.5">
              View All <ArrowUpRightIcon />
            </div>
          </ThemeButton>
        </div>
      ) : null}
    </div>
  );
}

function TicketMobileCard({
  ticket,
  onClick,
  showAssignee = true,
}: {
  ticket: RecentTicket;
  onClick?: (ticket: RecentTicket) => void;
  showAssignee?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(ticket)}
      className={`w-full rounded-xl border border-gray-200 bg-white p-3 text-left transition ${
        onClick ? 'hover:border-gray-300' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {showAssignee ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-orange-200 to-slate-800 text-base font-medium text-white">
              {ticket.assignee.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-gray-900">
                {ticket.assignee.name}
              </p>
              <p className=" text-xs text-gray-600">{ticket.date}</p>
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-xs text-gray-600">{ticket.date}</p>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {renderStatusBadge(ticket)}
          <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm font-semibold text-gray-700 shadow-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                ticket.priorityColor
                  ? ''
                  : (priorityStyles[ticket.priority ?? ''] ?? 'bg-gray-400')
              }`}
              style={
                ticket.priorityColor
                  ? { backgroundColor: ticket.priorityColor }
                  : undefined
              }
            />
            {ticket.priority ?? 'No Priority'}
          </span>
        </div>
      </div>

      <div className="my-3 h-px bg-gray-200" />

      <div className="flex items-center flex-wrap gap-3">
        <span className="flex px-2 shrink-0 items-center justify-center rounded-full  text-sm font-semibold text-gray-900">
          {ticket.ticketRefNo ?? ticket.id}
        </span>
        <p className="truncate text-sm text-gray-800">{ticket.title}</p>
      </div>

      <div className="mt-2">
        <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-purple-100 py-0.5 pr-3 pl-0.5 text-sm font-medium text-purple-700">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-medium">
            {ticket.project.initials}
          </span>
          {ticket.project.name}
        </span>
      </div>
    </button>
  );
}

function renderStatusBadge(ticket: RecentTicket) {
  const style = ticket.statusColor
    ? getStatusBadgeStyle(ticket.statusColor)
    : undefined;

  return (
    <span
      className={`inline-flex rounded-full border px-2 whitespace-nowrap py-1 text-xs font-semibold ${
        ticket.statusColor
          ? ''
          : (statusStyles[ticket.status] ??
            'border-gray-200 bg-gray-50 text-gray-600')
      }`}
      style={style}
    >
      {ticket.status}
    </span>
  );
}

function getStatusBadgeStyle(color: string) {
  const normalizedColor = color.trim();

  return {
    color: normalizedColor,
    borderColor: withAlpha(normalizedColor, 0.28),
    backgroundColor: withAlpha(normalizedColor, 0.12),
  };
}

function withAlpha(color: string, alpha: number) {
  const normalizedColor = color.trim();

  if (/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(normalizedColor)) {
    const hex = normalizedColor.slice(1);
    const expandedHex =
      hex.length === 3
        ? hex
            .split('')
            .map((part) => part + part)
            .join('')
        : hex;
    const red = Number.parseInt(expandedHex.slice(0, 2), 16);
    const green = Number.parseInt(expandedHex.slice(2, 4), 16);
    const blue = Number.parseInt(expandedHex.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return normalizedColor;
}

function SortHeaderButton({
  label,
  sortBy,
  sortState,
  onSortChange,
}: {
  label: ReactNode;
  sortBy?: TicketSortBy;
  sortState?: TicketSortState;
  onSortChange?: (sortState: TicketSortState) => void;
}) {
  if (!sortBy || !onSortChange) {
    return <>{label}</>;
  }

  const isActive = sortState?.sortBy === sortBy;
  const nextSortOrder: TicketSortOrder =
    isActive && sortState?.sortOrder === 'asc' ? 'desc' : 'asc';

  return (
    <button
      type="button"
      onClick={() => onSortChange({ sortBy, sortOrder: nextSortOrder })}
      className="inline-flex items-center gap-1.5 text-left transition hover:text-primary-dark"
      aria-label={`Sort by ${String(label)}`}
    >
      <span>{label}</span>
      <span className={isActive ? 'text-primary-dark' : 'text-gray-400'}>
        {isActive ? (sortState?.sortOrder === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );
}

function getColumnSortBy(columnId: string): TicketSortBy | undefined {
  const sortByMap: Record<string, TicketSortBy> = {
    id: 'id',
    title: 'title',
    project: 'project',
    status: 'status',
    priority: 'priority',
    assignee: 'assignee',
    createdAt: 'createdAt',
  };

  return sortByMap[columnId];
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 'ellipsis', totalPages - 1, totalPages] as const;
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      2,
      'ellipsis',
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ] as const;
  }

  return [
    1,
    'ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis',
    totalPages,
  ] as const;
}

function ChevronLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 12L6 8L10 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 12L10 8L6 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
