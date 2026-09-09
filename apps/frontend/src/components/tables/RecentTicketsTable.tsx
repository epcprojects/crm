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
import { useState, type MouseEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import ThemeButton from '../ui/ThemeButton';
import {
  ArrowUpRightIcon,
  ChatIcon,
  ProjectsIcon,
  ThreedotIcon,
  TrashIcon,
} from '../../../public/icons';
import { useAppSelector } from '../../app/Redux/store';
import EmptyState from '../EmptyState';
import { getInitials } from '../../app/(main-pages)/dashboard/page';
import {
  CalendarTabIcon,
  FilesTabIcon,
  NotesTabIcon,
} from '../../app/(main-pages)/projects/[projectId]/page';

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
    brandColor: string;
  };
  dueDate: string;
  status: TicketStatus;
  statusColor?: string;
  priority: TicketPriority | null;
  priorityColor?: string;
  assignee: {
    name: string;
    initials: string;
  };
  ticketType?: string | null;
  date: string;
  sortDate?: string;
  reporter: {
    id: string;
    email: string;
    fullName: string;
  };
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

export type RecentTicketQuickLinkItem = {
  key: 'project' | 'thread' | 'files' | 'calendar' | 'notes';
  label: string;
  href: string;
};
function formatTicketType(ticketType?: string | null) {
  if (!ticketType) {
    return 'No Type';
  }

  if (ticketType === 'feature_request') {
    return 'Feature';
  }

  if (ticketType === 'bug') {
    return 'Bug';
  }

  return ticketType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

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
      <span className=" max-w-52   line-clamp-3 text-ellipsis text-sm text-gray-800">
        {row.original.title}
      </span>
    ),
  },
  {
    id: 'project',
    accessorKey: 'project.name',
    header: 'Project',
    cell: ({ row }) => (
      <span className="inline-flex max-w-60 items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white py-0.5 pr-2.5 pl-0.5 text-xs  text-gray-800">
        <span
          className="flex h-6 w-6 items-center shrink-0 justify-center rounded-full text-xs text-gray-900"
          style={{
            color: row.original.project.brandColor,
            backgroundColor: `${row.original.project.brandColor}20`,
          }}
        >
          {row.original.project.initials}
        </span>
        <span className="truncate"> {row.original.project.name}</span>
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
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full  border  text-white px-2 py-1 text-xs font-meidu shadow-xs"
        style={
          row.original.priorityColor
            ? {
                backgroundColor: row.original.priorityColor,
                borderColor: row.original.priorityColor,
              }
            : {
                backgroundColor: '#00000010',
                borderColor: '#00000010',
                color: '#00000080',
                fontWeight: 'bolder',
              }
        }
      >
        {/* <span
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
        /> */}
        {row.original.priority ?? 'No Priority'}
      </span>
    ),
  },
  {
    id: 'ticketType',
    accessorKey: 'ticketType',
    header: 'Type',
    cell: ({ row }) => {
      const ticketType = row.original.ticketType;

      if (ticketType !== 'bug' && ticketType !== 'feature_request') {
        return <span className="text-sm text-gray-500">--</span>;
      }

      return (
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-1 text-xs font-medium ${
            ticketType === 'bug'
              ? 'border-red-200 bg-red-50 text-red-600'
              : 'border-blue-200 bg-blue-50 text-blue-600'
          }`}
        >
          {formatTicketType(ticketType)}
        </span>
      );
    },
  },
  {
    id: 'Creater',
    accessorKey: 'reporter.fullname',
    header: 'Created by',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 text-gray-900 font-normal text-sm">
        <span className="flex h-7.5 min-w-7.5 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-900">
          {getInitials(row.original.reporter.fullName)}
        </span>
        {row.original.reporter.fullName}
      </span>
    ),
  },
  {
    id: 'createdAt',
    accessorKey: 'date',
    header: 'Created On',
    cell: ({ row }) => (
      <span className="text-gray-900 text-sm  whitespace-nowrap">
        {row.original.date !== null ? row.original.date : '-'}
      </span>
    ),
  },
  {
    id: 'dueDate',
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }) => (
      <span className="text-gray-900 text-sm  whitespace-nowrap">
        {row.original.dueDate !== null ? row.original.dueDate : '-'}
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
  getRowHref?: (ticket: RecentTicket) => string;
  hideProjectColumn?: boolean;
  pagination?: PaginationState;
  totalRows?: number;
  manualPagination?: boolean;
  onPaginationChange?: (pagination: PaginationState) => void;
  sortState?: TicketSortState;
  onSortChange?: (sortState: TicketSortState) => void;
  onEmptyButtonClick?: () => void;
  getQuickLinkItems?: (ticket: RecentTicket) => RecentTicketQuickLinkItem[];
  onDeleteTickets?: (ticket: RecentTicket) => void;
  // internalScrollEnabled?: boolean;
};

export default function RecentTicketsTable({
  tickets,
  onViewAll,
  onEmptyButtonClick,
  enablePagination = false,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onRowClick,
  getRowHref,
  hideProjectColumn = false,
  pagination: controlledPagination,
  totalRows: controlledTotalRows,
  manualPagination = false,
  onPaginationChange,
  sortState,
  onSortChange,
  getQuickLinkItems,
  onDeleteTickets,
  // internalScrollEnabled = true,
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
  const shouldShowQuickLinks = Boolean(getQuickLinkItems);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const TICKETS_PAGE_SIZE_QUERY_PARAM = 'pageSize';
  const ALLOWED_TICKETS_PAGE_SIZES = [10, 25, 50, 100];
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
  if (tickets.length === 0) {
    return (
      <EmptyState
        imageUrl="/images/RecentTicketEmpty.svg"
        imageAlt="No recent tickets"
        title={manualPagination ? 'No Tickets Found' : 'No Recent Tickets'}
        description={
          manualPagination
            ? 'Tickets will appear here once they are created.'
            : 'Recent tickets will appear here once they are created.'
        }
        buttonLabel="New Ticket"
        onButtonClick={onEmptyButtonClick}
      />
    );
  }

  const handlePlainRowClick = (
    event: MouseEvent<HTMLElement>,
    ticket: RecentTicket,
  ) => {
    if (
      !onRowClick ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    onRowClick(ticket);
  };

  return (
    <div
      // className="flex h-full min-h-0 flex-col  rounded-xl bg-white xl:w-full xl:border xl:border-gray-200"
      className="flex h-auto min-h-0 flex-col overflow-visible rounded-xl bg-white xl:h-full xl:w-full xl:overflow-hidden xl:border xl:border-gray-200"
    >
      <div
        //       className={`min-h-0 flex-1 space-y-3 touch-pan-y scrollbar-hide xl:hidden xl:p-3 ${
        //   internalScrollEnabled
        //     ? 'overflow-y-auto overscroll-contain'
        //     : 'overflow-y-hidden overscroll-auto'
        // }`}
        // className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain xl:p-3 scrollbar-hide xl:hidden"
        className="flex-none space-y-3 overflow-visible scrollbar-hide xl:hidden xl:p-3"
      >
        {table.getRowModel().rows.length ? (
          table
            .getRowModel()
            .rows.map((row) => (
              <TicketMobileCard
                key={row.id}
                ticket={row.original}
                onClick={onRowClick}
                href={getRowHref?.(row.original)}
                showAssignee={!isExternalUser}
              />
            ))
        ) : (
          <EmptyState
            imageUrl="/images/RecentTicketEmpty.svg"
            imageAlt="No recent tickets"
            title="No Recent Tickets"
            description="Recent tickets will appear here once they are created."
            buttonLabel="New Ticket"
            onButtonClick={onEmptyButtonClick}
          />
        )}
      </div>

      <div className="hidden min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-hide xl:block">
        <table className="w-full  min-w-220 text-left">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="sticky top-0 border-b border-[#F3F4F6] px-4 py-3 text-xs font-semibold bg-[#F9FAFB] text-gray-900"
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
                {shouldShowQuickLinks ? (
                  <th className="sticky top-0 w-16 border-b border-[#F3F4F6] bg-[#F9FAFB] px-4 py-3 text-right text-xs font-semibold text-gray-900" />
                ) : null}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-200 last:border-0 ${
                    onRowClick || getRowHref
                      ? 'cursor-pointer hover:bg-gray-50'
                      : ''
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {getRowHref ? (
                        <Link
                          href={getRowHref(row.original)}
                          onClick={(event) =>
                            handlePlainRowClick(event, row.original)
                          }
                          className="block -mx-4 -my-3 px-4 py-3"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onRowClick?.(row.original)}
                          className="block w-full -mx-4 -my-3 px-4 py-3 text-left"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </button>
                      )}
                    </td>
                  ))}
                  {shouldShowQuickLinks ? (
                    <td className="px-4 py-3 text-sm">
                      <div className="flex justify-end">
                        <TicketQuickLinksPopover
                          ticket={row.original}
                          getQuickLinkItems={getQuickLinkItems}
                          deleteTicket={onDeleteTickets}
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (shouldShowQuickLinks ? 1 : 0)}
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
        <div className="flex justify-between sm:flex-col gap-3 md:border-t border-gray-200 xl:px-4 py-0.5 xl:py-3 md:flex-row md:items-center md:justify-between">
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
                    className="px-2 xl:block hidden text-sm text-gray-500"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => table.setPageIndex(pageNumber - 1)}
                    className={`min-w-8 rounded-md px-2 py-1 xl:block hidden text-sm transition ${
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
  href,
}: {
  ticket: RecentTicket;
  onClick?: (ticket: RecentTicket) => void;
  href?: string;
  showAssignee?: boolean;
}) {
  const projectColor = ticket.project.brandColor || '#F79009';
  const reporterInitials = getInitials(ticket.reporter.fullName);

  const statusStyle = ticket.statusColor
    ? getStatusBadgeStyle(ticket.statusColor)
    : undefined;

  const content = (
    <>
      <div className="flex flex-col gap-1 bg-gray-50 p-2.5">
        <p className="line-clamp-2 text-sm font-medium text-gray-950">
          {ticket.title}
        </p>

        <div className="flex flex-row items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs text-gray-700">
            {ticket.ticketRefNo ?? ticket.id}
          </p>

          <div className="flex shrink-0 flex-row items-center gap-2">
            <span
              className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${
                ticket.statusColor
                  ? ''
                  : (statusStyles[ticket.status] ??
                    'border-gray-200 bg-gray-50 text-gray-600')
              }`}
              style={statusStyle}
            >
              {ticket.status}
            </span>

            <span
              className={`inline-flex whitespace-nowrap rounded-[5px] px-2 py-0.5 text-xs font-medium text-white ${
                ticket.priorityColor
                  ? ''
                  : (priorityStyles[ticket.priority ?? ''] ?? 'bg-gray-400')
              }`}
              style={
                ticket.priorityColor
                  ? { backgroundColor: ticket.priorityColor }
                  : undefined
              }
            >
              {ticket.priority ?? 'No Priority'}
            </span>
            {ticket.ticketType === 'bug' ||
            ticket.ticketType === 'feature_request' ? (
              <span
                className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${
                  ticket.ticketType === 'bug'
                    ? 'border-red-200 bg-red-50 text-red-600'
                    : 'border-blue-200 bg-blue-50 text-blue-600'
                }`}
              >
                {formatTicketType(ticket.ticketType)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 p-2.5">
        {/* Project */}
        <div className="flex min-w-0 flex-col items-start gap-1">
          <p className="text-[10px] text-gray-500">Project</p>

          <div className="flex max-w-full flex-row items-center gap-1.25 rounded-full border border-gray-100 bg-white py-0.5 pr-2 pl-0.5">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium leading-none"
              style={{
                backgroundColor: `${projectColor}20`,
                color: projectColor,
              }}
            >
              {ticket.project.initials}
            </span>

            <p className="truncate text-xs text-gray-800">
              {ticket.project.name}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <p className="text-[10px] text-gray-500">Created by</p>

          <div className="flex min-w-0 flex-row items-center gap-1.25 py-0.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] leading-none font-medium text-gray-900">
              {reporterInitials}
            </span>

            <p className="truncate text-xs text-gray-800">
              {ticket.reporter.fullName}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1">
          <p className="text-[10px] text-gray-500">Created On</p>
          <p className="text-xs text-gray-800">{ticket.date}</p>
        </div>
        <div className="flex flex-col items-start gap-1">
          <p className="text-[10px] text-gray-500">Due Date</p>
          <p className="text-xs text-gray-800">
            {ticket.dueDate || 'No due date'}
          </p>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={(event) => {
          if (
            !onClick ||
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }

          onClick(ticket);
        }}
        className={`flex w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-left transition ${
          onClick || href ? 'hover:border-gray-300' : ''
        }`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick?.(ticket)}
      className={`flex w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-left transition ${
        onClick ? 'hover:border-gray-300' : ''
      }`}
    >
      {content}
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

function TicketQuickLinksPopover({
  ticket,
  getQuickLinkItems,
  deleteTicket,
}: {
  ticket: RecentTicket;
  getQuickLinkItems?: (ticket: RecentTicket) => RecentTicketQuickLinkItem[];
  deleteTicket?: (ticket: RecentTicket) => void;
}) {
  const quickLinkItems = getQuickLinkItems?.(ticket) ?? [];

  if (!quickLinkItems.length) {
    return null;
  }

  return (
    <Menu as="div" className="relative">
      {({ close }) => (
        <>
          <MenuButton
            type="button"
            onClick={(event) => {
              event.stopPropagation();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 outline-none transition hover:bg-gray-100 hover:text-gray-700 data-open:bg-gray-100"
            aria-label={`Open quick links for ${ticket.title}`}
          >
            <ThreedotIcon />
          </MenuButton>

          <MenuItems
            anchor="bottom end"
            transition
            className="z-100 mt-1 w-44 origin-top-right rounded-lg border border-gray-200 bg-white p-1 shadow-[0_10px_30px_rgb(0_0_0/0.12)] outline-none transition duration-150 data-closed:-translate-y-1 data-closed:scale-95 data-closed:opacity-0"
          >
            {quickLinkItems.map((item) => (
              <MenuItem key={item.key}>
                <Link
                  href={item.href}
                  onClick={(event) => {
                    event.stopPropagation();
                    close();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-gray-700 outline-none transition data-focus:bg-gray-100"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-gray-900  ">
                    {renderQuickLinkIcon(item.key)}
                  </span>
                  <span>{item.label}</span>
                </Link>
              </MenuItem>
            ))}
            {deleteTicket && (
              <MenuItem>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-red-500 outline-none transition data-focus:bg-gray-100"
                  onClick={() => deleteTicket(ticket)}
                >
                  <TrashIcon width="16" height="16" /> Delete Ticket
                </button>
              </MenuItem>
            )}
          </MenuItems>
        </>
      )}
    </Menu>
  );
}

function renderQuickLinkIcon(key: RecentTicketQuickLinkItem['key']): ReactNode {
  if (key === 'project') {
    return (
      <ProjectsIcon fill="currentColor" opacity="0" width="22" height="18" />
    );
  }

  if (key === 'thread') {
    return <ChatIcon fill="currentColor" width="18" height="18" />;
  }

  if (key === 'files') {
    return <FilesTabIcon fill="currentColor" width="18" height="18" />;
  }

  if (key === 'notes') {
    return <NotesTabIcon fill="currentColor" width="18" height="18" />;
  }

  return <CalendarTabIcon fill="currentColor" width="18" height="18" />;
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
