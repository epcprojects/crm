'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import StatusCard from '../../../components/dashboard/StatusCard';
import {
  AlertIcon,
  ChatIcon,
  CheckMarkCircleIcon,
  ClockIcon,
  CloseIcon,
  DownloadIcon,
  FiltersIcon,
  FolderIcon,
  PlusIcon,
  SearchIcon,
  ThreadIcon,
  TicketIcon2,
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
import { getNotificationNavigationPath } from '../../../lib/notification-navigation';

type TicketSummary = {
  open: number | null;
  inProgress: number | null;
  resolved: number | null;
  critical: number | null;
};

type DashboardProjectPanelTabKey = 'projects' | 'activity';

type DashboardActivityItem = {
  id: string;
  actor: string;
  action: string;
  title: string;
  target: string;
  timeLabel: string;
  accentClassName: string;
  entityType?: string;
  actorId?: string;
  ticketId?: string;
  projectId?: string;
};

type ApiDashboardActivityResponse = {
  items?: ApiDashboardActivityItem[];
  total?: number;
  page?: number;
  limit?: number;
};

type ApiDashboardActivityItem = {
  id: string;
  createdAt: string;
  title: string;
  type?: string | null;
  entityType?: string | null;
  projectId?: string | null;
  ticketId?: string | null;
  actor?: {
    fullName?: string | null;
  } | null;
  project?: {
    name?: string | null;
  } | null;
  ticket?: {
    title?: string | null;
    ticketRefNo?: string | null;
  } | null;
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
const TICKETS_PROJECT_QUERY_PARAM = 'project';
const DASHBOARD_TABS_QUERY_PARAM = 'dashboardTab';
const DASHBOARD_ACTIVITY_PAGE_SIZE = 20;
const DASHBOARD_UPCOMING_TICKETS_PAGE_SIZE = 50;
const DASHBOARD_CRITICAL_TICKETS_PAGE_SIZE = 50;

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
  const [projectPanelTab, setProjectPanelTab] =
    useState<DashboardProjectPanelTabKey>('projects');
  const activityScrollContainerRef = useRef<HTMLDivElement | null>(null);
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

  const selectedProjectIds = getTicketsProjectFilterValues(
    searchParams.getAll(TICKETS_PROJECT_QUERY_PARAM),
    searchParams.get(TICKETS_PROJECT_QUERY_PARAM),
  );
  const selectedProjectIdsKey = selectedProjectIds.join(',');

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
      {
        label: 'Active',
        value: 'Active',
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
  const projectFilterOptions = useMemo(
    () =>
      (projectsQuery.data ?? []).map((project) => ({
        label: project.name,
        value: project.id,
      })),
    [projectsQuery.data],
  );
  const ticketSummaryQuery = useQuery({
    queryKey: ['dashboard', 'ticket-summary'],
    queryFn: fetchTicketSummary,
    enabled: canViewStats,
  });
  const activityQuery = useInfiniteQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: ({ pageParam }) =>
      fetchDashboardActivity(
        Number(pageParam ?? 1),
        DASHBOARD_ACTIVITY_PAGE_SIZE,
      ),
    enabled: canViewProjectCards,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const total = lastPage.total ?? 0;
      const page = lastPage.page ?? 1;
      const limit = lastPage.limit ?? DASHBOARD_ACTIVITY_PAGE_SIZE;
      return page * limit < total ? page + 1 : undefined;
    },
  });

  const recentTicketsQuery = useQuery({
    queryKey: [
      'dashboard',
      'recent-tickets',
      searchValue.trim(),
      selectedProjectIdsKey,
      selectedStatus,
      selectedPriority,
    ],

    queryFn: () =>
      fetchDashboardTickets({
        page: 1,
        limit: 20,

        search: searchValue.trim() || undefined,
        projectIds: selectedProjectIds.length ? selectedProjectIds : undefined,

        statusKey: selectedStatus === 'all' ? undefined : selectedStatus,

        priorityKey: selectedPriority === 'all' ? undefined : selectedPriority,
      }),

    enabled: canViewRecentTickets,
  });
  const criticalTicketsQuery = useInfiniteQuery({
    queryKey: ['dashboard', 'critical-tickets'],
    queryFn: ({ pageParam }) =>
      fetchDashboardTickets({
        page: Number(pageParam ?? 1),
        limit: DASHBOARD_CRITICAL_TICKETS_PAGE_SIZE,
        priorityKey: 'Critical',
        statusKey: 'Active',
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
    enabled: canViewUpcoming,
  });
  const upcomingTicketsQuery = useInfiniteQuery({
    queryKey: ['dashboard', 'upcoming'],
    queryFn: ({ pageParam }) =>
      fetchUpcomingTickets(
        Number(pageParam ?? 1),
        DASHBOARD_UPCOMING_TICKETS_PAGE_SIZE,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
    enabled: canViewUpcoming,
  });
  const updateProjectMutation = useUpdateProjectMutation();
  const deleteProjectMutation = useDeleteProjectMutation();

  const projectOptions = useMemo(
    () => createTicketProjectOptions(projectNamesQuery.data ?? []),
    [projectNamesQuery.data],
  );
  const criticalTickets = useMemo(
    () =>
      (criticalTicketsQuery.data?.pages ?? []).flatMap((page) => page.items),
    [criticalTicketsQuery.data?.pages],
  );
  const upcomingTickets = useMemo(
    () =>
      (upcomingTicketsQuery.data?.pages ?? []).flatMap((page) => page.items),
    [upcomingTicketsQuery.data?.pages],
  );

  const dashboardTicketTabs = useMemo<TicketTab[]>(
    () =>
      ticketTabs.map((tab) =>
        tab.key === 'upcoming'
          ? {
              ...tab,
              tickets: upcomingTickets.map(
                mapApiDashboardTicketToTicketListItem,
              ),
            }
          : tab.key === 'critical'
            ? {
                ...tab,
                tickets: criticalTickets.map(mapRecentTicketToTicketListItem),
              }
            : tab,
      ),
    [criticalTickets, upcomingTickets],
  );

  const updateRecentTicketsFilters = ({
    status,
    priority,
    project,
  }: {
    status?: string;
    priority?: string;
    project?: string[];
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    const nextStatus = status ?? selectedStatus;
    const nextPriority = priority ?? selectedPriority;
    const nextProjectIds = project ?? selectedProjectIds;

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

  const invalidateActivityRelated = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['dashboard', 'activity'],
      refetchType: 'all',
    });
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
    const handleNotificationNew = (payload: NotificationItem) => {
      void invalidateActivityRelated();

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
  const dashboardActivityItems = useMemo(
    () => activityQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [activityQuery.data],
  );
  // const displayedProjects = (projectsQuery.data ?? []).slice(0, 0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // const dashboardScrollRef = useRef<HTMLDivElement | null>(null);
  // const upcomingSectionRef = useRef<HTMLDivElement | null>(null);
  // const [isUpcomingSectionPinned, setIsUpcomingSectionPinned] = useState(false);
  // useEffect(() => {
  //   const scrollContainer = dashboardScrollRef.current;
  //   const upcomingSection = upcomingSectionRef.current;

  //   if (!scrollContainer || !upcomingSection) {
  //     return;
  //   }

  //   const updatePinnedState = () => {
  //     if (window.innerWidth >= 1280) {
  //       setIsUpcomingSectionPinned(true);
  //       return;
  //     }

  //     const containerRect = scrollContainer.getBoundingClientRect();
  //     const sectionRect = upcomingSection.getBoundingClientRect();

  //     const hasReachedStickyPosition =
  //       Math.ceil(sectionRect.top) <= Math.ceil(containerRect.top);

  //     setIsUpcomingSectionPinned(hasReachedStickyPosition);
  //   };

  //   updatePinnedState();

  //   scrollContainer.addEventListener('scroll', updatePinnedState, {
  //     passive: true,
  //   });

  //   window.addEventListener('resize', updatePinnedState);

  //   return () => {
  //     scrollContainer.removeEventListener('scroll', updatePinnedState);
  //     window.removeEventListener('resize', updatePinnedState);
  //   };
  // }, []);
  return (
    <div className="xl:py-5 xl:pr-5 px-4 xl:px-0 pt-2 pb-0 z-100 h-full xl:h-dvh relative">
      {/* <div className="bg-white/40 border border-white rounded-3xl p-3 flex flex-row h-full gap-3"> */}
      <div
        // ref={dashboardScrollRef}
        className="flex h-full min-h-0 flex-col gap-3 xl:overflow-hidden  overflow-y-auto overscroll-contain scrollbar-hide xl:rounded-2xl  bg-gray-200 xl:flex-row xl:border xl:border-white xl:bg-white/40 xl:p-3"
      >
        <PermissionGuard permission="dashboard.view_upcoming">
          <div
            // ref={upcomingSectionRef}
            // className={`sticky -top-5 z-20 order-2 h-full min-h-0 flex-none overflow-hidden bg-gray-200 xl:static xl:z-auto xl:order-0 xl:h-full xl:flex-none xl:bg-transparent ${
            //   canViewRecentTickets ? 'xl:w-82.5' : 'xl:flex-1'
            // }`}
            // className={`order-2 min-h-0 flex-1 overflow-hidden xl:order-0 xl:h-full xl:flex-none ${
            //   canViewRecentTickets ? 'xl:w-82.5' : 'xl:flex-1'
            // }`}
            className={`order-2 min-h-0 flex-none overflow-visible xl:order-0 xl:h-full xl:flex-none xl:overflow-hidden ${
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
                hasNextPage={
                  selectedDashboardTab === 'upcoming'
                    ? Boolean(upcomingTicketsQuery.hasNextPage)
                    : selectedDashboardTab === 'critical'
                      ? Boolean(criticalTicketsQuery.hasNextPage)
                      : false
                }
                isFetchingNextPage={
                  selectedDashboardTab === 'upcoming'
                    ? upcomingTicketsQuery.isFetchingNextPage
                    : selectedDashboardTab === 'critical'
                      ? criticalTicketsQuery.isFetchingNextPage
                      : false
                }
                onLoadMore={
                  selectedDashboardTab === 'upcoming'
                    ? () => {
                        void upcomingTicketsQuery.fetchNextPage();
                      }
                    : selectedDashboardTab === 'critical'
                      ? () => {
                          void criticalTicketsQuery.fetchNextPage();
                        }
                      : undefined
                }
                // internalScrollEnabled={isUpcomingSectionPinned}
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
              <div className="flex w-full flex-col justify-between gap-2 xl:gap-6 rounded-[10px] xl:rounded-xl bg-[url('/images/DashboardComponentBgImage.jpg')]  bg-cover bg-center bg-no-repeat p-4 sm:p-5 xl:gap-8.5 xl:p-7.5">
                <div className="flex flex-col items-start gap-2 xl:flex-row xl:gap-6">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <p className="text-2xl text-white font-semibold sm:text-[32px]">
                      <span className="">Good Day</span>, {currentUserName} 👋
                    </p>

                    <p className="text-sm text-gray-100 sm:text-lg">
                      Here's what's happening across your{' '}
                      {displayedProjects.length > 1 ? 'companies' : 'company'}
                    </p>
                  </div>

                  {canCreateTicket ? (
                    <ThemeButton
                      className="shrink-0 rounded-full xl:flex hidden"
                      variant="primaryGradient"
                      icon={<PlusIcon width="20" height="20" />}
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
                        width={isMobile ? '12' : '20'}
                        height={isMobile ? '12' : '20'}
                        fill="white"
                      />
                    }
                  />

                  <StatusCard
                    title="In Progress"
                    count={formatSummaryCount(ticketSummary?.inProgress)}
                    icon={
                      <ClockIcon
                        width={isMobile ? '12' : '20'}
                        height={isMobile ? '12' : '20'}
                        fill="white"
                      />
                    }
                  />

                  <StatusCard
                    title="Resolved"
                    count={formatSummaryCount(ticketSummary?.resolved)}
                    icon={
                      <CheckMarkCircleIcon
                        width={isMobile ? '12' : '20'}
                        height={isMobile ? '12' : '20'}
                        fill="white"
                      />
                    }
                  />

                  <StatusCard
                    title="Critical"
                    count={formatSummaryCount(ticketSummary?.critical)}
                    icon={
                      <AlertIcon
                        width={isMobile ? '12' : '20'}
                        height={isMobile ? '12' : '20'}
                        fill="white"
                      />
                    }
                  />
                </div>
              </div>
            )}
          </PermissionGuard>
          <div className="hidden min-h-0 flex-1 gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
            <PermissionGuard permission="dashboard.view_recent_tickets">
              <div
                className={`bg-white shadow-[0_0_35px_0_rgb(0_0_0/0.04)]  flex flex-1 flex-col min-h-0 gap-3.5 rounded-xl p-3 h-full `}
              >
                <div className="flex flex-row  flex-wrap gap-3 justify-between items-center">
                  <div className="flex items-center flex-wrap gap-3">
                    <div className="flex flex-row gap-2.5 items-center">
                      <p className="text-lg whitespace-nowrap font-bold text-black">
                        Recent Tickets
                      </p>

                      <div className="min-w-7.5 min-h-7.5 py-1 px-2 flex items-center justify-center text-sm text-bright-gray rounded-full bg-gray-100">
                        {recentTicketsQuery.data?.items?.length ?? 0}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 ">
                      <span className="shrink-0">
                        <SearchIcon fill="#374151" />
                      </span>

                      <input
                        type="text"
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Search"
                        className="min-w-0 xl:flex-1 bg-transparent text-base text-gray-700 outline-none placeholder:text-gray-400"
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
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-wrap gap-2">
                      {/* Desktop filters: xl and above */}
                      <ThemeButton
                        className="shrink-0 rounded-full"
                        variant="primaryGradient"
                        icon={<DownloadIcon fill="white" />}
                        onClick={handleExportTickets}
                        disabled={isExportingTickets}
                      >
                        {isExportingTickets ? 'Exporting...' : 'Export Tickets'}
                      </ThemeButton>

                      {/* Compact filters: below xl only */}
                      <Popover as="div" className="relative xl:hidden block ">
                        {({ open }) => (
                          <>
                            <PopoverButton
                              className={`ring text-sm gap-1  hover:bg-linear-to-l from-royal-blue/80  to-crystal-blue/80 hover:text-white  font-semibold bg-white rounded-lg py-2 px-4 flex items-center justify-center ${
                                open ||
                                selectedStatus !== 'Open' ||
                                selectedPriority !== 'all'
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-gray-200 bg-white text-gray-600'
                              }`}
                              aria-label="Open ticket filters"
                            >
                              <FiltersIcon fill="currentColor" />
                              <span>Filter</span>
                            </PopoverButton>

                            <PopoverPanel
                              anchor="bottom end"
                              transition
                              className="z-100 mt-2 flex w-56 origin-top-right flex-col gap-3 overflow-visible! rounded-xl border border-gray-200 bg-white p-3 shadow-[0_14px_44px_rgb(0_0_0/0.14)] outline-none transition duration-150 data-closed:-translate-y-2 data-closed:scale-95 data-closed:opacity-0"
                            >
                              <div className="relative w-full overflow-visible">
                                <Dropdown
                                  options={projectFilterOptions}
                                  isMulti
                                  value={selectedProjectIds}
                                  onChange={(value) =>
                                    updateRecentTicketsFilters({
                                      project: value,
                                    })
                                  }
                                  showSearch={true}
                                  placeholder="All Projects"
                                  maxMenuHeight={150}
                                />
                              </div>{' '}
                              <div className="relative w-full overflow-visible">
                                <Dropdown
                                  options={statusFilterOptions}
                                  value={selectedStatus}
                                  onChange={(value) =>
                                    updateRecentTicketsFilters({
                                      status: value,
                                    })
                                  }
                                  showSearch={true}
                                  placeholder="All Status"
                                  maxMenuHeight={150}
                                />
                              </div>
                              <div className="relative w-full overflow-visible">
                                <Dropdown
                                  options={priorityFilterOptions}
                                  value={selectedPriority}
                                  onChange={(value) =>
                                    updateRecentTicketsFilters({
                                      priority: value,
                                    })
                                  }
                                  showSearch={true}
                                  placeholder="All Priority"
                                  maxMenuHeight={150}
                                />
                              </div>
                              {selectedStatus !== 'all' ||
                              selectedPriority !== 'all' ||
                              selectedProjectIds.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateRecentTicketsFilters({
                                      project: [],
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

                      {/* <button
                        type="button"
                        onClick={() => setFiltersOpen((current) => !current)}
                        className={`flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold ring-1 transition duration-300 hover:bg-linear-to-l hover:from-royal-blue/80 hover:to-crystal-blue/80 hover:text-white ${
                          filtersOpen
                            ? 'bg-primary/5 text-primary ring-primary'
                            : 'bg-white text-gray-600 ring-gray-200'
                        }`}
                        aria-label="Open ticket filters"
                        aria-expanded={filtersOpen}
                        aria-controls="recent-ticket-filters"
                      >
                        <FiltersIcon fill="currentColor" />
                        <span>Filter</span>
                      </button> */}
                      <ThemeButton
                        type="button"
                        variant="secondary"
                        icon={<FiltersIcon fill="currentColor" />}
                        onClick={() => setFiltersOpen((current) => !current)}
                        aria-label="Open ticket filters"
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

                      {canViewTicketsList ? (
                        <div>
                          {/* <button
                            type="button"
                            onClick={handleViewAllTickets}
                            className="ring text-sm hover:ring-transparent text-primary hover:text-white ring-primary  hover:bg-linear-to-l from-royal-blue/80  to-crystal-blue/80 font-semibold bg-white rounded-lg py-2 px-4 flex items-center justify-center"
                          >
                            View All
                          </button> */}
                          <ThemeButton
                            type="button"
                            variant="secondary"
                            onClick={handleViewAllTickets}
                          >
                            View All
                          </ThemeButton>
                        </div>
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
                  {/* <div className="hidden items-center gap-2 xl:flex">
                        <div className="  relative w-full overflow-visible">
                          <Dropdown
                            options={projectFilterOptions}
                            isMulti
                            value={selectedProjectIds}
                            onChange={(value) =>
                              updateRecentTicketsFilters({
                                project: value,
                              })
                            }
                            placeholder="All Projects"
                            maxMenuHeight={150}
                          />
                        </div>{' '}
                        <div className=" w-38">
                          <Dropdown
                            options={statusFilterOptions}
                            value={selectedStatus}
                            onChange={(value) =>
                              updateRecentTicketsFilters({ status: value })
                            }
                            placeholder="All Status"
                          />
                        </div>
                        <div className=" w-38">
                          <Dropdown
                            options={priorityFilterOptions}
                            value={selectedPriority}
                            onChange={(value) =>
                              updateRecentTicketsFilters({ priority: value })
                            }
                            placeholder="All Priority"
                          />
                        </div>
                      </div> */}
                  <div
                    className={`hidden w-full transition-[grid-template-rows,opacity,transform] duration-300 ease-out xl:grid ${
                      filtersOpen
                        ? 'grid-rows-[1fr] translate-y-0 opacity-100'
                        : 'pointer-events-none grid-rows-[0fr] -translate-y-2 opacity-0'
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        id="recent-ticket-filters"
                        className="flex w-full items-center gap-2 pt-1"
                      >
                        <div className="relative w-full overflow-visible">
                          <Dropdown
                            options={projectFilterOptions}
                            isMulti
                            value={selectedProjectIds}
                            showSearch={true}
                            onChange={(value) =>
                              updateRecentTicketsFilters({
                                project: value,
                              })
                            }
                            placeholder="All Projects"
                            maxMenuHeight={150}
                          />
                        </div>

                        <div className="w-full">
                          <Dropdown
                            options={statusFilterOptions}
                            value={selectedStatus}
                            showSearch={true}
                            onChange={(value) =>
                              updateRecentTicketsFilters({
                                status: value,
                              })
                            }
                            placeholder="All Status"
                          />
                        </div>

                        <div className="w-full">
                          <Dropdown
                            options={priorityFilterOptions}
                            value={selectedPriority}
                            showSearch={true}
                            onChange={(value) =>
                              updateRecentTicketsFilters({
                                priority: value,
                              })
                            }
                            placeholder="All Priority"
                          />
                        </div>

                        {/* {selectedProject !== 'all' ||
                        selectedStatus !== 'all' ||
                        selectedPriority !== 'all' ? ( */}
                        <ThemeButton
                          type="button"
                          variant="secondary"
                          size="xs"
                          disabled={
                            selectedProjectIds.length === 0 &&
                            selectedStatus === 'all' &&
                            selectedPriority === 'all'
                          }
                          onClick={() => {
                            updateRecentTicketsFilters({
                              project: [],
                              status: 'all',
                              priority: 'all',
                            });
                          }}
                          className="disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Clear Filters
                        </ThemeButton>
                      </div>
                    </div>
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
              <div className="bg-white relative shadow-[0_0_35px_0_rgb(0_0_0/0.04)] h-full flex-1 overflow-y-auto scrollbar-hide rounded-xl  flex flex-col gap-3.5 pb-4">
                <div className="flex flex-row justify-between items-center sticky w-full  z-10 top-0 px-4 pt-4 bg-white">
                  <div className="flex items-center rounded-full border border-gray-200 w-full bg-gray-50 p-1 shadow-[inset_0_1px_3px_rgba(15,23,42,0.06)]">
                    <button
                      type="button"
                      onClick={() => setProjectPanelTab('projects')}
                      className={`rounded-full px-4 py-1.5 w-full text-sm font-medium transition ${
                        projectPanelTab === 'projects'
                          ? 'bg-white text-gray-950 shadow-[0_0_20px_rgba(15,23,42,0.08)]'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Projects
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectPanelTab('activity')}
                      className={`rounded-full px-4 py-1.5 w-full text-sm font-medium transition ${
                        projectPanelTab === 'activity'
                          ? 'bg-white text-gray-950 shadow-[0_0_20px_rgba(15,23,42,0.08)]'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Activity
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 px-3">
                  {projectPanelTab === 'projects' ? (
                    projectsQuery.isLoading ? (
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
                    )
                  ) : (
                    <div
                      ref={activityScrollContainerRef}
                      onScroll={(event) => {
                        const target = event.currentTarget;
                        const distanceToBottom =
                          target.scrollHeight -
                          target.scrollTop -
                          target.clientHeight;

                        if (
                          distanceToBottom > 80 ||
                          !activityQuery.hasNextPage ||
                          activityQuery.isFetchingNextPage
                        ) {
                          return;
                        }

                        void activityQuery.fetchNextPage();
                      }}
                      className="overflow-y-auto pr-1 scrollbar-thin"
                    >
                      {activityQuery.isLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <DashboardActivityRowSkeleton key={index} />
                        ))
                      ) : dashboardActivityItems.length === 0 ? (
                        <EmptyState
                          imageUrl="/images/NotificationEmptyState.svg"
                          imageAlt="No activity"
                          title="No Activity"
                          description="Activity will appear here as work happens across projects and tickets."
                        />
                      ) : (
                        <>
                          {dashboardActivityItems.map((activityItem) => (
                            <DashboardActivityRow
                              key={activityItem.id}
                              item={activityItem}
                            />
                          ))}
                          {activityQuery.isFetchingNextPage
                            ? Array.from({ length: 2 }).map((_, index) => (
                                <DashboardActivityRowSkeleton
                                  key={`activity-loading-${index}`}
                                />
                              ))
                            : null}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* {projectPanelTab === 'projects' && canViewProjectsList ? (
                  <div className="py-2 pt-1 sticky -bottom-4">
                    <Link
                      href="/projects"
                      className="flex items-center justify-center rounded-xl  bg-white px-4  text-base font-semibold text-primary transition hover:border-transparent hover:bg-linear-to-l  hover:underline underline-offset-2"
                    >
                      View All
                    </Link>
                  </div>
                ) : null} */}
              </div>
            </PermissionGuard>
          </div>
        </div>
        {canCreateTicket ? (
          <button
            type="button"
            onClick={() => setCreateTicketOpen(true)}
            aria-label="Create new ticket"
            className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-l from-royal-blue to-crystal-blue text-white shadow-[0_10px_30px_rgb(48_79_253/0.35)] transition hover:opacity-90 active:scale-95 xl:hidden"
          >
            <PlusIcon fill="#FFFFFF" width="24" height="24" />
          </button>
        ) : null}
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

function DashboardActivityRow({ item }: { item: DashboardActivityItem }) {
  const router = useRouter();
  return (
    <article
      onClick={() => {
        const nextPath = getNotificationNavigationPath(item);

        if (nextPath) {
          router.push(nextPath);
        }
      }}
      className="flex cursor-pointer items-start gap-3 border-b border-gray-200 px-1 py-3 last:border-b-0"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full drop-shadow bg-gray-50 shadow-[0_0_20px_rgba(15,23,42,0.08)]">
        <ActivityEntityIcon item={item} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-6 text-gray-600">
          {/* <span className="font-semibold text-gray-950">{item.actor}</span>{' '} */}
          {/* {item.action}{' '} */}

          <span className="font-semibold text-gray-950">{item.title}</span>
          {/* <span className="font-semibold text-gray-950">{item.title}</span> */}
        </p>
        <p className="mt-1 text-xs text-gray-400">{item.timeLabel}</p>
      </div>
    </article>
  );
}

function ActivityEntityIcon({ item }: { item: DashboardActivityItem }) {
  const iconClassName = item.accentClassName;

  if (item.entityType === 'ticket_reply') {
    return (
      <span className={iconClassName}>
        <ChatIcon fill="#079455" />
      </span>
    );
  }

  if (item.entityType === 'thread_message') {
    return (
      <span className={iconClassName}>
        <ThreadIcon fill="#DC6803" width={18} height={18} />
      </span>
    );
  }

  if (item.entityType === 'project') {
    return <FolderIcon width="18" height="18" fill="#3B82F6" />;
  }

  if (item.entityType === 'ticket') {
    return (
      <span className={iconClassName}>
        <TicketIcon2 />
      </span>
    );
  }

  if (item.entityType === 'event') {
    return (
      <span className={iconClassName}>
        <ClockIcon width="18" height="18" />
      </span>
    );
  }

  return (
    <span className={`text-sm font-semibold ${iconClassName}`}>
      {getInitials(item.actor)}
    </span>
  );
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

function DashboardActivityRowSkeleton() {
  return (
    <div className="flex items-start gap-3 border-b border-gray-200 px-1 py-3 last:border-b-0">
      <div className="h-10 w-10 shrink-0 rounded-full bg-gray-100 shadow-[0_0_20px_rgba(15,23,42,0.06)]" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-4/5 rounded bg-gray-100" />
        <div className="h-3 w-16 rounded bg-gray-50" />
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
    brandColor: string;
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
  reporter: {
    id: string;
    email: string;
    fullName: string;
  };
  dueDate: string;
};

type ApiDashboardTicketsResponse = {
  items: ApiDashboardTicket[];
  meta: DashboardTicketsResponse['meta'];
};

async function fetchUpcomingTickets(
  page = 1,
  limit = DASHBOARD_UPCOMING_TICKETS_PAGE_SIZE,
): Promise<ApiDashboardTicketsResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(
    `/api/dashboard/upcoming?${searchParams.toString()}`,
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
      !isApiDashboardTicketsResponse(payload)
        ? payload?.message || 'Failed to fetch upcoming tickets.'
        : 'Failed to fetch upcoming tickets.',
    );
  }

  return {
    items: payload.items,
    meta: payload.meta,
  };
}

async function fetchDashboardActivity(
  page = 1,
  limit = DASHBOARD_ACTIVITY_PAGE_SIZE,
): Promise<{
  items: DashboardActivityItem[];
  total: number;
  page: number;
  limit: number;
}> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(`/api/activity?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiDashboardActivityResponse
    | { message?: string }
    | null;

  if (!response.ok || !isDashboardActivityResponse(payload)) {
    throw new Error(
      !isDashboardActivityResponse(payload)
        ? payload?.message || 'Failed to fetch activity.'
        : 'Failed to fetch activity.',
    );
  }

  return {
    items: (payload.items ?? []).map(mapApiActivityToDashboardItem),
    total: payload.total ?? 0,
    page: payload.page ?? page,
    limit: payload.limit ?? limit,
  };
}

async function fetchDashboardTickets({
  page,
  limit,
  statusKey,
  priorityKey,
  search,
  projectIds,
}: {
  page: number;
  limit: number;
  statusKey?: string;
  priorityKey?: string;
  search?: string;
  projectIds?: string[];
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
  projectIds?.forEach((projectId) => {
    if (projectId) {
      searchParams.append('projectIds', projectId);
    }
  });

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
    // ownerColor: 'border-red-200 bg-red-50 text-red-700',
    ownerColor: ticket.project?.brandColor
      ? ticket.project.brandColor
      : '#df169c',
    // ownerColor: ticket.project?.brandColor ? `border-[${ticket.project.brandColor}] bg-[${ticket.project.brandColor}30] text-[${ticket.project.brandColor}]` : 'border-purple-200 bg-purple-50 text-purple-700',
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

function mapApiActivityToDashboardItem(
  item: ApiDashboardActivityItem,
): DashboardActivityItem {
  const actor = item.actor?.fullName?.trim() || 'Someone';
  const ticketTitle = item.ticket?.title?.trim();
  const projectName = item.project?.name?.trim();

  return {
    id: item.id,
    actor,
    action: getActivityActionLabel(item.type, item.entityType),
    title: item.title,
    target:
      ticketTitle ||
      projectName ||
      item.ticket?.ticketRefNo?.trim() ||
      'an item',
    timeLabel: formatRelativeTime(item.createdAt),
    accentClassName: getActivityAccentClassName(item.type ?? item.entityType),
    entityType: item.entityType ?? undefined,
    ticketId: item.ticketId ?? undefined,
    projectId: item.projectId ?? undefined,
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
    dueDate: ticket.dueDate
      ? formatTicketDate(ticket.dueDate.split('T')[0] ?? ticket.dueDate)
      : '--',
    sortDate: ticket.createdAt,
    reporter: {
      id: ticket.reporter.id ?? '',
      email: ticket.reporter.email,
      fullName: ticket.reporter.fullName,
    },
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

export function getInitials(value: string) {
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
    return 'Active';
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

function isDashboardActivityResponse(
  payload: ApiDashboardActivityResponse | { message?: string } | null,
): payload is ApiDashboardActivityResponse {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'items' in payload &&
      Array.isArray(payload.items),
  );
}

function getActivityActionLabel(
  type?: string | null,
  entityType?: string | null,
) {
  switch (type) {
    case 'ticket_reply':
      return 'commented on';
    case 'ticket_created':
      return 'created a new ticket';
    case 'ticket_status_changed':
      return 'changed the status of';
    case 'thread_reply':
      return 'replied to a thread in';
    case 'thread_message':
      return 'started a new thread in';
    case 'project_created':
      return 'created project';
    default:
      if (entityType === 'ticket_reply') {
        return 'commented on';
      }

      return 'updated';
  }
}

function getActivityAccentClassName(type?: string | null) {
  switch (type) {
    case 'ticket_reply':
      return 'text-emerald-500';
    case 'ticket_created':
      return 'text-rose-500';
    case 'ticket_status_changed':
      return 'text-blue-500';
    case 'thread_reply':
      return 'text-orange-500';
    case 'thread_message':
      return 'text-violet-500';
    case 'project_created':
      return 'text-fuchsia-500';
    default:
      return 'text-sky-500';
  }
}

function formatRelativeTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `${minutes}m ago`;
  }

  if (diffMs < day) {
    const hours = Math.max(1, Math.floor(diffMs / hour));
    return `${hours}h ago`;
  }

  if (diffMs < day * 2) {
    return 'Yesterday';
  }

  const days = Math.max(1, Math.floor(diffMs / day));
  return `${days}d ago`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
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
