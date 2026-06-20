'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import StatusCard from '../../../components/dashboard/StatusCard';
import {
  AlertIcon,
  CheckMarkCircleIcon,
  ClockIcon,
  FolderIcon,
  ProfileIcon,
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
import {
  createTicketPriorityOptions,
  createTicketProjectOptions,
} from '../../../components/modals/create-ticket-modal.data';
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
  const projectsQuery = useProjectsQuery(canViewProjectCards || canCreateTicket, {
    limit: 3,
  });
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
        limit: 10,
      }),
    enabled: canViewRecentTickets,
  });
  const updateProjectMutation = useUpdateProjectMutation();
  const deleteProjectMutation = useDeleteProjectMutation();

  const projectOptions = useMemo(
    () => createTicketProjectOptions(projectsQuery.data ?? []),
    [projectsQuery.data],
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
          queryKey: ['dashboard', 'recent-tickets'],
        }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-project-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'ticket-summary'] }),
        queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
      ]);
      appToast.success('Ticket created successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to create ticket.',
      );
      throw error;
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
      await deleteProjectMutation.mutateAsync(projectToDelete.id);
      appToast.success('Project deleted successfully.');
      setProjectToDelete(null);
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to delete project.',
      );
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

  return (
    <div className="space-y-6">
      <PermissionGuard permission="dashboard.view_stats">
        <div className="grid md:grid-cols-4 gap-3 md:gap-5">
          <StatusCard
            icon={
              <FolderIcon
                width={isMobile ? '20' : '24'}
                height={isMobile ? '20' : '24'}
                fill="currentColor"
              />
            }
            title="Open"
            count={formatSummaryCount(ticketSummary?.open)}
          />
          <StatusCard
            icon={
              <ClockIcon
                width={isMobile ? '20' : '24'}
                height={isMobile ? '20' : '24'}
                fill="currentColor"
              />
            }
            title="In Progress"
            count={formatSummaryCount(ticketSummary?.inProgress)}
          />
          <StatusCard
            icon={
              <CheckMarkCircleIcon
                width={isMobile ? '20' : '24'}
                height={isMobile ? '20' : '24'}
                fill="currentColor"
              />
            }
            title="Resolved"
            count={formatSummaryCount(ticketSummary?.resolved)}
          />
          <StatusCard
            icon={
              <AlertIcon
                width={isMobile ? '20' : '24'}
                height={isMobile ? '20' : '24'}
                fill="currentColor"
              />
            }
            title="Critical"
            count={formatSummaryCount(ticketSummary?.critical)}
          />
        </div>
      </PermissionGuard>

      <PermissionGuard permission="dashboard.view_project_cards">
        <div className="space-y-4">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2 md:gap-2.5">
              <ProfileIcon />
              <h2 className="text-base md:text-xl font-semibold text-black">
                Projects
              </h2>
            </div>

            {canViewProjectsList ? (
              <Link
                href={'/projects'}
                className="text-primary font-medium text-base hover:underline underline-offset-2"
              >
                View All
              </Link>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
                      canEditProject ? () => setProjectToEdit(project) : undefined
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

      <div className="grid md:grid-cols-14 gap-4 md:gap-6">
        <PermissionGuard permission="dashboard.view_recent_tickets">
          <div
            className={`space-y-4 ${
              canViewUpcoming ? 'md:col-span-10' : 'md:col-span-14'
            }`}
          >
            <div className="flex items-center gap-2 md:gap-2.5">
              <ClockIcon opacity={0} />
              <h2 className="text-base md:text-xl font-semibold text-black">
                Recent Tickets
              </h2>
            </div>
            <RecentTicketsTable
              tickets={recentTicketsQuery.data?.items ?? []}
              onViewAll={canViewTicketsList ? handleViewAllTickets : undefined}
              onRowClick={
                canViewTicketDetail
                  ? (ticket) =>
                      router.push(
                        `/tickets/${ticket.id}?projectId=${ticket.project.id}`,
                      )
                  : undefined
              }
            />
          </div>
        </PermissionGuard>
        <PermissionGuard permission="dashboard.view_upcoming">
          <div
            className={` ${
              canViewRecentTickets ? 'md:col-span-4' : 'md:col-span-14'
            }`}
          >
            <TicketsTabs tabs={ticketTabs} />
          </div>
        </PermissionGuard>
      </div>

      <CreateTicketModal
        isOpen={createTicketOpen && canCreateTicket}
        onClose={() => setCreateTicketOpen(false)}
        onConfirm={handleCreateTicket}
        projectOptions={projectOptions}
        priorityOptions={createTicketPriorityOptions}
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
  page,
  limit,
}: {
  page: number;
  limit: number;
}): Promise<DashboardTicketsResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

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

function mapApiDashboardTicketToRecentTicket(
  ticket: ApiDashboardTicket,
): RecentTicket {
  const assigneeName =
    ticket.assignee?.fullName ?? ticket.assignee?.name ?? 'Unassigned';
  const statusLabel = ticket.status?.label ?? ticket.status?.key ?? 'Unknown';
  const priorityLabel =
    ticket.priority?.label ?? ticket.priority?.key ?? null;

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
  const words = value
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
