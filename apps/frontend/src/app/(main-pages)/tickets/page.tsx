'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
} from '../../../components/tables/RecentTicketsTable';
import TicketsKanbanView from '../../../components/tickets/TicketsKanbanView';
import { appToast } from '../../../components/toast/AppToast';
import Dropdown from '../../../components/ui/ThemeDropDown';
import {
  CloseIcon,
  DownloadIcon,
  FiltersIcon,
  PlusIcon,
  SearchIcon,
} from '../../../../public/icons';
import { createTicket } from '../../../lib/tickets';
import {
  projectsQueryKey,
  useProjectNamesQuery,
} from '../projects/projects.queries';
import {
  PermissionGuard,
  usePermissions,
} from '../../providers/PermissionProvider';
import { useAppLoader } from '../../providers/AppLoaderProvider';
import DashboardSummaryBanner from '../../../components/ui/DashboardSummaryBanner';
import ThemeButton from '../../../components/ui/ThemeButton';
import { RecentTicketsTableSkeleton } from '../dashboard/page';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { eventEmitter } from '../../../lib/event-emitter';
import { NotificationItem } from '@harperhelp/interfaces';
import { NotificationEntityType } from '@harperhelp/types';

type TicketSummary = {
  open: number | null;
  inProgress: number | null;
  resolved: number | null;
  critical: number | null;
};

const TICKETS_VIEW_QUERY_PARAM = 'view';
const TICKETS_STATUS_QUERY_PARAM = 'status';
const TICKETS_PRIORITY_QUERY_PARAM = 'priority';
const TICKETS_PROJECT_QUERY_PARAM = 'project';
const DEFAULT_TICKETS_STATUS_FILTER = 'Open';

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { setLoading } = useAppLoader();
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const [isExportingTickets, setIsExportingTickets] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sortState, setSortState] = useState<TicketSortState>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const projectsQuery = useProjectNamesQuery();
  const { hasPermission } = usePermissions();
  const canCreateTicket = hasPermission('tickets.create');
  const canFilterTickets = hasPermission('tickets.filter');
  const canViewTicketDetail = hasPermission('tickets.view_detail');
  const canEditTicketStatus = hasPermission('tickets.edit_status');
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
  const selectedProject = getTicketsFilterValue(
    searchParams.get(TICKETS_PROJECT_QUERY_PARAM),
  );
  // const canViewTickets = hasPermission('tickets.view_list');

  const ticketStatusesQuery = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: fetchTicketStatuses,
    enabled: canFilterTickets,
    // refetchOnMount: true,
  });

  const ticketPrioritiesQuery = useQuery({
    queryKey: ['ticket-priorities'],
    queryFn: fetchTicketPriorities,
    enabled: canFilterTickets,
  });
  // const ticketSummaryQuery = useQuery({
  //   queryKey: ['dashboard', 'ticket-summary'],
  //   queryFn: fetchTicketSummary,
  //   enabled: canViewTickets,
  // });

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
  const ticketSummaryStats = useMemo(
    () => [
      {
        title: 'Open',
        count: ticketsQuery.data?.summary?.open ?? 0,
        color: '#F04438',
      },
      {
        title: 'InProgress',
        count: ticketsQuery.data?.summary?.inProgress ?? 0,
        color: '#F79009',
      },
      {
        title: 'Resolved',
        count: ticketsQuery.data?.summary?.resolved ?? 0,
        color: '#17B26A',
      },
      {
        title: 'Critical',
        count: ticketsQuery.data?.summary?.critical ?? 0,
        color: '#7A5AF8',
      },
    ],
    [ticketsQuery.data],
  );
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
        id: status.id,
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

  const handleExportTickets = async () => {
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

      if (selectedProject !== 'all') {
        exportParams.set('projectId', selectedProject);
        const projectLabel = projectFilterOptions.find(
          (option) => option.value === selectedProject,
        )?.label;
        filenameParts.push(slugify(projectLabel ?? selectedProject));
      }

      const response = await fetch(
        `/api/tickets/export?${exportParams.toString()}`,
        { method: 'GET' },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.message ||
            'No tickets found to export with the current filters.',
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

      appToast.success('Tickets exported successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to export tickets.',
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
        throw new Error('Project id is required to update ticket status.');
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
        throw new Error(data?.message || 'Failed to reorder ticket statuses.');
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
          : 'Failed to reorder ticket statuses.',
      );
    },
    onSuccess: () => {
      appToast.success('Ticket statuses reordered successfully.');
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ticket-statuses'] });
    },
  });

  const handleReorderStatusColumn = (statusId: string, newIndex: number) => {
    if (!canFilterTickets || reorderStatusMutation.isPending) {
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

  const hasActiveTicketFilters =
    Boolean(searchValue.trim()) ||
    selectedStatus !== DEFAULT_TICKETS_STATUS_FILTER ||
    selectedPriority !== 'all' ||
    selectedProject !== 'all';

  const updateTicketsPageFilters = ({
    view,
    status,
    priority,
    project,
  }: {
    view?: 'table' | 'kanban';
    status?: string;
    priority?: string;
    project?: string;
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    const nextViewMode = view ?? viewMode;
    const nextStatus = status ?? selectedStatus;
    const nextPriority = priority ?? selectedPriority;
    const nextProject = project ?? selectedProject;

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

    if (nextProject === 'all') {
      nextSearchParams.delete(TICKETS_PROJECT_QUERY_PARAM);
    } else {
      nextSearchParams.set(TICKETS_PROJECT_QUERY_PARAM, nextProject);
    }

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
    setSearchValue('');
    updateTicketsPageFilters({
      status: DEFAULT_TICKETS_STATUS_FILTER,
      priority: 'all',
      project: 'all',
    });
  };

  const invalidateTicketRelated = async () => {
    await Promise.all([
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
    eventEmitter.on('notification:new', (payload: NotificationItem) => {
      if (payload.entityType === NotificationEntityType.TICKET) {
        invalidateTicketRelated();
      }

      if (payload.entityType === NotificationEntityType.PROJECT) {
        invalideProjectsRelated();
        invalidateTicketRelated();
      }
    });

    return () => {
      eventEmitter.off('notification:new');
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

  return (
    <>
      <div className="relative z-100 h-full xl:h-dvh overflow-hidden xl:py-5 xl:pr-5 px-4 xl:px-0 pt-2 pb-0 py-4">
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden xl:rounded-2xl xl:border xl:border-white xl:bg-white/40 xl:p-3">
          <div className="shrink-0">
            <DashboardSummaryBanner
              imageSrc="/images/TicketsIcon.svg"
              imageAlt="Tickets"
              title="Tickets"
              stats={ticketSummaryStats}
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-white p-3 md:p-4">
            <PermissionGuard
              permission="tickets.view_list"
              fallback={
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                  You do not have permission to view tickets.
                </div>
              }
            >
              <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
                <div className="flex shrink-0 flex-col gap-3 rounded-xl md:flex-row md:items-center md:justify-between">
                  {canFilterTickets ? (
                    <>
                      <div className="flex flex-row gap-3">
                        <div className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 md:max-w-50">
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
                        <Popover as="div" className="relative xl:hidden">
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
                                className="z-100 mt-2 flex w-56 origin-top-right flex-col gap-3 overflow-visible!  rounded-xl border border-gray-200 bg-white p-3 shadow-[0_14px_44px_rgb(0_0_0/0.14)] outline-none transition duration-150 data-closed:-translate-y-2 data-closed:scale-95 data-closed:opacity-0"
                              >
                                <div className="relative w-full overflow-visible">
                                  <Dropdown
                                    options={projectFilterOptions}
                                    value={selectedProject}
                                    onChange={(value) =>
                                      updateTicketsPageFilters({
                                        project: value,
                                      })
                                    }
                                    placeholder="All Projects"
                                    maxMenuHeight={150}
                                  />
                                </div>

                                <div className="relative w-full overflow-visible">
                                  <Dropdown
                                    options={statusFilterOptions}
                                    value={selectedStatus}
                                    onChange={(value) =>
                                      updateTicketsPageFilters({
                                        status: value,
                                      })
                                    }
                                    placeholder="All Status"
                                    maxMenuHeight={150}
                                  />
                                </div>

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
                      </div>

                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <div className="hidden xl:flex  items-center rounded-lg border border-gray-200 bg-white">
                          <button
                            type="button"
                            onClick={() => handleViewModeChange('table')}
                            className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
                              viewMode === 'table'
                                ? 'bg-linear-to-l from-royal-blue/80  to-crystal-blue/80 text-white shadow-sm'
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
                                ? 'bg-linear-to-l from-royal-blue/80  to-crystal-blue/80 text-white shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                            aria-label="Kanban view"
                          >
                            <KanbanViewIcon />
                          </button>
                        </div>

                        <div className="w-full hidden xl:block xl:w-44">
                          <Dropdown
                            options={projectFilterOptions}
                            value={selectedProject}
                            onChange={(value) =>
                              updateTicketsPageFilters({ project: value })
                            }
                            placeholder="All Projects"
                          />
                        </div>

                        {viewMode === 'table' && (
                          <div className="w-full hidden xl:block xl:w-38">
                            <Dropdown
                              options={statusFilterOptions}
                              value={selectedStatus}
                              onChange={(value) =>
                                updateTicketsPageFilters({ status: value })
                              }
                              placeholder="All Status"
                              minHeight="min-h-70"
                              menuScrollable={false}
                            />
                          </div>
                        )}

                        <div className="w-full hidden xl:block xl:w-38">
                          <Dropdown
                            options={priorityFilterOptions}
                            value={selectedPriority}
                            onChange={(value) =>
                              updateTicketsPageFilters({ priority: value })
                            }
                            placeholder="All Priority"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={clearTicketFilters}
                          disabled={!hasActiveTicketFilters}
                          className="hidden h-10 shrink-0 items-center justify-center rounded-full border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 xl:inline-flex"
                        >
                          Clear Filters
                        </button>

                        <div className="flex flex-row gap-3 ">
                          {canCreateTicket ? (
                            <ThemeButton
                              className="rounded-full w-full"
                              variant="primaryGradient"
                              icon={
                                <PlusIcon
                                  fill="#000000"
                                  width="20"
                                  height="20"
                                />
                              }
                              onClick={() => setCreateTicketOpen(true)}
                            >
                              New Ticket
                            </ThemeButton>
                          ) : null}

                          <ThemeButton
                            className="rounded-full w-full"
                            variant="primaryGradient"
                            icon={<DownloadIcon />}
                            onClick={handleExportTickets}
                            disabled={isExportingTickets}
                          >
                            {isExportingTickets
                              ? 'Exporting...'
                              : 'Export Tickets'}
                          </ThemeButton>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                  {ticketsQuery.isLoading ? (
                    <RecentTicketsTableSkeleton />
                  ) : viewMode === 'kanban' ? (
                    <TicketsKanbanView
                      tickets={sortedTickets}
                      statusOptions={kanbanStatusOptions}
                      onTicketClick={
                        canViewTicketDetail ? handleTicketClick : undefined
                      }
                      onMoveTicket={(ticket, nextStatusKey) => {
                        void handleMoveTicket(ticket, nextStatusKey);
                      }}
                      onReorderColumn={handleReorderStatusColumn}
                      canDragTickets={canEditTicketStatus}
                      canDragColumns={canFilterTickets}
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
                      onRowClick={
                        canViewTicketDetail ? handleTicketClick : undefined
                      }
                    />
                  )}
                </div>
              </div>
            </PermissionGuard>
          </div>
        </div>
      </div>

      <CreateTicketModal
        isOpen={createTicketOpen && canCreateTicket}
        onClose={() => setCreateTicketOpen(false)}
        onConfirm={handleCreateTicket}
        projectOptions={projectOptions}
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
  assignee: {
    id?: string;
    fullName?: string;
    name?: string;
  } | null;
};

type ApiDashboardTicketsResponse = {
  items: ApiDashboardTicket[];
  summary: TicketSummary;
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
// async function fetchTicketSummary(): Promise<TicketSummary> {
//   const response = await fetch('/api/dashboard/ticket-summary', {
//     method: 'GET',
//     headers: {
//       Accept: 'application/json',
//     },
//     cache: 'no-store',
//   });

//   const payload = (await response.json().catch(() => null)) as
//     | TicketSummary
//     | { message?: string }
//     | null;

//   if (!response.ok || !isTicketSummary(payload)) {
//     throw new Error(
//       payload && typeof payload === 'object' && 'message' in payload
//         ? payload.message || 'Failed to fetch ticket summary.'
//         : 'Failed to fetch ticket summary.',
//     );
//   }

//   return payload;
// }

// function isTicketSummary(value: unknown): value is TicketSummary {
//   return Boolean(
//     value &&
//     typeof value === 'object' &&
//     'open' in value &&
//     'inProgress' in value &&
//     'resolved' in value &&
//     'critical' in value,
//   );
// }
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
    status: statusLabel,
    statusColor: ticket.status?.color,
    priority: priorityLabel,
    priorityColor: ticket.priority?.color,
    assignee: {
      name: assigneeName,
      initials: getInitials(assigneeName),
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

function KanbanViewIcon() {
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
