'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import CreateProjectModal, {
  type CreateProjectFormValues,
} from '../../../components/modals/CreateProjectModal';
import ProjectCard from '../../../components/projects/ProjectCard';
import { appToast } from '../../../components/toast/AppToast';
import { baseProjects } from './projects.data';

export const projects = baseProjects;

export default function ProjectsPage() {
  const router = useRouter();
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [projectList, setProjectList] = useState(projects);

  useEffect(() => {
    setHeaderActionOverride(() => setCreateProjectOpen(true));

    return () => {
      setHeaderActionOverride(null);
    };
  }, [setHeaderActionOverride]);

  const handleCreateProject = async (values: CreateProjectFormValues) => {
    const initials = values.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();

    setProjectList((current) => [
      {
        id: values.name.toLowerCase().replace(/\s+/g, '-'),
        initials: initials || 'NP',
        name: values.name,
        category: values.category,
        totalCount: 0,
        openCount: 0,
        criticalCount: 0,
        colorHex: values.colorHex,
        threadPosts: 0,
        filesCount: 0,
      },
      ...current,
    ]);

    appToast.success('Project created successfully.');
  };

  return (
    <div className="">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {projectList.map((project) => (
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
          />
        ))}
      </div>

      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onConfirm={handleCreateProject}
      />
    </div>
  );
}
