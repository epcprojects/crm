'use client';

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { SearchIcon, PlusIcon } from '../../../../../public/icons';
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
  useProjectThreadDetailQuery,
  useProjectTicketsQuery,
  useProjectThreadQuery,
  useUploadProjectFilesMutation,
  useProjectsQuery,
} from '../projects.queries';
import {
  PermissionGuard,
  usePermissions,
} from '../../../providers/PermissionProvider';
import { useAppSelector } from '../../../Redux/store';
import Calendar from '../../../../components/calendar/Calendar';
const projectTabs = ['Tickets', 'Thread', 'Files', 'Calendar'] as const;

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
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
    pageSize: 12,
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
    ticketsPagination.pageIndex + 1,
    ticketsPagination.pageSize,
    canViewTickets,
  );
  const uploadProjectFilesMutation = useUploadProjectFilesMutation();
  const deleteProjectFileMutation = useDeleteProjectFileMutation();
  const projectsQuery = useProjectsQuery(canCreateTicket);
  const ticketStatusesQuery = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: fetchTicketStatuses,
    enabled: canViewTickets,
  });
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

  const projectTickets = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    const tickets = (projectTicketsQuery.data?.items ?? []).map((ticket) => ({
      ...ticket,
      statusColor: getTicketStatusColor(
        ticket.status,
        ticketStatusesQuery.data,
      ),
    }));

    return tickets.filter((ticket) => {
      if (!normalizedSearch) return true;

      return (
        (ticket.ticketRefNo ?? ticket.id)
          .toLowerCase()
          .includes(normalizedSearch) ||
        ticket.title.toLowerCase().includes(normalizedSearch) ||
        ticket.assignee.name.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [projectTicketsQuery.data?.items, searchValue]);

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

  if (projectDetailQuery.isLoading) {
    return <ProjectDetailSkeleton onBack={() => router.back()} />;
  }

  if (!canViewProjectDetail) {
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
          You do not have permission to view project details.
        </div>
      </div>
    );
  }

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
  const projectSummaryStats = [
    ...(canViewTickets
      ? [
          {
            title: 'Tickets',
            count: projectTicketsQuery.data?.meta.total ?? 0,
            color: '#F04438',
          },
        ]
      : []),
    ...(canViewThread
      ? [
          {
            title: 'Thread Posts',
            count: projectThreadQuery.data?.length ?? 0,
            color: '#F79009',
          },
        ]
      : []),
    ...(canViewFiles
      ? [
          {
            title: 'Files',
            count:
              uploadedFilesState.length + (projectFilesQuery.data?.length ?? 0),
            color: '#17B26A',
          },
        ]
      : []),
  ];
  return (
    <>
      <div className="relative z-100 h-full xl:h-dvh overflow-hidden xl:py-5 xl:pr-5 px-4 pt-2 pb-0 p-4">
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 xl:overflow-hidden xl:rounded-3xl xl:border xl:border-white xl:bg-white/40 xl:p-3">
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
            >
              <BackArrowIcon />
              Back
            </button>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden rounded-[20px] bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5">
            <section className="w-full shrink-0">
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
            </section>

            <TabGroup className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
              <TabList className="flex shrink-0 overflow-x-auto scrollbar-hide border-y border-gray-200">
                {visibleProjectTabs.map((tab) => (
                  <Tab
                    key={tab}
                    className={({ selected }) =>
                      clsx(
                        'shrink-0 border-b-2 px-2 xl:px-4 py-3 text-sm font-semibold outline-none transition',
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

              <TabPanels className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <PermissionGuard permission="tickets.view_list">
                  <TabPanel className="flex h-full min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
                    <div className="flex shrink-0 flex-col gap-3 rounded-xl md:flex-row md:items-center md:justify-between">
                      {canFilterTickets ? (
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
                      ) : null}

                      {canCreateTicket ? (
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
              canPostThreadMessage ? handleSubmitReply : undefined
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
              canPostThreadReply ? handleSubmitThreadReply : undefined
            }
            isSubmittingReply={
              createProjectThreadMutation.isPending &&
              Boolean(selectedThreadMessageId)
            }
            canCompose={canPostThreadReply}
            canAttachFile={canAttachThreadFile && canPostThreadReply}
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

type ApiTicketStatus = {
  id: string;
  key: string;
  label: string;
  color: string;
};

async function fetchTicketStatuses() {
  const response = await fetch('/api/ticket-statuses', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketStatus[]
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

function getTicketStatusColor(status: string, statuses?: ApiTicketStatus[]) {
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
        <div className="shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
            aria-hidden="false"
          >
            <BackArrowIcon />
            Back
          </button>
        </div>

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
                  index === 0
                    ? 'border-gray-300'
                    : 'border-transparent'
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
                  <div
                    key={index}
                    className="h-4 rounded bg-gray-200"
                  />
                ))}
              </div>

              {/* Table rows */}
              <div className="min-h-0 flex-1 overflow-hidden">
                {Array.from({ length: 6 }).map((_, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="grid grid-cols-6 gap-4 border-b border-gray-200 px-4 py-4 last:border-b-0"
                  >
                    {Array.from({ length: 6 }).map(
                      (_, cellIndex) => (
                        <div
                          key={cellIndex}
                          className={`h-4 rounded ${
                            cellIndex === 3 || cellIndex === 4
                              ? 'bg-gray-200'
                              : 'bg-gray-100'
                          }`}
                        />
                      ),
                    )}
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
