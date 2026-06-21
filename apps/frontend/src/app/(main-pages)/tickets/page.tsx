'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../components/modals/CreateTicketModal';
import {
  createTicketPriorityOptions,
  createTicketProjectOptions,
} from '../../../components/modals/create-ticket-modal.data';
import RecentTicketsTable, {
  type RecentTicket,
} from '../../../components/tables/RecentTicketsTable';
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
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 12,
  });
  const projectsQuery = useProjectsQuery();
  const { hasPermission } = usePermissions();
  const canCreateTicket = hasPermission('tickets.create');
  const canFilterTickets = hasPermission('tickets.filter');
  const canViewTicketDetail = hasPermission('tickets.view_detail');
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
      searchValue.trim(),
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: () =>
      fetchDashboardTickets({
        statusKey: selectedStatus === 'all' ? undefined : selectedStatus,
        priorityKey: selectedPriority === 'all' ? undefined : selectedPriority,
        search: searchValue.trim(),
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
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
        assigneeId: values.assignee,
        dueDate: values.dueDate,
        attachments: values.attachments,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['dashboard-project-tickets'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'recent-tickets'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'ticket-summary'],
        }),
        queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
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
  }, [searchValue, selectedPriority, selectedStatus]);

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

        <RecentTicketsTable
          tickets={ticketsQuery.data?.items ?? []}
          enablePagination
          initialPageSize={12}
          pageSizeOptions={[10, 25, 50, 100]}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalRows={ticketsQuery.data?.meta.total ?? 0}
          manualPagination
          onRowClick={
            canViewTicketDetail
              ? (ticket) =>
                  router.push(
                    `/tickets/${ticket.id}?projectId=${ticket.project.id}`,
                  )
              : undefined
          }
        />
      </PermissionGuard>
      <CreateTicketModal
        isOpen={createTicketOpen && canCreateTicket}
        onClose={() => setCreateTicketOpen(false)}
        onConfirm={handleCreateTicket}
        projectOptions={projectOptions}
        priorityOptions={createTicketPriorityOptions}
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
  search,
  page,
  limit,
}: {
  statusKey?: string;
  priorityKey?: string;
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
