'use client';

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import clsx from 'clsx';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../../components/modals/CreateTicketModal';
import UploadFileModal, {
  type UploadFileFormValues,
} from '../../../../components/modals/UploadFileModal';
import DiscussionPanel from '../../../../components/discussion/DiscussionPanel';
import ProjectFilesPanel from '../../../../components/projects/ProjectFilesPanel';
import {
  createTicketAssigneeOptions,
  createTicketPriorityOptions,
  createTicketProjectOptions,
} from '../../../../components/modals/create-ticket-modal.data';
import RecentTicketsTable from '../../../../components/tables/RecentTicketsTable';
import { appToast } from '../../../../components/toast/AppToast';
import { SearchIcon, PlusIcon } from '../../../../../public/icons';
import ThemeButton from '../../../../components/ui/ThemeButton';
import {
  baseProjects,
  getProjectFiles,
  getProjectById,
  getProjectTickets,
} from '../projects.data';

const projectTabs = ['Tickets', 'Thread', 'Files', 'Calendar'] as const;

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [fileSearchValue, setFileSearchValue] = useState('');
  const project = useMemo(
    () => getProjectById(String(params?.projectId ?? '')),
    [params?.projectId],
  );

  const projectOptions = useMemo(
    () => createTicketProjectOptions(baseProjects),
    [],
  );

  const [projectFilesState, setProjectFilesState] = useState(() =>
    project ? getProjectFiles(project.id) : [],
  );

  useEffect(() => {
    if (project) {
      setProjectFilesState(getProjectFiles(project.id));
    }
  }, [project]);

  const projectTickets = useMemo(() => {
    if (!project) return [];
    const normalizedSearch = searchValue.trim().toLowerCase();
    return getProjectTickets(project.name).filter((ticket) => {
      if (!normalizedSearch) return true;
      return (
        ticket.id.toLowerCase().includes(normalizedSearch) ||
        ticket.title.toLowerCase().includes(normalizedSearch) ||
        ticket.assignee.name.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [project, searchValue]);

  const projectFiles = useMemo(() => {
    const normalizedSearch = fileSearchValue.trim().toLowerCase();

    return projectFilesState.filter((file) => {
      if (!normalizedSearch) return true;

      return (
        file.name.toLowerCase().includes(normalizedSearch) ||
        file.uploadedBy?.toLowerCase().includes(normalizedSearch) ||
        file.uploadedAt?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [fileSearchValue, projectFilesState]);

  const handleCreateTicket = async (values: CreateTicketFormValues) => {
    console.log('Create project ticket payload', values);
    appToast.success('Ticket created successfully.');
  };

  const handleUploadFile = async (values: UploadFileFormValues) => {
    setProjectFilesState((currentFiles) => [
      {
        id: `project-file-${Date.now()}`,
        name: values.name,
        size: values.size,
        type: values.type,
        uploadedBy: 'Admin User',
        uploadedAt: new Date().toISOString().slice(0, 10),
      },
      ...currentFiles,
    ]);
    appToast.success('File uploaded successfully.');
  };

  if (!project) {
    return (
      <div className="space-y-4 -mt-16 sm:mt-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
        >
          <BackArrowIcon />
          Back
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Project not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 flex flex-col flex-1 items-start w-full -mt-16 sm:mt-0">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
      >
        <BackArrowIcon />
        Back
      </button>

      <section className="w-full">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <span
              className="flex h-12 min-w-12 sm:h-19 sm:w-19 items-center justify-center rounded-full text-lg md:text-3xl font-semibold"
              style={{
                backgroundColor: `${project.colorHex}22`,
                color: project.colorHex,
              }}
            >
              {project.initials}
            </span>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base md:text-lg font-semibold text-gray-900">
                  {project.name}
                </h2>
                <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-sm font-medium text-green-600">
                  {project.category}
                </span>
              </div>

              <div className="mt-1.5 sm:mt-2.5 flex-wrap flex items-center gap-4 sm:gap-8">
                <Metric
                  label="Tickets"
                  value={String(projectTickets.length).padStart(2, '0')}
                />
                <Metric
                  label="Thread posts"
                  value={String(project.threadPosts).padStart(2, '0')}
                />
                <Metric
                  label="Files"
                  value={String(project.filesCount).padStart(2, '0')}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <TabGroup className="space-y-4 flex flex-1 flex-col w-full">
        <TabList className="flex border-y border-gray-200">
          {projectTabs.map((tab) => (
            <Tab
              key={tab}
              className={({ selected }) =>
                clsx(
                  'border-b-2 px-4 py-3 text-sm font-semibold outline-none transition',
                  selected
                    ? 'border-primary-dark text-primary-dark'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )
              }
            >
              {tab}
            </Tab>
          ))}
        </TabList>

        <TabPanels className={'flex-1 flex flex-col'}>
          <TabPanel className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl md:flex-row md:items-center md:justify-between">
              <div className="relative flex w-full items-center md:max-w-xs">
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search..."
                  className="h-10.5 w-full rounded-lg border border-gray-200 bg-white ps-7 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
                <span className="absolute inset-s-2">
                  <SearchIcon />
                </span>
              </div>

              <ThemeButton
                icon={<PlusIcon />}
                onClick={() => setCreateTicketOpen(true)}
              >
                New Ticket
              </ThemeButton>
            </div>

            <RecentTicketsTable
              tickets={projectTickets}
              enablePagination
              initialPageSize={12}
              pageSizeOptions={[12, 24, 48]}
              onRowClick={(ticket) => router.push(`/tickets/${ticket.id}`)}
              hideProjectColumn
            />
          </TabPanel>

          <TabPanel className={'flex flex-col flex-1 '}>
            <DiscussionPanel
              title="Discussion"
              replies={[
                {
                  id: 'project-thread-1',
                  author: { name: 'Admin User', initials: 'AU' },
                  createdAt: 'Feb 10, 2026 - 4:39 PM',
                  message:
                    'Investigating now — looks like an env variable issue.',
                },
              ]}
              composerPlaceholder="Post the project thread..."
            />
          </TabPanel>

          <TabPanel className={'flex flex-col flex-1 '}>
            <ProjectFilesPanel
              files={projectFiles}
              searchValue={fileSearchValue}
              onSearchChange={setFileSearchValue}
              onUploadClick={() => setUploadFileOpen(true)}
            />
          </TabPanel>

          <TabPanel>
            <PlaceholderCard
              title="Calendar"
              description="Project milestones and due dates will appear here."
            />
          </TabPanel>
        </TabPanels>
      </TabGroup>

      <CreateTicketModal
        isOpen={createTicketOpen}
        onClose={() => setCreateTicketOpen(false)}
        onConfirm={handleCreateTicket}
        projectOptions={projectOptions.filter(
          (option) => option.value === project.id,
        )}
        assigneeOptions={createTicketAssigneeOptions}
        priorityOptions={createTicketPriorityOptions}
      />

      <UploadFileModal
        isOpen={uploadFileOpen}
        onClose={() => setUploadFileOpen(false)}
        onConfirm={handleUploadFile}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="sm:min-w-16 border-r border-gray-200 pr-4 sm:pr-6 last:border-r-0 last:pr-0">
      <p className="text-sm text-gray-500 whitespace-nowrap">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function PlaceholderCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.4375 8.99975C2.4375 9.27992 2.56174 9.53984 2.67939 9.73502C2.80635 9.94563 2.97708 10.1631 3.16439 10.3751C3.54013 10.8004 4.0304 11.2571 4.50618 11.6703C4.98475 12.0858 5.46167 12.4685 5.81794 12.7466C5.99637 12.8859 6.14523 12.9994 6.24978 13.0784C6.30207 13.1179 6.34332 13.1488 6.37169 13.1699L6.40436 13.1942L6.41303 13.2007L6.41604 13.2029C6.66617 13.3871 7.01862 13.334 7.20286 13.0838C7.3871 12.8337 7.33371 12.4816 7.08361 12.2973L7.07407 12.2903L7.04403 12.268C7.01746 12.2482 6.97815 12.2187 6.9279 12.1808C6.82738 12.1048 6.68327 11.9949 6.51014 11.8598C6.16329 11.589 5.70272 11.2194 5.2438 10.8208C4.78208 10.4199 4.33486 10.0008 4.00748 9.63023C3.98678 9.60679 3.96674 9.58375 3.94737 9.56114L15 9.56113C15.3107 9.56113 15.5625 9.30929 15.5625 8.99863C15.5625 8.68797 15.3107 8.43613 15 8.43613L3.94927 8.43614C3.96805 8.41423 3.98746 8.39194 4.00748 8.36927C4.33486 7.99871 4.78208 7.57959 5.2438 7.17865C5.70272 6.78013 6.16329 6.41046 6.51014 6.13974C6.68327 6.00461 6.82737 5.89466 6.9279 5.81872C6.97815 5.78076 7.01746 5.75133 7.04403 5.73153L7.07406 5.7092L7.08361 5.70214C7.33371 5.51789 7.3871 5.16578 7.20286 4.91567C7.01862 4.66554 6.66617 4.61237 6.41604 4.79662L6.41303 4.79884L6.40436 4.80525L6.37169 4.82954C6.34332 4.85069 6.30207 4.88157 6.24978 4.92107C6.14523 5.00005 5.99637 5.11363 5.81793 5.2529C5.46167 5.53098 4.98474 5.91364 4.50618 6.32922C4.0304 6.74237 3.54013 7.19911 3.16439 7.62441C2.97708 7.83642 2.80635 8.05386 2.67939 8.26448C2.56245 8.45847 2.43899 8.71646 2.43751 8.9947"
        fill="black"
      />
    </svg>
  );
}
