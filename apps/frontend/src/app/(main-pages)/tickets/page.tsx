/* eslint-disable @nx/enforce-module-boundaries */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { PaginationState } from '@tanstack/react-table';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../components/modals/CreateTicketModal';
import { createTicketProjectOptions } from '../../../components/modals/create-ticket-modal.data';
import RecentTicketsTable, {
  type TicketSortState,
  type RecentTicket,
  type RecentTicketQuickLinkItem,
} from '../../../components/tables/RecentTicketsTable';
import TicketsKanbanView, {
  TicketsKanbanSkeleton,
} from '../../../components/tickets/TicketsKanbanView';
import { appToast } from '../../../components/toast/AppToast';
import Dropdown from '../../../components/ui/ThemeDropDown';
import ThemeInput from '../../../components/ui/ThemeInput';
import {
  CloseIcon,
  DownloadIcon,
  FiltersIcon,
  PlusIcon,
  SearchIcon,
} from '../../../../public/icons';
import { createTicket } from '../../../lib/tickets';
import { fetchAssignableMembers } from '../../../lib/project-members';
import {
  projectsQueryKey,
  useDeleteTicketMutation,
  useProjectNamesQuery,
} from '../projects/projects.queries';
import {
  PermissionGuard,
  usePermissions,
} from '../../providers/PermissionProvider';
import { useAppLoader } from '../../providers/AppLoaderProvider';
import { useDebouncedValue } from '../../../components/hooks/useDebouncedValue';
import DashboardSummaryBanner from '../../../components/ui/DashboardSummaryBanner';
import ThemeButton from '../../../components/ui/ThemeButton';
import { RecentTicketsTableSkeleton } from '../dashboard/page';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { eventEmitter } from '../../../lib/event-emitter';
import { NotificationItem } from '@harperhelp/interfaces';
import { NotificationEntityType } from '@harperhelp/types';
import DashboardSummaryBannerSkeleton from 'apps/frontend/src/components/ui/DashboardSummaryBannerSkeleton';
import ConfirmActionModal from 'apps/frontend/src/components/modals/ConfirmActionModal';

type TicketSummary = {
  open: number | null;
  inProgress: number | null;
  resolved: number | null;
  critical: number | null;
  closed: number | null;
};

const TICKETS_VIEW_QUERY_PARAM = 'view';
const TICKETS_SEARCH_QUERY_PARAM = 'search';
const TICKETS_STATUS_QUERY_PARAM = 'status';
const TICKETS_PRIORITY_QUERY_PARAM = 'priority';
const TICKETS_PROJECT_QUERY_PARAM = 'project';
const DEFAULT_TICKETS_STATUS_FILTER = 'Active';
const TICKETS_TYPE_QUERY_PARAM = 'ticketType';
const TICKETS_CONTACT_QUERY_PARAM = 'contactId';
const TICKETS_DATE_FROM_QUERY_PARAM = 'dateFrom';
const TICKETS_DATE_TO_QUERY_PARAM = 'dateTo';
const TICKETS_CREATED_BY_QUERY_PARAM = 'reporterId';
const TICKETS_ASSIGNED_TO_QUERY_PARAM = 'assigneeId';
const TICKETS_PAGE_SIZE_QUERY_PARAM = 'size';
const ALLOWED_TICKETS_PAGE_SIZES = [10, 25, 50, 100];
const KANBAN_PAGE_SIZE = 20;
export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { setLoading } = useAppLoader();
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const [isExportingTickets, setIsExportingTickets] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<{
    projectId: string;
    ticketId: string;
    name: string;
  } | null>(null);
  const searchValue = searchParams.get(TICKETS_SEARCH_QUERY_PARAM) ?? '';
  const setSearchValue = (value: string) => {
    const url = new URL(window.location.href);

    if (value) {
      url.searchParams.set(TICKETS_SEARCH_QUERY_PARAM, value);
    } else {
      url.searchParams.delete(TICKETS_SEARCH_QUERY_PARAM);
    }

    // Persist immediately so opening a ticket before the debounce finishes
    // still preserves the search when navigating back.
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  };
  const debouncedSearchValue = useDebouncedValue(searchValue);
  const [pagination, setPagination] = useState<PaginationState>(() => {
    const requestedPageSize = Number(
      searchParams.get(TICKETS_PAGE_SIZE_QUERY_PARAM),
    );

    return {
      pageIndex: 0,
      pageSize: ALLOWED_TICKETS_PAGE_SIZES.includes(requestedPageSize)
        ? requestedPageSize
        : 10,
    };
  });
  const handlePaginationChange = (nextPagination: PaginationState) => {
    setPagination(nextPagination);

    const params = new URLSearchParams(searchParams.toString());

    params.set(TICKETS_PAGE_SIZE_QUERY_PARAM, String(nextPagination.pageSize));

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  };
  const [sortState, setSortState] = useState<TicketSortState>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const projectsQuery = useProjectNamesQuery();
  const { hasPermission } = usePermissions();
  const canCreateTicket = hasPermission('tickets.create');
  const canExportTickets = hasPermission('tickets.export_tickets');
  const canViewTicketDetail = hasPermission('tickets.view_detail');
  const canEditTicketStatus = hasPermission('tickets.edit_status');
  const canViewProjectDetail = hasPermission('projects.view_detail');
  const canViewProjectThread = hasPermission('thread.view');
  const canViewProjectFiles = hasPermission('files.view');
  const canDeleteTicket = true;
  const canViewProjectCalendar = hasPermission('calendar.view_grid');
  const canViewProjectNotes = hasPermission('projects_notes.view_list');
  const viewMode = getTicketsViewMode(
    searchParams.get(TICKETS_VIEW_QUERY_PARAM),
  );
  const selectedStatus =
    viewMode === 'kanban'
      ? 'all'
      : getTicketsStatusFilterValue(
          searchParams.get(TICKETS_STATUS_QUERY_PARAM),
        );
  const selectedPriority = getTicketsFilterValue(
    searchParams.get(TICKETS_PRIORITY_QUERY_PARAM),
  );
  const selectedTicketType = getTicketsTypeFilterValue(
    searchParams.get(TICKETS_TYPE_QUERY_PARAM),
  );
  const selectedProjectIds = getTicketsProjectFilterValues(
    searchParams.getAll(TICKETS_PROJECT_QUERY_PARAM),
    searchParams.get(TICKETS_PROJECT_QUERY_PARAM),
  );
  const selectedProjectIdsKey = selectedProjectIds.join(',');
  const selectedContactId = getTicketsFilterValue(
    searchParams.get(TICKETS_CONTACT_QUERY_PARAM),
  );
  const dateFromValue = searchParams.get(TICKETS_DATE_FROM_QUERY_PARAM) ?? '';
  const dateToValue = searchParams.get(TICKETS_DATE_TO_QUERY_PARAM) ?? '';
  const selectedCreatedBy = getTicketsFilterValue(
    searchParams.get(TICKETS_CREATED_BY_QUERY_PARAM),
  );
  const selectedAssignedTo = getTicketsFilterValue(
    searchParams.get(TICKETS_ASSIGNED_TO_QUERY_PARAM),
  );
  const [loadingKanbanStatuses, setLoadingKanbanStatuses] = useState<
    Record<string, boolean>
  >({});
  const loadingKanbanStatusesRef = useRef<Record<string, boolean>>({});

  const ticketStatusesQuery = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: fetchTicketStatuses,
    enabled: hasPermission('tickets.view_list'),
  });

  const ticketPrioritiesQuery = useQuery({
    queryKey: ['ticket-priorities'],
    queryFn: fetchTicketPriorities,
    enabled: hasPermission('tickets.view_list'),
  });

  const ticketContactsQuery = useQuery({
    queryKey: ['contacts', 'ticket-filter'],
    queryFn: fetchTicketContactOptions,
    enabled: hasPermission('tickets.view_list'),
  });

  const assignableMembersProjectIds = selectedProjectIds.length
    ? selectedProjectIds
    : (projectsQuery.data ?? []).map((project) => project.id);

  const ticketMembersQuery = useQuery({
    queryKey: [
      'project-members',
      'assignable',
      assignableMembersProjectIds.join(','),
    ],
    queryFn: () => fetchAssignableMembers(assignableMembersProjectIds),
    enabled: hasPermission('tickets.view_list'),
  });

  const ticketsQuery = useQuery({
    queryKey: [
      'dashboard-project-tickets',
      selectedStatus,
      selectedPriority,
      selectedTicketType,
      selectedProjectIdsKey,
      selectedContactId,
      dateFromValue,
      dateToValue,
      selectedCreatedBy,
      selectedAssignedTo,
      debouncedSearchValue.trim(),
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: () =>
      fetchDashboardTickets({
        statusKey: selectedStatus === 'all' ? undefined : selectedStatus,
        priorityKey: selectedPriority === 'all' ? undefined : selectedPriority,
        ticketType:
          selectedTicketType === 'all' ? undefined : selectedTicketType,
        projectIds: selectedProjectIds.length ? selectedProjectIds : undefined,
        contactId: selectedContactId === 'all' ? undefined : selectedContactId,
        dateFrom: dateFromValue || undefined,
        dateTo: dateToValue || undefined,
        reporterId:
          selectedCreatedBy === 'all' ? undefined : selectedCreatedBy,
        assigneeId:
          selectedAssignedTo === 'all' ? undefined : selectedAssignedTo,
        search: debouncedSearchValue.trim(),
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      }),
    enabled: hasPermission('tickets.view_list') && viewMode === 'table',
    // Keep the summary visible while the next search or filter request loads.
    placeholderData: keepPreviousData,
  });
  const kanbanFilters = {
    priorityKey: selectedPriority === 'all' ? undefined : selectedPriority,

    ticketType: selectedTicketType === 'all' ? undefined : selectedTicketType,

    projectIds: selectedProjectIds.length ? selectedProjectIds : undefined,

    search: debouncedSearchValue.trim() || undefined,
  };

  const kanbanBoardQueryKey = [
    'dashboard-kanban-board',
    selectedPriority,
    selectedTicketType,
    selectedProjectIdsKey,
    debouncedSearchValue.trim(),
  ] as const;

  const kanbanBoardQuery = useQuery({
    queryKey: kanbanBoardQueryKey,
    queryFn: () =>
      fetchDashboardKanbanBoard({
        ...kanbanFilters,
        limit: KANBAN_PAGE_SIZE,
      }),
    enabled: hasPermission('tickets.view_list') && viewMode === 'kanban',
    placeholderData: keepPreviousData,
  });

  const kanbanCountsQuery = useQuery({
    queryKey: [
      'dashboard-kanban-ticket-counts',
      selectedPriority,
      selectedTicketType,
      selectedProjectIdsKey,
      debouncedSearchValue.trim(),
    ],
    queryFn: () => fetchDashboardKanbanTicketCounts(kanbanFilters),
    enabled: hasPermission('tickets.view_list') && viewMode === 'kanban',
  });

  const kanbanTickets = useMemo(
    () => Object.values(kanbanBoardQuery.data?.items ?? {}).flat(),
    [kanbanBoardQuery.data?.items],
  );

  const ticketSummaryStats = useMemo(
    () => [
      {
        title: 'Open',
        count:
          viewMode === 'kanban'
            ? (kanbanBoardQuery.data?.summary?.open ?? 0)
            : (ticketsQuery.data?.summary?.open ?? 0),
        color: '#F04438',
      },
      {
        title: 'InProgress',
        count:
          viewMode === 'kanban'
            ? (kanbanBoardQuery.data?.summary?.inProgress ?? 0)
            : (ticketsQuery.data?.summary?.inProgress ?? 0),
        color: '#F79009',
      },
      {
        title: 'Resolved',
        count:
          viewMode === 'kanban'
            ? (kanbanBoardQuery.data?.summary?.resolved ?? 0)
            : (ticketsQuery.data?.summary?.resolved ?? 0),
        color: '#17B26A',
      },
      {
        title: 'Critical',
        count:
          viewMode === 'kanban'
            ? (kanbanBoardQuery.data?.summary?.critical ?? 0)
            : (ticketsQuery.data?.summary?.critical ?? 0),
        color: '#7A5AF8',
      },
      {
        title: 'Closed',
        count:
          viewMode === 'kanban'
            ? (kanbanBoardQuery.data?.summary?.closed ?? 0)
            : (ticketsQuery.data?.summary?.closed ?? 0),
        color: 'gray',
      },
    ],
    [ticketsQuery.data, kanbanBoardQuery.data],
  );
  const projectOptions = useMemo(
    () => createTicketProjectOptions(projectsQuery.data ?? []),
    [projectsQuery.data],
  );
  const statusFilterOptions = useMemo(
    () => [
      { label: 'All Status', value: 'all' },
      { label: 'Active', value: 'Active' },
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
    () =>
      (projectsQuery.data ?? []).map((project) => ({
        label: project.name,
        value: project.id,
      })),
    [projectsQuery.data],
  );
  const contactFilterOptions = useMemo(
    () => [
      { label: 'All Contacts', value: 'all' },
      ...(ticketContactsQuery.data ?? []).map((contact) => ({
        label: contact.fullName
          ? `${contact.fullName} (${contact.phone})`
          : contact.phone,
        value: contact.id,
      })),
    ],
    [ticketContactsQuery.data],
  );
  const createdByFilterOptions = useMemo(
    () => [
      { label: 'All Creators', value: 'all' },
      ...(ticketMembersQuery.data ?? []).map((member) => ({
        label: member.fullName,
        value: member.id,
      })),
    ],
    [ticketMembersQuery.data],
  );
  const assignedToFilterOptions = useMemo(
    () => [
      { label: 'All Assignees', value: 'all' },
      { label: 'Unassigned', value: 'unassigned' },
      ...(ticketMembersQuery.data ?? []).map((member) => ({
        label: member.fullName,
        value: member.id,
      })),
    ],
    [ticketMembersQuery.data],
  );

  const kanbanStatusOptions = useMemo(
    () =>
      (ticketStatusesQuery.data ?? []).map((status) => ({
        id: status.id,
        label: status.label,
        value: status.key,
        color: status.color,
      })),
    [ticketStatusesQuery.data],
  );
  const kanbanHasMoreByStatus = useMemo(() => {
    const boardData = kanbanBoardQuery.data;
    const counts = kanbanCountsQuery.data ?? {};

    return Object.fromEntries(
      kanbanStatusOptions.map((status) => {
        const loadedCount = boardData?.items[status.value]?.length ?? 0;

        const totalCount = counts[status.value] ?? 0;

        /*
         * Counts API batati hai total kitne tickets hain.
         * Board API batati hai next page available hai ya nahi.
         */
        const backendHasMore =
          boardData?.hasMore[status.value] ?? loadedCount < totalCount;

        return [status.value, loadedCount < totalCount && backendHasMore];
      }),
    );
  }, [kanbanBoardQuery.data, kanbanCountsQuery.data, kanbanStatusOptions]);

  const sortedTickets = useMemo(
    () => sortTicketsLocally(ticketsQuery.data?.items ?? [], sortState),
    [sortState, ticketsQuery.data?.items],
  );
  const ticketQuickLinkItems = useMemo(
    () =>
      canViewProjectDetail
        ? (ticket: RecentTicket): RecentTicketQuickLinkItem[] => {
            const projectId = ticket.project.id;

            if (!projectId) {
              return [];
            }

            const items: RecentTicketQuickLinkItem[] = [
              {
                key: 'project',
                label: 'Go to Project',
                href: `/projects/${projectId}`,
              },
            ];

            if (canViewProjectThread) {
              items.push({
                key: 'thread',
                label: 'Thread',
                href: `/projects/${projectId}?t=1`,
              });
            }

            if (canViewProjectFiles) {
              items.push({
                key: 'files',
                label: 'Files',
                href: `/projects/${projectId}?t=2`,
              });
            }

            if (canViewProjectCalendar) {
              items.push({
                key: 'calendar',
                label: 'Calendar',
                href: `/projects/${projectId}?t=3`,
              });
            }

            if (canViewProjectNotes) {
              items.push({
                key: 'notes',
                label: 'Notes',
                href: `/projects/${projectId}?t=4`,
              });
            }

            return items;
          }
        : undefined,
    [
      canViewProjectCalendar,
      canViewProjectDetail,
      canViewProjectFiles,
      canViewProjectNotes,
      canViewProjectThread,
    ],
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

  const handleExportTickets = async () => {
    if (!canExportTickets || isExportingTickets) {
      return;
    }

    try {
      setIsExportingTickets(true);

      const exportParams = new URLSearchParams();
      const filenameParts: string[] = [];

      if (searchValue.trim()) {
        exportParams.set('search', searchValue.trim());
        filenameParts.push(`search_${slugify(searchValue.trim())}`);
      }

      if (selectedStatus !== 'all') {
        exportParams.set('statusKey', selectedStatus);
        const statusLabel = statusFilterOptions.find(
          (option) => option.value === selectedStatus,
        )?.label;
        filenameParts.push(slugify(statusLabel ?? selectedStatus));
      }

      if (selectedPriority !== 'all') {
        exportParams.set('priorityKey', selectedPriority);
        const priorityLabel = priorityFilterOptions.find(
          (option) => option.value === selectedPriority,
        )?.label;
        filenameParts.push(slugify(priorityLabel ?? selectedPriority));
      }

      if (selectedProjectIds.length) {
        selectedProjectIds.forEach((projectId) => {
          exportParams.append('projectIds', projectId);
        });

        const projectLabels = selectedProjectIds.map(
          (projectId) =>
            projectFilterOptions.find((option) => option.value === projectId)
              ?.label ?? projectId,
        );

        filenameParts.push(
          `projects_${projectLabels.map((label) => slugify(label)).join('_')}`,
        );
      }

      if (selectedContactId !== 'all') {
        exportParams.set('contactId', selectedContactId);
        const contactLabel = contactFilterOptions.find(
          (option) => option.value === selectedContactId,
        )?.label;
        filenameParts.push(`contact_${slugify(contactLabel ?? selectedContactId)}`);
      }

      if (dateFromValue) {
        exportParams.set('dateFrom', dateFromValue);
        filenameParts.push(`from_${slugify(dateFromValue)}`);
      }

      if (dateToValue) {
        exportParams.set('dateTo', dateToValue);
        filenameParts.push(`to_${slugify(dateToValue)}`);
      }

      if (selectedCreatedBy !== 'all') {
        exportParams.set('reporterId', selectedCreatedBy);
        const createdByLabel = createdByFilterOptions.find(
          (option) => option.value === selectedCreatedBy,
        )?.label;
        filenameParts.push(
          `createdby_${slugify(createdByLabel ?? selectedCreatedBy)}`,
        );
      }

      if (selectedAssignedTo !== 'all') {
        exportParams.set('assigneeId', selectedAssignedTo);
        const assignedToLabel = assignedToFilterOptions.find(
          (option) => option.value === selectedAssignedTo,
        )?.label;
        filenameParts.push(
          `assignedto_${slugify(assignedToLabel ?? selectedAssignedTo)}`,
        );
      }

      const response = await fetch(
        `/api/tickets/export?${exportParams.toString()}`,
        { method: 'GET' },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);

        throw new Error(
          payload?.message ||
            'No leads found to export with the current filters.',
        );
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `tickets_${
        filenameParts.length ? filenameParts.join('_') : 'all'
      }.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      appToast.success('Leads exported successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to export leads.',
      );
    } finally {
      setIsExportingTickets(false);
    }
  };
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
        throw new Error('Project id is required to update lead status.');
      }

      const response = await fetch(
        `/api/projects/${projectId}/tickets/${ticket.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ statusKey }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          Array.isArray(data?.message) && data.message.length
            ? data.message.join(', ')
            : data?.message || 'Failed to update lead status.';
        throw new Error(message);
      }

      return { ticket, statusKey };
    },
    onMutate: async ({ ticket, statusKey }) => {
      const nextStatus = statusMetadataByKey.get(statusKey);

      await queryClient.cancelQueries({
        queryKey: ['dashboard-project-tickets'],
      });

      const previousQueries =
        queryClient.getQueriesData<DashboardTicketsResponse>({
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
          : 'Failed to update lead status.',
      );
    },
    onSuccess: () => {
      appToast.success('Lead status updated successfully.');
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
        queryClient.invalidateQueries({
          queryKey: ['dashboard-kanban-ticket-counts'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard-kanban-board'],
          refetchType: 'all',
        }),
      ]);
    },
  });

  const deleteTicketMutation = useDeleteTicketMutation();

  const reorderStatusMutation = useMutation({
    mutationFn: async ({
      statusId,
      newIndex,
    }: {
      statusId: string;
      newIndex: number;
    }) => {
      const response = await fetch('/api/ticket-statuses/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ statusId, newIndex }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to reorder lead statuses.');
      }

      return { statusId, newIndex };
    },
    onMutate: async ({ statusId, newIndex }) => {
      await queryClient.cancelQueries({ queryKey: ['ticket-statuses'] });

      const previousStatuses = queryClient.getQueryData<ApiTicketSetting[]>([
        'ticket-statuses',
      ]);

      queryClient.setQueryData<ApiTicketSetting[]>(
        ['ticket-statuses'],
        (current) => {
          if (!current) {
            return current;
          }

          const draggedIndex = current.findIndex(
            (status) => status.id === statusId,
          );

          if (draggedIndex === -1) {
            return current;
          }

          const nextOrder = [...current];
          const [draggedStatus] = nextOrder.splice(draggedIndex, 1);
          nextOrder.splice(newIndex, 0, draggedStatus);

          return nextOrder;
        },
      );

      return { previousStatuses };
    },
    onError: (error, _variables, context) => {
      if (context?.previousStatuses) {
        queryClient.setQueryData(['ticket-statuses'], context.previousStatuses);
      }

      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to reorder lead statuses.',
      );
    },
    onSuccess: () => {
      appToast.success('Lead statuses reordered successfully.');
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ticket-statuses'] });
    },
  });

  const handleReorderStatusColumn = (statusId: string, newIndex: number) => {
    if (reorderStatusMutation.isPending) {
      return;
    }

    reorderStatusMutation.mutate({ statusId, newIndex });
  };
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
        ticketType: values.ticketType,
        dueDate: values.dueDate,
        contactId: values.contactId || undefined,
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
      appToast.success('Lead created successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to create lead.',
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete || !hasPermission('tickets.delete')) {
      return;
    }

    try {
      setLoading(true);
      await deleteTicketMutation.mutateAsync({
        projectId: ticketToDelete.projectId,
        ticketId: ticketToDelete.ticketId,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-kanban-board'] }),
        queryClient.invalidateQueries({
          queryKey: ['dashboard-kanban-ticket-counts'],
        }),
      ]);
      appToast.success('Lead deleted successfully.');
      setTicketToDelete(null);
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to delete lead.',
      );
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
  }, [
    searchValue,
    selectedPriority,
    selectedTicketType,
    selectedProjectIdsKey,
    selectedStatus,
    selectedContactId,
    dateFromValue,
    dateToValue,
    selectedCreatedBy,
    selectedAssignedTo,
  ]);

  const hasActiveTicketFilters =
    Boolean(searchValue.trim()) ||
    selectedStatus !== DEFAULT_TICKETS_STATUS_FILTER ||
    selectedPriority !== 'all' ||
    selectedTicketType !== 'all' ||
    selectedProjectIds.length > 0 ||
    selectedContactId !== 'all' ||
    Boolean(dateFromValue) ||
    Boolean(dateToValue) ||
    selectedCreatedBy !== 'all' ||
    selectedAssignedTo !== 'all';

  const updateTicketsPageFilters = ({
    search,
    view,
    status,
    priority,
    ticketType,
    project,
    contactId,
    dateFrom,
    dateTo,
    createdBy,
    assignedTo,
  }: {
    search?: string;
    view?: 'table' | 'kanban';
    status?: string;
    priority?: string;
    ticketType?: string;
    project?: string[];
    contactId?: string;
    dateFrom?: string;
    dateTo?: string;
    createdBy?: string;
    assignedTo?: string;
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (search !== undefined) {
      if (search) {
        nextSearchParams.set(TICKETS_SEARCH_QUERY_PARAM, search);
      } else {
        nextSearchParams.delete(TICKETS_SEARCH_QUERY_PARAM);
      }
    }

    const nextViewMode = view ?? viewMode;
    const nextStatus = status ?? selectedStatus;
    const nextPriority = priority ?? selectedPriority;
    const nextTicketType = ticketType ?? selectedTicketType;
    const nextProjectIds = project ?? selectedProjectIds;
    const nextContactId = contactId ?? selectedContactId;
    const nextDateFrom = dateFrom ?? dateFromValue;
    const nextDateTo = dateTo ?? dateToValue;
    const nextCreatedBy = createdBy ?? selectedCreatedBy;
    const nextAssignedTo = assignedTo ?? selectedAssignedTo;

    if (nextViewMode === 'table') {
      nextSearchParams.delete(TICKETS_VIEW_QUERY_PARAM);
    } else {
      nextSearchParams.set(TICKETS_VIEW_QUERY_PARAM, nextViewMode);
    }

    if (nextViewMode === 'kanban') {
      nextSearchParams.delete(TICKETS_STATUS_QUERY_PARAM);
    } else if (
      status !== undefined ||
      searchParams.get(TICKETS_STATUS_QUERY_PARAM)?.trim()
    ) {
      nextSearchParams.set(TICKETS_STATUS_QUERY_PARAM, nextStatus);
    }

    if (nextPriority === 'all') {
      nextSearchParams.delete(TICKETS_PRIORITY_QUERY_PARAM);
    } else {
      nextSearchParams.set(TICKETS_PRIORITY_QUERY_PARAM, nextPriority);
    }

    if (nextTicketType === 'all') {
      nextSearchParams.delete(TICKETS_TYPE_QUERY_PARAM);
    } else {
      nextSearchParams.set(TICKETS_TYPE_QUERY_PARAM, nextTicketType);
    }

    if (nextContactId === 'all') {
      nextSearchParams.delete(TICKETS_CONTACT_QUERY_PARAM);
    } else {
      nextSearchParams.set(TICKETS_CONTACT_QUERY_PARAM, nextContactId);
    }

    if (nextDateFrom) {
      nextSearchParams.set(TICKETS_DATE_FROM_QUERY_PARAM, nextDateFrom);
    } else {
      nextSearchParams.delete(TICKETS_DATE_FROM_QUERY_PARAM);
    }

    if (nextDateTo) {
      nextSearchParams.set(TICKETS_DATE_TO_QUERY_PARAM, nextDateTo);
    } else {
      nextSearchParams.delete(TICKETS_DATE_TO_QUERY_PARAM);
    }

    if (nextCreatedBy === 'all') {
      nextSearchParams.delete(TICKETS_CREATED_BY_QUERY_PARAM);
    } else {
      nextSearchParams.set(TICKETS_CREATED_BY_QUERY_PARAM, nextCreatedBy);
    }

    if (nextAssignedTo === 'all') {
      nextSearchParams.delete(TICKETS_ASSIGNED_TO_QUERY_PARAM);
    } else {
      nextSearchParams.set(TICKETS_ASSIGNED_TO_QUERY_PARAM, nextAssignedTo);
    }

    nextSearchParams.delete(TICKETS_PROJECT_QUERY_PARAM);

    nextProjectIds.forEach((projectId) => {
      nextSearchParams.append(TICKETS_PROJECT_QUERY_PARAM, projectId);
    });

    const nextQueryString = nextSearchParams.toString();

    const currentQueryString = searchParams.toString();

    if (nextQueryString === currentQueryString) {
      return;
    }

    router.push(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, {
      scroll: false,
    });
  };

  const clearTicketFilters = () => {
    updateTicketsPageFilters({
      search: '',
      status: DEFAULT_TICKETS_STATUS_FILTER,
      priority: 'all',
      ticketType: 'all',
      project: [],
      contactId: 'all',
      dateFrom: '',
      dateTo: '',
      createdBy: 'all',
      assignedTo: 'all',
    });
  };

  const invalidateTicketRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['dashboard-kanban-board'],
        refetchType: 'all',
      }),
      queryClient.invalidateQueries({
        queryKey: ['dashboard-kanban-ticket-counts'],
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
        queryKey: ['dashboard-project-tickets'],
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
  };

  const invalideProjectsRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['project-names'],
        refetchType: 'all',
      }),
      //projects
      queryClient.invalidateQueries({
        queryKey: ['projects'],
        refetchType: 'all',
      }),
    ]);
  };

  // Event listener
  useEffect(() => {
    const handleNotificationNew = (payload: NotificationItem) => {
      if (payload.entityType === NotificationEntityType.TICKET) {
        void invalidateTicketRelated();
      }

      if (payload.entityType === NotificationEntityType.PROJECT) {
        void invalideProjectsRelated();
        void invalidateTicketRelated();
      }
    };

    eventEmitter.on('notification:new', handleNotificationNew);

    return () => {
      eventEmitter.off('notification:new', handleNotificationNew);
    };
  }, []);

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
  const handleLoadMoreKanbanStatus = async (statusKey: string) => {
    const currentBoard =
      queryClient.getQueryData<KanbanBoardData>(kanbanBoardQueryKey);

    if (!currentBoard) {
      return;
    }

    const currentTickets = currentBoard.items[statusKey] ?? [];

    const loadedCount = currentTickets.length;

    const totalCount = kanbanCountsQuery.data?.[statusKey] ?? 0;

    const backendHasMore =
      currentBoard.hasMore[statusKey] ?? loadedCount < totalCount;

    if (
      loadedCount >= totalCount ||
      !backendHasMore ||
      loadingKanbanStatusesRef.current[statusKey]
    ) {
      return;
    }

    loadingKanbanStatusesRef.current[statusKey] = true;

    const nextPage = (currentBoard.pageByStatus[statusKey] ?? 1) + 1;

    setLoadingKanbanStatuses((current) => ({
      ...current,
      [statusKey]: true,
    }));

    try {
      const activePriorityKey =
        selectedPriority === 'all' ? undefined : selectedPriority;

      const activeTicketType =
        selectedTicketType === 'all' ? undefined : selectedTicketType;

      const activeProjectIds =
        selectedProjectIds.length > 0 ? [...selectedProjectIds] : undefined;

      const activeSearch = debouncedSearchValue.trim() || undefined;

      const nextPageData = await queryClient.fetchQuery({
        queryKey: [
          'dashboard-kanban-board-page',
          statusKey,
          nextPage,
          KANBAN_PAGE_SIZE,
          activePriorityKey ?? 'all',
          activeTicketType ?? 'all',
          selectedProjectIdsKey,
          activeSearch ?? '',
        ],
        queryFn: () =>
          fetchDashboardKanbanBoard({
            statusKey,
            page: nextPage,
            limit: KANBAN_PAGE_SIZE,
            priorityKey: activePriorityKey,
            ticketType: activeTicketType,
            projectIds: activeProjectIds,
            search: activeSearch,
          }),
      });

      queryClient.setQueryData<KanbanBoardData>(
        kanbanBoardQueryKey,
        (current) => {
          if (!current) {
            return current;
          }

          const existingTickets = current.items[statusKey] ?? [];

          /*
           * Paginated response ke tickets ko requested column ka
           * exact display label dein.
           *
           * Example:
           * statusKey: UnderReview
           * display label: Under Review
           */
          const targetStatus = statusMetadataByKey.get(statusKey);

          const normalizedIncomingTickets = (
            nextPageData.items[statusKey] ?? []
          ).map((ticket) => ({
            ...ticket,
            status: targetStatus?.label ?? ticket.status ?? statusKey,
            statusColor: targetStatus?.color ?? ticket.statusColor,
          }));

          const seenTicketIds = new Set(
            existingTickets.map((ticket) => ticket.id).filter(Boolean),
          );

          const uniqueIncomingTickets = normalizedIncomingTickets.filter(
            (ticket) => {
              if (!ticket.id || seenTicketIds.has(ticket.id)) {
                return false;
              }

              seenTicketIds.add(ticket.id);
              return true;
            },
          );

          const nextLoadedCount =
            existingTickets.length + uniqueIncomingTickets.length;

          const statusTotalCount = kanbanCountsQuery.data?.[statusKey] ?? 0;

          /*
           * Normally backend hasMore source of truth hai.
           * Count comparison additional safety provide karti hai.
           *
           * Agar response mein koi naya valid ticket nahi aya,
           * repeated observer/API loop rok diya jayega.
           */
          const responseHasMore = nextPageData.hasMore[statusKey] ?? false;

          const shouldLoadMore =
            uniqueIncomingTickets.length > 0 &&
            nextLoadedCount < statusTotalCount &&
            responseHasMore;

          return {
            ...current,
            items: {
              ...current.items,
              [statusKey]: [...existingTickets, ...uniqueIncomingTickets],
            },
            hasMore: {
              ...current.hasMore,
              [statusKey]: shouldLoadMore,
            },
            pageByStatus: {
              ...current.pageByStatus,
              [statusKey]: nextPage,
            },
          };
        },
      );
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to load more leads.',
      );
    } finally {
      loadingKanbanStatusesRef.current[statusKey] = false;

      setLoadingKanbanStatuses((current) => ({
        ...current,
        [statusKey]: false,
      }));
    }
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

  const handleViewModeChange = (nextViewMode: 'table' | 'kanban') => {
    updateTicketsPageFilters({
      view: nextViewMode,
      status: nextViewMode === 'kanban' ? 'all' : undefined,
    });
  };
  const isTicketsContentLoading =
    viewMode === 'kanban'
      ? kanbanBoardQuery.isLoading || ticketStatusesQuery.isLoading
      : ticketsQuery.isLoading || ticketsQuery.isPlaceholderData;
  const isTicketSummaryLoading =
    viewMode === 'table' && ticketsQuery.isLoading && !ticketsQuery.data;
  const [filtersOpen, setFiltersOpen] = useState(false);
  return (
    <>
      <div className="relative z-100 h-full xl:h-dvh overflow-hidden xl:py-5 xl:pr-5 px-4 xl:px-0 pt-2 pb-0 py-4">
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 xl:overflow-hidden overflow-y-auto overscroll-contain scrollbar-hide xl:rounded-2xl xl:border xl:border-white xl:bg-white/40 xl:p-3">
          <div className="shrink-0">
            {isTicketSummaryLoading ? (
              <DashboardSummaryBannerSkeleton
                statsCount={4}
                titleWidthClass="w-28"
              />
            ) : (
              <DashboardSummaryBanner
                imageSrc="/images/TicketsIcon.svg"
                imageAlt="Leads"
                title="Leads"
                stats={ticketSummaryStats}
              />
            )}
          </div>
          <div className="flex h-auto min-h-0 min-w-0 flex-none flex-col overflow-visible rounded-xl bg-white p-3 md:p-4 xl:h-full xl:flex-1 xl:overflow-hidden">
            <PermissionGuard
              permission="tickets.view_list"
              fallback={
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                  You do not have permission to view leads.
                </div>
              }
            >
              <div className="flex h-auto min-h-0 min-w-0 flex-col gap-4 overflow-visible xl:h-full xl:overflow-hidden">
                <div className="flex flex-col gap-3 rounded-xl md:flex-row justify-end items-end">
                  <>
                    <div className="flex w-full md:flex-row flex-col gap-2 justify-between">
                      <div className="flex flex-row justify-between w-full sm:w-fit gap-3">
                        <div className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 md:max-w-100 md:min-w-80">
                          <div className="flex items-center gap-2">
                            <span className="shrink-0">
                              <SearchIcon fill="#374151" />
                            </span>
                            <input
                              type="text"
                              value={searchValue}
                              onChange={(event) =>
                                setSearchValue(event.target.value)
                              }
                              placeholder="Search"
                              className="min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
                            />

                            <button
                              type="button"
                              onClick={() => setSearchValue('')}
                              disabled={!searchValue}
                              tabIndex={searchValue ? 0 : -1}
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                                searchValue
                                  ? 'visible hover:bg-gray-100'
                                  : 'pointer-events-none invisible'
                              }`}
                              aria-label="Clear search"
                            >
                              <CloseIcon width="15" height="15" />
                            </button>
                          </div>
                        </div>
                        <Popover as="div" className="block sm:hidden ">
                          {({ open }) => (
                            <>
                              <PopoverButton
                                className={`flex h-10 shrink-0 items-center justify-center rounded-lg border px-3 text-sm font-medium outline-none ${
                                  open
                                    ? 'border-primary  text-white'
                                    : 'border-gray-200 bg-white text-gray-700'
                                }`}
                                aria-label="Open filters"
                              >
                                <FiltersIcon />
                              </PopoverButton>

                              <PopoverPanel
                                anchor="bottom end"
                                transition
                                className="z-100 mt-2 flex w-60 origin-top-right flex-col gap-3 overflow-visible!  rounded-xl border border-gray-200 bg-white p-3 shadow-[0_14px_44px_rgb(0_0_0/0.14)] outline-none transition duration-150 data-closed:-translate-y-2 data-closed:scale-95 data-closed:opacity-0"
                              >
                                <div className="relative w-full overflow-visible">
                                  <Dropdown
                                    options={projectFilterOptions}
                                    isMulti
                                    value={selectedProjectIds}
                                    onChange={(value) =>
                                      updateTicketsPageFilters({
                                        project: value,
                                      })
                                    }
                                    showSearch={true}
                                    placeholder="All Projects"
                                    maxMenuHeight={150}
                                  />
                                </div>

                                {viewMode === 'table' ? (
                                  <div className="relative w-full overflow-visible">
                                    <Dropdown
                                      options={statusFilterOptions}
                                      value={selectedStatus}
                                      onChange={(value) =>
                                        updateTicketsPageFilters({
                                          status: value,
                                        })
                                      }
                                      showSearch={true}
                                      placeholder="All Status"
                                      maxMenuHeight={150}
                                    />
                                  </div>
                                ) : null}

                                <div className="relative w-full overflow-visible">
                                  <Dropdown
                                    options={priorityFilterOptions}
                                    value={selectedPriority}
                                    onChange={(value) =>
                                      updateTicketsPageFilters({
                                        priority: value,
                                      })
                                    }
                                    showSearch={true}
                                    placeholder="All Priority"
                                    maxMenuHeight={150}
                                  />
                                </div>

                                <div className="relative w-full overflow-visible">
                                  <Dropdown
                                    options={contactFilterOptions}
                                    value={selectedContactId}
                                    onChange={(value) =>
                                      updateTicketsPageFilters({
                                        contactId: value,
                                      })
                                    }
                                    showSearch={true}
                                    placeholder="All Contacts"
                                    maxMenuHeight={150}
                                  />
                                </div>

                                {viewMode === 'table' ? (
                                  <>
                                    <div className="relative w-full overflow-visible">
                                      <Dropdown
                                        options={createdByFilterOptions}
                                        value={selectedCreatedBy}
                                        onChange={(value) =>
                                          updateTicketsPageFilters({
                                            createdBy: value,
                                          })
                                        }
                                        showSearch={true}
                                        placeholder="All Creators"
                                        maxMenuHeight={150}
                                      />
                                    </div>

                                    <div className="relative w-full overflow-visible">
                                      <Dropdown
                                        options={assignedToFilterOptions}
                                        value={selectedAssignedTo}
                                        onChange={(value) =>
                                          updateTicketsPageFilters({
                                            assignedTo: value,
                                          })
                                        }
                                        showSearch={true}
                                        placeholder="All Assignees"
                                        maxMenuHeight={150}
                                      />
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <ThemeInput
                                        type="date"
                                        value={dateFromValue}
                                        onChange={(event) =>
                                          updateTicketsPageFilters({
                                            dateFrom: event.target.value,
                                          })
                                        }
                                        max={dateToValue || undefined}
                                        wrapperClassName="w-full"
                                        aria-label="From date"
                                      />
                                      <span className="shrink-0 text-xs text-gray-400">
                                        to
                                      </span>
                                      <ThemeInput
                                        type="date"
                                        value={dateToValue}
                                        onChange={(event) =>
                                          updateTicketsPageFilters({
                                            dateTo: event.target.value,
                                          })
                                        }
                                        min={dateFromValue || undefined}
                                        wrapperClassName="w-full"
                                        aria-label="To date"
                                      />
                                    </div>
                                  </>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={clearTicketFilters}
                                  disabled={!hasActiveTicketFilters}
                                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Clear Filters
                                </button>
                              </PopoverPanel>
                            </>
                          )}
                        </Popover>
                      </div>

                      <div className="flex  flex-col gap-3 md:flex-row xl:items-center  justify-end">
                        <Popover
                          as="div"
                          className="hidden md:block  2xl:hidden"
                        >
                          {({ open }) => (
                            <>
                              <PopoverButton
                                className={`flex h-10 shrink-0 items-center justify-center rounded-lg border px-3 text-sm font-medium outline-none ${
                                  open
                                    ? 'border-primary  text-white'
                                    : 'border-gray-200 bg-white text-gray-700'
                                }`}
                                aria-label="Open filters"
                              >
                                <FiltersIcon />
                              </PopoverButton>

                              <PopoverPanel
                                anchor="bottom end"
                                transition
                                className="z-100 mt-2 flex w-60 origin-top-right flex-col gap-3 overflow-visible!  rounded-xl border border-gray-200 bg-white p-3 shadow-[0_14px_44px_rgb(0_0_0/0.14)] outline-none transition duration-150 data-closed:-translate-y-2 data-closed:scale-95 data-closed:opacity-0"
                              >
                                <div className="relative w-full overflow-visible">
                                  <Dropdown
                                    options={projectFilterOptions}
                                    isMulti
                                    value={selectedProjectIds}
                                    onChange={(value) =>
                                      updateTicketsPageFilters({
                                        project: value,
                                      })
                                    }
                                    showSearch={true}
                                    placeholder="All Projects"
                                    maxMenuHeight={150}
                                  />
                                </div>

                                {viewMode === 'table' ? (
                                  <div className="relative w-full overflow-visible">
                                    <Dropdown
                                      options={statusFilterOptions}
                                      value={selectedStatus}
                                      onChange={(value) =>
                                        updateTicketsPageFilters({
                                          status: value,
                                        })
                                      }
                                      showSearch={true}
                                      placeholder="All Status"
                                      maxMenuHeight={150}
                                    />
                                  </div>
                                ) : null}

                                <div className="relative w-full overflow-visible">
                                  <Dropdown
                                    options={priorityFilterOptions}
                                    value={selectedPriority}
                                    onChange={(value) =>
                                      updateTicketsPageFilters({
                                        priority: value,
                                      })
                                    }
                                    showSearch={true}
                                    placeholder="All Priority"
                                    maxMenuHeight={150}
                                  />
                                </div>

                                <div className="relative w-full overflow-visible">
                                  <Dropdown
                                    options={contactFilterOptions}
                                    value={selectedContactId}
                                    onChange={(value) =>
                                      updateTicketsPageFilters({
                                        contactId: value,
                                      })
                                    }
                                    showSearch={true}
                                    placeholder="All Contacts"
                                    maxMenuHeight={150}
                                  />
                                </div>

                                {viewMode === 'table' ? (
                                  <>
                                    <div className="relative w-full overflow-visible">
                                      <Dropdown
                                        options={createdByFilterOptions}
                                        value={selectedCreatedBy}
                                        onChange={(value) =>
                                          updateTicketsPageFilters({
                                            createdBy: value,
                                          })
                                        }
                                        showSearch={true}
                                        placeholder="All Creators"
                                        maxMenuHeight={150}
                                      />
                                    </div>

                                    <div className="relative w-full overflow-visible">
                                      <Dropdown
                                        options={assignedToFilterOptions}
                                        value={selectedAssignedTo}
                                        onChange={(value) =>
                                          updateTicketsPageFilters({
                                            assignedTo: value,
                                          })
                                        }
                                        showSearch={true}
                                        placeholder="All Assignees"
                                        maxMenuHeight={150}
                                      />
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <ThemeInput
                                        type="date"
                                        value={dateFromValue}
                                        onChange={(event) =>
                                          updateTicketsPageFilters({
                                            dateFrom: event.target.value,
                                          })
                                        }
                                        max={dateToValue || undefined}
                                        wrapperClassName="w-full"
                                        aria-label="From date"
                                      />
                                      <span className="shrink-0 text-xs text-gray-400">
                                        to
                                      </span>
                                      <ThemeInput
                                        type="date"
                                        value={dateToValue}
                                        onChange={(event) =>
                                          updateTicketsPageFilters({
                                            dateTo: event.target.value,
                                          })
                                        }
                                        min={dateFromValue || undefined}
                                        wrapperClassName="w-full"
                                        aria-label="To date"
                                      />
                                    </div>
                                  </>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={clearTicketFilters}
                                  disabled={!hasActiveTicketFilters}
                                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Clear Filters
                                </button>
                              </PopoverPanel>
                            </>
                          )}
                        </Popover>
                        <div className="hidden xl:flex  items-center rounded-lg border border-gray-200 bg-white">
                          <button
                            type="button"
                            onClick={() => handleViewModeChange('table')}
                            className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
                              viewMode === 'table'
                                ? 'bg-linear-[271deg] from-aztec-purple  to-cyan-blue text-white shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                            aria-label="Table view"
                          >
                            <TableViewIcon />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleViewModeChange('kanban')}
                            className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
                              viewMode === 'kanban'
                                ? 'bg-linear-[271deg] from-aztec-purple  to-cyan-blue text-white shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                            aria-label="Kanban view"
                          >
                            <KanbanViewIcon />
                          </button>
                        </div>
                        <div className="2xl:block  3xl:hidden hidden">
                          <ThemeButton
                            type="button"
                            variant="secondary"
                            icon={<FiltersIcon fill="currentColor" />}
                            onClick={() =>
                              setFiltersOpen((current) => !current)
                            }
                            aria-label="Open lead filters"
                            aria-expanded={filtersOpen}
                            aria-controls="recent-ticket-filters"
                            className={
                              filtersOpen
                                ? 'border-primary! bg-primary/5! text-primary! shadow-sm'
                                : ''
                            }
                          >
                            Filter
                          </ThemeButton>
                        </div>
                        <div className="w-full hidden 3xl:block 2xl:w-55">
                          <Dropdown
                            options={projectFilterOptions}
                            isMulti
                            value={selectedProjectIds}
                            onChange={(value) =>
                              updateTicketsPageFilters({ project: value })
                            }
                            placeholder="All Projects"
                            maxMenuHeight={320}
                            showSearch={true}
                          />
                        </div>
                        {viewMode === 'table' && (
                          <div className="w-full hidden 3xl:block 2xl:w-55">
                            <Dropdown
                              options={statusFilterOptions}
                              value={selectedStatus}
                              onChange={(value) =>
                                updateTicketsPageFilters({ status: value })
                              }
                              placeholder="All Status"
                              minHeight="min-h-70"
                              menuScrollable={false}
                              showSearch={true}
                            />
                          </div>
                        )}

                        <div className="w-full  gap-3 hidden 3xl:flex 2xl:w-55">
                          <Dropdown
                            options={priorityFilterOptions}
                            value={selectedPriority}
                            onChange={(value) =>
                              updateTicketsPageFilters({ priority: value })
                            }
                            showSearch={true}
                            placeholder="All Priority"
                          />
                        </div>

                        <div className="w-full hidden 3xl:block 2xl:w-55">
                          <Dropdown
                            options={contactFilterOptions}
                            value={selectedContactId}
                            onChange={(value) =>
                              updateTicketsPageFilters({ contactId: value })
                            }
                            showSearch={true}
                            placeholder="All Contacts"
                            maxMenuHeight={320}
                          />
                        </div>

                        {viewMode === 'table' && (
                          <div className="w-full hidden 3xl:block 2xl:w-55">
                            <Dropdown
                              options={createdByFilterOptions}
                              value={selectedCreatedBy}
                              onChange={(value) =>
                                updateTicketsPageFilters({ createdBy: value })
                              }
                              showSearch={true}
                              placeholder="All Creators"
                              maxMenuHeight={320}
                            />
                          </div>
                        )}

                        {viewMode === 'table' && (
                          <div className="w-full hidden 3xl:block 2xl:w-55">
                            <Dropdown
                              options={assignedToFilterOptions}
                              value={selectedAssignedTo}
                              onChange={(value) =>
                                updateTicketsPageFilters({ assignedTo: value })
                              }
                              showSearch={true}
                              placeholder="All Assignees"
                              maxMenuHeight={320}
                            />
                          </div>
                        )}

                        {viewMode === 'table' && (
                          <div className="hidden 3xl:flex items-center gap-2">
                            <ThemeInput
                              type="date"
                              value={dateFromValue}
                              onChange={(event) =>
                                updateTicketsPageFilters({
                                  dateFrom: event.target.value,
                                })
                              }
                              max={dateToValue || undefined}
                              wrapperClassName="w-full"
                              aria-label="From date"
                            />
                            <span className="shrink-0 text-xs text-gray-400">
                              to
                            </span>
                            <ThemeInput
                              type="date"
                              value={dateToValue}
                              onChange={(event) =>
                                updateTicketsPageFilters({
                                  dateTo: event.target.value,
                                })
                              }
                              min={dateFromValue || undefined}
                              wrapperClassName="w-full"
                              aria-label="To date"
                            />
                          </div>
                        )}

                        <ThemeButton
                          type="button"
                          variant="secondary"
                          size="md"
                          onClick={clearTicketFilters}
                          disabled={!hasActiveTicketFilters}
                          className="hidden h-10 shrink-0 disabled:cursor-not-allowed disabled:opacity-50 3xl:inline-flex"
                        >
                          Clear Filters
                        </ThemeButton>
                        <div className="flex flex-row gap-3 ">
                          <Popover
                            as="div"
                            className="relative hidden md:hidden"
                          >
                            {({ open }) => (
                              <>
                                <PopoverButton
                                  className={`flex h-10 shrink-0 items-center justify-center rounded-lg border px-3 text-sm font-medium outline-none ${
                                    open
                                      ? 'border-primary  text-white'
                                      : 'border-gray-200 bg-white text-gray-700'
                                  }`}
                                  aria-label="Open filters"
                                >
                                  <FiltersIcon />
                                </PopoverButton>

                                <PopoverPanel
                                  anchor="bottom end"
                                  transition
                                  className="z-100 mt-2 flex w-60 origin-top-right flex-col gap-3 overflow-visible!  rounded-xl border border-gray-200 bg-white p-3 shadow-[0_14px_44px_rgb(0_0_0/0.14)] outline-none transition duration-150 data-closed:-translate-y-2 data-closed:scale-95 data-closed:opacity-0"
                                >
                                  <div className="relative w-full overflow-visible">
                                    <Dropdown
                                      options={projectFilterOptions}
                                      isMulti
                                      value={selectedProjectIds}
                                      onChange={(value) =>
                                        updateTicketsPageFilters({
                                          project: value,
                                        })
                                      }
                                      placeholder="All Projects"
                                      maxMenuHeight={150}
                                      showSearch={true}
                                    />
                                  </div>

                                  {viewMode === 'table' ? (
                                    <div className="relative w-full overflow-visible">
                                      <Dropdown
                                        options={statusFilterOptions}
                                        value={selectedStatus}
                                        onChange={(value) =>
                                          updateTicketsPageFilters({
                                            status: value,
                                          })
                                        }
                                        showSearch={true}
                                        placeholder="All Status"
                                        maxMenuHeight={150}
                                      />
                                    </div>
                                  ) : null}

                                  <div className="relative w-full overflow-visible">
                                    <Dropdown
                                      options={priorityFilterOptions}
                                      value={selectedPriority}
                                      onChange={(value) =>
                                        updateTicketsPageFilters({
                                          priority: value,
                                        })
                                      }
                                      placeholder="All Priority"
                                      maxMenuHeight={150}
                                      showSearch={true}
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    onClick={clearTicketFilters}
                                    disabled={!hasActiveTicketFilters}
                                    className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Clear Filters
                                  </button>
                                </PopoverPanel>
                              </>
                            )}
                          </Popover>
                          {canCreateTicket ? (
                            <ThemeButton
                              className="rounded-full w-full xl:flex hidden"
                              variant="primaryGradient"
                              icon={<PlusIcon width="20" height="20" />}
                              onClick={() => setCreateTicketOpen(true)}
                            >
                              New Lead
                            </ThemeButton>
                          ) : null}

                          {canExportTickets ? (
                            <ThemeButton
                              className="rounded-full w-full"
                              variant="primaryGradient"
                              icon={<DownloadIcon fill="#ffffff" />}
                              onClick={handleExportTickets}
                              disabled={isExportingTickets}
                            >
                              {isExportingTickets
                                ? 'Exporting...'
                                : 'Export Leads'}
                            </ThemeButton>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </>
                </div>
                <div
                  className={`hidden w-full justify-end transition-[grid-template-rows,opacity,transform] duration-300 ease-out xl:grid ${
                    filtersOpen
                      ? 'grid-rows-[1fr]  translate-y-0 opacity-100'
                      : 'pointer-events-none grid-rows-[0fr] -translate-y-2 opacity-0'
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div
                      id="recent-ticket-filters"
                      className="flex w-full items-center gap-2 pt-1"
                    >
                      <div className="w-full hidden 2xl:block 2xl:w-55">
                        <Dropdown
                          options={projectFilterOptions}
                          isMulti
                          value={selectedProjectIds}
                          onChange={(value) =>
                            updateTicketsPageFilters({ project: value })
                          }
                          placeholder="All Projects"
                          maxMenuHeight={320}
                          showSearch={true}
                        />
                      </div>
                      {viewMode === 'table' && (
                        <div className="w-full hidden 2xl:block 2xl:w-55">
                          <Dropdown
                            options={statusFilterOptions}
                            value={selectedStatus}
                            onChange={(value) =>
                              updateTicketsPageFilters({ status: value })
                            }
                            placeholder="All Status"
                            minHeight="min-h-70"
                            menuScrollable={false}
                            showSearch={true}
                          />
                        </div>
                      )}

                      <div className="w-full  gap-3 hidden 2xl:flex 2xl:w-55">
                        <Dropdown
                          options={priorityFilterOptions}
                          value={selectedPriority}
                          onChange={(value) =>
                            updateTicketsPageFilters({ priority: value })
                          }
                          showSearch={true}
                          placeholder="All Priority"
                        />
                      </div>

                      <div className="w-full hidden 2xl:block 2xl:w-55">
                        <Dropdown
                          options={contactFilterOptions}
                          value={selectedContactId}
                          onChange={(value) =>
                            updateTicketsPageFilters({ contactId: value })
                          }
                          showSearch={true}
                          placeholder="All Contacts"
                          maxMenuHeight={320}
                        />
                      </div>

                      {viewMode === 'table' && (
                        <div className="w-full hidden 2xl:block 2xl:w-55">
                          <Dropdown
                            options={createdByFilterOptions}
                            value={selectedCreatedBy}
                            onChange={(value) =>
                              updateTicketsPageFilters({ createdBy: value })
                            }
                            showSearch={true}
                            placeholder="All Creators"
                            maxMenuHeight={320}
                          />
                        </div>
                      )}

                      {viewMode === 'table' && (
                        <div className="w-full hidden 2xl:block 2xl:w-55">
                          <Dropdown
                            options={assignedToFilterOptions}
                            value={selectedAssignedTo}
                            onChange={(value) =>
                              updateTicketsPageFilters({ assignedTo: value })
                            }
                            showSearch={true}
                            placeholder="All Assignees"
                            maxMenuHeight={320}
                          />
                        </div>
                      )}

                      {viewMode === 'table' && (
                        <div className="hidden 2xl:flex items-center gap-2">
                          <ThemeInput
                            type="date"
                            value={dateFromValue}
                            onChange={(event) =>
                              updateTicketsPageFilters({
                                dateFrom: event.target.value,
                              })
                            }
                            max={dateToValue || undefined}
                            wrapperClassName="w-full"
                            aria-label="From date"
                          />
                          <span className="shrink-0 text-xs text-gray-400">
                            to
                          </span>
                          <ThemeInput
                            type="date"
                            value={dateToValue}
                            onChange={(event) =>
                              updateTicketsPageFilters({
                                dateTo: event.target.value,
                              })
                            }
                            min={dateFromValue || undefined}
                            wrapperClassName="w-full"
                            aria-label="To date"
                          />
                        </div>
                      )}

                      <ThemeButton
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={clearTicketFilters}
                        disabled={!hasActiveTicketFilters}
                        className="hidden h-10 shrink-0 disabled:cursor-not-allowed disabled:opacity-50 2xl:inline-flex"
                      >
                        Clear Filters
                      </ThemeButton>
                    </div>
                  </div>
                </div>
                <div className="min-h-0 min-w-0 flex-none overflow-visible xl:flex-1 xl:overflow-hidden">
                  {isTicketsContentLoading ? (
                    viewMode === 'kanban' ? (
                      <TicketsKanbanSkeleton />
                    ) : (
                      <RecentTicketsTableSkeleton />
                    )
                  ) : viewMode === 'kanban' ? (
                    <TicketsKanbanView
                      tickets={kanbanTickets}
                      onDeleteTicket={
                        canDeleteTicket
                          ? (ticket) =>
                              setTicketToDelete({
                                projectId: ticket.project.id ?? '',
                                ticketId: ticket.id,
                                name: ticket.title,
                              })
                          : undefined
                      }
                      statusOptions={kanbanStatusOptions}
                      statusCountsByKey={kanbanCountsQuery.data ?? {}}
                      hasMoreByStatus={kanbanHasMoreByStatus}
                      loadingByStatus={loadingKanbanStatuses}
                      onLoadMoreStatus={(statusKey) => {
                        void handleLoadMoreKanbanStatus(statusKey);
                      }}
                      onTicketClick={
                        canViewTicketDetail ? handleTicketClick : undefined
                      }
                      onMoveTicket={(ticket, nextStatusKey) => {
                        void handleMoveTicket(ticket, nextStatusKey);
                      }}
                      onReorderColumn={handleReorderStatusColumn}
                      canDragTickets={canEditTicketStatus}
                      canDragColumns
                      movingTicketId={
                        moveTicketMutation.isPending
                          ? (moveTicketMutation.variables?.ticket.id ?? null)
                          : null
                      }
                    />
                  ) : (
                    <RecentTicketsTable
                      tickets={sortedTickets}
                      onEmptyButtonClick={
                        canCreateTicket
                          ? () => setCreateTicketOpen(true)
                          : undefined
                      }
                      enablePagination
                      initialPageSize={10}
                      pageSizeOptions={[10, 25, 50, 100]}
                      pagination={pagination}
                      onPaginationChange={handlePaginationChange}
                      totalRows={ticketsQuery.data?.meta.total ?? 0}
                      manualPagination
                      sortState={sortState}
                      onSortChange={handleSortChange}
                      getRowHref={
                        canViewTicketDetail
                          ? (ticket) =>
                              `/tickets/${ticket.id}?projectId=${ticket.project.id}`
                          : undefined
                      }
                      getQuickLinkItems={ticketQuickLinkItems}
                      onRowClick={
                        canViewTicketDetail ? handleTicketClick : undefined
                      }
                      onDeleteTickets={(val) => {
                        // alert('ticket to be delete is' + val.id);
                        if (canDeleteTicket) {
                          setTicketToDelete({
                            projectId: val.project.id ?? '',
                            ticketId: val.id,
                            name: val.title,
                          });
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            </PermissionGuard>
          </div>
        </div>
        {canCreateTicket ? (
          <button
            type="button"
            onClick={() => setCreateTicketOpen(true)}
            className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-l from-royal-blue to-crystal-blue text-white shadow-[0_10px_30px_rgb(48_79_253/0.35)] transition hover:opacity-90 active:scale-95 xl:hidden"
            aria-label="Create new lead"
          >
            <PlusIcon fill="#ffffff" width="24" height="24" />
          </button>
        ) : null}
      </div>

      <CreateTicketModal
        isOpen={createTicketOpen && canCreateTicket}
        onClose={() => setCreateTicketOpen(false)}
        onConfirm={handleCreateTicket}
        projectOptions={projectOptions}
      />
      <ConfirmActionModal
        isOpen={Boolean(ticketToDelete) && canDeleteTicket}
        onClose={() => setTicketToDelete(null)}
        title="Delete Lead?"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold">
              “{ticketToDelete?.name ?? 'this lead'}”
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        isSubmitting={deleteTicketMutation.isPending}
        onConfirm={handleDeleteTicket}
      />
    </>
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
  summary: TicketSummary;
  countPerStatus: Record<string, number>;
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
  dueDate: string | null;
  title: string;
  project: {
    id: string;
    name: string;
    brandColor?: string;
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
  ticketType?: string | null;
  assignee: {
    id?: string;
    fullName?: string;
    name?: string;
  } | null;
  reporter?: {
    id: string;
    email: string;
    fullName: string;
  };
  contact?: {
    id: string;
    fullName: string | null;
    phone: string;
  } | null;
};

type ApiDashboardTicketsResponse = {
  items: ApiDashboardTicket[];
  summary: TicketSummary;
  countPerStatus?: Record<string, number>;
  meta: DashboardTicketsResponse['meta'];
};

type ApiKanbanBoardTicket = {
  /*
   * Initial Kanban response raw fields
   */
  t_id?: string;
  t_title?: string;
  t_ticketRefNo?: string;
  t_dueDate?: string | null;
  t_createdAt?: string;
  t_statusKey?: string;

  p_id?: string;
  p_name?: string;
  p_brandColor?: string | null;

  s_key?: string;
  s_label?: string;
  s_color?: string | null;

  pr_key?: string | null;
  pr_label?: string | null;
  pr_color?: string | null;

  a_id?: string | null;
  a_fullName?: string | null;
  a_email?: string | null;

  c_id?: string | null;
  c_fullName?: string | null;
  c_phone?: string | null;

  rn?: string;

  /*
   * Paginated Kanban response entity fields
   */
  id?: string;
  title?: string;
  ticketRefNo?: string;
  dueDate?: string | null;
  createdAt?: string;
  statusKey?: string;
  projectId?: string;
  priorityKey?: string | null;
  assigneeId?: string | null;
  ticketType?: string | null;

  project?: {
    id?: string;
    name?: string;
    brandColor?: string | null;
  } | null;

  status?: {
    key?: string;
    label?: string;
    color?: string | null;
  } | null;

  priority?: {
    key?: string;
    label?: string;
    color?: string | null;
  } | null;

  assignee?: {
    id?: string;
    fullName?: string;
    name?: string;
    email?: string;
  } | null;

  contact?: {
    id?: string;
    fullName?: string | null;
    phone?: string;
  } | null;
};

type ApiKanbanBoardResponse = {
  items: Record<string, ApiKanbanBoardTicket[]> | ApiKanbanBoardTicket[];
  hasMore: Record<string, boolean> | boolean;
  summary: TicketSummary;
};

type KanbanBoardData = {
  items: Record<string, RecentTicket[]>;
  hasMore: Record<string, boolean>;
  summary: TicketSummary;
  pageByStatus: Record<string, number>;
};

type ApiKanbanTicketCountsResponse = {
  countPerStatus: Record<string, number>;
};
function mapApiKanbanTicketToRecentTicket(
  ticket: ApiKanbanBoardTicket,
): RecentTicket {
  const ticketId = ticket.t_id ?? ticket.id ?? '';

  const projectId = ticket.p_id ?? ticket.project?.id ?? ticket.projectId ?? '';

  const projectName =
    ticket.p_name?.trim() || ticket.project?.name?.trim() || 'Unknown Project';

  const assigneeName =
    ticket.a_fullName?.trim() ||
    ticket.assignee?.fullName?.trim() ||
    ticket.assignee?.name?.trim() ||
    'Unassigned';

  const statusLabel =
    ticket.s_label?.trim() ||
    ticket.status?.label?.trim() ||
    ticket.s_key?.trim() ||
    ticket.status?.key?.trim() ||
    ticket.t_statusKey?.trim() ||
    ticket.statusKey?.trim() ||
    'Unknown';

  const priorityLabel =
    ticket.pr_label?.trim() ||
    ticket.priority?.label?.trim() ||
    ticket.pr_key?.trim() ||
    ticket.priority?.key?.trim() ||
    ticket.priorityKey?.trim() ||
    null;

  const dueDate = ticket.t_dueDate ?? ticket.dueDate ?? null;

  const createdAt = ticket.t_createdAt ?? ticket.createdAt ?? '';

  const contactId = ticket.c_id ?? ticket.contact?.id ?? null;
  const contactFullName = ticket.c_fullName ?? ticket.contact?.fullName ?? null;
  const contactPhone = ticket.c_phone ?? ticket.contact?.phone ?? null;

  return {
    id: ticketId,
    ticketRefNo: ticket.t_ticketRefNo ?? ticket.ticketRefNo,
    title: ticket.t_title ?? ticket.title ?? 'Untitled Ticket',
    ticketType: ticket.ticketType ?? null,
    contact:
      contactId && contactPhone
        ? { id: contactId, fullName: contactFullName, phone: contactPhone }
        : null,
    project: {
      id: projectId,
      name: projectName,
      initials: getInitials(projectName),
      brandColor:
        ticket.p_brandColor ?? ticket.project?.brandColor ?? '#31d81b',
    },
    dueDate: dueDate
      ? formatTicketDate(dueDate.split('T')[0] ?? dueDate)
      : '--',
    status: statusLabel,
    statusColor: ticket.s_color ?? ticket.status?.color ?? undefined,
    priority: priorityLabel,
    priorityColor: ticket.pr_color ?? ticket.priority?.color ?? undefined,
    assignee: {
      name: assigneeName,
      initials: getInitials(assigneeName),
    },
    reporter: {
      id: '',
      email: '',
      fullName: 'Unknown',
    },
    date: createdAt ? formatTicketDate(createdAt) : '--',
    sortDate: createdAt,
  };
}

async function fetchDashboardTickets({
  statusKey,
  priorityKey,
  ticketType,
  projectIds,
  contactId,
  dateFrom,
  dateTo,
  reporterId,
  assigneeId,
  search,
  page,
  limit,
}: {
  statusKey?: string;
  priorityKey?: string;
  ticketType?: string;
  projectIds?: string[];
  contactId?: string;
  dateFrom?: string;
  dateTo?: string;
  reporterId?: string;
  assigneeId?: string;
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
  if (ticketType) {
    searchParams.set('ticketType', ticketType);
  }

  projectIds?.forEach((projectId) => {
    if (projectId) {
      searchParams.append('projectIds', projectId);
    }
  });

  if (contactId) {
    searchParams.set('contactId', contactId);
  }

  if (dateFrom) {
    searchParams.set('dateFrom', dateFrom);
  }

  if (dateTo) {
    searchParams.set('dateTo', dateTo);
  }

  if (reporterId) {
    searchParams.set('reporterId', reporterId);
  }

  if (assigneeId) {
    searchParams.set('assigneeId', assigneeId);
  }

  if (search) {
    searchParams.set('search', search);
  }

  const response = await fetch(
    `/api/dashboard/tickets?${searchParams.toString()}`,
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
    summary: payload.summary,
    countPerStatus: payload.countPerStatus ?? {},
    meta: payload.meta,
  };
}

async function fetchDashboardKanbanTicketCounts({
  priorityKey,
  ticketType,
  projectIds,
  search,
}: {
  priorityKey?: string;
  ticketType?: string;
  projectIds?: string[];
  search?: string;
}): Promise<Record<string, number>> {
  const searchParams = new URLSearchParams();

  if (priorityKey) {
    searchParams.set('priorityKey', priorityKey);
  }
  if (ticketType) {
    searchParams.set('ticketType', ticketType);
  }
  if (search) {
    searchParams.set('search', search);
  }

  projectIds?.forEach((projectId) => {
    if (projectId) {
      searchParams.append('projectIds', projectId);
    }
  });

  const response = await fetch(
    `/api/dashboard/kanban-ticket-counts?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | ApiKanbanTicketCountsResponse
    | { message?: string }
    | null;

  if (!response.ok || !payload || !('countPerStatus' in payload)) {
    throw new Error(
      payload && 'message' in payload
        ? payload.message || 'Failed to fetch Kanban counts.'
        : 'Failed to fetch Kanban counts.',
    );
  }

  return payload.countPerStatus;
}

async function fetchDashboardKanbanBoard({
  priorityKey,
  ticketType,
  projectIds,
  search,
  statusKey,
  page = 1,
  limit = KANBAN_PAGE_SIZE,
}: {
  priorityKey?: string;
  ticketType?: string;
  projectIds?: string[];
  search?: string;
  statusKey?: string;
  page?: number;
  limit?: number;
}): Promise<KanbanBoardData> {
  const searchParams = new URLSearchParams({
    limit: String(limit),
  });

  /*
   * Initial request:
   * statusKey aur page send nahi honge.
   *
   * Column pagination:
   * statusKey aur page dono send honge.
   */
  if (statusKey) {
    searchParams.set('statusKey', statusKey);
    searchParams.set('page', String(page));
  }

  if (priorityKey) {
    searchParams.set('priorityKey', priorityKey);
  }
  if (ticketType) {
    searchParams.set('ticketType', ticketType);
  }
  if (search) {
    searchParams.set('search', search);
  }

  projectIds?.forEach((projectId) => {
    if (projectId) {
      searchParams.append('projectIds', projectId);
    }
  });

  const requestUrl = `/api/dashboard/kanban-board?${searchParams.toString()}`;

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? Array.isArray(payload.message)
          ? payload.message.join(', ')
          : String(payload.message || '')
        : '';

    throw new Error(
      message || `Failed to fetch Kanban board (${response.status}).`,
    );
  }

  const responseData =
    payload && typeof payload === 'object' && 'data' in payload
      ? payload.data
      : payload;

  if (
    !responseData ||
    typeof responseData !== 'object' ||
    !('items' in responseData)
  ) {
    console.error('Invalid Kanban board response:', {
      requestUrl,
      statusKey,
      page,
      payload,
    });

    throw new Error('Kanban board returned an invalid response.');
  }

  const kanbanPayload = responseData as ApiKanbanBoardResponse;
  const normalizedItems: Record<string, ApiKanbanBoardTicket[]> = Array.isArray(
    kanbanPayload.items,
  )
    ? {
        [statusKey ?? 'Unknown']: kanbanPayload.items,
      }
    : kanbanPayload.items;

  const mappedItems = Object.fromEntries(
    Object.entries(normalizedItems).map(([currentStatusKey, tickets]) => [
      currentStatusKey,
      Array.isArray(tickets)
        ? tickets.map(mapApiKanbanTicketToRecentTicket)
        : [],
    ]),
  ) as Record<string, RecentTicket[]>;

  const normalizedHasMore: Record<string, boolean> =
    typeof kanbanPayload.hasMore === 'boolean'
      ? {
          [statusKey ?? 'Unknown']: kanbanPayload.hasMore,
        }
      : (kanbanPayload.hasMore ?? {});

  return {
    items: mappedItems,
    hasMore: normalizedHasMore,
    summary: kanbanPayload.summary,
    pageByStatus: Object.fromEntries(
      Object.keys(mappedItems).map((currentStatusKey) => [
        currentStatusKey,
        statusKey ? page : 1,
      ]),
    ),
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

  return payload;
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

type ApiTicketContactOption = {
  id: string;
  fullName: string | null;
  phone: string;
};

async function fetchTicketContactOptions() {
  const response = await fetch('/api/contacts?limit=200', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as {
    items?: ApiTicketContactOption[];
    message?: string;
  } | null;

  if (!response.ok || !Array.isArray(payload?.items)) {
    throw new Error(payload?.message || 'Failed to fetch contacts.');
  }

  return payload.items;
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
        className="inline-block h-2.5 w-2.5 rounded-full"
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

// function isApiDashboardKanbanResponse(
//   value: unknown,
// ): value is ApiDashboardKanbanResponse {
//   return Boolean(
//     value &&
//       typeof value === 'object' &&
//       (value as ApiDashboardKanbanResponse).items &&
//       !Array.isArray((value as ApiDashboardKanbanResponse).items) &&
//       typeof (value as ApiDashboardKanbanResponse).items === 'object',
//   );
// }

function createKanbanTicketSummary(
  tickets: ApiDashboardTicket[],
): TicketSummary {
  return tickets.reduce<{
    open: number;
    inProgress: number;
    resolved: number;
    critical: number;
    closed: number;
  }>(
    (summary, ticket) => {
      switch (ticket.status?.key.toLowerCase()) {
        case 'open':
          summary.open += 1;
          break;
        case 'inprogress':
          summary.inProgress += 1;
          break;
        case 'resolved':
          summary.resolved += 1;
          break;
      }

      if (ticket.priority?.key.toLowerCase() === 'critical') {
        summary.critical += 1;
      }

      return summary;
    },
    { open: 0, inProgress: 0, resolved: 0, critical: 0, closed: 0 },
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
      brandColor: ticket.project?.brandColor ?? '#31d81b',
    },
    dueDate: ticket.dueDate
      ? formatTicketDate(ticket.dueDate.split('T')[0] ?? ticket.dueDate)
      : '--',
    status: statusLabel,
    statusColor: ticket.status?.color,
    priority: priorityLabel,
    ticketType: ticket.ticketType ?? null,
    contact: ticket.contact ?? null,
    priorityColor: ticket.priority?.color,
    assignee: {
      name: assigneeName,
      initials: getInitials(assigneeName),
    },
    reporter: {
      id: ticket.reporter?.id ?? '',
      email: ticket.reporter?.email ?? '',
      fullName: ticket.reporter?.fullName ?? 'Unknown',
    },
    date: formatTicketDate(ticket.createdAt),
    sortDate: ticket.createdAt,
  };
}

function sortTicketsLocally(
  tickets: RecentTicket[],
  sortState: TicketSortState,
) {
  const direction = sortState.sortOrder === 'asc' ? 1 : -1;

  return [...tickets].sort((firstTicket, secondTicket) => {
    if (sortState.sortBy === 'createdAt') {
      const firstDateValue = getTicketSortDateValue(firstTicket);
      const secondDateValue = getTicketSortDateValue(secondTicket);

      return (firstDateValue - secondDateValue) * direction;
    }

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

function getTicketSortDateValue(ticket: RecentTicket) {
  const rawValue = ticket.sortDate ?? ticket.date;
  const parsedValue = new Date(rawValue).getTime();

  if (Number.isNaN(parsedValue)) {
    return 0;
  }

  return parsedValue;
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

function getInitials(value?: string | null) {
  const words = String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return 'NA';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}
function getTicketsViewMode(value: string | null): 'table' | 'kanban' {
  if (value === 'kanban') {
    return 'kanban';
  }

  return 'table';
}

function getTicketsStatusFilterValue(value: string | null) {
  if (!value || !value.trim()) {
    return DEFAULT_TICKETS_STATUS_FILTER;
  }

  return value;
}

function getTicketsFilterValue(value: string | null) {
  if (!value || !value.trim()) {
    return 'all';
  }

  return value;
}

function getTicketsProjectFilterValues(
  values: string[],
  fallbackValue: string | null,
) {
  const sourceValues =
    values.length > 0 ? values : fallbackValue ? [fallbackValue] : [];

  return Array.from(
    new Set(
      sourceValues
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter((value) => value && value !== 'all'),
    ),
  );
}

function formatTicketDate(value: string) {
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  );

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function TableViewIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.25 3.1875C1.93934 3.1875 1.6875 3.43934 1.6875 3.75C1.6875 4.06066 1.93934 4.3125 2.25 4.3125L11.25 4.3125C11.5607 4.3125 11.8125 4.06066 11.8125 3.75C11.8125 3.43934 11.5607 3.1875 11.25 3.1875H2.25Z"
        fill="currentColor"
      />
      <path
        d="M14.25 3.1875C13.9393 3.1875 13.6875 3.43934 13.6875 3.75C13.6875 4.06066 13.9393 4.3125 14.25 4.3125L15.75 4.3125C16.0607 4.3125 16.3125 4.06066 16.3125 3.75C16.3125 3.43934 16.0607 3.1875 15.75 3.1875H14.25Z"
        fill="currentColor"
      />
      <path
        d="M1.6875 9C1.6875 8.68934 1.93934 8.4375 2.25 8.4375L11.25 8.4375C11.5607 8.4375 11.8125 8.68934 11.8125 9C11.8125 9.31066 11.5607 9.5625 11.25 9.5625L2.25 9.5625C1.93934 9.5625 1.6875 9.31066 1.6875 9Z"
        fill="currentColor"
      />
      <path
        d="M14.25 8.4375C13.9393 8.4375 13.6875 8.68934 13.6875 9C13.6875 9.31066 13.9393 9.5625 14.25 9.5625H15.75C16.0607 9.5625 16.3125 9.31066 16.3125 9C16.3125 8.68934 16.0607 8.4375 15.75 8.4375L14.25 8.4375Z"
        fill="currentColor"
      />
      <path
        d="M1.6875 14.25C1.6875 13.9393 1.93934 13.6875 2.25 13.6875L11.25 13.6875C11.5607 13.6875 11.8125 13.9393 11.8125 14.25C11.8125 14.5607 11.5607 14.8125 11.25 14.8125L2.25 14.8125C1.93934 14.8125 1.6875 14.5607 1.6875 14.25Z"
        fill="currentColor"
      />
      <path
        d="M14.25 13.6875C13.9393 13.6875 13.6875 13.9393 13.6875 14.25C13.6875 14.5607 13.9393 14.8125 14.25 14.8125H15.75C16.0607 14.8125 16.3125 14.5607 16.3125 14.25C16.3125 13.9393 16.0607 13.6875 15.75 13.6875H14.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function KanbanViewIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.3125 9.04288V8.95712C1.31249 7.31409 1.31248 6.02358 1.44794 5.01602C1.58676 3.98352 1.87704 3.16433 2.52068 2.52068C3.16433 1.87704 3.98352 1.58676 5.01602 1.44795C6.02358 1.31248 7.31408 1.31249 8.95711 1.3125H9.04287C10.6859 1.31249 11.9764 1.31248 12.984 1.44794C14.0165 1.58676 14.8357 1.87704 15.4793 2.52068C16.123 3.16433 16.4132 3.98352 16.5521 5.01602C16.6875 6.02357 16.6875 7.31408 16.6875 8.9571V9.04287C16.6875 10.6859 16.6875 11.9764 16.5521 12.984C16.4132 14.0165 16.123 14.8357 15.4793 15.4793C14.8357 16.123 14.0165 16.4132 12.984 16.5521C11.9764 16.6875 10.6859 16.6875 9.04288 16.6875H8.95712C7.31409 16.6875 6.02358 16.6875 5.01602 16.5521C3.98352 16.4132 3.16433 16.123 2.52068 15.4793C1.87704 14.8357 1.58676 14.0165 1.44795 12.984C1.31248 11.9764 1.31249 10.6859 1.3125 9.04288ZM2.56291 12.8341C2.68496 13.7418 2.9164 14.284 3.31618 14.6838C3.71596 15.0836 4.25818 15.315 5.16592 15.4371C5.25376 15.4489 5.34424 15.4596 5.4375 15.4693L5.4375 11.8125H2.4755C2.49408 12.1896 2.52174 12.5278 2.56291 12.8341ZM6.5625 11.8125L6.5625 15.5397C7.24559 15.5621 8.04687 15.5625 9 15.5625C9.95313 15.5625 10.7544 15.5621 11.4375 15.5397V11.8125L6.5625 11.8125ZM6.5625 10.6875V7.3125H11.4375L11.4375 10.6875L6.5625 10.6875ZM5.4375 7.3125V10.6875H2.44408C2.43766 10.1839 2.4375 9.62454 2.4375 9C2.4375 8.37546 2.43766 7.81611 2.44408 7.3125H5.4375ZM6.5625 6.1875L11.4375 6.1875V2.46028C10.7544 2.43788 9.95313 2.4375 9 2.4375C8.04687 2.4375 7.24559 2.43788 6.5625 2.46028L6.5625 6.1875ZM5.4375 2.53071L5.4375 6.1875H2.4755C2.49408 5.81041 2.52174 5.47218 2.56291 5.16592C2.68496 4.25818 2.9164 3.71596 3.31618 3.31618C3.71596 2.9164 4.25818 2.68496 5.16592 2.56291C5.25376 2.5511 5.34423 2.5404 5.4375 2.53071ZM12.8341 15.4371C12.7462 15.4489 12.6558 15.4596 12.5625 15.4693V11.8125H15.5245C15.5059 12.1896 15.4783 12.5278 15.4371 12.8341C15.315 13.7418 15.0836 14.284 14.6838 14.6838C14.284 15.0836 13.7418 15.315 12.8341 15.4371ZM15.5559 10.6875H12.5625L12.5625 7.3125H15.5559C15.5623 7.81611 15.5625 8.37546 15.5625 9C15.5625 9.62454 15.5623 10.1839 15.5559 10.6875ZM15.5245 6.1875H12.5625V2.53071C12.6558 2.5404 12.7462 2.5511 12.8341 2.56291C13.7418 2.68496 14.284 2.9164 14.6838 3.31618C15.0836 3.71596 15.315 4.25818 15.4371 5.16592C15.4783 5.47218 15.5059 5.8104 15.5245 6.1875Z"
        fill="currentColor"
      />
    </svg>
  );
}
function getTicketsTypeFilterValue(value: string | null) {
  if (value === 'bug' || value === 'feature_request') {
    return value;
  }

  return 'all';
}
