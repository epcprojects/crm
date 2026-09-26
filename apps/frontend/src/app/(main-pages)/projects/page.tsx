'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import CreateProjectModal, {
  type CreateProjectFormValues,
} from '../../../components/modals/CreateProjectModal';
import ConfirmActionModal from '../../../components/modals/ConfirmActionModal';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../components/modals/CreateTicketModal';
import AssignProjectUsersModal from '../../../components/modals/AssignProjectUsersModal';
import ProjectUsersModal, {
  type ProjectUserRecord,
} from '../../../components/modals/ProjectUsersModal';
import { createTicketProjectOptions } from '../../../components/modals/create-ticket-modal.data';
import ProjectCard from '../../../components/projects/ProjectCard';
import { appToast } from '../../../components/toast/AppToast';
import { useAppLoader } from '../../providers/AppLoaderProvider';
import {
  PermissionGuard,
  usePermissions,
} from '../../providers/PermissionProvider';
import { createTicket, toStatusStats } from '../../../lib/tickets';
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useProjectNamesQuery,
  useUpdateProjectMutation,
  useProjectsInfiniteQuery,
  projectsQueryKey,
} from './projects.queries';
import type { ProjectRecord } from './projects.data';
import DashboardSummaryBanner from '../../../components/ui/DashboardSummaryBanner';
import { CloseIcon, PlusIcon, SearchIcon } from '../../../../public/icons';
import ThemeButton from '../../../components/ui/ThemeButton';
import EmptyState from '../../../components/EmptyState';
import { useDebouncedValue } from '../../../components/hooks/useDebouncedValue';
import { eventEmitter } from '../../../lib/event-emitter';
import { NotificationEntityType } from '@epc-crm/types';
import { NotificationItem } from '@epc-crm/interfaces';
import {
  assignProjectUsers,
  fetchAvailableProjectUsers,
  fetchProjectUsers,
  removeProjectUser,
} from '../../../lib/project-users';
// eslint-disable-next-line @nx/enforce-module-boundaries
import DashboardSummaryBannerSkeleton from 'apps/frontend/src/components/ui/DashboardSummaryBannerSkeleton';

type ProjectUsersModalState = {
  projectId: string;
  projectName: string;
  projectInitials: string;
  projectColorHex?: string;
  mode: 'view' | 'assign';
};

const PROJECTS_SEARCH_QUERY_PARAM = 'search';

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const { setLoading } = useAppLoader();
  const { hasPermission } = usePermissions();
  const searchValue = searchParams.get(PROJECTS_SEARCH_QUERY_PARAM) ?? '';
  const setSearchValue = (value: string) => {
    const url = new URL(window.location.href);

    if (value) {
      url.searchParams.set(PROJECTS_SEARCH_QUERY_PARAM, value);
    } else {
      url.searchParams.delete(PROJECTS_SEARCH_QUERY_PARAM);
    }

    // Persist immediately so opening a project before the debounce finishes
    // still preserves the search when navigating back.
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  };
  const debouncedSearchValue = useDebouncedValue(searchValue);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [projectToDelete, setProjectToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<ProjectRecord | null>(
    null,
  );
  const [projectUsersModal, setProjectUsersModal] =
    useState<ProjectUsersModalState | null>(null);
  const [projectUsersSearchValue, setProjectUsersSearchValue] = useState('');
  const debouncedProjectUsersSearchValue = useDebouncedValue(
    projectUsersSearchValue,
  );
  const [
    availableProjectUsersSearchValue,
    setAvailableProjectUsersSearchValue,
  ] = useState('');
  const debouncedAvailableProjectUsersSearchValue = useDebouncedValue(
    availableProjectUsersSearchValue,
  );
  const hasShownLoadError = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const createProjectMutation = useCreateProjectMutation();
  const updateProjectMutation = useUpdateProjectMutation();
  const deleteProjectMutation = useDeleteProjectMutation();
  const canViewProjectList = hasPermission('projects.view_list');
  const canCreateProject = hasPermission('projects.create');
  const canViewProjectDetail = hasPermission('projects.view_detail');
  const canCreateTicket = hasPermission('tickets.create');
  const canEditProject = hasPermission('projects.edit');
  const canDeleteProject = hasPermission('projects.delete');
  const canViewProjectUsers = hasPermission('projects.view_users');
  const canAssignProjectUsers = hasPermission('projects.assign_users');
  const projectsQuery = useProjectsInfiniteQuery(
    canViewProjectList,
    12,
    debouncedSearchValue,
  );
  const projectNamesQuery = useProjectNamesQuery(canCreateTicket);
  const projects = useMemo(
    () => projectsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [projectsQuery.data],
  );
  const projectOptions = useMemo(
    () => createTicketProjectOptions(projectNamesQuery.data ?? []),
    [projectNamesQuery.data],
  );
  const projectUsersQuery = useQuery({
    queryKey: [
      'project-users',
      projectUsersModal?.projectId,
      debouncedProjectUsersSearchValue.trim(),
    ],
    queryFn: () =>
      fetchProjectUsers(
        projectUsersModal!.projectId,
        debouncedProjectUsersSearchValue.trim() || undefined,
      ),
    enabled: Boolean(projectUsersModal?.projectId && canViewProjectUsers),
  });
  const availableProjectUsersQuery = useQuery({
    queryKey: [
      'available-project-users',
      projectUsersModal?.projectId,
      debouncedAvailableProjectUsersSearchValue.trim(),
    ],
    queryFn: () =>
      fetchAvailableProjectUsers(
        projectUsersModal!.projectId,
        debouncedAvailableProjectUsersSearchValue.trim() || undefined,
      ),
    enabled: Boolean(
      projectUsersModal?.projectId &&
        projectUsersModal?.mode === 'assign' &&
        canAssignProjectUsers,
    ),
  });
  const removeProjectUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!projectUsersModal?.projectId) {
        throw new Error('Project is required.');
      }

      return removeProjectUser(projectUsersModal.projectId, userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['project-users', projectUsersModal?.projectId],
      });
      appToast.success('User removed successfully.');
    },
  });
  const assignProjectUsersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      if (!projectUsersModal?.projectId) {
        throw new Error('Project is required.');
      }

      return assignProjectUsers(projectUsersModal.projectId, userIds);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['project-users', projectUsersModal?.projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['available-project-users', projectUsersModal?.projectId],
        }),
      ]);
      appToast.success('Users assigned successfully.');
      setProjectUsersSearchValue('');
    },
  });

  useEffect(() => {
    setHeaderActionOverride(
      canCreateProject ? () => setCreateProjectOpen(true) : null,
    );

    return () => {
      setHeaderActionOverride(null);
    };
  }, [canCreateProject, setHeaderActionOverride]);

  useEffect(() => {
    if (projectsQuery.isError && !hasShownLoadError.current) {
      hasShownLoadError.current = true;
      appToast.error(
        projectsQuery.error instanceof Error
          ? projectsQuery.error.message
          : 'Failed to load projects.',
      );
    }

    if (!projectsQuery.isError) {
      hasShownLoadError.current = false;
    }
  }, [projectsQuery.error, projectsQuery.isError]);

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;

    if (
      !loadMoreElement ||
      !projectsQuery.hasNextPage ||
      projectsQuery.isPlaceholderData
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          projectsQuery.hasNextPage &&
          !projectsQuery.isFetchingNextPage
        ) {
          void projectsQuery.fetchNextPage();
        }
      },
      { rootMargin: '240px' },
    );

    observer.observe(loadMoreElement);

    return () => observer.disconnect();
  }, [
    projectsQuery.fetchNextPage,
    projectsQuery.hasNextPage,
    projectsQuery.isFetchingNextPage,
    projectsQuery.isPlaceholderData,
  ]);

  const handleCreateProject = async (values: CreateProjectFormValues) => {
    try {
      if (projectToEdit) {
        if (!canEditProject) return;
        setLoading(true);
        await updateProjectMutation.mutateAsync({
          projectId: projectToEdit.id,
          values,
        });
        appToast.success('Project updated successfully.');
        setProjectToEdit(null);
        return;
      }

      if (!canCreateProject) return;
      setLoading(true);
      await createProjectMutation.mutateAsync(values);
      appToast.success('Project created successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error
          ? error.message
          : projectToEdit
            ? 'Failed to update project.'
            : 'Failed to create project.',
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (values: CreateTicketFormValues) => {
    try {
      setLoading(true);
      await createTicket({
        projectId: values.project,
        title: values.title,
        description: values.description,
        statusKey: values.status,
        assigneeId: values.assigneeId || undefined,
        ticketType: values.ticketType,
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

  const handleDeleteProject = async () => {
    if (!projectToDelete || !canDeleteProject) {
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
  const handleRemoveProjectUser = async (userId: string) => {
    try {
      await removeProjectUserMutation.mutateAsync(userId);
    } catch (error) {
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to remove project user.',
      );
    }
  };
  const handleAssignProjectUsers = async (userIds: string[]) => {
    try {
      await assignProjectUsersMutation.mutateAsync(userIds);
    } catch (error) {
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to assign project users.',
      );
    }
  };

  const filteredProjects = projects;
  const projectUsers = useMemo<ProjectUserRecord[]>(
    () => projectUsersQuery.data ?? [],
    [projectUsersQuery.data],
  );
  const availableProjectUsers = useMemo<ProjectUserRecord[]>(
    () => availableProjectUsersQuery.data ?? [],
    [availableProjectUsersQuery.data],
  );
  const projectSummary = projectsQuery.data?.pages[0]?.summary;

  const projectSummaryStats = useMemo(
    () => [
      {
        title: 'Total Projects',
        count: projectSummary?.totalProjects ?? 0,
        color: '#F04438',
      },
      {
        title: 'Active Projects',
        count: projectSummary?.activeProjects ?? 0,
        color: '#F79009',
      },
      {
        title: 'Total Leads',
        count: projectSummary?.totalLeads ?? 0,
        color: '#17B26A',
      },
    ],
    [projectSummary],
  );
  const projectStatusStats = useMemo(
    () => toStatusStats(projectSummary),
    [projectSummary],
  );
  const isProjectSummaryLoading =
    canViewProjectList && projectsQuery.isLoading && !projectsQuery.data;

  const invalidateProjectRelated = async () => {
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
  };

  // Event listener
  useEffect(() => {
    const handleNotificationNew = (payload: NotificationItem) => {
      if (payload.entityType === NotificationEntityType.PROJECT) {
        void invalidateProjectRelated();
      }
    };

    eventEmitter.on('notification:new', handleNotificationNew);

    return () => {
      eventEmitter.off('notification:new', handleNotificationNew);
    };
  }, []);

  return (
    <>
      <div className="relative z-100 h-full xl:h-dvh xl:py-5 px-4 xl:px-0 pt-2 pb-0 xl:pr-5">
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain scrollbar-hide xl:overflow-hidden xl:rounded-2xl xl:border xl:border-white xl:bg-white/40 xl:p-3">
          <div className="shrink-0">
            {isProjectSummaryLoading ? (
              <DashboardSummaryBannerSkeleton
                statsCount={4}
                titleWidthClass="w-32"
              />
            ) : (
              <DashboardSummaryBanner
                imageSrc="/images/ProjectsIcon.svg"
                imageAlt="Projects"
                title="Projects"
                stats={projectSummaryStats}
                extraStats={projectStatusStats}
                extraStatsTitle="Leads by status"
              />
            )}
          </div>

          <div className="flex h-auto min-h-0 flex-none flex-col gap-4 overflow-visible rounded-xl bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5 xl:h-full xl:flex-1 xl:overflow-hidden">
            <PermissionGuard
              permission="projects.view_list"
              fallback={
                <div className="flex min-h-80 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
                  You do not have permission to view projects.
                </div>
              }
            >
              <div className="flex min-h-0 flex-none flex-col gap-4 xl:flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 md:max-w-100 md:min-w-80">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">
                        <SearchIcon fill="#374151" />
                      </span>

                      <input
                        type="text"
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
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
                  {/* )} */}

                  {canCreateProject && filteredProjects.length > 0 ? (
                    <ThemeButton
                      className="shrink-0 rounded-full hidden xl:flex"
                      variant="primaryGradient"
                      icon={<PlusIcon width="20" height="20" />}
                      onClick={() => {
                        setProjectToEdit(null);
                        setCreateProjectOpen(true);
                      }}
                    >
                      New Project
                    </ThemeButton>
                  ) : null}
                </div>

                <div className="flex-none overflow-visible pr-1 scrollbar-hide xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain">
                  {projectsQuery.isLoading ||
                  projectsQuery.isPlaceholderData ? (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <ProjectCardSkeleton key={index} />
                      ))}
                    </div>
                  ) : filteredProjects.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ">
                      {filteredProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          id={project.id}
                          initials={project.initials}
                          name={project.name}
                          category={project.category}
                          totalCount={project.totalCount}
                          statusCounts={project.statusCounts}
                          colorHex={project.colorHex}
                          href={
                            canViewProjectDetail
                              ? `/projects/${project.id}`
                              : undefined
                          }
                          onClick={
                            canViewProjectDetail
                              ? () => router.push(`/projects/${project.id}`)
                              : undefined
                          }
                          onAddTicket={
                            canCreateTicket
                              ? () => {
                                  setSelectedProjectId(project.id);
                                  setCreateTicketOpen(true);
                                }
                              : undefined
                          }
                          onEdit={
                            canEditProject
                              ? () => {
                                  setProjectToEdit(project);
                                  setCreateProjectOpen(true);
                                }
                              : undefined
                          }
                          onViewUsers={
                            canViewProjectUsers
                              ? () => {
                                  setProjectUsersSearchValue('');
                                  setAvailableProjectUsersSearchValue('');
                                  setProjectUsersModal({
                                    projectId: project.id,
                                    projectName: project.name,
                                    projectInitials: project.initials,
                                    projectColorHex: project.colorHex,
                                    mode: 'view',
                                  });
                                }
                              : undefined
                          }
                          onAssignUsers={
                            canAssignProjectUsers
                              ? () => {
                                  setProjectUsersSearchValue('');
                                  setAvailableProjectUsersSearchValue('');
                                  setProjectUsersModal({
                                    projectId: project.id,
                                    projectName: project.name,
                                    projectInitials: project.initials,
                                    projectColorHex: project.colorHex,
                                    mode: 'assign',
                                  });
                                }
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
                  ) : (
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
                  )}

                  {projectsQuery.hasNextPage ? (
                    <div ref={loadMoreRef} className="py-6">
                      {projectsQuery.isFetchingNextPage ? (
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <ProjectCardSkeleton key={`next-page-${index}`} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </PermissionGuard>
          </div>
        </div>
        {canCreateProject ? (
          <button
            type="button"
            onClick={() => {
              setProjectToEdit(null);
              setCreateProjectOpen(true);
            }}
            aria-label="Create new project"
            className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-l from-royal-blue to-crystal-blue text-white shadow-[0_10px_30px_rgb(48_79_253/0.35)] transition hover:opacity-90 active:scale-95 xl:hidden"
          >
            <PlusIcon fill="#FFFFFF" width="24" height="24" />
          </button>
        ) : null}
      </div>

      <CreateProjectModal
        isOpen={
          createProjectOpen &&
          (projectToEdit ? canEditProject : canCreateProject)
        }
        onClose={() => {
          setCreateProjectOpen(false);
          setProjectToEdit(null);
        }}
        onConfirm={handleCreateProject}
        initialValues={
          projectToEdit
            ? {
                name: projectToEdit.name,
                category: projectToEdit.category,
                colorHex: projectToEdit.colorHex,
                attachments: [],
              }
            : undefined
        }
        title={projectToEdit ? 'Edit Project' : 'Create Project'}
        confirmLabel={projectToEdit ? 'Update Project' : 'Create Project'}
      />

      <ConfirmActionModal
        isOpen={Boolean(projectToDelete)}
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

      <CreateTicketModal
        isOpen={createTicketOpen && canCreateTicket}
        onClose={() => {
          setCreateTicketOpen(false);
          setSelectedProjectId(null);
        }}
        onConfirm={handleCreateTicket}
        projectOptions={projectOptions}
        preselectedProjectId={selectedProjectId ?? undefined}
        disableProjectSelection={Boolean(selectedProjectId)}
      />

      <ProjectUsersModal
        isOpen={
          Boolean(projectUsersModal) && projectUsersModal?.mode === 'view'
        }
        onClose={() => {
          setProjectUsersModal(null);
          setProjectUsersSearchValue('');
          setAvailableProjectUsersSearchValue('');
        }}
        projectName={projectUsersModal?.projectName ?? 'Project'}
        projectInitials={projectUsersModal?.projectInitials ?? 'PR'}
        projectColorHex={projectUsersModal?.projectColorHex}
        users={projectUsers}
        isLoading={projectUsersQuery.isLoading}
        removingUserId={
          removeProjectUserMutation.isPending
            ? removeProjectUserMutation.variables
            : null
        }
        onSearchChange={setProjectUsersSearchValue}
        onAssignUsers={
          canAssignProjectUsers
            ? () => {
                if (projectUsersModal?.mode !== 'assign') {
                  setAvailableProjectUsersSearchValue('');
                  setProjectUsersModal((current) =>
                    current
                      ? {
                          ...current,
                          mode: 'assign',
                        }
                      : current,
                  );
                }
              }
            : undefined
        }
        onRemoveUser={
          canAssignProjectUsers ? handleRemoveProjectUser : undefined
        }
      />

      <AssignProjectUsersModal
        isOpen={
          Boolean(projectUsersModal) && projectUsersModal?.mode === 'assign'
        }
        onClose={() => {
          setProjectUsersModal(null);
          setAvailableProjectUsersSearchValue('');
        }}
        projectName={projectUsersModal?.projectName ?? 'Project'}
        users={availableProjectUsers}
        isLoading={availableProjectUsersQuery.isLoading}
        isSubmitting={assignProjectUsersMutation.isPending}
        onSearchChange={setAvailableProjectUsersSearchValue}
        onAssign={handleAssignProjectUsers}
      />
    </>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-gray-200 shadow-xs md:rounded-2xl">
      <div className="flex items-start justify-between gap-3 bg-gray-100 px-2.5 py-3.5 md:gap-4 md:px-4 md:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
          <div className="h-9 w-9 shrink-0 rounded-full bg-white shadow-[0_0_35px_0_rgb(0_0_0/0.06)] md:h-10.5 md:w-10.5" />

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-28 max-w-full rounded bg-gray-300" />
            <div className="h-3 w-20 rounded bg-gray-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-200 bg-white p-2.5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex min-w-0 items-center justify-center gap-1.5 px-1 md:gap-2"
          >
            <div
              className={`h-3 rounded bg-gray-200 ${
                index === 2 ? 'w-10' : 'w-8'
              }`}
            />

            <div className="h-4 w-4 shrink-0 rounded-full bg-gray-200 shadow-[0_0_18px_0_rgb(0_0_0/0.08)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
