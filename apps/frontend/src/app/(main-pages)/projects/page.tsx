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
  useUpdateProjectMutation,
  useProjectsInfiniteQuery,
  projectsQueryKey,
} from './projects.queries';
import type { ProjectRecord } from './projects.data';
import DashboardSummaryBanner from '../../../components/ui/DashboardSummaryBanner';
import { PlusIcon, SearchIcon } from '../../../../public/icons';
import ThemeButton from '../../../components/ui/ThemeButton';
import EmptyState from '../../../components/EmptyState';

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const { setLoading } = useAppLoader();
  const { hasPermission } = usePermissions();
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
  const projectsQuery = useProjectsInfiniteQuery(canViewProjectList, 12);
  const projects = useMemo(
    () => projectsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [projectsQuery.data],
  );
  const projectOptions = useMemo(
    () => createTicketProjectOptions(projects),
    [projects],
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
  const [searchValue, setSearchValue] = useState('');

  const filteredProjects = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    if (!search) {
      return projects;
    }

    return projects.filter((project) =>
      [project.name, project.category, project.initials].some((value) =>
        value.toLowerCase().includes(search),
      ),
    );
  }, [projects, searchValue]);
  const totalProjects =
    projectsQuery.data?.pages[0]?.meta.total ?? projects.length;

  const projectSummaryStats = useMemo(
    () => [
      {
        title: 'Total Projects',
        count: totalProjects,
        color: '#F04438',
      },
      {
        title: 'Active Projects',
        count: totalProjects,
        color: '#F79009',
      },
      {
        title: 'Open Tickets',
        count: projects.reduce(
          (total, project) => total + project.openCount,
          0,
        ),
        color: '#17B26A',
      },
      {
        title: 'Critical Issues',
        count: projects.reduce(
          (total, project) => total + project.criticalCount,
          0,
        ),
        color: '#7A5AF8',
      },
    ],
    [projects, totalProjects],
  );

  return (
    <>
      <div className="relative z-100 h-dvh py-5 pr-5">
        <div className="flex h-full flex-col gap-3 rounded-3xl border border-white bg-white/40 p-3">
          <DashboardSummaryBanner
            imageSrc="/images/ProjectsIcon.svg"
            imageAlt="Projects"
            title="Projects"
            stats={projectSummaryStats}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-[20px] bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5">
            <PermissionGuard
              permission="projects.view_list"
              fallback={
                <div className="flex min-h-80 flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
                  You do not have permission to view projects.
                </div>
              }
            >
              <div className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 sm:max-w-50">
                    <div className="flex items-center gap-2">
                      <SearchIcon fill="#374151" />

                      <input
                        type="text"
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Search"
                        className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {canCreateProject ? (
                    <ThemeButton
                      className="shrink-0 rounded-full"
                      variant="primaryGradient"
                      icon={<PlusIcon fill="#3889FE" width="20" height="20" />}
                      onClick={() => {
                        setProjectToEdit(null);
                        setCreateProjectOpen(true);
                      }}
                    >
                      New Project
                    </ThemeButton>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  {projectsQuery.isLoading ? (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <ProjectCardSkeleton key={index} />
                      ))}
                    </div>
                  ) : filteredProjects.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
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
    // <div className="">
    //   <PermissionGuard
    //     permission="projects.view_list"
    //     fallback={
    //       <div className="flex min-h-80 items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
    //         You do not have permission to view projects.
    //       </div>
    //     }
    //   >
    //     <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    //       {projectsQuery.isLoading
    //         ? Array.from({ length: 6 }).map((_, index) => (
    //             <ProjectCardSkeleton key={index} />
    //           ))
    //         : projects.map((project) => (
    //             <ProjectCard
    //               key={project.id}
    //               id={project.id}
    //               initials={project.initials}
    //               name={project.name}
    //               category={project.category}
    //               totalCount={project.totalCount}
    //               openCount={project.openCount}
    //               criticalCount={project.criticalCount}
    //               colorHex={project.colorHex}
    //               onClick={
    //                 canViewProjectDetail
    //                   ? () => router.push(`/projects/${project.id}`)
    //                   : undefined
    //               }
    //               onAddTicket={
    //                 canCreateTicket
    //                   ? () => {
    //                       setSelectedProjectId(project.id);
    //                       setCreateTicketOpen(true);
    //                     }
    //                   : undefined
    //               }
    //               onEdit={
    //                 canEditProject
    //                   ? () => {
    //                       setProjectToEdit(project);
    //                       setCreateProjectOpen(true);
    //                     }
    //                   : undefined
    //               }
    //               onDelete={
    //                 canDeleteProject
    //                   ? () =>
    //                       setProjectToDelete({
    //                         id: project.id,
    //                         name: project.name,
    //                       })
    //                   : undefined
    //               }
    //               isDeleting={
    //                 deleteProjectMutation.isPending &&
    //                 deleteProjectMutation.variables === project.id
    //               }
    //             />
    //           ))}
    //     </div>
    //     {projectsQuery.hasNextPage ? (
    //       <div ref={loadMoreRef} className="py-6">
    //         {projectsQuery.isFetchingNextPage ? (
    //           <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    //             {Array.from({ length: 3 }).map((_, index) => (
    //               <ProjectCardSkeleton key={`next-page-${index}`} />
    //             ))}
    //           </div>
    //         ) : null}
    //       </div>
    //     ) : null}
    //   </PermissionGuard>

    //   <CreateProjectModal
    //     isOpen={
    //       createProjectOpen &&
    //       (projectToEdit ? canEditProject : canCreateProject)
    //     }
    //     onClose={() => {
    //       setCreateProjectOpen(false);
    //       setProjectToEdit(null);
    //     }}
    //     onConfirm={handleCreateProject}
    //     initialValues={
    //       projectToEdit
    //         ? {
    //             name: projectToEdit.name,
    //             category: projectToEdit.category,
    //             colorHex: projectToEdit.colorHex,
    //           }
    //         : undefined
    //     }
    //     title={projectToEdit ? 'Edit Project' : 'Create Project'}
    //     confirmLabel={projectToEdit ? 'Update Project' : 'Create Project'}
    //   />

    //   <ConfirmActionModal
    //     isOpen={Boolean(projectToDelete)}
    //     onClose={() => setProjectToDelete(null)}
    //     title="Delete Project?"
    //     message={
    //       <>
    //         Are you sure you want to delete{' '}
    //         <span className="font-semibold">
    //           “{projectToDelete?.name ?? 'this project'}”
    //         </span>
    //         ? This action cannot be undone.
    //       </>
    //     }
    //     confirmLabel="Yes, Delete"
    //     cancelLabel="Cancel"
    //     variant="danger"
    //     isSubmitting={deleteProjectMutation.isPending}
    //     onConfirm={handleDeleteProject}
    //   />

    //   <CreateTicketModal
    //     isOpen={createTicketOpen}
    //     onClose={() => {
    //       setCreateTicketOpen(false);
    //       setSelectedProjectId(null);
    //     }}
    //     onConfirm={handleCreateTicket}
    //     projectOptions={projectOptions}
    //     preselectedProjectId={selectedProjectId ?? undefined}
    //     disableProjectSelection={Boolean(selectedProjectId)}
    //   />
    // </div>
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
