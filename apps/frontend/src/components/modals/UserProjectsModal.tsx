'use client';

import { useEffect, useState } from 'react';
import { ProjectsIcon, SearchIcon } from '../../../public/icons';
import type { UserCardProject } from '../users/UserCard';
import AppModal from './AppModal';

export default function UserProjectsModal({
  projects,
  onClose,
}: {
  projects: UserCardProject[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const filteredProjects = projects.filter((project) =>
    project.name.toLocaleLowerCase().includes(query),
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title="Project Assigned"
      size="small"
      showFooter={false}
      bodyPaddingClasses="p-4 pe-1"
      icon={
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-r from-blue-500 to-violet-500">
          <ProjectsIcon width="20" height="20" fill="white" opacity="0" />
        </span>
      }
    >
      <div className="space-y-3  min-h-53">
        <div className="pe-3">
          <label className="flex  items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <SearchIcon fill="#374151" />
            <input
              autoFocus
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects"
              aria-label="Search assigned projects"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </label>
        </div>
        <ul
          className="max-h-80 space-y-1 overflow-y-auto scrollbar-thin"
          aria-label="Assigned projects"
        >
          {filteredProjects.map((project) => (
            <li key={project.id} className="flex items-center gap-3 py-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                style={{
                  color: project.colorHex,
                  backgroundColor: `${project.colorHex}1A`,
                }}
              >
                {project.initials}
              </span>
              <span className="min-w-0 wrap-break-word font-semibold text-sm text-gray-900">
                {project.name}
              </span>
            </li>
          ))}
        </ul>
        {filteredProjects.length === 0 ? (
          <div className="h-full min-h-32 flex items-center justify-center">
            <p
              role="status"
              className="py-4 text-center h-ful text-sm text-gray-500"
            >
              {query
                ? 'No projects match your search.'
                : 'No projects assigned.'}
            </p>
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}
