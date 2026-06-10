'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import CreateProjectModal, {
  type CreateProjectFormValues,
} from '../../../components/modals/CreateProjectModal';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../components/modals/CreateTicketModal';
import {
  createTicketAssigneeOptions,
  createTicketPriorityOptions,
  createTicketProjectOptions,
} from '../../../components/modals/create-ticket-modal.data';
import ProjectCard from '../../../components/projects/ProjectCard';
import { appToast } from '../../../components/toast/AppToast';
import { useCreateProjectMutation, useProjectsQuery } from './projects.queries';

export default function ProjectsPage() {
  const router = useRouter();
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const hasShownLoadError = useRef(false);
  const projectsQuery = useProjectsQuery();
  const createProjectMutation = useCreateProjectMutation();
  const projectOptions = useMemo(
    () => createTicketProjectOptions(projectsQuery.data ?? []),
    [projectsQuery.data],
  );

  useEffect(() => {
    setHeaderActionOverride(() => setCreateProjectOpen(true));

    return () => {
      setHeaderActionOverride(null);
    };
  }, [setHeaderActionOverride]);

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
      await createProjectMutation.mutateAsync(values);
      appToast.success('Project created successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to create project.',
      );
      throw error;
    }
  };

  const handleCreateTicket = async (_values: CreateTicketFormValues) => {
    appToast.success('Ticket created successfully.');
  };

  return (
    <div className="">
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
                onClick={() => router.push(`/projects/${project.id}`)}
                onAddTicket={() => {
                  setSelectedProjectId(project.id);
                  setCreateTicketOpen(true);
                }}
              />
            ))}
      </div>

      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onConfirm={handleCreateProject}
      />

      <CreateTicketModal
        isOpen={createTicketOpen}
        onClose={() => {
          setCreateTicketOpen(false);
          setSelectedProjectId(null);
        }}
        onConfirm={handleCreateTicket}
        projectOptions={projectOptions}
        assigneeOptions={createTicketAssigneeOptions}
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
