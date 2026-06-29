'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../components/modals/CreateTicketModal';
import { createTicketProjectOptions } from '../../../components/modals/create-ticket-modal.data';
import RecentTicketsTable, {
  type TicketSortState,
  type RecentTicket,
} from '../../../components/tables/RecentTicketsTable';
import TicketsKanbanView from '../../../components/tickets/TicketsKanbanView';
import { appToast } from '../../../components/toast/AppToast';
import Dropdown from '../../../components/ui/ThemeDropDown';
import { SearchIcon } from '../../../../public/icons';
import { createTicket } from '../../../lib/tickets';
import {
  projectsQueryKey,
  useProjectsQuery,
} from '../projects/projects.queries';
import {
  PermissionGuard,
  usePermissions,
} from '../../providers/PermissionProvider';
import { useAppLoader } from '../../providers/AppLoaderProvider';

export default function Page() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setLoading } = useAppLoader();
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sortState, setSortState] = useState<TicketSortState>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const projectsQuery = useProjectsQuery();
  const { hasPermission } = usePermissions();
  const canCreateTicket = hasPermission('tickets.create');
  const canFilterTickets = hasPermission('tickets.filter');
  const canViewTicketDetail = hasPermission('tickets.view_detail');
  const canEditTicketStatus = hasPermission('tickets.edit_status');
  const ticketStatusesQuery = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: fetchTicketStatuses,
    enabled: canFilterTickets,
  });
  const ticketPrioritiesQuery = useQuery({
    queryKey: ['ticket-priorities'],
    queryFn: fetchTicketPriorities,
    enabled: canFilterTickets,
  });
  const ticketsQuery = useQuery({
    queryKey: [
      'dashboard-project-tickets',
      selectedStatus,
      selectedPriority,
      selectedProject,
      searchValue.trim(),
      viewMode,
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: () =>
      fetchDashboardTickets({
        statusKey: selectedStatus === 'all' ? undefined : selectedStatus,
        priorityKey: selectedPriority === 'all' ? undefined : selectedPriority,
        projectId: selectedProject === 'all' ? undefined : selectedProject,
        search: searchValue.trim(),
        page: viewMode === 'kanban' ? 1 : pagination.pageIndex + 1,
        limit: viewMode === 'kanban' ? 100 : pagination.pageSize,
      }),
    enabled: hasPermission('tickets.view_list'),
  });

  const projectOptions = useMemo(
    () => createTicketProjectOptions(projectsQuery.data ?? []),
    [projectsQuery.data],
  );
  const statusFilterOptions = useMemo(
    () => [
      { label: 'All Status', value: 'all' },
      ...(ticketStatusesQuery.data ?? []).map(mapTicketSettingToDropdownOption),
    ],
    [ticketStatusesQuery.data],
  );
  const priorityFilterOptions = useMemo(
    () => [
      { label: 'All Priority', value: 'all' },
      ...(ticketPrioritiesQuery.data ?? []).map(
        mapTicketSettingToDropdownOption,
      ),
    ],
    [ticketPrioritiesQuery.data],
  );
  const projectFilterOptions = useMemo(
    () => [
      { label: 'All Projects', value: 'all' },
      ...(projectsQuery.data ?? []).map((project) => ({
        label: project.name,
        value: project.id,
      })),
    ],
    [projectsQuery.data],
  );
  const kanbanStatusOptions = useMemo(
    () =>
      (ticketStatusesQuery.data ?? []).map((status) => ({
        label: status.label,
        value: status.key,
        color: status.color,
      })),
    [ticketStatusesQuery.data],
  );
  const sortedTickets = useMemo(
    () => sortTicketsLocally(ticketsQuery.data?.items ?? [], sortState),
    [sortState, ticketsQuery.data?.items],
  );
  const statusMetadataByKey = useMemo(
    () =>
      new Map(
        (ticketStatusesQuery.data ?? []).map((status) => [
          status.key,
          {
            label: status.label,
            color: status.color,
          },
        ]),
      ),
    [ticketStatusesQuery.data],
  );

  const moveTicketMutation = useMutation({
    mutationFn: async ({
      ticket,
      statusKey,
    }: {
      ticket: RecentTicket;
      statusKey: string;
    }) => {
      const projectId = ticket.project.id;

      if (!projectId) {
        throw new Error('Project id is required to update ticket status.');
      }

      const response = await fetch(`/api/projects/${projectId}/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ statusKey }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          Array.isArray(data?.message) && data.message.length
            ? data.message.join(', ')
            : data?.message || 'Failed to update ticket status.';
        throw new Error(message);
      }

      return { ticket, statusKey };
    },
    onMutate: async ({ ticket, statusKey }) => {
      const nextStatus = statusMetadataByKey.get(statusKey);

      await queryClient.cancelQueries({
        queryKey: ['dashboard-project-tickets'],
      });

      const previousQueries = queryClient.getQueriesData<DashboardTicketsResponse>({
        queryKey: ['dashboard-project-tickets'],
      });

      queryClient.setQueriesData<DashboardTicketsResponse>(
        { queryKey: ['dashboard-project-tickets'] },
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            items: current.items.map((currentTicket) =>
              currentTicket.id === ticket.id
                ? {
                    ...currentTicket,
                    status: nextStatus?.label ?? currentTicket.status,
                    statusColor: nextStatus?.color ?? currentTicket.statusColor,
                  }
                : currentTicket,
            ),
          };
        },
      );

      return { previousQueries };
    },
    onError: (error, _variables, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update ticket status.',
      );
    },
    onSuccess: () => {
      appToast.success('Ticket status updated successfully.');
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['dashboard-project-tickets'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'recent-tickets'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'upcoming'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'critical-tickets'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'ticket-summary'],
          refetchType: 'all',
        }),
      ]);
    },
  });

  const handleCreateTicket = async (values: CreateTicketFormValues) => {
    if (!canCreateTicket) {
      return;
    }

    try {
      setLoading(true);
      await createTicket({
        projectId: values.project,
        title: values.title,
        description: values.description,
        statusKey: values.status,
        priorityKey: values.priority,
        dueDate: values.dueDate,
        attachments: values.attachments,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['dashboard-project-tickets'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'recent-tickets'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'upcoming'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'critical-tickets'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'ticket-summary'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: projectsQueryKey,
          refetchType: 'all',
        }),
      ]);
      appToast.success('Ticket created successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to create ticket.',
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canCreateTicket) {
      setHeaderActionOverride(() => setCreateTicketOpen(true));
    } else {
      setHeaderActionOverride(null);
    }

    return () => {
      setHeaderActionOverride(null);
    };
  }, [canCreateTicket, setHeaderActionOverride]);

  useEffect(() => {
    setPagination((current) => ({
      ...current,
      pageIndex: 0,
    }));
  }, [searchValue, selectedPriority, selectedProject, selectedStatus]);

  const handleSortChange = (nextSortState: TicketSortState) => {
    setSortState(nextSortState);
    setPagination((current) => ({
      ...current,
      pageIndex: 0,
    }));
  };

  const handleTicketClick = (ticket: RecentTicket) => {
    if (!canViewTicketDetail) {
      return;
    }

    router.push(`/tickets/${ticket.id}?projectId=${ticket.project.id}`);
  };

  const handleMoveTicket = async (
    ticket: RecentTicket,
    nextStatusKey: string,
  ) => {
    if (!canEditTicketStatus || moveTicketMutation.isPending) {
      return;
    }

    const nextStatus = statusMetadataByKey.get(nextStatusKey);

    if (!nextStatus || ticket.status === nextStatus.label) {
      return;
    }

    await moveTicketMutation.mutateAsync({
      ticket,
      statusKey: nextStatusKey,
    });
  };

  return (
    <div className="space-y-4">
      <PermissionGuard
        permission="tickets.view_list"
        fallback={
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            You do not have permission to view tickets.
          </div>
        }
      >
        <div className="flex flex-col gap-3 rounded-xl md:flex-row md:items-center md:justify-between">
          {canFilterTickets ? (
            <>
              <div className="relative flex w-full items-center md:max-w-xs">
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search..."
                  className="h-10.5 w-full rounded-lg border border-gray-200 bg-white ps-7 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
                <span className="absolute start-2">
                  <SearchIcon />
                </span>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
                      viewMode === 'table'
                        ? 'bg-primary-dark text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                    aria-label="Table view"
                  >
                    <TableViewIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('kanban')}
                    className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
                      viewMode === 'kanban'
                        ? 'bg-primary-dark text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                    aria-label="Kanban view"
                  >
                    <KanbanViewIcon />
                  </button>
                </div>
                <div className="w-full md:w-44">
                  <Dropdown
                    options={projectFilterOptions}
                    value={selectedProject}
                    onChange={setSelectedProject}
                    placeholder="All Projects"
                  />
                </div>
                <div className="w-full md:w-38">
                  <Dropdown
                    options={statusFilterOptions}
                    value={selectedStatus}
                    onChange={setSelectedStatus}
                    placeholder="All Status"
                  />
                </div>
                <div className="w-full md:w-38">
                  <Dropdown
                    options={priorityFilterOptions}
                    value={selectedPriority}
                    onChange={setSelectedPriority}
                    placeholder="All Priority"
                  />
                </div>
              </div>
            </>
          ) : null}
        </div>

        {viewMode === 'kanban' ? (
          <TicketsKanbanView
            tickets={sortedTickets}
            statusOptions={kanbanStatusOptions}
            onTicketClick={canViewTicketDetail ? handleTicketClick : undefined}
            onMoveTicket={(ticket, nextStatusKey) => {
              void handleMoveTicket(ticket, nextStatusKey);
            }}
            canDragTickets={canEditTicketStatus}
            movingTicketId={
              moveTicketMutation.isPending
                ? (moveTicketMutation.variables?.ticket.id ?? null)
                : null
            }
          />
        ) : (
          <RecentTicketsTable
            tickets={sortedTickets}
            enablePagination
            initialPageSize={10}
            pageSizeOptions={[10, 25, 50, 100]}
            pagination={pagination}
            onPaginationChange={setPagination}
            totalRows={ticketsQuery.data?.meta.total ?? 0}
            manualPagination
            sortState={sortState}
            onSortChange={handleSortChange}
            onRowClick={canViewTicketDetail ? handleTicketClick : undefined}
          />
        )}
      </PermissionGuard>
      <CreateTicketModal
        isOpen={createTicketOpen && canCreateTicket}
        onClose={() => setCreateTicketOpen(false)}
        onConfirm={handleCreateTicket}
        projectOptions={projectOptions}
      />
    </div>
  );
}

type ApiTicketSetting = {
  id: string;
  key: string;
  label: string;
  color: string;
  sortOrder: number;
};

type DashboardTicketsResponse = {
  items: RecentTicket[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

type ApiDashboardTicket = {
  id: string;
  ticketRefNo?: string;
  createdAt: string;
  title: string;
  project: {
    id: string;
    name: string;
  };
  status: {
    key: string;
    label: string;
    color?: string;
  } | null;
  priority: {
    key: string;
    label: string;
    color?: string;
  } | null;
  assignee: {
    id?: string;
    fullName?: string;
    name?: string;
  } | null;
};

type ApiDashboardTicketsResponse = {
  items: ApiDashboardTicket[];
  meta: DashboardTicketsResponse['meta'];
};

async function fetchDashboardTickets({
  statusKey,
  priorityKey,
  projectId,
  search,
  page,
  limit,
}: {
  statusKey?: string;
  priorityKey?: string;
  projectId?: string;
  search?: string;
  page: number;
  limit: number;
}): Promise<DashboardTicketsResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (statusKey) {
    searchParams.set('statusKey', statusKey);
  }

  if (priorityKey) {
    searchParams.set('priorityKey', priorityKey);
  }

  if (projectId) {
    searchParams.set('projectId', projectId);
  }

  if (search) {
    searchParams.set('search', search);
  }

  const response = await fetch(
    `/api/dashboard/projects?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | ApiDashboardTicketsResponse
    | { message?: string }
    | null;

  if (!response.ok || !isApiDashboardTicketsResponse(payload)) {
    throw new Error(
      payload && typeof payload === 'object' && 'message' in payload
        ? payload.message || 'Failed to fetch tickets.'
        : 'Failed to fetch tickets.',
    );
  }

  return {
    items: payload.items.map(mapApiDashboardTicketToRecentTicket),
    meta: payload.meta,
  };
}

async function fetchTicketStatuses() {
  const response = await fetch('/api/ticket-statuses', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketSetting[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch ticket statuses.'
        : 'Failed to fetch ticket statuses.',
    );
  }

  return sortTicketSettings(payload);
}

async function fetchTicketPriorities() {
  const response = await fetch('/api/ticket-priorities', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketSetting[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch ticket priorities.'
        : 'Failed to fetch ticket priorities.',
    );
  }

  return sortTicketSettings(payload);
}

function sortTicketSettings(settings: ApiTicketSetting[]) {
  return settings
    .slice()
    .sort((first, second) => first.sortOrder - second.sortOrder);
}

function mapTicketSettingToDropdownOption(setting: ApiTicketSetting) {
  return {
    label: setting.label,
    value: setting.key,
    icon: (
      <span
        className="inline-block h-2.25 w-2.5 rounded-full"
        style={{ backgroundColor: setting.color }}
      />
    ),
  };
}

function isApiDashboardTicketsResponse(
  value: unknown,
): value is ApiDashboardTicketsResponse {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray((value as ApiDashboardTicketsResponse).items) &&
      (value as ApiDashboardTicketsResponse).meta &&
      typeof (value as ApiDashboardTicketsResponse).meta === 'object',
  );
}

function mapApiDashboardTicketToRecentTicket(
  ticket: ApiDashboardTicket,
): RecentTicket {
  const assigneeName =
    ticket.assignee?.fullName ?? ticket.assignee?.name ?? 'Unassigned';
  const statusLabel = ticket.status?.label ?? ticket.status?.key ?? 'Unknown';
  const priorityLabel = ticket.priority?.label ?? ticket.priority?.key ?? null;

  return {
    id: ticket.id,
    ticketRefNo: ticket.ticketRefNo,
    title: ticket.title,
    project: {
      id: ticket.project.id,
      name: ticket.project.name,
      initials: getInitials(ticket.project.name),
    },
    status: statusLabel,
    statusColor: ticket.status?.color,
    priority: priorityLabel,
    priorityColor: ticket.priority?.color,
    assignee: {
      name: assigneeName,
      initials: getInitials(assigneeName),
    },
    date: formatTicketDate(ticket.createdAt),
  };
}

function sortTicketsLocally(
  tickets: RecentTicket[],
  sortState: TicketSortState,
) {
  const direction = sortState.sortOrder === 'asc' ? 1 : -1;

  return [...tickets].sort((firstTicket, secondTicket) => {
    const firstValue = getTicketSortValue(firstTicket, sortState.sortBy);
    const secondValue = getTicketSortValue(secondTicket, sortState.sortBy);

    return (
      firstValue.localeCompare(secondValue, undefined, {
        numeric: true,
        sensitivity: 'base',
      }) * direction
    );
  });
}

function getTicketSortValue(
  ticket: RecentTicket,
  sortBy: TicketSortState['sortBy'],
) {
  switch (sortBy) {
    case 'id':
      return ticket.ticketRefNo ?? ticket.id;
    case 'title':
      return ticket.title;
    case 'project':
      return ticket.project.name;
    case 'status':
      return ticket.status;
    case 'priority':
      return ticket.priority ?? 'No Priority';
    case 'assignee':
      return ticket.assignee.name;
    case 'createdAt':
      return ticket.date;
    default:
      return '';
  }
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return 'NA';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function formatTicketDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function TableViewIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 4H12M4 8H12M4 12H12M2.667 2.667H13.333C14.07 2.667 14.667 3.264 14.667 4V12C14.667 12.736 14.07 13.333 13.333 13.333H2.667C1.93 13.333 1.333 12.736 1.333 12V4C1.333 3.264 1.93 2.667 2.667 2.667Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KanbanViewIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.667 2.667H6.667V6.667H2.667V2.667ZM9.333 2.667H13.333V6.667H9.333V2.667ZM2.667 9.333H6.667V13.333H2.667V9.333ZM9.333 9.333H13.333V13.333H9.333V9.333Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
