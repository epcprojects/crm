'use client';

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
  type ColumnDef,
} from '@tanstack/react-table';
import { useState } from 'react';
import ThemeButton from '../ui/ThemeButton';
import { ArrowUpRightIcon } from '../../../public/icons';

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved';
export type TicketPriority = 'High' | 'Medium' | 'Low' | 'Critical';

export type RecentTicket = {
  id: string;
  title: string;
  project: {
    initials: string;
    name: string;
  };
  status: TicketStatus;
  priority: TicketPriority;
  assignee: {
    name: string;
    initials: string;
  };
  date: string;
};

const statusStyles: Record<TicketStatus, string> = {
  Open: 'border-red-200 bg-red-50 text-red-500',
  'In Progress': 'border-warning-200 bg-warning-50 text-warning-500',
  Resolved: 'border-green-200 bg-green-50 text-green-600',
};

const priorityStyles: Record<TicketPriority, string> = {
  High: 'bg-red-500',
  Medium: 'bg-warning-500',
  Low: 'bg-green-500',
  Critical: 'bg-primary',
};

const baseColumns: ColumnDef<RecentTicket>[] = [
  {
    accessorKey: 'id',
    header: '#',
    cell: ({ row }) => (
      <span className="font-semibold text-gray-900 text-sm">
        {row.original.id}
      </span>
    ),
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <span className="block max-w-52 whitespace-break-spaces text-sm text-gray-900">
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: 'project.name',
    header: 'Project',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-purple-100 py-0.75 pr-2.5 pl-0.75 text-sm font-medium text-purple-700">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-medium">
          {row.original.project.initials}
        </span>
        {row.original.project.name}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <span
        className={`inline-flex rounded-full border px-2  whitespace-nowrap py-1 text-xs font-semibold ${statusStyles[row.original.status]}`}
      >
        {row.original.status}
      </span>
    ),
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm font-semibold text-gray-700 shadow-xs">
        <span
          className={`h-1.5 w-1.5 rounded-full ${priorityStyles[row.original.priority]}`}
        />
        {row.original.priority}
      </span>
    ),
  },
  {
    accessorKey: 'assignee.name',
    header: 'Assignee',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 text-gray-900 font-normal text-sm">
        <span className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-linear-to-br from-orange-200 to-slate-800 text-sm font-medium text-white">
          {row.original.assignee.initials}
        </span>
        {row.original.assignee.name}
      </span>
    ),
  },
  {
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
};

export default function RecentTicketsTable({
  tickets,
  onViewAll,
  enablePagination = false,
  initialPageSize = 12,
  pageSizeOptions = [12, 24, 48],
  onRowClick,
  hideProjectColumn = false,
}: RecentTicketsTableProps) {
  const columns = hideProjectColumn
    ? baseColumns.filter((_, index) => index !== 2)
    : baseColumns;

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const table = useReactTable({
    data: tickets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(enablePagination
      ? { getPaginationRowModel: getPaginationRowModel() }
      : {}),
    ...(enablePagination
      ? {
          state: { pagination },
          onPaginationChange: setPagination,
        }
      : {}),
  });

  const totalRows = tickets.length;
  const currentPage = pagination.pageIndex + 1;
  const totalPages = enablePagination ? table.getPageCount() : 1;
  const startRow =
    totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const endRow = enablePagination
    ? Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRows)
    : totalRows;
  const visiblePages = getVisiblePageNumbers(currentPage, totalPages);

  return (
    <div className="overflow-hidden rounded-xl w-[calc(100dvw-32px)] sm:w-full border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full  min-w-[880px] text-left">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
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
        <div className="flex justify-between sm:flex-col gap-3 border-t border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="sm:inline-block hidden">Showing per page</span>
            <select
              value={pagination.pageSize}
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
      ) : (
        <div className="flex justify-center border-t border-gray-200 py-4.5">
          <ThemeButton onClick={onViewAll}>
            <div className="flex items-center gap-1.5">
              View All <ArrowUpRightIcon />
            </div>
          </ThemeButton>
        </div>
      )}
    </div>
  );
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
