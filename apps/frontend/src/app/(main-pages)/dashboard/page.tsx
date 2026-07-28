'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import StatusCard from '../../../components/dashboard/StatusCard';
import {
  AlertIcon,
  CheckMarkCircleIcon,
  ClockIcon,
  CloseIcon,
  DownloadIcon,
  FiltersIcon,
  FolderIcon,
  PlusIcon,
  SearchIcon,
} from '../../../../public/icons';
import TicketsTabs, {
  type TicketTab,
  type TicketTabKey,
} from '../../../components/dashboard/TicketsTabs';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../components/modals/CreateTicketModal';
import ConfirmActionModal from '../../../components/modals/ConfirmActionModal';
import CreateProjectModal, {
  type CreateProjectFormValues,
} from '../../../components/modals/CreateProjectModal';
import { createTicketProjectOptions } from '../../../components/modals/create-ticket-modal.data';
import ProjectCard from '../../../components/projects/ProjectCard';
import RecentTicketsTable, {
  type RecentTicket,
} from '../../../components/tables/RecentTicketsTable';
import { appToast } from '../../../components/toast/AppToast';
import { createTicket } from '../../../lib/tickets';
import type { ProjectRecord } from '../projects/projects.data';
import {
  useDeleteProjectMutation,
  projectsQueryKey,
  useProjectNamesQuery,
  useProjectsQuery,
  useUpdateProjectMutation,
  useCreateProjectMutation,
} from '../projects/projects.queries';
import { useIsMobile } from '../../../components/hooks/useIsMobile';
import Link from 'next/link';
import {
  PermissionGuard,
  usePermissions,
} from '../../providers/PermissionProvider';
import { useAppLoader } from '../../providers/AppLoaderProvider';
import ThemeButton from '../../../components/ui/ThemeButton';
import { useAppSelector } from '../../Redux/store';
import EmptyState from '../../../components/EmptyState';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import Dropdown from '../../../components/ui/ThemeDropDown';
import { eventEmitter } from '../../../../src/lib/event-emitter';
import { NotificationItem } from '@harperhelp/interfaces';
import { NotificationEntityType } from '@harperhelp/types';

type TicketSummary = {
  open: number | null;
  inProgress: number | null;
  resolved: number | null;
  critical: number | null;
};

const ticketTabs: TicketTab[] = [
  {
    key: 'upcoming',
    label: 'Upcoming',
    tickets: [],
  },
  {
    key: 'critical',
    label: 'Critical',
    tickets: [],
  },
];

type ApiTicketSetting = {
  id: string;
  key: string;
  label: string;
  color: string;
  sortOrder: number;
};

const RECENT_TICKETS_STATUS_QUERY_PARAM = 'status';
const RECENT_TICKETS_PRIORITY_QUERY_PARAM = 'priority';
const DASHBOARD_TABS_QUERY_PARAM = 'dashboardTab';

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const { setLoading } = useAppLoader();
  const { hasPermission } = usePermissions();
  const canViewStats = hasPermission('dashboard.view_stats');
  const canViewProjectCards = hasPermission('dashboard.view_project_cards');
  const canViewUpcoming = hasPermission('dashboard.view_upcoming');
  const canViewRecentTickets = hasPermission('dashboard.view_recent_tickets');
  const canCreateTicket = hasPermission('tickets.create');
  const canViewTicketsList = hasPermission('tickets.view_list');
  const canViewTicketDetail = hasPermission('tickets.view_detail');
  const canViewProjectsList = hasPermission('projects.view_list');
  const canViewProjectDetail = hasPermission('projects.view_detail');
  const canEditProject = hasPermission('projects.edit');
  const canDeleteProject = hasPermission('projects.delete');
  const [searchValue, setSearchValue] = useState('');
  const [isExportingTickets, setIsExportingTickets] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<ProjectRecord | null>(
    null,
  );
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const projectsQuery = useProjectsQuery(
    canViewProjectCards || canCreateTicket,
  );
  const projectNamesQuery = useProjectNamesQuery(canCreateTicket);
  const selectedStatus = getDashboardStatusFilterValue(
    searchParams.get(RECENT_TICKETS_STATUS_QUERY_PARAM),
  );
  const selectedPriority = getDashboardPriorityFilterValue(
    searchParams.get(RECENT_TICKETS_PRIORITY_QUERY_PARAM),
  );
  const selectedDashboardTab = getDashboardTabValue(
    searchParams.get(DASHBOARD_TABS_QUERY_PARAM),
  );

  const ticketStatusesQuery = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: fetchTicketStatuses,
    enabled: canViewRecentTickets,
  });

  const ticketPrioritiesQuery = useQuery({
    queryKey: ['ticket-priorities'],
    queryFn: fetchTicketPriorities,
    enabled: canViewRecentTickets,
  });

  const statusFilterOptions = useMemo(
    () => [
      {
        label: 'All Status',
        value: 'all',
      },
      ...(ticketStatusesQuery.data ?? []).map(mapTicketSettingToDropdownOption),
    ],
    [ticketStatusesQuery.data],
  );

  const priorityFilterOptions = useMemo(
    () => [
      {
        label: 'All Priority',
        value: 'all',
      },
      ...(ticketPrioritiesQuery.data ?? []).map(
        mapTicketSettingToDropdownOption,
      ),
    ],
    [ticketPrioritiesQuery.data],
  );
  const ticketSummaryQuery = useQuery({
    queryKey: ['dashboard', 'ticket-summary'],
    queryFn: fetchTicketSummary,
    enabled: canViewStats,
  });

  const recentTicketsQuery = useQuery({
    queryKey: [
      'dashboard',
      'recent-tickets',
      searchValue.trim(),
      selectedStatus,
      selectedPriority,
    ],

    queryFn: () =>
      fetchDashboardTickets({
        page: 1,
        limit: 20,

        search: searchValue.trim() || undefined,

        statusKey: selectedStatus === 'all' ? undefined : selectedStatus,

        priorityKey: selectedPriority === 'all' ? undefined : selectedPriority,
      }),

    enabled: canViewRecentTickets,
  });
  const criticalTicketsQuery = useQuery({
    queryKey: ['dashboard', 'critical-tickets'],
    queryFn: () =>
      fetchDashboardTickets({
        page: 1,
        limit: 10,
        priorityKey: 'Critical',
      }),
    enabled: canViewUpcoming,
  });
  const upcomingTicketsQuery = useQuery({
    queryKey: ['dashboard', 'upcoming'],
    queryFn: fetchUpcomingTickets,
    enabled: canViewUpcoming,
  });
  const updateProjectMutation = useUpdateProjectMutation();
  const deleteProjectMutation = useDeleteProjectMutation();

  const projectOptions = useMemo(
    () => createTicketProjectOptions(projectNamesQuery.data ?? []),
    [projectNamesQuery.data],
  );
  const dashboardTicketTabs = useMemo<TicketTab[]>(
    () =>
      ticketTabs.map((tab) =>
        tab.key === 'upcoming'
          ? {
              ...tab,
              tickets: (upcomingTicketsQuery.data ?? []).map(
                mapApiDashboardTicketToTicketListItem,
              ),
            }
          : tab.key === 'critical'
            ? {
                ...tab,
                tickets: (criticalTicketsQuery.data?.items ?? []).map(
                  mapRecentTicketToTicketListItem,
                ),
              }
            : tab,
      ),
    [criticalTicketsQuery.data?.items, upcomingTicketsQuery.data],
  );

  const updateRecentTicketsFilters = ({
    status,
    priority,
  }: {
    status?: string;
    priority?: string;
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    const nextStatus = status ?? selectedStatus;
    const nextPriority = priority ?? selectedPriority;

    if (nextStatus === 'Open') {
      nextSearchParams.delete(RECENT_TICKETS_STATUS_QUERY_PARAM);
    } else {
      nextSearchParams.set(RECENT_TICKETS_STATUS_QUERY_PARAM, nextStatus);
    }

    if (nextPriority === 'all') {
      nextSearchParams.delete(RECENT_TICKETS_PRIORITY_QUERY_PARAM);
    } else {
      nextSearchParams.set(RECENT_TICKETS_PRIORITY_QUERY_PARAM, nextPriority);
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

  const updateDashboardTab = (tabKey: TicketTabKey) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (tabKey === 'upcoming') {
      nextSearchParams.delete(DASHBOARD_TABS_QUERY_PARAM);
    } else {
      nextSearchParams.set(DASHBOARD_TABS_QUERY_PARAM, tabKey);
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

      const response = await fetch(
        `/api/dashboard/tickets/export?${exportParams.toString()}`,
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
      link.download = `dashboard_tickets_${
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

  const handleViewAllTickets = () => {
    if (!canViewTicketsList) {
      return;
    }

    router.push('/tickets');
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
      await invalidateTicketRelated();
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

  const handleEditProject = async (values: CreateProjectFormValues) => {
    if (!projectToEdit || !hasPermission('projects.edit')) {
      return;
    }

    try {
      setLoading(true);
      await updateProjectMutation.mutateAsync({
        projectId: projectToEdit.id,
        values,
      });
      appToast.success('Project updated successfully.');
      setProjectToEdit(null);
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to update project.',
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete || !hasPermission('projects.delete')) {
      return;
    }

    try {
      setLoading(true);
      await deleteProjectMutation.mutateAsync(projectToDelete.id);
      appToast.success('Project deleted successfully.');
      setProjectToDelete(null);
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to delete project.',
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

  const isMobile = useIsMobile();
  const ticketSummary = ticketSummaryQuery.data;
  const isStatsLoading = canViewStats && ticketSummaryQuery.isLoading;
  const isRecentTicketsLoading =
    canViewRecentTickets && recentTicketsQuery.isLoading;
  const isUpcomingTicketsLoading =
    canViewUpcoming &&
    (upcomingTicketsQuery.isLoading || criticalTicketsQuery.isLoading);
  const user = useAppSelector((state) => state.auth.user);
  const currentUserName = user?.fullName || 'Admin';
  const canCreateProject = hasPermission('projects.create');
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const createProjectMutation = useCreateProjectMutation();
  const handleCreateProject = async (values: CreateProjectFormValues) => {
    if (!canCreateProject) {
      return;
    }

    try {
      setLoading(true);

      await createProjectMutation.mutateAsync(values);

      appToast.success('Project created successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to create project.',
      );

      throw error;
    } finally {
      setLoading(false);
    }
  };
  const displayedProjects = projectsQuery.data ?? [];
  // const displayedProjects = (projectsQuery.data ?? []).slice(0, 0);
  return (
    <div className="xl:py-5 xl:pr-5 px-4 xl:px-0 pt-2 pb-0 z-100 h-full xl:h-dvh relative">
      {/* <div className="bg-white/40 border border-white rounded-3xl p-3 flex flex-row h-full gap-3"> */}
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden xl:rounded-4xl  bg-gray-200 xl:flex-row xl:border xl:border-white xl:bg-white/40 xl:p-3">
        <PermissionGuard permission="dashboard.view_upcoming">
          <div
            className={`order-2 min-h-0 flex-1 overflow-hidden xl:order-0 xl:h-full xl:flex-none ${
              canViewRecentTickets ? 'xl:w-82.5' : 'xl:flex-1'
            }`}
          >
            {isUpcomingTicketsLoading ? (
              <DashboardTabsSkeleton />
            ) : (
              <TicketsTabs
                tabs={dashboardTicketTabs}
                activeTabKey={selectedDashboardTab}
                onActiveTabChange={updateDashboardTab}
                onTicketClick={
                  canViewTicketDetail
                    ? (ticket) =>
                        router.push(
                          `/tickets/${ticket.id}${
                            ticket.projectId
                              ? `?projectId=${ticket.projectId}`
                              : ''
                          }`,
                        )
                    : undefined
                }
              />
            )}
          </div>
        </PermissionGuard>
        <div className="order-1 flex shrink-0 min-w-0 flex-col gap-3 xl:order-2 xl:min-h-0 xl:flex-1 xl:shrink">
          <PermissionGuard permission="dashboard.view_stats">
            {isStatsLoading ? (
              <DashboardStatsSkeleton />
            ) : (
              <div className="flex w-full flex-col justify-between gap-2 xl:gap-6 rounded-[10px] xl:rounded-[20px] bg-[url('/images/DashboardComponentBgImage.jpg')]  bg-cover bg-center bg-no-repeat p-4 sm:p-5 xl:gap-8.5 xl:p-7.5">
                <div className="flex flex-col items-start gap-2 xl:flex-row xl:gap-6">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <p className="text-2xl text-white font-semibold sm:text-[32px]">
                      <span className="">Good Day</span>, {currentUserName} 👋
                    </p>

                    <p className="text-sm text-gray-100 sm:text-lg">
                      Here's what's happening across your companies
                    </p>
                  </div>

                  {canCreateTicket ? (
                    <ThemeButton
                      className="shrink-0 rounded-full"
                      variant="primaryGradient"
                      icon={<PlusIcon fill="#3889FE" width="20" height="20" />}
                      onClick={() => setCreateTicketOpen(true)}
                    >
                      New Ticket
                    </ThemeButton>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-1.5 xl:grid-cols-4 xl:gap-5">
                  <StatusCard
                    title="Open"
                    count={formatSummaryCount(ticketSummary?.open)}
                    icon={
                      <FolderIcon
                        width={isMobile ? '12' : '24'}
                        height={isMobile ? '12' : '24'}
                        fill="white"
                      />
                    }
                  />

                  <StatusCard
                    title="In Progress"
                    count={formatSummaryCount(ticketSummary?.inProgress)}
                    icon={
                      <ClockIcon
                        width={isMobile ? '12' : '24'}
                        height={isMobile ? '12' : '24'}
                        fill="white"
                      />
                    }
                  />

                  <StatusCard
                    title="Resolved"
                    count={formatSummaryCount(ticketSummary?.resolved)}
                    icon={
                      <CheckMarkCircleIcon
                        width={isMobile ? '12' : '24'}
                        height={isMobile ? '12' : '24'}
                        fill="white"
                      />
                    }
                  />

                  <StatusCard
                    title="Critical"
                    count={formatSummaryCount(ticketSummary?.critical)}
                    icon={
                      <AlertIcon
                        width={isMobile ? '12' : '24'}
                        height={isMobile ? '12' : '24'}
                        fill="white"
                      />
                    }
                  />
                </div>
              </div>
            )}
          </PermissionGuard>
          <div className="hidden min-h-0 flex-1 gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_340px]">
            <PermissionGuard permission="dashboard.view_recent_tickets">
              <div
                className={`bg-white shadow-[0_0_35px_0_rgb(0_0_0/0.04)]  flex flex-1 flex-col min-h-0 gap-3.5 rounded-[20px] p-3 h-full `}
              >
                <div className="flex flex-row  flex-wrap gap-3 justify-between items-center">
                  <div className="flex flex-row gap-2.5 items-center">
                    <p className="text-lg font-bold text-black">
                      Recent Tickets
                    </p>

                    <div className="w-7.5 h-7.5 flex items-center justify-center text-sm text-bright-gray rounded-full bg-gray-100">
                      {recentTicketsQuery.data?.items?.length ?? 0}
                    </div>
                  </div>

                  {/* Compact filters: below xl only */}
                  <Popover as="div" className="relative xl:hidden">
                    {({ open }) => (
                      <>
                        <PopoverButton
                          className={`flex h-10 shrink-0 items-center justify-center gap-1 rounded-lg border px-3 text-xs font-medium outline-none ${
                            open ||
                            selectedStatus !== 'all' ||
                            selectedPriority !== 'all'
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-gray-200 bg-gray-100 text-black-olive'
                          }`}
                          aria-label="Open ticket filters"
                        >
                          <FiltersIcon />
                          <span>Filter</span>
                        </PopoverButton>

                        <PopoverPanel
                          anchor="bottom end"
                          transition
                          className="z-100 mt-2 flex w-56 origin-top-right flex-col gap-3 overflow-visible! rounded-xl border border-gray-200 bg-white p-3 shadow-[0_14px_44px_rgb(0_0_0/0.14)] outline-none transition duration-150 data-closed:-translate-y-2 data-closed:scale-95 data-closed:opacity-0"
                        >
                          <div className="relative w-full overflow-visible">
                            <Dropdown
                              options={statusFilterOptions}
                              value={selectedStatus}
                              onChange={(value) =>
                                updateRecentTicketsFilters({ status: value })
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
                                updateRecentTicketsFilters({ priority: value })
                              }
                              placeholder="All Priority"
                              maxMenuHeight={150}
                            />
                          </div>

                          {selectedStatus !== 'all' ||
                          selectedPriority !== 'all' ? (
                            <button
                              type="button"
                              onClick={() => {
                                updateRecentTicketsFilters({
                                  status: 'all',
                                  priority: 'all',
                                });
                              }}
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                            >
                              Clear Filters
                            </button>
                          ) : null}
                        </PopoverPanel>
                      </>
                    )}
                  </Popover>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 ">
                      <span className="shrink-0">
                        <SearchIcon fill="#374151" />
                      </span>

                      <input
                        type="text"
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Search"
                        className="min-w-0 flex-1 bg-transparent text-base text-gray-700 outline-none placeholder:text-gray-400"
                      />

                      <button
                        type="button"
                        onClick={() => setSearchValue('')}
                        disabled={!searchValue}
                        tabIndex={searchValue ? 0 : -1}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                          searchValue
                            ? 'visible hover:bg-gray-100'
                            : 'invisible pointer-events-none'
                        }`}
                        aria-label="Clear search"
                      >
                        <CloseIcon width="15" height="15" />
                      </button>
                    </div>

                    {/* Desktop filters: xl and above */}
                    <div className="hidden items-center gap-2 xl:flex">
                      <div className="w-38">
                        <Dropdown
                          options={statusFilterOptions}
                          value={selectedStatus}
                          onChange={(value) =>
                            updateRecentTicketsFilters({ status: value })
                          }
                          placeholder="All Status"
                        />
                      </div>

                      <div className="w-38">
                        <Dropdown
                          options={priorityFilterOptions}
                          value={selectedPriority}
                          onChange={(value) =>
                            updateRecentTicketsFilters({ priority: value })
                          }
                          placeholder="All Priority"
                        />
                      </div>
                    </div>
                    <ThemeButton
                      className="shrink-0 rounded-full"
                      variant="primaryGradient"
                      icon={<DownloadIcon />}
                      onClick={handleExportTickets}
                      disabled={isExportingTickets}
                    >
                      {isExportingTickets ? 'Exporting...' : 'Export Tickets'}
                    </ThemeButton>

                    {canViewTicketsList ? (
                      <button
                        type="button"
                        onClick={handleViewAllTickets}
                        className="border text-sm hover:border-transparent text-primary hover:text-white border-primary  hover:bg-linear-to-l from-royal-blue/80  to-crystal-blue/80 font-semibold bg-white rounded-lg py-2 px-4 flex items-center hover:border-l-0 justify-center"
                      >
                        View All
                      </button>
                    ) : null}

                    {/* <button
                      type="button"
                      className="border border-gray-200 bg-gray-100 py-2 px-2.5 rounded-lg flex flex-row items-center gap-0.75"
                    >
                      <FiltersIcon />
                      <p className="text-xs font-medium text-black-olive">
                        Filter
                      </p>
                    </button> */}
                  </div>
                </div>

                {isRecentTicketsLoading ? (
                  <RecentTicketsTableSkeleton />
                ) : (
                  <RecentTicketsTable
                    tickets={recentTicketsQuery.data?.items ?? []}
                    onEmptyButtonClick={
                      canCreateTicket
                        ? () => setCreateTicketOpen(true)
                        : undefined
                    }
                    onViewAll={undefined}
                    onRowClick={
                      canViewTicketDetail
                        ? (ticket) =>
                            router.push(
                              `/tickets/${ticket.id}?projectId=${ticket.project.id}`,
                            )
                        : undefined
                    }
                  />
                )}
              </div>
            </PermissionGuard>
            <PermissionGuard permission="dashboard.view_project_cards">
              <div className="bg-white shadow-[0_0_35px_0_rgb(0_0_0/0.04)] flex-1 overflow-y-auto scrollbar-hide rounded-[20px]  flex flex-col gap-3.5 ">
                <div className="flex flex-row justify-between items-center sticky z-10 top-0 px-4 pt-4 bg-white">
                  <div className="flex flex-row gap-2.5 items-center">
                    <p className="text-black font-bold text-lg">Projects</p>

                    <div className="w-7.5 h-7.5 text-sm text-bright-gray bg-gray-100 rounded-full flex items-center justify-center">
                      {projectsQuery.data?.length ?? 0}
                    </div>
                  </div>

                  {canViewProjectsList ? (
                    <Link
                      href="/projects"
                      className="border text-sm hover:border-transparent text-primary hover:text-white border-primary  hover:bg-linear-to-l from-royal-blue/80  to-crystal-blue/80 font-semibold bg-white rounded-lg py-2.5 px-4 flex items-center hover:border-l-0 justify-center"
                    >
                      View All
                    </Link>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 px-3">
                  {projectsQuery.isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <ProjectCardSkeleton key={index} />
                    ))
                  ) : displayedProjects.length === 0 ? (
                    <EmptyState
                      imageUrl="/images/EmptyProjectIcon.svg"
                      imageAlt="No projects"
                      title="No Projects"
                      description="Projects will appear here once they are created."
                      buttonLabel="New Project"
                      onButtonClick={
                        canCreateProject
                          ? () => {
                              setProjectToEdit(null);
                              setCreateProjectOpen(true);
                            }
                          : undefined
                      }
                    />
                  ) : (
                    displayedProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        id={project.id}
                        initials={project.initials}
                        name={project.name}
                        category={project.category}
                        totalCount={project.totalCount}
                        openCount={project.openCount}
                        criticalCount={project.criticalCount}
                        colorHex={project.colorHex}
                        onClick={
                          canViewProjectDetail
                            ? () => router.push(`/projects/${project.id}`)
                            : undefined
                        }
                        onEdit={
                          canEditProject
                            ? () => setProjectToEdit(project)
                            : undefined
                        }
                        onDelete={
                          canDeleteProject
                            ? () =>
                                setProjectToDelete({
                                  id: project.id,
                                  name: project.name,
                                })
                            : undefined
                        }
                        isDeleting={
                          deleteProjectMutation.isPending &&
                          deleteProjectMutation.variables === project.id
                        }
                      />
                    ))
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
      <CreateProjectModal
        isOpen={createProjectOpen && canCreateProject}
        onClose={() => setCreateProjectOpen(false)}
        onConfirm={handleCreateProject}
        title="Create Project"
        confirmLabel="Create Project"
      />
      <CreateProjectModal
        isOpen={Boolean(projectToEdit) && canEditProject}
        onClose={() => setProjectToEdit(null)}
        onConfirm={handleEditProject}
        initialValues={
          projectToEdit
            ? {
                name: projectToEdit.name,
                category: projectToEdit.category,
                colorHex: projectToEdit.colorHex,
              }
            : undefined
        }
        title="Edit Project"
        confirmLabel="Update Project"
      />

      <ConfirmActionModal
        isOpen={Boolean(projectToDelete) && canDeleteProject}
        onClose={() => setProjectToDelete(null)}
        title="Delete Project?"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold">
              “{projectToDelete?.name ?? 'this project'}”
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        isSubmitting={deleteProjectMutation.isPending}
        onConfirm={handleDeleteProject}
      />
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-gray-200 shadow-xs md:rounded-2xl">
      {/* Project header */}
      <div className="flex items-start justify-between gap-3 bg-gray-100 px-2.5 py-3.5 md:gap-4 md:px-4 md:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
          {/* Project initials */}
          <div className="h-9 w-9 shrink-0 rounded-full bg-white shadow-[0_0_35px_0_rgb(0_0_0/0.06)] md:h-10.5 md:w-10.5" />

          {/* Project name and category */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-32 max-w-full rounded bg-gray-300" />
            <div className="h-2.5 w-20 rounded bg-gray-200" />
          </div>
        </div>
      </div>

      {/* Project metrics */}
      <div className="grid grid-cols-3 divide-x divide-gray-200 bg-white p-2.5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex min-w-0 items-center justify-center gap-1.5 px-1 md:gap-2"
          >
            <div
              className={`h-3 rounded bg-gray-200 ${
                index === 2 ? 'w-11' : 'w-8'
              }`}
            />
            <div className="h-4 w-4 shrink-0 rounded-full bg-gray-200 shadow-[0_0_18px_0_rgb(0_0_0/0.08)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardStatsSkeleton() {
  return (
    <div className="flex w-full animate-pulse flex-col justify-between gap-6 rounded-[10px] bg-[linear-gradient(to_right,#335C94_0%,#665932_25%,#7B398E_50%,#003F89_75%,#070922_100%)] p-4 sm:p-5 xl:gap-8.5 xl:rounded-[20px] xl:p-7.5">
      {/* Header */}
      <div className="flex flex-col items-stretch gap-4 xl:flex-row xl:items-start xl:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="h-7 w-52 max-w-full rounded-lg bg-white/20 sm:w-64 xl:h-9 xl:w-72" />

          <div className="h-4 w-full max-w-80 rounded bg-white/10 xl:h-5 xl:max-w-96" />
        </div>

        {/* New Ticket button */}
        <div className="h-10 w-full shrink-0 rounded-full bg-white/20 xl:w-32" />
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4 xl:gap-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="min-w-0 rounded-xl border border-white/6 px-2 py-2 shadow-[0_14px_44px_0_rgb(0_0_0/20%)] sm:px-3 xl:rounded-full xl:py-2 xl:pr-4 xl:pl-2"
          >
            <div className="flex min-w-0 items-center gap-2 xl:gap-3">
              {/* Icon */}
              <div className="h-9 w-9 shrink-0 rounded-full bg-white/20 sm:h-10 sm:w-10 xl:h-12 xl:w-12" />

              {/* Label and count */}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
                <div
                  className={`h-3 rounded bg-white/15 xl:h-4 ${
                    index === 1 ? 'w-16 xl:w-20' : 'w-11 xl:w-14'
                  }`}
                />

                <div className="h-5 w-7 rounded bg-white/25 xl:h-7 xl:w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecentTicketsTableSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 animate-pulse flex-col overflow-hidden rounded-xl bg-white xl:w-full xl:border xl:border-gray-200"
      aria-hidden="true"
    >
      {/* Mobile skeleton cards */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain scrollbar-hide xl:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="w-full rounded-xl border border-gray-200 bg-white p-3"
          >
            {/* Assignee, status and priority */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200" />

                <div className="min-w-0 space-y-2">
                  <div
                    className={`h-4 rounded bg-gray-200 ${
                      index % 2 === 0 ? 'w-28' : 'w-24'
                    }`}
                  />
                  <div className="h-3 w-16 rounded bg-gray-100" />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div className="h-7 w-16 rounded-full bg-gray-100" />
                <div className="h-7 w-18 rounded-md bg-gray-100" />
              </div>
            </div>

            <div className="my-3 h-px bg-gray-200" />

            {/* Ticket reference and title */}
            <div className="flex items-center gap-3">
              <div className="h-5 w-16 shrink-0 rounded-full bg-gray-100" />

              <div
                className={`h-4 rounded bg-gray-100 ${
                  index % 2 === 0 ? 'w-40' : 'w-32'
                }`}
              />
            </div>

            {/* Project */}
            <div className="mt-2">
              <div className="flex h-7 w-32 items-center gap-2 rounded-full bg-purple-50 p-0.5 pr-3">
                <div className="h-6 w-6 shrink-0 rounded-full bg-white" />
                <div className="h-3 w-20 rounded bg-purple-100" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* XL desktop table skeleton */}
      <div className="hidden min-h-0 flex-1 overflow-hidden xl:block">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-4 rounded bg-gray-200" />
            ))}
          </div>
        </div>

        <div>
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-5 gap-4 border-b border-gray-200 px-4 py-4 last:border-b-0"
            >
              {Array.from({ length: 5 }).map((_, cellIndex) => (
                <div key={cellIndex} className="h-5 rounded bg-gray-100" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardTabsSkeleton() {
  return (
    <div
      className="flex h-full min-w-0 w-full animate-pulse flex-col gap-3 rounded-[10px] bg-white py-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] xl:min-w-81 xl:max-w-81 xl:rounded-[20px] 2xl:min-w-82.5 2xl:max-w-82.5"
      aria-hidden="true"
    >
      {/* Pill-shaped tabs */}
      <div className="shrink-0 px-3 sm:px-4.5">
        <div className="grid w-full grid-cols-2 gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
          <div className="h-7 rounded-full bg-white shadow-[0_0_25px_0_rgb(27_28_29/0.08)]" />

          <div className="h-7 rounded-full bg-gray-100" />
        </div>
      </div>

      {/* Ticket rows */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 scrollbar-hide sm:px-4.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-start gap-3 border-b border-gray-200 py-3 last:border-b-0 sm:py-4"
          >
            {/* Project icon */}
            <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200 shadow-[0_0_35px_0_rgb(0_0_0/0.08)]" />

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {/* Ticket title */}
              <div
                className={`h-3.5 max-w-full rounded bg-gray-200 ${
                  index % 2 === 0 ? 'w-4/5' : 'w-2/3'
                }`}
              />

              {/* Date, owner and tag */}
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                <div className="h-3 w-14 shrink-0 rounded bg-gray-100 sm:w-16" />

                <div className="flex min-w-0 flex-wrap gap-1.5">
                  <div className="h-4.5 w-12 rounded-full bg-gray-100 sm:w-14" />

                  <div className="h-4.5 w-10 rounded-full bg-gray-100 sm:w-12" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function sortTicketSettings(settings: ApiTicketSetting[]) {
  return [...settings].sort(
    (first, second) => first.sortOrder - second.sortOrder,
  );
}

function mapTicketSettingToDropdownOption(setting: ApiTicketSetting) {
  return {
    label: setting.label,
    value: setting.key,
    icon: (
      <span
        className="inline-block h-2.25 w-2.5 rounded-full"
        style={{
          backgroundColor: setting.color,
        }}
      />
    ),
  };
}
async function fetchTicketStatuses(): Promise<ApiTicketSetting[]> {
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

async function fetchTicketPriorities(): Promise<ApiTicketSetting[]> {
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

async function fetchTicketSummary(): Promise<TicketSummary> {
  const response = await fetch('/api/dashboard/ticket-summary', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | TicketSummary
    | { message?: string }
    | null;

  if (!response.ok || !isTicketSummary(payload)) {
    throw new Error(
      !isTicketSummary(payload)
        ? payload?.message || 'Failed to fetch ticket summary.'
        : 'Failed to fetch ticket summary.',
    );
  }

  return payload;
}

function isTicketSummary(value: unknown): value is TicketSummary {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'open' in value &&
      'inProgress' in value &&
      'resolved' in value &&
      'critical' in value,
  );
}

function formatSummaryCount(value: number | null | undefined) {
  return value ?? 0;
}

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
  } | null;
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

async function fetchUpcomingTickets(): Promise<ApiDashboardTicket[]> {
  const response = await fetch('/api/dashboard/upcoming', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiDashboardTicket[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch upcoming tickets.'
        : 'Failed to fetch upcoming tickets.',
    );
  }

  return payload;
}

async function fetchDashboardTickets({
  page,
  limit,
  statusKey,
  priorityKey,
  search,
}: {
  page: number;
  limit: number;
  statusKey?: string;
  priorityKey?: string;
  search?: string;
}): Promise<DashboardTicketsResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (priorityKey) {
    searchParams.set('priorityKey', priorityKey);
  }

  if (search) {
    searchParams.set('search', search);
  }
  if (statusKey) {
    searchParams.set('statusKey', statusKey);
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
        ? payload.message || 'Failed to fetch recent tickets.'
        : 'Failed to fetch recent tickets.',
    );
  }

  return {
    items: payload.items.map(mapApiDashboardTicketToRecentTicket),
    meta: payload.meta,
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

function mapApiDashboardTicketToTicketListItem(
  ticket: ApiDashboardTicket,
): TicketTab['tickets'][number] {
  const projectName = ticket.project?.name ?? 'No Project';
  const priorityLabel =
    ticket.priority?.label ?? ticket.priority?.key ?? 'No Priority';

  return {
    id: ticket.id,
    projectId: ticket.project?.id,
    title: ticket.title,
    date: formatTicketDate(ticket.createdAt),
    owner: projectName,
    ownerColor: 'border-purple-200 bg-purple-50 text-purple-700',
    tag: priorityLabel,
    tagClassName: getPriorityTagClassName(priorityLabel),
    icon: getInitials(projectName),
    iconClassName: 'border-purple-200 bg-purple-50 text-purple-700',
  };
}

function mapRecentTicketToTicketListItem(
  ticket: RecentTicket,
): TicketTab['tickets'][number] {
  const priorityLabel = ticket.priority ?? 'No Priority';

  return {
    id: ticket.id,
    projectId: ticket.project.id,
    title: ticket.title,
    date: ticket.date,
    owner: ticket.project.name,
    ownerColor: 'border-purple-200 bg-purple-50 text-purple-700',
    tag: priorityLabel,
    tagClassName: getPriorityTagClassName(priorityLabel),
    icon: ticket.project.initials,
    iconClassName: 'border-purple-200 bg-purple-50 text-purple-700',
  };
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
      id: ticket.project?.id,
      name: ticket.project?.name ?? 'No Project',
      initials: getInitials(ticket.project?.name ?? 'No Project'),
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

function getPriorityTagClassName(priority: string) {
  const normalizedPriority = priority.trim().toLowerCase();

  if (normalizedPriority === 'critical') {
    return 'border-red-200 bg-red-50 text-red-600';
  }

  if (normalizedPriority === 'high') {
    return 'border-orange-200 bg-orange-50 text-orange-600';
  }

  if (normalizedPriority === 'medium') {
    return 'border-sky-200 bg-sky-50 text-sky-600';
  }

  if (normalizedPriority === 'low') {
    return 'border-green-200 bg-green-50 text-green-600';
  }

  return 'border-gray-200 bg-gray-50 text-gray-600';
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

function getDashboardStatusFilterValue(value: string | null) {
  if (!value || !value.trim()) {
    return 'Open';
  }

  return value;
}

function getDashboardPriorityFilterValue(value: string | null) {
  if (!value || !value.trim()) {
    return 'all';
  }

  return value;
}

function getDashboardTabValue(value: string | null): TicketTabKey {
  if (value === 'critical') {
    return 'critical';
  }

  return 'upcoming';
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
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
