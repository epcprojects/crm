'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import StatusCard from '../../../components/dashboard/StatusCard';
import {
  AlertIcon,
  CheckMarkCircleIcon,
  ClockIcon,
  FiltersIcon,
  FolderIcon,
  PlusIcon,
  ProfileIcon,
  SearchIcon,
} from '../../../../public/icons';
import TicketsTabs, {
  type TicketTab,
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
  useProjectsQuery,
  useUpdateProjectMutation,
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

export default function Page() {
  const router = useRouter();
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
    {
      limit: 3,
    },
  );
  const ticketSummaryQuery = useQuery({
    queryKey: ['dashboard', 'ticket-summary'],
    queryFn: fetchTicketSummary,
    enabled: canViewStats,
  });
  const recentTicketsQuery = useQuery({
    queryKey: ['dashboard', 'recent-tickets'],
    queryFn: () =>
      fetchDashboardTickets({
        page: 1,
        limit: 20,
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
    () => createTicketProjectOptions(projectsQuery.data ?? []),
    [projectsQuery.data],
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

  const handleViewAllTickets = () => {
    if (!canViewTicketsList) {
      return;
    }

    router.push('/tickets');
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
  return (
    <div className="py-5 pr-5 z-100 h-dvh relative">
      <div className="bg-white/40 border border-white rounded-4xl p-3 flex flex-row h-full gap-3">
        <PermissionGuard permission="dashboard.view_upcoming">
          <div
            className={` ${
              canViewRecentTickets ? 'md:col-span-4' : 'md:col-span-14'
            }`}
          >
            {isUpcomingTicketsLoading ? (
              <DashboardTabsSkeleton />
            ) : (
              <TicketsTabs
                tabs={dashboardTicketTabs}
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
        <div className="flex flex-col gap-3 flex-1">
          <PermissionGuard permission="dashboard.view_stats">
            {isStatsLoading ? (
              <DashboardStatsSkeleton />
            ) : (
              <div className="bg-[url('/images/DashboardComponentBgImage.jpg')] w-full bg-center bg-no-repeat bg-cover h-56 rounded-[20px] p-7.5 bg-black/30 flex flex-col justify-between">
                <div className="flex flex-row gap-6 items-start">
                  <div className="flex flex-col flex-1 gap-1.5">
                    <p className="text-[32px] text-white">
                      <span className="font-bold">Good day</span>,{' '}
                      {currentUserName} 👋
                    </p>

                    <p className="text-lg text-gray-100">
                      Here's what's happening across your companies
                    </p>
                  </div>

                  {canCreateTicket ? (
                    <ThemeButton
                      className="rounded-full"
                      variant="primaryGradient"
                      icon={<PlusIcon fill="#3889FE" width="20" height="20" />}
                      onClick={() => setCreateTicketOpen(true)}
                    >
                      New Ticket
                    </ThemeButton>
                  ) : null}
                </div>

                <div className="grid grid-cols-4 gap-5">
                  <StatusCard
                    title="Open"
                    count={formatSummaryCount(ticketSummary?.open)}
                    icon={
                      <FolderIcon
                        width={isMobile ? '20' : '24'}
                        height={isMobile ? '20' : '24'}
                        fill="white"
                      />
                    }
                  />

                  <StatusCard
                    title="In Progress"
                    count={formatSummaryCount(ticketSummary?.inProgress)}
                    icon={
                      <ClockIcon
                        width={isMobile ? '20' : '24'}
                        height={isMobile ? '20' : '24'}
                        fill="white"
                      />
                    }
                  />

                  <StatusCard
                    title="Resolved"
                    count={formatSummaryCount(ticketSummary?.resolved)}
                    icon={
                      <CheckMarkCircleIcon
                        width={isMobile ? '20' : '24'}
                        height={isMobile ? '20' : '24'}
                        fill="white"
                      />
                    }
                  />

                  <StatusCard
                    title="Critical"
                    count={formatSummaryCount(ticketSummary?.critical)}
                    icon={
                      <AlertIcon
                        width={isMobile ? '20' : '24'}
                        height={isMobile ? '20' : '24'}
                        fill="white"
                      />
                    }
                  />
                </div>
              </div>
            )}
          </PermissionGuard>
          <div className="flex min-h-0 flex-1 flex-row gap-3">
            <PermissionGuard permission="dashboard.view_recent_tickets">
              <div
                className={`bg-white shadow-[0_0_35px_0_rgb(0_0_0/0.04)] flex flex-1 flex-col min-h-0 gap-3.5 rounded-[20px] p-3 h-full `}
              >
                <div className="flex flex-row justify-between items-center">
                  <div className="flex flex-row gap-2.5 items-center">
                    <p className="text-lg font-medium text-black">
                      Recent Tickets
                    </p>

                    <div className="w-7.5 h-7.5 flex items-center justify-center text-sm text-bright-gray rounded-full bg-gray-100">
                      {recentTicketsQuery.data?.items?.length ?? 0}
                    </div>
                  </div>

                  <div className="flex flex-row gap-2">
                    <div className="border border-gray-200 bg-white py-2 px-2.5 flex items-center gap-2 justify-between flex-row rounded-lg">
                      <SearchIcon fill="#374151" />
                      <input
                        placeholder="Search"
                        className="placeholder:text-gray-400 text-sm text-gray-700 outline-none"
                      />
                    </div>

                    {canViewTicketsList ? (
                      <button
                        type="button"
                        onClick={handleViewAllTickets}
                        className="border text-xs font-medium text-black-olive border-gray-200 bg-white rounded-lg py-2 px-2.5 flex items-center justify-center"
                      >
                        View All
                      </button>
                    ) : null}

                    <button
                      type="button"
                      className="border border-gray-200 bg-gray-100 py-2 px-2.5 rounded-lg flex flex-row items-center gap-0.75"
                    >
                      <FiltersIcon />
                      <p className="text-xs font-medium text-black-olive">
                        Filter
                      </p>
                    </button>
                  </div>
                </div>

                {isRecentTicketsLoading ? (
                  <RecentTicketsTableSkeleton />
                ) : (
                  <RecentTicketsTable
                    tickets={recentTicketsQuery.data?.items ?? []}
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
              <div className="bg-white shadow-[0_0_35px_0_rgb(0_0_0/0.04)] rounded-[20px] p-3 flex flex-col gap-3.5 w-[320px]">
                <div className="flex flex-row justify-between items-center">
                  <div className="flex flex-row gap-2.5 items-center">
                    <p className="text-black font-medium text-lg">Projects</p>

                    <div className="w-7.5 h-7.5 text-sm text-bright-gray bg-gray-100 rounded-full flex items-center justify-center">
                      {projectsQuery.data?.length ?? 0}
                    </div>
                  </div>

                  {canViewProjectsList ? (
                    <Link
                      href="/projects"
                      className="bg-white border border-soft-peach py-2 px-2.5 rounded-lg flex items-center justify-center text-xs font-medium text-black-olive"
                    >
                      View All
                    </Link>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 ">
                  {projectsQuery.isLoading
                    ? Array.from({ length: 3 }).map((_, index) => (
                        <ProjectCardSkeleton key={index} />
                      ))
                    : (projectsQuery.data ?? []).map((project) => (
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
                      ))}
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
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-2.5 shadow-xs md:rounded-2xl md:p-4">
      <div className="flex items-center gap-3 md:gap-4">
        <div className="h-9 w-9 rounded-full bg-gray-200 md:h-10.5 md:w-10.5" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-100" />
        </div>
      </div>

      <div className="my-3 h-px bg-gray-200 md:my-4" />

      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-full bg-gray-50 px-3 py-1.5"
          >
            <div className="h-3 w-10 rounded bg-gray-200" />
            <div className="h-5 w-6 rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardStatsSkeleton() {
  return (
    <div className="grid md:grid-cols-4 gap-3 md:gap-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3.5 md:rounded-2xl md:px-5 md:py-6"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-10 w-10 rounded-full bg-gray-200 md:h-12 md:w-12" />
            <div className="space-y-2">
              <div className="h-6 w-14 rounded bg-gray-200 md:h-7 md:w-16" />
              <div className="h-3 w-20 rounded bg-gray-200 md:w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentTicketsTableSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-4 md:px-6">
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-4 rounded bg-gray-200" />
          ))}
        </div>
      </div>
      <div className="space-y-0">
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-5 gap-4 border-b border-gray-100 px-4 py-4 last:border-b-0 md:px-6"
          >
            {Array.from({ length: 5 }).map((_, cellIndex) => (
              <div key={cellIndex} className="h-5 rounded bg-gray-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardTabsSkeleton() {
  return (
    <div className="w-[calc(100dvw-32px)] space-y-2 rounded-xl bg-white sm:w-full">
      <div className="flex border-b border-gray-200">
        <div className="h-9 w-1/2 animate-pulse rounded-tl bg-gray-100" />
        <div className="h-9 w-1/2 animate-pulse rounded-tr bg-gray-50" />
      </div>
      <div className="space-y-3 rounded-xl border border-gray-200 px-4 py-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-b-0"
          >
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-3 w-full rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
  priorityKey,
}: {
  page: number;
  limit: number;
  priorityKey?: string;
}): Promise<DashboardTicketsResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (priorityKey) {
    searchParams.set('priorityKey', priorityKey);
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

function formatTicketDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
