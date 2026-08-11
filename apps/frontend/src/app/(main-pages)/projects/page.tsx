'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import CreateProjectModal, {
  type CreateProjectFormValues,
} from '../../../components/modals/CreateProjectModal';
import ConfirmActionModal from '../../../components/modals/ConfirmActionModal';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../components/modals/CreateTicketModal';
import { createTicketProjectOptions } from '../../../components/modals/create-ticket-modal.data';
import ProjectCard from '../../../components/projects/ProjectCard';
import { appToast } from '../../../components/toast/AppToast';
import { useAppLoader } from '../../providers/AppLoaderProvider';
import {
  PermissionGuard,
  usePermissions,
} from '../../providers/PermissionProvider';
import { createTicket } from '../../../lib/tickets';
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
import { eventEmitter } from '../../../lib/event-emitter';
import { NotificationEntityType } from '@harperhelp/types';
import { NotificationItem } from '@harperhelp/interfaces';

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const { setLoading } = useAppLoader();
  const { hasPermission } = usePermissions();
  const [searchValue, setSearchValue] = useState('');
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
  const projectsQuery = useProjectsInfiniteQuery(
    canViewProjectList,
    12,
    searchValue,
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

    if (!loadMoreElement || !projectsQuery.hasNextPage) {
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

  const filteredProjects = projects;
  const projectSummary = projectsQuery.data?.pages[0]?.summary;

  const totalProjects =
    projectsQuery.data?.pages[0]?.meta.total ?? projects.length;

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
        title: 'Open Tickets',
        count: projectSummary?.openTickets ?? 0,
        color: '#17B26A',
      },
      {
        title: 'Critical Issues',
        count: projectSummary?.criticalIssues ?? 0,
        color: '#7A5AF8',
      },
    ],
    [projectSummary],
  );

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
  // const projectsPageScrollRef = useRef<HTMLDivElement | null>(null);
  // const projectsSectionRef = useRef<HTMLDivElement | null>(null);

  // const [isProjectsSectionPinned, setIsProjectsSectionPinned] = useState(false);
  // useEffect(() => {
  //   const scrollContainer = projectsPageScrollRef.current;
  //   const projectsSection = projectsSectionRef.current;

  //   if (!scrollContainer || !projectsSection) {
  //     return;
  //   }

  //   const updatePinnedState = () => {
  //     if (window.innerWidth >= 1280) {
  //       setIsProjectsSectionPinned(true);
  //       return;
  //     }

  //     const containerRect = scrollContainer.getBoundingClientRect();
  //     const sectionRect = projectsSection.getBoundingClientRect();

  //     const hasReachedStickyPosition =
  //       Math.ceil(sectionRect.top) <= Math.ceil(containerRect.top);

  //     setIsProjectsSectionPinned(hasReachedStickyPosition);
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
    <>
      <div className="relative z-100 h-full xl:h-dvh xl:py-5 px-4 xl:px-0 pt-2 pb-0 xl:pr-5">
        <div
          // ref={projectsPageScrollRef}
          className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain scrollbar-hide xl:overflow-hidden xl:rounded-2xl xl:border xl:border-white xl:bg-white/40 xl:p-3"
          // className="flex h-full flex-col gap-3 xl:rounded-2xl xl:border xl:border-white xl:bg-white/40 xl:p-3"
        >
          <div className="shrink-0">
            <DashboardSummaryBanner
              imageSrc="/images/ProjectsIcon.svg"
              imageAlt="Projects"
              title="Projects"
              stats={projectSummaryStats}
            />
          </div>

          <div
            // ref={projectsSectionRef}
            // className="flex min-h-0 flex-1 flex-col gap-4 rounded-xl bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5"
            // className="sticky -top-5 z-20 flex h-full min-h-0 flex-none flex-col gap-4 overflow-hidden rounded-xl bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5 xl:static xl:z-auto xl:flex-1"
            className="flex h-auto min-h-0 flex-none flex-col gap-4 overflow-visible rounded-xl bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5 xl:h-full xl:flex-1 xl:overflow-hidden"
          >
            <PermissionGuard
              permission="projects.view_list"
              fallback={
                <div className="flex min-h-80 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
                  You do not have permission to view projects.
                </div>
              }
            >
              <div
                // className="flex min-h-0 flex-1 flex-col gap-4"
                className="flex min-h-0 flex-none flex-col gap-4 xl:flex-1"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* {filteredProjects.length > 0 && ( */}
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

                <div
                  // className={`min-h-0 flex-1 touch-pan-y pr-1 scrollbar-hide ${
                  //   isProjectsSectionPinned
                  //     ? 'overflow-y-auto overscroll-contain'
                  //     : 'overflow-y-hidden overscroll-auto xl:overflow-y-auto xl:overscroll-contain'
                  // }`}
                  // className="min-h-0 flex-1 overflow-y-auto scrollbar-hide pr-1"
                  className="flex-none overflow-visible pr-1 scrollbar-hide xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain"
                >
                  {projectsQuery.isLoading ? (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <ProjectCardSkeleton key={index} />
                      ))}
                    </div>
                  ) : filteredProjects.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4 ">
                      {filteredProjects.map((project) => (
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
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
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
    </>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-gray-200 shadow-xs md:rounded-2xl">
      {/* Gray header */}
      <div className="flex items-start justify-between gap-3 bg-gray-100 px-2.5 py-3.5 md:gap-4 md:px-4 md:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
          <div className="h-9 w-9 shrink-0 rounded-full bg-white shadow-[0_0_35px_0_rgb(0_0_0/0.06)] md:h-10.5 md:w-10.5" />

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-28 max-w-full rounded bg-gray-300" />
            <div className="h-3 w-20 rounded bg-gray-200" />
          </div>
        </div>
      </div>

      {/* Metrics footer */}
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
