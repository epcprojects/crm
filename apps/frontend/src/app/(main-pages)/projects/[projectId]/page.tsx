'use client';

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../../components/modals/CreateTicketModal';
import UploadFileModal, {
  type UploadFileFormValues,
} from '../../../../components/modals/UploadFileModal';
import ConfirmActionModal from '../../../../components/modals/ConfirmActionModal';
import ProjectThreadPanel from '../../../../components/discussion/ProjectThreadPanel';
import type { DiscussionAttachment } from '../../../../components/discussion/types';
import ProjectFilesPanel, {
  type ProjectFileRecord,
} from '../../../../components/projects/ProjectFilesPanel';
import { createTicketProjectOptions } from '../../../../components/modals/create-ticket-modal.data';
import RecentTicketsTable from '../../../../components/tables/RecentTicketsTable';
import { appToast } from '../../../../components/toast/AppToast';
import {
  FiltersIcon,
  SearchIcon,
  PlusIcon,
  TicketsIcon,
} from '../../../../../public/icons';
import Dropdown from '../../../../components/ui/ThemeDropDown';
import ThemeButton from '../../../../components/ui/ThemeButton';
import { useIsMobile } from '../../../../components/hooks/useIsMobile';
import { useAppLoader } from '../../../providers/AppLoaderProvider';
import { createTicket } from '../../../../lib/tickets';
import {
  projectsQueryKey,
  projectTicketsQueryKey,
  projectThreadQueryKey,
  projectThreadDetailQueryKey,
  useDeleteProjectFileMutation,
  useProjectDetailQuery,
  useProjectFilesQuery,
  useProjectNamesQuery,
  useProjectThreadDetailQuery,
  useProjectTicketsQuery,
  useProjectThreadQuery,
  useUploadProjectFilesMutation,
} from '../projects.queries';
import {
  PermissionGuard,
  usePermissions,
} from '../../../providers/PermissionProvider';
import { useAppSelector } from '../../../Redux/store';
import Calendar from '../../../../components/calendar/Calendar';
import DashboardSummaryBanner from '../../../../components/ui/DashboardSummaryBanner';
import EmptyState from '../../../../components/EmptyState';

const projectTabs = ['Tickets', 'Thread', 'Files', 'Calendar'] as const;

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLoading } = useAppLoader();
  const isMobile = useIsMobile();
  const currentUserId = useAppSelector((state) => state.auth.user?.id ?? '');
  const { hasPermission } = usePermissions();
  const canViewProjectDetail = hasPermission('projects.view_detail');
  const canViewTickets = hasPermission('tickets.view_list');
  const canViewTicketDetail = hasPermission('tickets.view_detail');
  const canCreateTicket = hasPermission('tickets.create');
  const canFilterTickets = hasPermission('tickets.filter');
  const canViewThread = hasPermission('thread.view');
  const canPostThreadMessage = hasPermission('thread.post_message');
  const canPostThreadReply = hasPermission('thread.post_reply');
  const canAttachThreadFile = hasPermission('thread.attach_file');
  const canViewFiles = hasPermission('files.view');
  const canUploadFiles = hasPermission('files.upload');
  const canDownloadFiles = hasPermission('files.download');
  const canViewCalendar = hasPermission('calendar.view_grid');
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [fileSearchValue, setFileSearchValue] = useState('');
  const [uploadedFilesState, setUploadedFilesState] = useState<
    ProjectFileRecord[]
  >([]);
  const [fileToDelete, setFileToDelete] = useState<ProjectFileRecord | null>(
    null,
  );
  const [selectedThreadMessageId, setSelectedThreadMessageId] = useState('');
  const [ticketsPagination, setTicketsPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const projectId = String(params?.projectId ?? '');
  const hasShownError = useRef(false);
  const queryClient = useQueryClient();
  const projectDetailQuery = useProjectDetailQuery(
    projectId,
    canViewProjectDetail,
  );
  const projectThreadQuery = useProjectThreadQuery(projectId, canViewThread);
  const projectThreadDetailQuery = useProjectThreadDetailQuery(
    projectId,
    selectedThreadMessageId,
    canViewThread,
  );

  const projectFilesQuery = useProjectFilesQuery(projectId, canViewFiles);
  const projectTicketsQuery = useProjectTicketsQuery(
    projectId,
    {
      page: ticketsPagination.pageIndex + 1,
      limit: ticketsPagination.pageSize,
      search: searchValue.trim() || undefined,
      statusKey: selectedStatus === 'all' ? undefined : selectedStatus,
      priorityKey: selectedPriority === 'all' ? undefined : selectedPriority,
    },
    canViewTickets,
  );
  const uploadProjectFilesMutation = useUploadProjectFilesMutation();
  const deleteProjectFileMutation = useDeleteProjectFileMutation();
  const projectsQuery = useProjectNamesQuery(canCreateTicket);
  const ticketStatusesQuery = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: fetchTicketStatuses,
    enabled: canViewTickets,
  });
  const ticketPrioritiesQuery = useQuery({
    queryKey: ['ticket-priorities'],
    queryFn: fetchTicketPriorities,
    enabled: canViewTickets,
  });

  const statusFilterOptions = useMemo(
    () => [
      {
        label: 'All Status',
        value: 'all',
      },
      ...(ticketStatusesQuery.data ?? []).map(mapTicketSettingToDropdownOption),
    ],
    [ticketStatusesQuery.data],
  );

  const priorityFilterOptions = useMemo(
    () => [
      {
        label: 'All Priority',
        value: 'all',
      },
      ...(ticketPrioritiesQuery.data ?? []).map(
        mapTicketSettingToDropdownOption,
      ),
    ],
    [ticketPrioritiesQuery.data],
  );

  const project = projectDetailQuery.data;

  const createProjectThreadMutation = useMutation({
    mutationFn: async ({
      message,
      attachments,
      parentId,
    }: {
      message: string;
      attachments: File[];
      parentId?: string;
    }) => {
      const formData = new FormData();
      if (message.trim()) {
        formData.append('message', message.trim());
      }

      if (parentId?.trim()) {
        formData.append('parentId', parentId.trim());
      }

      attachments.forEach((attachment) => {
        formData.append('attachments', attachment);
      });

      const response = await fetch(`/api/projects/${projectId}/thread`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          Array.isArray(data?.message) && data.message.length
            ? data.message.join(', ')
            : data?.message || 'Failed to post project thread message.';
        throw new Error(message);
      }

      return data;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...projectThreadQueryKey, projectId],
      });
      if (variables.parentId) {
        await queryClient.invalidateQueries({
          queryKey: [
            ...projectThreadDetailQueryKey,
            projectId,
            variables.parentId,
          ],
        });
      }
      appToast.success('Reply posted successfully.');
    },
    onError: (error) => {
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to post project thread message.',
      );
    },
  });

  const projectOptions = useMemo(
    () => createTicketProjectOptions(projectsQuery.data ?? []),
    [projectsQuery.data],
  );

  useEffect(() => {
    setTicketsPagination((current) => ({
      ...current,
      pageIndex: 0,
    }));
    setUploadedFilesState([]);
    setSelectedThreadMessageId('');
    setSelectedStatus('all');
    setSelectedPriority('all');
    setSearchValue('');
  }, [projectId]);

  useEffect(() => {
    if (projectDetailQuery.isError && !hasShownError.current) {
      hasShownError.current = true;
      appToast.error(
        projectDetailQuery.error instanceof Error
          ? projectDetailQuery.error.message
          : 'Failed to load project.',
      );
    }

    if (!projectDetailQuery.isError) {
      hasShownError.current = false;
    }
  }, [projectDetailQuery.error, projectDetailQuery.isError]);

  const projectTickets = useMemo(
    () =>
      (projectTicketsQuery.data?.items ?? []).map((ticket) => ({
        ...ticket,
        statusColor:
          ticket.statusColor ??
          getTicketStatusColor(ticket.status, ticketStatusesQuery.data),
      })),
    [projectTicketsQuery.data?.items, ticketStatusesQuery.data],
  );
  const projectFiles = useMemo(() => {
    const normalizedSearch = fileSearchValue.trim().toLowerCase();
    const files = [...uploadedFilesState, ...(projectFilesQuery.data ?? [])];

    return files.filter((file) => {
      if (!normalizedSearch) return true;

      return (
        file.name.toLowerCase().includes(normalizedSearch) ||
        file.uploadedBy?.toLowerCase().includes(normalizedSearch) ||
        file.uploadedAt?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [fileSearchValue, projectFilesQuery.data, uploadedFilesState]);

  const selectedThreadRoot = useMemo(() => {
    if (!selectedThreadMessageId) {
      return null;
    }

    return (
      projectThreadQuery.data?.find(
        (reply) => reply.id === selectedThreadMessageId,
      ) ?? null
    );
  }, [projectThreadQuery.data, selectedThreadMessageId]);

  const selectedThreadHeader = useMemo(() => {
    if (!selectedThreadMessageId) {
      return null;
    }

    return projectThreadDetailQuery.data?.header ?? selectedThreadRoot ?? null;
  }, [
    projectThreadDetailQuery.data,
    selectedThreadMessageId,
    selectedThreadRoot,
  ]);

  const selectedThreadReplies = useMemo(() => {
    if (!selectedThreadMessageId) {
      return [];
    }

    return projectThreadDetailQuery.data?.replies ?? [];
  }, [projectThreadDetailQuery.data, selectedThreadMessageId]);

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
      await queryClient.invalidateQueries({
        queryKey: [...projectTicketsQueryKey, projectId],
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

  const handleUploadFile = async (values: UploadFileFormValues) => {
    if (!canUploadFiles) {
      return;
    }

    try {
      setLoading(true);
      await uploadProjectFilesMutation.mutateAsync({ projectId, values });
      appToast.success('File uploaded successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to upload file.',
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) {
      return;
    }

    try {
      setLoading(true);
      await deleteProjectFileMutation.mutateAsync({
        projectId,
        fileId: fileToDelete.id,
      });
      appToast.success('File deleted successfully.');
      setFileToDelete(null);
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to delete file.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteThreadAttachment = async (
    attachment: DiscussionAttachment,
  ) => {
    try {
      setLoading(true);
      await deleteProjectFileMutation.mutateAsync({
        projectId,
        fileId: attachment.id,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...projectThreadQueryKey, projectId],
        }),
        selectedThreadMessageId
          ? queryClient.invalidateQueries({
              queryKey: [
                ...projectThreadDetailQueryKey,
                projectId,
                selectedThreadMessageId,
              ],
            })
          : Promise.resolve(),
      ]);
      appToast.success('Attachment deleted successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to delete attachment.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async ({
    message,
    attachments,
  }: {
    message: string;
    attachments: File[];
  }) => {
    if (!canPostThreadMessage) {
      return;
    }

    await createProjectThreadMutation.mutateAsync({ message, attachments });
  };

  const handleSubmitThreadReply = async ({
    message,
    attachments,
  }: {
    message: string;
    attachments: File[];
  }) => {
    if (!canPostThreadReply || !selectedThreadMessageId) {
      return;
    }

    await createProjectThreadMutation.mutateAsync({
      message,
      attachments,
      parentId: selectedThreadMessageId,
    });
  };

  const visibleProjectTabs = projectTabs.filter((tab) => {
    if (tab === 'Tickets') return canViewTickets;
    if (tab === 'Thread') return canViewThread;
    if (tab === 'Files') return canViewFiles;
    if (tab === 'Calendar') return canViewCalendar;
    return false;
  });
  const defaultProjectTabIndex = useMemo(() => {
    const requestedTab = searchParams.get('t');
    const requestedTabName = requestedTab === '1' ? 'Thread' : null;

    if (!requestedTabName) {
      return 0;
    }

    const requestedTabIndex = visibleProjectTabs.indexOf(requestedTabName);
    return requestedTabIndex >= 0 ? requestedTabIndex : 0;
  }, [searchParams, visibleProjectTabs]);

  if (projectDetailQuery.isLoading) {
    return <ProjectDetailSkeleton onBack={() => router.back()} />;
  }

  if (!canViewProjectDetail) {
    return (
      <div className="space-y-4 mt-8">
        <div className="rounded-[20px] border border-gray-200 bg-white px-6 py-10 shadow-[0_0_35px_0_rgb(0_0_0/0.04)]">
          <EmptyState
            imageUrl="/images/EmptyProjectIcon.svg"
            imageAlt="Project not found"
            title="You do not have permission to view project details."
            // description="Recent tickets will appear here once they are created."
            buttonLabel="Go Back"
            onButtonClick={() => router.back()}
          />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4 mt-8">
        <div className="rounded-[20px] border border-gray-200 bg-white px-6 py-10 shadow-[0_0_35px_0_rgb(0_0_0/0.04)]">
          <EmptyState
            imageUrl="/images/EmptyProjectIcon.svg"
            imageAlt="Project not found"
            title="Project not found"
            // description="Recent tickets will appear here once they are created."
            buttonLabel="Go Back"
            onButtonClick={() => router.back()}
          />
        </div>
      </div>
    );
  }
  const projectSummaryStats = [
    ...(canViewTickets
      ? [
          {
            title: 'Tickets',
            count: projectTicketsQuery.data?.meta.total ?? 0,
            color: '#17B26A',
          },
        ]
      : []),
    ...(canViewThread
      ? [
          {
            title: 'Thread Posts',
            count: projectThreadQuery.data?.length ?? 0,
            color: '#7A5AF8',
          },
        ]
      : []),
    ...(canViewFiles
      ? [
          {
            title: 'Files',
            count:
              uploadedFilesState.length + (projectFilesQuery.data?.length ?? 0),
            color: '#F79009',
          },
        ]
      : []),
  ];

  // const ticketSummaryStats = useMemo(
  //   () => [
  //     {
  //       title: 'Open',
  //       count: ticketsQuery.data?.summary?.open ?? 0,
  //       color: '#F04438',
  //     },
  //     {
  //       title: 'InProgress',
  //       count: ticketsQuery.data?.summary?.inProgress ?? 0,
  //       color: '#F79009',
  //     },
  //     {
  //       title: 'Resolved',
  //       count: ticketsQuery.data?.summary?.resolved ?? 0,
  //       color: '#17B26A',
  //     },
  //     {
  //       title: 'Critical',
  //       count: ticketsQuery.data?.summary?.critical ?? 0,
  //       color: '#7A5AF8',
  //     },
  //   ],
  //   [ticketsQuery.data],
  // );
  return (
    <>
      <div className="relative z-100 h-full xl:h-dvh overflow-hidden xl:py-5 xl:pr-5 px-4 xl:px-0 pt-2 pb-0 py-4">
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 xl:overflow-hidden xl:rounded-3xl xl:border xl:border-white xl:bg-white/40 xl:p-3">
          <DashboardSummaryBanner
            imageSrc="/images/bannerBackBtn.svg"
            onBack={() => router.back()}
            imageAlt="Tickets"
            title={project.name}
            badge={project.category}
            stats={projectSummaryStats}
            badgeClr={project.colorHex}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden rounded-[20px] bg-white px-4 pt-2 md:pt-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:px-5">
            {/* <section className="w-full shrink-0">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                  <span
                    className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold sm:h-19 sm:w-19 md:text-3xl"
                    style={{
                      backgroundColor: `${project.colorHex}22`,
                      color: project.colorHex,
                    }}
                  >
                    {project.initials}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="truncate text-base font-semibold text-gray-900 md:text-lg">
                        {project.name}
                      </h2>

                      <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600 sm:text-sm">
                        {project.category}
                      </span>
                    </div>

                    {projectSummaryStats.length ? (
                      <div className="mt-3 flex max-w-full flex-wrap items-center gap-x-5 gap-y-2">
                        {projectSummaryStats.map((item, index) => (
                          <div
                            key={`${item.title}-${index}`}
                            className="flex items-center gap-2"
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />

                            <span className="whitespace-nowrap text-xs text-gray-500 sm:text-sm">
                              {item.title}
                            </span>

                            <span className="whitespace-nowrap text-sm font-semibold text-gray-900">
                              {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section> */}

            <TabGroup
              defaultIndex={defaultProjectTabIndex}
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden"
            >
              <TabList className="flex shrink-0 overflow-x-auto scrollbar-hide border-b border-gray-200">
                {visibleProjectTabs.map((tab) => (
                  <Tab
                    key={tab}
                    className={({ selected }) =>
                      clsx(
                        'shrink-0 border-b-2 px-2 xl:px-4 py-3 text-sm font-semibold outline-none transition',
                        selected
                          ? 'border-[#3165F6] text-[#3165F6]'
                          : 'border-transparent text-gray-500 hover:text-gray-700',
                      )
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-flex shrink-0 items-center justify-center">
                        {renderProjectTabIcon(tab)}
                      </span>
                      <span>{tab}</span>
                    </span>
                  </Tab>
                ))}
              </TabList>

              <TabPanels className="flex min-h-0 min-w-0 flex-1 flex-col pb-4 md:pb-4 overflow-hidden">
                <PermissionGuard permission="tickets.view_list">
                  <TabPanel className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
                    <div className="flex shrink-0 flex-col gap-3 rounded-xl md:flex-row md:items-center md:justify-between">
                      {canFilterTickets ? (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 md:max-w-xs">
                              <div className="flex items-center gap-2">
                                <SearchIcon fill="#374151" />

                                <input
                                  type="text"
                                  value={searchValue}
                                  onChange={(event) =>
                                    setSearchValue(event.target.value)
                                  }
                                  placeholder="Search"
                                  className="min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
                                />
                              </div>
                            </div>

                            {/* Mobile/tablet filter button */}
                            <Popover as="div" className="relative xl:hidden">
                              {({ open }) => (
                                <>
                                  <PopoverButton
                                    className={`flex h-10 shrink-0 items-center justify-center rounded-lg border px-3 text-sm font-medium outline-none ${
                                      open ||
                                      selectedStatus !== 'all' ||
                                      selectedPriority !== 'all'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-gray-200 bg-white text-gray-700'
                                    }`}
                                    aria-label="Open ticket filters"
                                  >
                                    <FiltersIcon />
                                  </PopoverButton>

                                  <PopoverPanel
                                    anchor="bottom end"
                                    transition
                                    className="z-100 mt-2 flex w-56 origin-top-right flex-col gap-3 overflow-visible! rounded-xl border border-gray-200 bg-white p-3 shadow-[0_14px_44px_rgb(0_0_0/0.14)] outline-none transition duration-150 data-closed:-translate-y-2 data-closed:scale-95 data-closed:opacity-0"
                                  >
                                    <div className="relative w-full overflow-visible">
                                      <Dropdown
                                        options={statusFilterOptions}
                                        value={selectedStatus}
                                        onChange={setSelectedStatus}
                                        placeholder="All Status"
                                        maxMenuHeight={150}
                                      />
                                    </div>

                                    <div className="relative w-full overflow-visible">
                                      <Dropdown
                                        options={priorityFilterOptions}
                                        value={selectedPriority}
                                        onChange={setSelectedPriority}
                                        placeholder="All Priority"
                                        maxMenuHeight={150}
                                      />
                                    </div>

                                    {selectedStatus !== 'all' ||
                                    selectedPriority !== 'all' ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedStatus('all');
                                          setSelectedPriority('all');
                                        }}
                                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                      >
                                        Clear Filters
                                      </button>
                                    ) : null}
                                  </PopoverPanel>
                                </>
                              )}
                            </Popover>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Desktop inline filters */}
                            <div className="hidden w-38 xl:block">
                              <Dropdown
                                options={statusFilterOptions}
                                value={selectedStatus}
                                onChange={setSelectedStatus}
                                placeholder="All Status"
                              />
                            </div>

                            <div className="hidden w-38 xl:block">
                              <Dropdown
                                options={priorityFilterOptions}
                                value={selectedPriority}
                                onChange={setSelectedPriority}
                                placeholder="All Priority"
                              />
                            </div>

                            {canCreateTicket ? (
                              <ThemeButton
                                className="shrink-0 rounded-full"
                                variant="primaryGradient"
                                icon={
                                  <PlusIcon
                                    fill="#3889FE"
                                    width="20"
                                    height="20"
                                  />
                                }
                                onClick={() => setCreateTicketOpen(true)}
                              >
                                New Ticket
                              </ThemeButton>
                            ) : null}
                          </div>
                        </>
                      ) : canCreateTicket ? (
                        <div className="ml-auto">
                          <ThemeButton
                            className="shrink-0 rounded-full"
                            variant="primaryGradient"
                            icon={
                              <PlusIcon fill="#3889FE" width="20" height="20" />
                            }
                            onClick={() => setCreateTicketOpen(true)}
                          >
                            New Ticket
                          </ThemeButton>
                        </div>
                      ) : null}
                    </div>
                    <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                      <RecentTicketsTable
                        tickets={projectTickets}
                        enablePagination
                        pageSizeOptions={[10, 25, 50, 100]}
                        pagination={ticketsPagination}
                        onPaginationChange={setTicketsPagination}
                        totalRows={projectTicketsQuery.data?.meta.total ?? 0}
                        manualPagination
                        onRowClick={
                          canViewTicketDetail
                            ? (ticket) =>
                                router.push(
                                  `/tickets/${ticket.id}?projectId=${projectId}`,
                                )
                            : undefined
                        }
                        hideProjectColumn
                      />
                    </div>
                  </TabPanel>
                </PermissionGuard>

                <PermissionGuard permission="thread.view">
                  <TabPanel className="h-full min-h-0 min-w-0 overflow-hidden">
                    <div
                      className={`grid h-full min-h-0 min-w-0 overflow-hidden rounded-xl border border-gray-200 md:rounded-2xl ${
                        selectedThreadMessageId && !isMobile
                          ? 'xl:grid-cols-[minmax(0,1fr)_400px] xl:grid-rows-[minmax(0,1fr)] xl:divide-x xl:divide-gray-200'
                          : 'grid-cols-1'
                      }`}
                    >
                      {(!isMobile || !selectedThreadMessageId) && (
                        <div className="h-full min-h-0 min-w-0 overflow-hidden">
                          <ProjectThreadPanel
                            title="Discussion"
                            replies={projectThreadQuery.data ?? []}
                            emptyTitle={
                              projectThreadQuery.isLoading
                                ? 'Loading discussion...'
                                : 'No replies yet.'
                            }
                            emptyDescription={
                              projectThreadQuery.isLoading
                                ? 'Fetching project discussion messages.'
                                : 'No discussion messages have been added to this project yet.'
                            }
                            composerPlaceholder="Post the project thread..."
                            onSubmitReply={
                              canPostThreadMessage
                                ? handleSubmitReply
                                : undefined
                            }
                            isSubmittingReply={
                              createProjectThreadMutation.isPending &&
                              !selectedThreadMessageId
                            }
                            canCompose={canPostThreadMessage}
                            canAttachFile={canAttachThreadFile}
                            requireMessage={false}
                            currentUserId={currentUserId}
                            showReplyMeta
                            onReplyClick={(reply) =>
                              setSelectedThreadMessageId(reply.id)
                            }
                            onDeleteAttachment={handleDeleteThreadAttachment}
                            deletingAttachmentId={
                              deleteProjectFileMutation.isPending
                                ? deleteProjectFileMutation.variables?.fileId
                                : undefined
                            }
                          />
                        </div>
                      )}

                      {selectedThreadMessageId ? (
                        <div className="h-full min-h-0 min-w-0 overflow-hidden">
                          <ProjectThreadPanel
                            title="Thread"
                            subtitle=""
                            headerAction={
                              <button
                                type="button"
                                onClick={() => setSelectedThreadMessageId('')}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100"
                                aria-label="Close thread"
                              >
                                <CloseCrossIcon />
                              </button>
                            }
                            headerReply={selectedThreadHeader}
                            replies={selectedThreadReplies}
                            emptyTitle={
                              projectThreadDetailQuery.isLoading
                                ? 'Loading thread...'
                                : 'No replies yet.'
                            }
                            emptyDescription={
                              projectThreadDetailQuery.isLoading
                                ? 'Fetching thread replies.'
                                : 'No replies have been added to this thread yet.'
                            }
                            composerPlaceholder="Reply to thread..."
                            onSubmitReply={
                              canPostThreadReply
                                ? handleSubmitThreadReply
                                : undefined
                            }
                            isSubmittingReply={
                              createProjectThreadMutation.isPending &&
                              Boolean(selectedThreadMessageId)
                            }
                            canCompose={canPostThreadReply}
                            canAttachFile={
                              canAttachThreadFile && canPostThreadReply
                            }
                            requireMessage={false}
                            currentUserId={currentUserId}
                            onDeleteAttachment={handleDeleteThreadAttachment}
                            deletingAttachmentId={
                              deleteProjectFileMutation.isPending
                                ? deleteProjectFileMutation.variables?.fileId
                                : undefined
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  </TabPanel>
                </PermissionGuard>

                <PermissionGuard permission="files.view">
                  <TabPanel className="h-full min-h-0 min-w-0 overflow-hidden">
                    <ProjectFilesPanel
                      files={projectFiles}
                      searchValue={fileSearchValue}
                      onSearchChange={setFileSearchValue}
                      onUploadClick={
                        canUploadFiles
                          ? () => setUploadFileOpen(true)
                          : undefined
                      }
                      onDeleteFile={setFileToDelete}
                      canDownloadFile={canDownloadFiles}
                      deletingFileId={
                        deleteProjectFileMutation.isPending
                          ? deleteProjectFileMutation.variables?.fileId
                          : undefined
                      }
                      subtitle={
                        projectFilesQuery.isLoading
                          ? 'Loading files...'
                          : `${
                              uploadedFilesState.length +
                              (projectFilesQuery.data?.length ?? 0)
                            } files`
                      }
                    />
                  </TabPanel>
                </PermissionGuard>

                <PermissionGuard permission="calendar.view_grid">
                  <TabPanel className="h-full min-h-0 overflow-y-auto">
                    <Calendar projectId={projectId} />
                  </TabPanel>
                </PermissionGuard>
              </TabPanels>
            </TabGroup>
          </div>
        </div>
      </div>

      <CreateTicketModal
        isOpen={createTicketOpen && canCreateTicket}
        onClose={() => setCreateTicketOpen(false)}
        onConfirm={handleCreateTicket}
        projectOptions={projectOptions}
        preselectedProjectId={project.id}
        disableProjectSelection
      />

      <UploadFileModal
        isOpen={uploadFileOpen && canUploadFiles}
        onClose={() => setUploadFileOpen(false)}
        onConfirm={handleUploadFile}
      />

      <ConfirmActionModal
        isOpen={Boolean(fileToDelete)}
        onClose={() => setFileToDelete(null)}
        title="Delete File?"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold">
              “{fileToDelete?.name ?? 'this file'}”
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        isSubmitting={deleteProjectFileMutation.isPending}
        onConfirm={handleDeleteFile}
      />
    </>
  );
}

function renderProjectTabIcon(tab: (typeof projectTabs)[number]) {
  if (tab === 'Tickets') {
    return (
      <TicketsIcon width="20" height="20" fill="currentColor" opacity="0" />
    );
  }

  if (tab === 'Thread') {
    return <ThreadTabIcon />;
  }

  if (tab === 'Files') {
    return <FilesTabIcon />;
  }

  return <CalendarTabIcon />;
}

function ThreadTabIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.83366 9.99999C5.83366 9.53974 6.20676 9.16666 6.66699 9.16666H6.67447C7.13471 9.16666 7.5078 9.53974 7.5078 9.99999C7.5078 10.4602 7.13471 10.8333 6.67447 10.8333H6.66699C6.20676 10.8333 5.83366 10.4602 5.83366 9.99999Z"
        fill="currentColor"
      />
      <path
        d="M9.16325 9.99999C9.16325 9.53974 9.53633 9.16666 9.99658 9.16666H10.0041C10.4643 9.16666 10.8374 9.53974 10.8374 9.99999C10.8374 10.4602 10.4643 10.8333 10.0041 10.8333H9.99658C9.53633 10.8333 9.16325 10.4602 9.16325 9.99999Z"
        fill="currentColor"
      />
      <path
        d="M13.3262 9.16666C12.8659 9.16666 12.4928 9.53974 12.4928 9.99999C12.4928 10.4602 12.8659 10.8333 13.3262 10.8333H13.3337C13.7939 10.8333 14.167 10.4602 14.167 9.99999C14.167 9.53974 13.7939 9.16666 13.3337 9.16666H13.3262Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.04199 9.63891C1.04199 4.86531 5.07968 1.04166 10.0003 1.04166C14.921 1.04166 18.9587 4.86531 18.9587 9.63891C18.9587 14.4125 14.921 18.2362 10.0003 18.2362C9.42041 18.2369 8.84228 18.1832 8.27281 18.0763C8.07515 18.0392 7.94957 18.0157 7.85613 18.003C7.81566 17.9974 7.79057 17.9953 7.77688 17.9945L7.78887 17.99C7.78887 17.99 7.78379 17.9912 7.77513 17.9925L7.76819 17.9934C7.77034 17.9935 7.77297 17.9942 7.77688 17.9945C7.76273 17.9999 7.73527 18.0111 7.69012 18.0326C7.59468 18.0779 7.46756 18.1453 7.27294 18.2488C6.07984 18.8833 4.68786 19.1083 3.34529 18.8586C3.1285 18.8182 2.94899 18.6667 2.87293 18.4597C2.79688 18.2527 2.83553 18.021 2.97463 17.8499C3.36447 17.3704 3.63252 16.7927 3.75106 16.171C3.78313 16 3.71055 15.7677 3.48742 15.5412C1.97509 14.0054 1.04199 11.9287 1.04199 9.63891ZM10.0003 2.29166C5.71727 2.29166 2.29199 5.60728 2.29199 9.63891C2.29199 11.5798 3.08112 13.3471 4.37804 14.6641C4.77323 15.0653 5.11369 15.691 4.9793 16.4032L4.9791 16.4042C4.89253 16.8588 4.7452 17.2972 4.5424 17.707C5.28728 17.6894 6.02474 17.4968 6.68603 17.1452L6.69892 17.1383L6.70171 17.1368C6.87883 17.0426 7.03028 16.9621 7.15384 16.9034C7.274 16.8463 7.42399 16.7817 7.5864 16.7568C7.74453 16.7327 7.89817 16.747 8.02603 16.7646C8.15379 16.7821 8.31008 16.8114 8.48888 16.845L8.50353 16.8477C8.99685 16.9404 9.49749 16.9868 9.99949 16.9862C14.2826 16.9862 17.7087 13.6706 17.7087 9.63891C17.7087 5.60728 14.2834 2.29166 10.0003 2.29166Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FilesTabIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.12533 11.6667C8.12533 11.3215 7.8455 11.0417 7.50033 11.0417C7.15515 11.0417 6.87533 11.3215 6.87533 11.6667C6.87533 12.9323 7.90134 13.9583 9.16699 13.9583H10.8337C12.0993 13.9583 13.1253 12.9323 13.1253 11.6667C13.1253 11.3215 12.8455 11.0417 12.5003 11.0417C12.1551 11.0417 11.8753 11.3215 11.8753 11.6667C11.8753 12.242 11.409 12.7083 10.8337 12.7083H9.16699C8.5917 12.7083 8.12533 12.242 8.12533 11.6667Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.29033 1.04166H11.7103C12.459 1.04163 13.0834 1.04161 13.5791 1.10825C14.1022 1.17859 14.5746 1.33331 14.9541 1.71287C15.3337 2.09243 15.4884 2.56476 15.5587 3.08793C15.6141 3.49938 15.6234 3.99951 15.625 4.58586C15.6886 4.6107 15.7513 4.63866 15.8132 4.67018C16.3228 4.92984 16.7371 5.34416 16.9968 5.85377C17.1627 6.17938 17.23 6.52805 17.2615 6.9141C17.2909 7.27329 17.292 7.7122 17.292 8.24537L17.3013 8.25118C17.7518 8.53425 18.1327 8.9152 18.4158 9.36571C18.7124 9.83768 18.8394 10.3684 18.8999 10.9914C18.9587 11.5978 18.9587 12.3538 18.9587 13.3008V13.3659C18.9587 14.3128 18.9587 15.0689 18.8999 15.6753C18.8394 16.2983 18.7124 16.829 18.4158 17.3009C18.1327 17.7515 17.7518 18.1324 17.3013 18.4155C16.8293 18.712 16.2986 18.8391 15.6756 18.8995C15.0692 18.9583 14.3132 18.9583 13.3662 18.9583H6.63443C5.6875 18.9583 4.93146 18.9583 4.32502 18.8995C3.70203 18.8391 3.17135 18.712 2.69938 18.4155C2.24887 18.1324 1.86792 17.7515 1.58484 17.3009C1.28829 16.829 1.16121 16.2983 1.10079 15.6753C1.04198 15.0689 1.04198 14.3128 1.04199 13.3659V13.3008C1.04198 12.3538 1.04198 11.5978 1.10079 10.9914C1.16121 10.3684 1.28829 9.83768 1.58484 9.36571C1.86792 8.9152 2.24887 8.53425 2.69938 8.25118L2.70866 8.24537C2.70869 7.71221 2.70977 7.27329 2.73912 6.9141C2.77066 6.52805 2.83794 6.17938 3.00385 5.85377C3.26351 5.34416 3.67783 4.92984 4.18744 4.67018C4.24931 4.63866 4.31201 4.61069 4.37564 4.58586C4.37722 3.99951 4.3866 3.49937 4.44192 3.08793C4.51226 2.56476 4.66698 2.09243 5.04654 1.71287C5.4261 1.33331 5.89843 1.17859 6.42159 1.10825C6.91724 1.04161 7.54161 1.04163 8.29033 1.04166ZM14.3199 3.25449C14.3589 3.54437 14.3705 3.90537 14.3739 4.38476C14.0803 4.37498 13.744 4.37499 13.3598 4.37499H6.64081C6.25662 4.37499 5.92034 4.37498 5.62677 4.38476C5.6302 3.90537 5.6418 3.54437 5.68077 3.25449C5.73248 2.86993 5.82183 2.70535 5.93042 2.59676C6.03902 2.48816 6.2036 2.39881 6.58815 2.34711C6.99068 2.29299 7.53032 2.29166 8.33366 2.29166H11.667C12.4703 2.29166 13.01 2.29299 13.4125 2.34711C13.7971 2.39881 13.9616 2.48816 14.0702 2.59676C14.1788 2.70535 14.2682 2.86993 14.3199 3.25449ZM16.041 7.81257C16.039 7.48556 16.0332 7.22974 16.0157 7.01589C15.9905 6.70714 15.9442 6.54129 15.883 6.42125C15.7432 6.14685 15.5201 5.92376 15.2457 5.78394C15.1257 5.72278 14.9598 5.67652 14.6511 5.6513C14.335 5.62548 13.9274 5.62499 13.3337 5.62499H6.66699C6.07329 5.62499 5.6656 5.62548 5.34956 5.6513C5.04081 5.67652 4.87496 5.72278 4.75492 5.78394C4.48052 5.92376 4.25742 6.14685 4.11761 6.42125C4.05645 6.54129 4.01019 6.70714 3.98497 7.01589C3.96749 7.22974 3.96162 7.48556 3.95965 7.81257C4.07788 7.79416 4.19958 7.77929 4.32502 7.76713C4.93146 7.70831 5.68751 7.70832 6.63444 7.70832H13.3662C14.3131 7.70832 15.0692 7.70831 15.6756 7.76713C15.8011 7.77929 15.9228 7.79416 16.041 7.81257ZM3.36442 9.30958C3.60394 9.15908 3.91627 9.06263 4.44568 9.01129C4.98471 8.95901 5.6801 8.95832 6.66699 8.95832H13.3337C14.3206 8.95832 15.0159 8.95901 15.555 9.01129C16.0844 9.06263 16.3967 9.15908 16.6362 9.30958C16.9277 9.49275 17.1742 9.73924 17.3574 10.0308C17.5079 10.2703 17.6044 10.5826 17.6557 11.112C17.708 11.651 17.7087 12.3464 17.7087 13.3333C17.7087 14.3202 17.708 15.0156 17.6557 15.5546C17.6044 16.0841 17.5079 16.3964 17.3574 16.6359C17.1742 16.9274 16.9277 17.1739 16.6362 17.3571C16.3967 17.5076 16.0844 17.604 15.555 17.6554C15.0159 17.7076 14.3206 17.7083 13.3337 17.7083H6.66699C5.6801 17.7083 4.98471 17.7076 4.44568 17.6554C3.91627 17.604 3.60394 17.5076 3.36442 17.3571C3.07291 17.1739 2.82642 16.9274 2.64325 16.6359C2.49275 16.3964 2.3963 16.0841 2.34496 15.5546C2.29268 15.0156 2.29199 14.3202 2.29199 13.3333C2.29199 12.3464 2.29268 11.651 2.34496 11.112C2.3963 10.5826 2.49275 10.2703 2.64325 10.0308C2.82642 9.73924 3.07291 9.49275 3.36442 9.30958Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CalendarTabIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.16634 10.2083C8.82116 10.2083 8.54134 10.4881 8.54134 10.8333C8.54134 11.1785 8.82116 11.4583 9.16634 11.4583H13.333C13.6782 11.4583 13.958 11.1785 13.958 10.8333C13.958 10.4881 13.6782 10.2083 13.333 10.2083H9.16634Z"
        fill="currentColor"
      />
      <path
        d="M6.66634 10.2083C6.32116 10.2083 6.04134 10.4881 6.04134 10.8333C6.04134 11.1785 6.32116 11.4583 6.66634 11.4583H6.67383C7.019 11.4583 7.29883 11.1785 7.29883 10.8333C7.29883 10.4881 7.019 10.2083 6.67383 10.2083H6.66634Z"
        fill="currentColor"
      />
      <path
        d="M6.66634 13.5417C6.32116 13.5417 6.04134 13.8215 6.04134 14.1667C6.04134 14.5118 6.32116 14.7917 6.66634 14.7917H10.833C11.1782 14.7917 11.458 14.5118 11.458 14.1667C11.458 13.8215 11.1782 13.5417 10.833 13.5417H6.66634Z"
        fill="currentColor"
      />
      <path
        d="M13.3255 13.5417C12.9803 13.5417 12.7005 13.8215 12.7005 14.1667C12.7005 14.5118 12.9803 14.7917 13.3255 14.7917H13.333C13.6782 14.7917 13.958 14.5118 13.958 14.1667C13.958 13.8215 13.6782 13.5417 13.333 13.5417H13.3255Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.62467 1.66666C5.62467 1.32148 5.34485 1.04166 4.99967 1.04166C4.6545 1.04166 4.37467 1.32148 4.37467 1.66666V2.19565C3.70404 2.38572 3.13842 2.69465 2.66763 3.20362C2.01937 3.90444 1.73122 4.78993 1.59322 5.89958C1.45799 6.98691 1.458 8.38038 1.45801 10.1584V10.675C1.458 12.4529 1.45799 13.8464 1.59322 14.9337C1.73122 16.0434 2.01937 16.9289 2.66763 17.6297C3.32229 18.3374 4.16031 18.6584 5.20908 18.8108C6.22411 18.9584 7.52096 18.9583 9.15737 18.9583H10.842C12.4784 18.9583 13.7752 18.9584 14.7903 18.8108C15.839 18.6584 16.6771 18.3374 17.3317 17.6297C17.98 16.9289 18.2681 16.0434 18.4061 14.9337C18.5414 13.8464 18.5413 12.4529 18.5413 10.6749V10.1584C18.5413 8.38039 18.5414 6.98692 18.4061 5.89958C18.2681 4.78993 17.98 3.90444 17.3317 3.20362C16.8609 2.69465 16.2953 2.38572 15.6247 2.19565V1.66666C15.6247 1.32148 15.3449 1.04166 14.9997 1.04166C14.6545 1.04166 14.3747 1.32148 14.3747 1.66666V1.97157C13.428 1.87497 12.263 1.87498 10.842 1.87499H9.15738C7.73636 1.87498 6.57139 1.87497 5.62467 1.97157V1.66666ZM3.58525 4.05243C3.80137 3.81879 4.05908 3.63991 4.39851 3.50486C4.47306 3.76664 4.71398 3.95832 4.99967 3.95832C5.34485 3.95832 5.62467 3.6785 5.62467 3.33332V3.22881C6.50885 3.12629 7.65165 3.12499 9.20801 3.12499H10.7913C12.3477 3.12499 13.4905 3.12629 14.3747 3.22881V3.33332C14.3747 3.6785 14.6545 3.95832 14.9997 3.95832C15.2854 3.95832 15.5263 3.76664 15.6008 3.50486C15.9403 3.63992 16.198 3.81879 16.4141 4.05243C16.8076 4.47788 17.0409 5.06112 17.1642 6.04166H2.83518C2.95844 5.06112 3.19171 4.47788 3.58525 4.05243ZM2.74044 7.29166C2.70847 8.08906 2.70801 9.04233 2.70801 10.2027V10.6306C2.70801 12.4625 2.70915 13.7783 2.83366 14.7795C2.95652 15.7674 3.19008 16.3537 3.58525 16.7809C3.97402 17.2012 4.49741 17.4442 5.38887 17.5738C6.30364 17.7068 7.50957 17.7083 9.20801 17.7083H10.7913C12.4898 17.7083 13.6957 17.7068 14.6105 17.5738C15.5019 17.4442 16.0253 17.2012 16.4141 16.7809C16.8093 16.3537 17.0428 15.7674 17.1657 14.7795C17.2902 13.7783 17.2913 12.4625 17.2913 10.6306V10.2027C17.2913 9.04233 17.2909 8.08906 17.2589 7.29166H2.74044Z"
        fill="currentColor"
      />
    </svg>
  );
}

type ApiTicketSetting = {
  id: string;
  key: string;
  label: string;
  color: string;
  sortOrder?: number;
};

function mapTicketSettingToDropdownOption(setting: ApiTicketSetting) {
  return {
    label: setting.label,
    value: setting.key,
    icon: (
      <span
        className="inline-block h-2.25 w-2.5 rounded-full"
        style={{
          backgroundColor: setting.color,
        }}
      />
    ),
  };
}
async function fetchTicketStatuses() {
  const response = await fetch('/api/ticket-statuses', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketSetting[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch ticket statuses.'
        : 'Failed to fetch ticket statuses.',
    );
  }

  return payload;
}

async function fetchTicketPriorities() {
  const response = await fetch('/api/ticket-priorities', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketSetting[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch ticket priorities.'
        : 'Failed to fetch ticket priorities.',
    );
  }

  return payload;
}

function getTicketStatusColor(status: string, statuses?: ApiTicketSetting[]) {
  const normalizedStatus = normalizeStatusValue(status);

  return statuses?.find((item) => {
    return (
      normalizeStatusValue(item.label) === normalizedStatus ||
      normalizeStatusValue(item.key) === normalizedStatus
    );
  })?.color;
}

function normalizeStatusValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
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

function CloseCrossIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 5L15 15M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProjectDetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div
      className="relative z-100 h-dvh overflow-hidden py-5 pr-5"
      aria-hidden="true"
    >
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-3xl border border-white bg-white/40 p-3">
        {/* Back button */}
        {/* <div className="shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
            aria-hidden="false"
          >
            <BackArrowIcon />
            Back
          </button>
        </div> */}

        {/* Project detail card */}
        <div className="flex min-h-0 min-w-0 flex-1 animate-pulse flex-col gap-4 overflow-hidden rounded-[20px] bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5">
          {/* Project summary */}
          <section className="w-full shrink-0">
            <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
              <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200 sm:h-19 sm:w-19" />

              <div className="min-w-0 flex-1">
                {/* Name and category */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="h-5 w-40 rounded bg-gray-200" />
                  <div className="h-6 w-24 rounded-full bg-gray-100" />
                </div>

                {/* Summary metrics */}
                <div className="mt-3 flex max-w-full flex-wrap items-center gap-x-5 gap-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-200" />
                      <div
                        className={`h-3.5 rounded bg-gray-200 ${
                          index === 1 ? 'w-20' : 'w-12'
                        }`}
                      />
                      <div className="h-4 w-6 rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <div className="flex shrink-0 overflow-hidden border-y border-gray-200">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={`border-b-2 px-4 py-3 ${
                  index === 0 ? 'border-gray-300' : 'border-transparent'
                }`}
              >
                <div
                  className={`h-4 rounded bg-gray-200 ${
                    index === 3 ? 'w-16' : 'w-12'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Active tab content */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
            {/* Search/filter row */}
            <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="h-10 w-full rounded-lg border border-gray-200 bg-gray-100 md:max-w-xs" />

              <div className="flex items-center gap-3">
                <div className="h-10 w-36 rounded-lg border border-gray-200 bg-gray-100" />
                <div className="h-10 w-36 rounded-lg border border-gray-200 bg-gray-100" />
                <div className="h-10 w-28 rounded-full bg-gray-200" />
              </div>
            </div>

            {/* Tickets table */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
              {/* Table header */}
              <div className="grid grid-cols-6 gap-4 border-b border-gray-200 bg-gray-50 px-4 py-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-4 rounded bg-gray-200" />
                ))}
              </div>

              {/* Table rows */}
              <div className="min-h-0 flex-1 overflow-hidden">
                {Array.from({ length: 6 }).map((_, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="grid grid-cols-6 gap-4 border-b border-gray-200 px-4 py-4 last:border-b-0"
                  >
                    {Array.from({ length: 6 }).map((_, cellIndex) => (
                      <div
                        key={cellIndex}
                        className={`h-4 rounded ${
                          cellIndex === 3 || cellIndex === 4
                            ? 'bg-gray-200'
                            : 'bg-gray-100'
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                <div className="h-8 w-32 rounded bg-gray-100" />
                <div className="flex gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-8 w-8 rounded-md bg-gray-100"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
