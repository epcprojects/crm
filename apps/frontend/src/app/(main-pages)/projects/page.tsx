'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import CreateProjectModal, {
  type CreateProjectFormValues,
} from '../../../components/modals/CreateProjectModal';
import ConfirmActionModal from '../../../components/modals/ConfirmActionModal';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../components/modals/CreateTicketModal';
import {
  createTicketPriorityOptions,
  createTicketProjectOptions,
} from '../../../components/modals/create-ticket-modal.data';
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
  useProjectsQuery,
} from './projects.queries';
import type { ProjectRecord } from './projects.data';

export default function ProjectsPage() {
  const router = useRouter();
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
  const [projectToEdit, setProjectToEdit] = useState<ProjectRecord | null>(null);
  const hasShownLoadError = useRef(false);
  const projectsQuery = useProjectsQuery();
  const createProjectMutation = useCreateProjectMutation();
  const updateProjectMutation = useUpdateProjectMutation();
  const deleteProjectMutation = useDeleteProjectMutation();
  const projectOptions = useMemo(
    () => createTicketProjectOptions(projectsQuery.data ?? []),
    [projectsQuery.data],
  );
  const canCreateProject = hasPermission('projects.create');
  const canViewProjectDetail = hasPermission('projects.view_detail');
  const canCreateTicket = hasPermission('tickets.create');
  const canEditProject = hasPermission('projects.edit');
  const canDeleteProject = hasPermission('projects.delete');

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
      await createTicket({
        projectId: values.project,
        title: values.title,
        description: values.description,
        statusKey: values.status,
        assigneeId: values.assignee,
        dueDate: values.dueDate,
        attachments: values.attachments,
      });
      appToast.success('Ticket created successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to create ticket.',
      );
      throw error;
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete || !canDeleteProject) {
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

  return (
    <div className="">
      <PermissionGuard
        permission="projects.view_list"
        fallback={
          <div className="flex min-h-80 items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
            You do not have permission to view projects.
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {projectsQuery.isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
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
      </PermissionGuard>

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
        isOpen={createTicketOpen}
        onClose={() => {
          setCreateTicketOpen(false);
          setSelectedProjectId(null);
        }}
        onConfirm={handleCreateTicket}
        projectOptions={projectOptions}
        priorityOptions={createTicketPriorityOptions}
        preselectedProjectId={selectedProjectId ?? undefined}
        disableProjectSelection={Boolean(selectedProjectId)}
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
