'use client';

import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Popover,
  PopoverButton,
  PopoverPanel,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react';

import {
  InfiniteData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedValue } from '../../../../components/hooks/useDebouncedValue';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import clsx from 'clsx';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../../components/modals/CreateTicketModal';
import UploadFileModal, {
  type UploadFileFormValues,
} from '../../../../components/modals/UploadFileModal';
import { uploadFilesDirectly } from '../../../../lib/attachments';
import ConfirmActionModal from '../../../../components/modals/ConfirmActionModal';
import ProjectThreadPanel from '../../../../components/discussion/ProjectThreadPanel';
import type {
  DiscussionAttachment,
  DiscussionReaction,
  DiscussionReply,
} from '../../../../components/discussion/types';
import ProjectFilesPanel, {
  type ProjectFileRecord,
} from '../../../../components/projects/ProjectFilesPanel';
import RichTextEditor from '../../../../components/RichTextEditor';
import { createTicketProjectOptions } from '../../../../components/modals/create-ticket-modal.data';
import RecentTicketsTable, {
  type RecentTicket,
} from '../../../../components/tables/RecentTicketsTable';
import TicketsKanbanView, {
  TicketsKanbanSkeleton,
} from '../../../../components/tickets/TicketsKanbanView';
import { appToast } from '../../../../components/toast/AppToast';
import {
  EditIcon,
  FiltersIcon,
  SearchIcon,
  PlusIcon,
  ThreedotIcon,
  TicketsIcon,
  TrashIcon,
  CloseIcon,
  ThreadIcon,
  FeatureIcon,
  BugIcon,
} from '../../../../../public/icons';
import Dropdown from '../../../../components/ui/ThemeDropDown';
import ThemeButton from '../../../../components/ui/ThemeButton';
import { useIsMobile } from '../../../../components/hooks/useIsMobile';
import { useThread } from '../../../../components/hooks/useThread';
import { useAppLoader } from '../../../providers/AppLoaderProvider';
import { createTicket } from '../../../../lib/tickets';
import {
  projectsQueryKey,
  projectTicketsQueryKey,
  projectThreadQueryKey,
  projectThreadDetailQueryKey,
  type ProjectThreadPage,
  type ProjectNoteRecord,
  flattenProjectThreadPages,
  useCreateProjectNoteMutation,
  useDeleteProjectNoteMutation,
  useDeleteProjectFileMutation,
  useDeleteTicketMutation,
  useProjectDetailQuery,
  useProjectFilesQuery,
  useProjectNamesQuery,
  useProjectNoteDetailQuery,
  useProjectNotesQuery,
  useProjectThreadDetailQuery,
  useProjectThreadInfiniteQuery,
  useProjectTicketsQuery,
  useUpdateProjectNoteMutation,
  useUploadProjectFilesMutation,
  projectFilesQueryKey,
  fetchProjectKanbanBoard,
  fetchProjectKanbanCounts,
  ProjectKanbanBoardData,
} from '../projects.queries';
import {
  PermissionGuard,
  usePermissions,
} from '../../../providers/PermissionProvider';
import { useAppSelector } from '../../../Redux/store';
import Calendar from '../../../../components/calendar/Calendar';
import DashboardSummaryBanner from '../../../../components/ui/DashboardSummaryBanner';
import EmptyState from '../../../../components/EmptyState';
import AppModal from '../../../../components/modals/AppModal';
import { fetchProjectMembers } from '../../../../lib/project-members';
import { RecentTicketsTableSkeleton } from '../../dashboard/page';
import { KanbanViewIcon, TableViewIcon } from '../../tickets/page';

const projectTabs = [
  'Tickets',
  'Thread',
  'Files',
  'Calendar',
  'Notes',
] as const;
const projectTabQueryParamMap: Record<
  (typeof projectTabs)[number],
  string | null
> = {
  Tickets: null,
  Thread: '1',
  Files: '2',
  Calendar: '3',
  Notes: '4',
};
const PROJECT_TICKETS_STATUS_QUERY_PARAM = 'ticketStatus';
const PROJECT_TICKETS_PRIORITY_QUERY_PARAM = 'ticketPriority';
const PROJECT_TICKETS_PAGE_SIZE_QUERY_PARAM = 'size';
const PROJECT_TICKETS_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const PROJECT_TICKETS_VIEW_QUERY_PARAM = 'ticketView';
const PROJECT_NOTES_LIMIT = 50;
const MAX_PROJECT_NOTE_DESCRIPTION_LENGTH = 4000;
const PROJECT_KANBAN_PAGE_SIZE = 20;
const PROJECT_TICKETS_TYPE_QUERY_PARAM = 'ticketType';

type SocketTokenResponse = {
  accessToken: string;
  socketUrl: string;
};
type ProjectTicketsCacheData = {
  items: RecentTicket[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setLoading } = useAppLoader();
  const isMobile = useIsMobile();
  const currentUserId = useAppSelector((state) => state.auth.user?.id ?? '');
  const { hasPermission } = usePermissions();
  const canViewProjectDetail = hasPermission('projects.view_detail');
  const canViewTickets = hasPermission('tickets.view_list');
  const canViewTicketDetail = hasPermission('tickets.view_detail');
  const canCreateTicket = hasPermission('tickets.create');
  const canDeleteTicket = hasPermission('tickets.delete');
  const canFilterTickets = hasPermission('tickets.filter');
  const canViewThread = hasPermission('thread.view');
  const canEditThread = hasPermission('thread.edit');
  const canViewThreadReplies = hasPermission('thread.view_replies');
  const canDeleteThread = hasPermission('thread.delete');
  const canPostThreadMessage = hasPermission('thread.post_message');
  const canPostThreadReply = hasPermission('thread.post_reply');
  const canAttachThreadFile = hasPermission('thread.attach_file');
  const canViewFiles = hasPermission('files.view');
  const canUploadFiles = hasPermission('files.upload');
  const canDownloadFiles = hasPermission('files.download');
  const canViewCalendar = hasPermission('calendar.view_grid');
  const canViewProjectNotesList = hasPermission('projects_notes.view_list');
  const canViewProjectNoteDetail = hasPermission('projects_notes.view_detail');
  const canCreateProjectNote = hasPermission('projects_notes.create');
  const canEditProjectNote = hasPermission('projects_notes.edit');
  const canDeleteProjectNote = hasPermission('projects_notes.delete');
  const canEditTicketStatus = hasPermission('tickets.edit_status');
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [ticketToDelete, setTicketToDelete] = useState<RecentTicket | null>(
    null,
  );
  const debouncedSearchValue = useDebouncedValue(searchValue);
  const [fileSearchValue, setFileSearchValue] = useState('');
  const [notesSearchValue, setNotesSearchValue] = useState('');
  const debouncedNotesSearchValue = useDebouncedValue(notesSearchValue);
  const [loadingProjectKanbanStatuses, setLoadingProjectKanbanStatuses] =
    useState<Record<string, boolean>>({});

  const loadingProjectKanbanStatusesRef = useRef<Record<string, boolean>>({});
  const [uploadedFilesState, setUploadedFilesState] = useState<
    ProjectFileRecord[]
  >([]);
  const [fileToDelete, setFileToDelete] = useState<ProjectFileRecord | null>(
    null,
  );
  const [selectedThreadMessageId, setSelectedThreadMessageId] = useState('');
  const [selectedProjectNoteId, setSelectedProjectNoteId] = useState('');
  const [isProjectNoteMobileModalOpen, setIsProjectNoteMobileModalOpen] =
    useState(false);
  const [isCreatingProjectNote, setIsCreatingProjectNote] = useState(false);
  const [isEditingProjectNote, setIsEditingProjectNote] = useState(false);
  const [pendingProjectNoteEditId, setPendingProjectNoteEditId] = useState('');
  const [deletingThreadReplyId, setDeletingThreadReplyId] = useState('');
  const [editingThreadReplyId, setEditingThreadReplyId] = useState('');
  const [projectNoteTitleDraft, setProjectNoteTitleDraft] = useState('');
  const [projectNoteDescriptionDraft, setProjectNoteDescriptionDraft] =
    useState('');
  const [projectNoteToDelete, setProjectNoteToDelete] =
    useState<ProjectNoteRecord | null>(null);
  const [threadSocketToken, setThreadSocketToken] =
    useState<SocketTokenResponse | null>(null);
  const [ticketsPagination, setTicketsPagination] = useState(() => {
    const requestedPageSize = Number(
      searchParams.get(PROJECT_TICKETS_PAGE_SIZE_QUERY_PARAM),
    );

    return {
      pageIndex: 0,
      pageSize: PROJECT_TICKETS_PAGE_SIZE_OPTIONS.includes(requestedPageSize)
        ? requestedPageSize
        : 10,
    };
  });
  const handleProjectTicketsPaginationChange = (
    nextPagination: typeof ticketsPagination,
  ) => {
    setTicketsPagination(nextPagination);

    const nextSearchParams = new URLSearchParams(searchParams.toString());

    nextSearchParams.set(
      PROJECT_TICKETS_PAGE_SIZE_QUERY_PARAM,
      String(nextPagination.pageSize),
    );

    const nextQueryString = nextSearchParams.toString();

    router.replace(
      nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
      {
        scroll: false,
      },
    );
  };
  const projectId = String(params?.projectId ?? '');
  const selectedStatus = getDashboardStatusFilterValue(
    searchParams.get(PROJECT_TICKETS_STATUS_QUERY_PARAM),
  );
  const selectedPriority = getProjectTicketFilterValue(
    searchParams.get(PROJECT_TICKETS_PRIORITY_QUERY_PARAM),
  );
  const selectedTicketType = getProjectTicketTypeFilterValue(
    searchParams.get(PROJECT_TICKETS_TYPE_QUERY_PARAM),
  );

  const ticketTypeFilterOptions = [
    { label: 'All Types', value: 'all' },
    { label: 'Bug', value: 'bug', icon: <BugIcon /> },
    { label: 'Feature', value: 'feature_request', icon: <FeatureIcon /> },
  ];
  const projectTicketsViewMode =
    searchParams.get(PROJECT_TICKETS_VIEW_QUERY_PARAM) === 'kanban'
      ? 'kanban'
      : 'table';
  const hasShownError = useRef(false);
  const queryClient = useQueryClient();
  const updateProjectThreadReplyCount = (
    threadId: string,
    updateCount: (currentCount: number) => number,
  ) => {
    queryClient.setQueryData<InfiniteData<ProjectThreadPage>>(
      [...projectThreadQueryKey, projectId, currentUserId],
      (currentReplies) =>
        currentReplies
          ? {
              ...currentReplies,
              pages: currentReplies.pages.map((page) => ({
                ...page,
                threads: page.threads.map((reply) =>
                  reply.id === threadId
                    ? {
                        ...reply,
                        replyCount: Math.max(
                          0,
                          updateCount(reply.replyCount ?? 0),
                        ),
                      }
                    : reply,
                ),
              })),
            }
          : currentReplies,
    );
  };
  const projectDetailQuery = useProjectDetailQuery(
    projectId,
    canViewProjectDetail,
  );
  const shouldRedirectToNotFound =
    projectDetailQuery.isError && isNotFoundError(projectDetailQuery.error);
  const projectThreadQuery = useProjectThreadInfiniteQuery(
    projectId,
    currentUserId,
    canViewThread,
  );
  const projectThreadDetailQuery = useProjectThreadDetailQuery(
    projectId,
    selectedThreadMessageId,
    currentUserId,
    canViewThread,
  );
  const projectMembersQuery = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: Boolean(projectId && (canPostThreadMessage || canPostThreadReply)),
  });

  const projectFilesQuery = useProjectFilesQuery(projectId, canViewFiles);
  const createProjectNoteMutation = useCreateProjectNoteMutation();
  const updateProjectNoteMutation = useUpdateProjectNoteMutation();
  const deleteProjectNoteMutation = useDeleteProjectNoteMutation();
  const deleteTicketMutation = useDeleteTicketMutation();
  const projectNotesQuery = useProjectNotesQuery(
    projectId,
    {
      page: 1,
      limit: PROJECT_NOTES_LIMIT,
      search: debouncedNotesSearchValue.trim() || undefined,
    },
    canViewProjectNotesList,
  );
  const projectNoteDetailQuery = useProjectNoteDetailQuery(
    projectId,
    selectedProjectNoteId,
    canViewProjectNoteDetail && !isCreatingProjectNote,
  );
  const projectTicketsQuery = useProjectTicketsQuery(
    projectId,
    {
      page: ticketsPagination.pageIndex + 1,
      limit: ticketsPagination.pageSize,
      search: debouncedSearchValue.trim() || undefined,
      statusKey: selectedStatus === 'all' ? undefined : selectedStatus,
      priorityKey: selectedPriority === 'all' ? undefined : selectedPriority,
      ticketType: selectedTicketType === 'all' ? undefined : selectedTicketType,
    },
    canViewTickets && projectTicketsViewMode === 'table',
  );
  const projectKanbanPriorityKey =
    selectedPriority === 'all' ? undefined : selectedPriority;

  const projectKanbanTicketType =
    selectedTicketType === 'all' ? undefined : selectedTicketType;

  const projectKanbanSearch = debouncedSearchValue.trim() || undefined;

  const projectKanbanBoardQueryKey = [
    'project-kanban-board',
    projectId,
    projectKanbanPriorityKey ?? 'all',
    projectKanbanTicketType ?? 'all',
    projectKanbanSearch ?? '',
  ] as const;

  const projectKanbanBoardQuery = useQuery({
    queryKey: projectKanbanBoardQueryKey,
    queryFn: () =>
      fetchProjectKanbanBoard({
        projectId,
        priorityKey: projectKanbanPriorityKey,
        ticketType: projectKanbanTicketType,
        search: projectKanbanSearch,
        limit: PROJECT_KANBAN_PAGE_SIZE,
      }),
    enabled:
      Boolean(projectId) &&
      canViewTickets &&
      projectTicketsViewMode === 'kanban',
  });

  const projectKanbanCountsQuery = useQuery({
    queryKey: [
      'project-kanban-counts',
      projectId,
      projectKanbanPriorityKey ?? 'all',
      projectKanbanTicketType ?? 'all',
      projectKanbanSearch ?? '',
    ],
    queryFn: () =>
      fetchProjectKanbanCounts({
        projectId,
        priorityKey: projectKanbanPriorityKey,
        ticketType: projectKanbanTicketType,
        search: projectKanbanSearch,
      }),
    enabled:
      Boolean(projectId) &&
      canViewTickets &&
      projectTicketsViewMode === 'kanban',
  });
  const projectKanbanTickets = useMemo(
    () => Object.values(projectKanbanBoardQuery.data?.items ?? {}).flat(),
    [projectKanbanBoardQuery.data?.items],
  );
  const handleLoadMoreProjectKanbanStatus = async (statusKey: string) => {
    const currentBoard = queryClient.getQueryData<ProjectKanbanBoardData>(
      projectKanbanBoardQueryKey,
    );

    if (!currentBoard) {
      return;
    }

    const existingTickets = currentBoard.items[statusKey] ?? [];

    const loadedCount = existingTickets.length;

    const totalCount = projectKanbanCountsQuery.data?.[statusKey] ?? 0;

    const backendHasMore =
      currentBoard.hasMore[statusKey] ?? loadedCount < totalCount;

    if (
      loadedCount >= totalCount ||
      !backendHasMore ||
      loadingProjectKanbanStatusesRef.current[statusKey]
    ) {
      return;
    }

    loadingProjectKanbanStatusesRef.current[statusKey] = true;

    const nextPage = (currentBoard.pageByStatus[statusKey] ?? 1) + 1;

    setLoadingProjectKanbanStatuses((current) => ({
      ...current,
      [statusKey]: true,
    }));

    try {
      const nextPageData = await queryClient.fetchQuery({
        queryKey: [
          'project-kanban-board-page',
          projectId,
          statusKey,
          nextPage,
          PROJECT_KANBAN_PAGE_SIZE,
          projectKanbanPriorityKey ?? 'all',
          projectKanbanTicketType ?? 'all',
          projectKanbanSearch ?? '',
        ],
        queryFn: () =>
          fetchProjectKanbanBoard({
            projectId,
            statusKey,
            page: nextPage,
            limit: PROJECT_KANBAN_PAGE_SIZE,
            priorityKey: projectKanbanPriorityKey,
            ticketType: projectKanbanTicketType,
            search: projectKanbanSearch,
          }),
      });

      queryClient.setQueryData<ProjectKanbanBoardData>(
        projectKanbanBoardQueryKey,
        (current) => {
          if (!current) {
            return current;
          }

          const currentTickets = current.items[statusKey] ?? [];

          const targetStatus = statusMetadataByKey.get(statusKey);

          const incomingTickets = (nextPageData.items[statusKey] ?? []).map(
            (ticket) => ({
              ...ticket,
              status: targetStatus?.label ?? ticket.status ?? statusKey,
              statusColor: targetStatus?.color ?? ticket.statusColor,
            }),
          );

          const existingIds = new Set(
            currentTickets.map((ticket) => ticket.id).filter(Boolean),
          );

          const uniqueIncomingTickets = incomingTickets.filter((ticket) => {
            if (!ticket.id || existingIds.has(ticket.id)) {
              return false;
            }

            existingIds.add(ticket.id);
            return true;
          });

          const nextLoadedCount =
            currentTickets.length + uniqueIncomingTickets.length;

          const statusTotalCount =
            projectKanbanCountsQuery.data?.[statusKey] ?? 0;

          const responseHasMore = nextPageData.hasMore[statusKey] ?? false;

          const shouldLoadMore =
            uniqueIncomingTickets.length > 0 &&
            nextLoadedCount < statusTotalCount &&
            responseHasMore;

          return {
            ...current,
            items: {
              ...current.items,
              [statusKey]: [...currentTickets, ...uniqueIncomingTickets],
            },
            hasMore: {
              ...current.hasMore,
              [statusKey]: shouldLoadMore,
            },
            pageByStatus: {
              ...current.pageByStatus,
              [statusKey]: nextPage,
            },
          };
        },
      );
    } catch (error) {
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to load more project tickets.',
      );
    } finally {
      loadingProjectKanbanStatusesRef.current[statusKey] = false;

      setLoadingProjectKanbanStatuses((current) => ({
        ...current,
        [statusKey]: false,
      }));
    }
  };
  const uploadProjectFilesMutation = useUploadProjectFilesMutation();
  const deleteProjectFileMutation = useDeleteProjectFileMutation();
  const toggleProjectThreadReactionMutation = useMutation({
    mutationFn: async ({
      messageId,
      emoji,
      remove,
    }: {
      messageId: string;
      emoji: string;
      remove: boolean;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/thread/${messageId}/reactions`,
        {
          method: remove ? 'DELETE' : 'POST',
          headers: {
            Accept: 'application/json',
            ...(remove ? {} : { 'Content-Type': 'application/json' }),
          },
          ...(remove ? {} : { body: JSON.stringify({ emoji }) }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          Array.isArray(data?.message) && data.message.length
            ? data.message.join(', ')
            : data?.message || 'Failed to update thread reaction.';
        throw new Error(message);
      }

      return data;
    },
    onError: (error) => {
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update thread reaction.',
      );
    },
  });
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
      {
        label: 'Active',
        value: 'Active',
      },
      ...(ticketStatusesQuery.data ?? []).map(mapTicketSettingToDropdownOption),
    ],
    [ticketStatusesQuery.data],
  );
  const kanbanStatusOptions = useMemo(
    () =>
      (ticketStatusesQuery.data ?? []).map((status) => ({
        id: status.id,
        label: status.label,
        value: status.key,
        color: status.color,
      })),
    [ticketStatusesQuery.data],
  );
  const statusMetadataByKey = useMemo(
    () =>
      new Map(
        (ticketStatusesQuery.data ?? []).map((status) => [
          status.key,
          {
            label: status.label,
            color: status.color,
          },
        ]),
      ),
    [ticketStatusesQuery.data],
  );
  const moveProjectTicketMutation = useMutation({
    mutationFn: async ({
      ticket,
      statusKey,
    }: {
      ticket: RecentTicket;
      statusKey: string;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/tickets/${ticket.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            statusKey,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          Array.isArray(data?.message) && data.message.length
            ? data.message.join(', ')
            : data?.message || 'Failed to update ticket status.';

        throw new Error(message);
      }

      return {
        ticket,
        statusKey,
      };
    },

    onMutate: async ({ ticket, statusKey }) => {
      const projectTicketsKey = [...projectTicketsQueryKey, projectId];

      const nextStatus = statusMetadataByKey.get(statusKey);

      await queryClient.cancelQueries({
        queryKey: projectTicketsKey,
      });

      const previousQueries =
        queryClient.getQueriesData<ProjectTicketsCacheData>({
          queryKey: projectTicketsKey,
        });

      queryClient.setQueriesData<ProjectTicketsCacheData>(
        {
          queryKey: projectTicketsKey,
        },
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            items: current.items.map((currentTicket) =>
              currentTicket.id === ticket.id
                ? {
                    ...currentTicket,
                    status: nextStatus?.label ?? currentTicket.status,
                    statusColor: nextStatus?.color ?? currentTicket.statusColor,
                  }
                : currentTicket,
            ),
          };
        },
      );

      return {
        previousQueries,
      };
    },

    onError: (error, _variables, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });

      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update ticket status.',
      );
    },

    onSuccess: () => {
      appToast.success('Ticket status updated successfully.');
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...projectTicketsQueryKey, projectId],
        }),

        queryClient.invalidateQueries({
          queryKey: ['dashboard-project-tickets'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['project-kanban-board', projectId],
        }),

        queryClient.invalidateQueries({
          queryKey: ['project-kanban-counts', projectId],
        }),

        queryClient.invalidateQueries({
          queryKey: [...projectTicketsQueryKey, projectId],
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
      ]);
    },
  });
  const handleMoveProjectTicket = async (
    ticket: RecentTicket,
    nextStatusKey: string,
  ) => {
    if (!canEditTicketStatus || moveProjectTicketMutation.isPending) {
      return;
    }

    const nextStatus = statusMetadataByKey.get(nextStatusKey);

    if (!nextStatus || ticket.status === nextStatus.label) {
      return;
    }

    await moveProjectTicketMutation.mutateAsync({
      ticket,
      statusKey: nextStatusKey,
    });
  };
  const reorderProjectStatusMutation = useMutation({
    mutationFn: async ({
      statusId,
      newIndex,
    }: {
      statusId: string;
      newIndex: number;
    }) => {
      const response = await fetch('/api/ticket-statuses/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          statusId,
          newIndex,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to reorder ticket statuses.');
      }

      return {
        statusId,
        newIndex,
      };
    },

    onMutate: async ({ statusId, newIndex }) => {
      await queryClient.cancelQueries({
        queryKey: ['ticket-statuses'],
      });

      const previousStatuses = queryClient.getQueryData<ApiTicketSetting[]>([
        'ticket-statuses',
      ]);

      queryClient.setQueryData<ApiTicketSetting[]>(
        ['ticket-statuses'],
        (current) => {
          if (!current) {
            return current;
          }

          const draggedIndex = current.findIndex(
            (status) => status.id === statusId,
          );

          if (draggedIndex === -1) {
            return current;
          }

          const nextOrder = [...current];
          const [draggedStatus] = nextOrder.splice(draggedIndex, 1);

          if (!draggedStatus) {
            return current;
          }

          nextOrder.splice(newIndex, 0, draggedStatus);

          return nextOrder;
        },
      );

      return {
        previousStatuses,
      };
    },

    onError: (error, _variables, context) => {
      if (context?.previousStatuses) {
        queryClient.setQueryData(['ticket-statuses'], context.previousStatuses);
      }

      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to reorder ticket statuses.',
      );
    },

    onSuccess: () => {
      appToast.success('Ticket statuses reordered successfully.');
    },

    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['ticket-statuses'],
      });
    },
  });
  const handleReorderProjectStatusColumn = (
    statusId: string,
    newIndex: number,
  ) => {
    if (!canFilterTickets || reorderProjectStatusMutation.isPending) {
      return;
    }

    reorderProjectStatusMutation.mutate({
      statusId,
      newIndex,
    });
  };
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
      mentionedUserIds,
    }: {
      message: string;
      attachments: File[];
      parentId?: string;
      mentionedUserIds?: string[];
    }) => {
      const uploadedAttachments = attachments.length
        ? await uploadFilesDirectly(
            attachments,
            `projects/${projectId}/threads`,
          )
        : [];

      const response = await fetch(`/api/projects/${projectId}/thread`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          parentId: parentId?.trim(),
          mentionedUserIds,
          attachments: uploadedAttachments,
        }),
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
      if (variables.parentId) {
        updateProjectThreadReplyCount(
          variables.parentId,
          (currentCount) => currentCount + 1,
        );
      }

      const invalidations: Promise<unknown>[] = [
        queryClient.invalidateQueries({
          queryKey: [...projectThreadQueryKey, projectId],
        }),
      ];

      if (variables.parentId) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [
              ...projectThreadDetailQueryKey,
              projectId,
              variables.parentId,
            ],
          }),
        );
      }

      if (variables.attachments.length > 0) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: [...projectFilesQueryKey, projectId],
          }),
        );
      }

      await Promise.all(invalidations);

      appToast.success(
        variables.parentId
          ? 'Reply posted successfully.'
          : 'Thread posted successfully.',
      );
    },
    onError: (error) => {
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to post project thread message.',
      );
    },
  });

  const updateProjectThreadMutation = useMutation({
    mutationFn: async ({
      messageId,
      message,
      parentId,
      mentionedUserIds,
    }: {
      messageId: string;
      message: string;
      parentId?: string;
      mentionedUserIds: string[];
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/thread/${messageId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            message: message.trim(),
            parentId: parentId?.trim() || undefined,
            mentionedUserIds: mentionedUserIds
              .map((mentionedUserId) => mentionedUserId.trim())
              .filter((mentionedUserId) => mentionedUserId.length > 0),
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          Array.isArray(data?.message) && data.message.length
            ? data.message.join(', ')
            : data?.message || 'Failed to update thread message.';
        throw new Error(message);
      }

      return data;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...projectThreadQueryKey, projectId],
      });

      const detailMessageId = variables.parentId || selectedThreadMessageId;
      if (detailMessageId) {
        await queryClient.invalidateQueries({
          queryKey: [
            ...projectThreadDetailQueryKey,
            projectId,
            detailMessageId,
          ],
        });
      }

      appToast.success('Thread updated successfully.');
    },
    onError: (error) => {
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update thread message.',
      );
    },
  });

  const deleteProjectThreadMutation = useMutation({
    mutationFn: async ({
      messageId,
      parentId: _parentId,
    }: {
      messageId: string;
      parentId?: string;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/thread/${messageId}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
          },
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          Array.isArray(data?.message) && data.message.length
            ? data.message.join(', ')
            : data?.message || 'Failed to delete thread message.';
        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: async (_data, variables) => {
      if (variables.parentId) {
        updateProjectThreadReplyCount(
          variables.parentId,
          (currentCount) => currentCount - 1,
        );
      }

      await queryClient.invalidateQueries({
        queryKey: [...projectThreadQueryKey, projectId],
      });

      if (selectedThreadMessageId) {
        await queryClient.invalidateQueries({
          queryKey: [
            ...projectThreadDetailQueryKey,
            projectId,
            selectedThreadMessageId,
          ],
        });
      }

      appToast.success('Thread deleted successfully.');
    },
    onError: (error) => {
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete thread message.',
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
    setSearchValue('');
  }, [projectId]);

  const projectThreadReplies = useMemo(
    () => flattenProjectThreadPages(projectThreadQuery.data?.pages),
    [projectThreadQuery.data?.pages],
  );

  useEffect(() => {
    if (!canViewThread || !projectId) {
      setThreadSocketToken(null);
      return;
    }

    let isDisposed = false;

    void fetchSocketToken()
      .then((token) => {
        if (!isDisposed) {
          setThreadSocketToken(token);
        }
      })
      .catch(() => {
        if (!isDisposed) {
          setThreadSocketToken(null);
        }
      });

    return () => {
      isDisposed = true;
    };
  }, [canViewThread, projectId]);

  const updateProjectTicketFilters = ({
    status,
    priority,
    ticketType,
  }: {
    status?: string;
    priority?: string;
    ticketType?: string;
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    const nextStatus = status ?? selectedStatus;
    const nextPriority = priority ?? selectedPriority;
    const nextTicketType = ticketType ?? selectedTicketType;

    nextSearchParams.set(PROJECT_TICKETS_STATUS_QUERY_PARAM, nextStatus);

    if (nextPriority === 'all') {
      nextSearchParams.delete(PROJECT_TICKETS_PRIORITY_QUERY_PARAM);
    } else {
      nextSearchParams.set(PROJECT_TICKETS_PRIORITY_QUERY_PARAM, nextPriority);
    }

    if (nextTicketType === 'all') {
      nextSearchParams.delete(PROJECT_TICKETS_TYPE_QUERY_PARAM);
    } else {
      nextSearchParams.set(PROJECT_TICKETS_TYPE_QUERY_PARAM, nextTicketType);
    }

    const nextQueryString = nextSearchParams.toString();

    const currentQueryString = searchParams.toString();

    if (nextQueryString === currentQueryString) {
      return;
    }

    router.push(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, {
      scroll: false,
    });
  };

  const hasActiveProjectTicketFilters =
    Boolean(searchValue.trim()) ||
    selectedStatus !== 'all' ||
    selectedPriority !== 'all' ||
    selectedTicketType !== 'all';

  const clearProjectTicketFilters = () => {
    setSearchValue('');

    updateProjectTicketFilters({
      status: 'all',
      priority: 'all',
      ticketType: 'all',
    });
  };
  const handleProjectTicketsViewChange = (nextViewMode: 'table' | 'kanban') => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (nextViewMode === 'table') {
      nextSearchParams.delete(PROJECT_TICKETS_VIEW_QUERY_PARAM);
    } else {
      nextSearchParams.set(PROJECT_TICKETS_VIEW_QUERY_PARAM, nextViewMode);

      nextSearchParams.delete(PROJECT_TICKETS_STATUS_QUERY_PARAM);
    }

    setTicketsPagination((current) => ({
      ...current,
      pageIndex: 0,
    }));

    const nextQueryString = nextSearchParams.toString();

    router.replace(
      nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
      {
        scroll: false,
      },
    );
  };

  useEffect(() => {
    if (projectDetailQuery.isError && !hasShownError.current) {
      if (shouldRedirectToNotFound) {
        hasShownError.current = true;
        router.replace('/not-found');
        return;
      }

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
  }, [
    projectDetailQuery.error,
    projectDetailQuery.isError,
    router,
    shouldRedirectToNotFound,
  ]);

  const projectTickets = useMemo(
    () =>
      (projectTicketsQuery.data?.items ?? []).map((ticket) => ({
        ...ticket,

        project: {
          ...ticket.project,
          id: project?.id ?? ticket.project.id,
          name: project?.name ?? ticket.project.name,
          initials: project?.initials ?? ticket.project.initials,
          brandColor: project?.colorHex ?? ticket.project.brandColor,
        },

        statusColor:
          ticket.statusColor ??
          getTicketStatusColor(ticket.status, ticketStatusesQuery.data),
      })),
    [
      projectTicketsQuery.data?.items,
      ticketStatusesQuery.data,
      project?.id,
      project?.name,
      project?.initials,
      project?.colorHex,
    ],
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
      projectThreadReplies.find(
        (reply) => reply.id === selectedThreadMessageId,
      ) ?? null
    );
  }, [projectThreadReplies, selectedThreadMessageId]);

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
  const projectNotes = useMemo(
    () => projectNotesQuery.data?.items ?? [],
    [projectNotesQuery.data?.items],
  );
  const fullNotesQueries = useQueries({
    queries: projectNotes.map((note) => ({
      queryKey: ['project-note-detail', projectId, note.id],
      queryFn: async (): Promise<ProjectNoteRecord> => {
        const response = await fetch(
          `/api/projects/${projectId}/notes/${note.id}`,
        );

        if (!response.ok) {
          return note;
        }

        return response.json();
      },
      enabled: Boolean(projectId && note.id),
    })),
  });

  const fullNotesById = new Map(
    fullNotesQueries
      .map((query) => query.data)
      .filter((note): note is ProjectNoteRecord => Boolean(note))
      .map((note) => [note.id, note]),
  );
  const selectedProjectNoteSummary = useMemo(
    () =>
      projectNotes.find((note) => note.id === selectedProjectNoteId) ??
      (!isCreatingProjectNote ? projectNotes[0] : null) ??
      null,
    [isCreatingProjectNote, projectNotes, selectedProjectNoteId],
  );
  const selectedProjectNote =
    !canViewProjectNoteDetail || isCreatingProjectNote
      ? null
      : (projectNoteDetailQuery.data ?? null);

  useEffect(() => {
    if (!projectNotes.length) {
      if (selectedProjectNoteId) {
        setSelectedProjectNoteId('');
      }

      return;
    }

    const hasSelectedNote = projectNotes.some(
      (note) => note.id === selectedProjectNoteId,
    );

    if (!hasSelectedNote && !isCreatingProjectNote) {
      setSelectedProjectNoteId(projectNotes[0].id);
    }
  }, [isCreatingProjectNote, projectNotes, selectedProjectNoteId]);

  useEffect(() => {
    if (!isMobile && isProjectNoteMobileModalOpen) {
      setIsProjectNoteMobileModalOpen(false);
    }
  }, [isMobile, isProjectNoteMobileModalOpen]);

  useEffect(() => {
    if (isCreatingProjectNote) {
      return;
    }

    if (
      pendingProjectNoteEditId &&
      selectedProjectNote?.id === pendingProjectNoteEditId
    ) {
      setIsEditingProjectNote(true);
      setProjectNoteTitleDraft(selectedProjectNote.title);
      setProjectNoteDescriptionDraft(selectedProjectNote.description);
      setPendingProjectNoteEditId('');
      return;
    }

    if (isEditingProjectNote) {
      return;
    }

    setIsEditingProjectNote(false);
    setProjectNoteTitleDraft(selectedProjectNote?.title ?? '');
    setProjectNoteDescriptionDraft(selectedProjectNote?.description ?? '');
  }, [
    isCreatingProjectNote,
    isEditingProjectNote,
    pendingProjectNoteEditId,
    selectedProjectNote,
  ]);
  const isProjectTicketsLoading =
    projectTicketsViewMode === 'kanban'
      ? projectKanbanBoardQuery.isLoading ||
        projectKanbanCountsQuery.isLoading ||
        ticketStatusesQuery.isLoading
      : projectTicketsQuery.isLoading;
  const handleStartCreatingProjectNote = () => {
    if (isMobile) {
      setIsProjectNoteMobileModalOpen(true);
    }

    setIsCreatingProjectNote(true);
    setIsEditingProjectNote(false);
    setPendingProjectNoteEditId('');
    setSelectedProjectNoteId('');
    setProjectNoteTitleDraft('');
    setProjectNoteDescriptionDraft('');
  };

  const handleCancelCreatingProjectNote = () => {
    setIsCreatingProjectNote(false);
    setProjectNoteTitleDraft(selectedProjectNote?.title ?? '');
    setProjectNoteDescriptionDraft(selectedProjectNote?.description ?? '');
  };

  const handleStartEditingProjectNote = () => {
    if (!selectedProjectNote) {
      return;
    }

    if (isMobile) {
      setIsProjectNoteMobileModalOpen(true);
    }

    setIsEditingProjectNote(true);
    setProjectNoteTitleDraft(selectedProjectNote.title);
    setProjectNoteDescriptionDraft(selectedProjectNote.description);
  };

  const handleCancelEditingProjectNote = () => {
    setIsEditingProjectNote(false);
    setPendingProjectNoteEditId('');
    setProjectNoteTitleDraft(selectedProjectNote?.title ?? '');
    setProjectNoteDescriptionDraft(selectedProjectNote?.description ?? '');
  };

  const handleCloseProjectNoteMobileModal = () => {
    setIsProjectNoteMobileModalOpen(false);
    setIsEditingProjectNote(false);
    setPendingProjectNoteEditId('');

    if (isCreatingProjectNote) {
      setIsCreatingProjectNote(false);
      setSelectedProjectNoteId('');
      setProjectNoteTitleDraft('');
      setProjectNoteDescriptionDraft('');
      return;
    }

    setProjectNoteTitleDraft(selectedProjectNote?.title ?? '');
    setProjectNoteDescriptionDraft(selectedProjectNote?.description ?? '');
  };

  const handleCreateProjectNote = async () => {
    const normalizedTitle = projectNoteTitleDraft.trim();

    if (!normalizedTitle) {
      appToast.error('Note title is required.');
      return;
    }

    const createdNote = await createProjectNoteMutation.mutateAsync({
      projectId,
      values: {
        title: normalizedTitle,
        description: projectNoteDescriptionDraft,
      },
    });

    setIsCreatingProjectNote(false);
    setSelectedProjectNoteId(createdNote.id);
    setPendingProjectNoteEditId('');
    setProjectNoteTitleDraft(createdNote.title);
    setProjectNoteDescriptionDraft(createdNote.description);
    appToast.success('Note created successfully.');
  };

  const handleUpdateProjectNote = async () => {
    if (!selectedProjectNote) {
      return;
    }

    const normalizedTitle = projectNoteTitleDraft.trim();

    if (!normalizedTitle) {
      appToast.error('Note title is required.');
      return;
    }

    const updatedNote = await updateProjectNoteMutation.mutateAsync({
      projectId,
      noteId: selectedProjectNote.id,
      values: {
        title: normalizedTitle,
        description: projectNoteDescriptionDraft,
      },
    });

    setIsEditingProjectNote(false);
    setPendingProjectNoteEditId('');
    setProjectNoteTitleDraft(updatedNote.title);
    setProjectNoteDescriptionDraft(updatedNote.description);
    appToast.success('Note updated successfully.');
  };

  const handleDeleteProjectNote = async () => {
    if (!projectNoteToDelete) {
      return;
    }

    const deletingNoteId = projectNoteToDelete.id;
    const isDeletingSelectedNote = selectedProjectNoteId === deletingNoteId;
    const nextNote = isDeletingSelectedNote
      ? (projectNotes.find((note) => note.id !== deletingNoteId) ?? null)
      : null;

    if (isDeletingSelectedNote) {
      setSelectedProjectNoteId(nextNote?.id ?? '');
      setProjectNoteTitleDraft(nextNote?.title ?? '');
      setProjectNoteDescriptionDraft(nextNote?.description ?? '');
      setIsEditingProjectNote(false);
      setPendingProjectNoteEditId('');
    }

    await deleteProjectNoteMutation.mutateAsync({
      projectId,
      noteId: deletingNoteId,
    });

    setProjectNoteToDelete(null);
    setIsEditingProjectNote(false);
    setIsCreatingProjectNote(false);

    appToast.success('Note deleted successfully.');
  };

  const invalidateThreadQueries = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [...projectThreadQueryKey, projectId],
    });

    if (selectedThreadMessageId) {
      void queryClient.invalidateQueries({
        queryKey: [
          ...projectThreadDetailQueryKey,
          projectId,
          selectedThreadMessageId,
        ],
      });
    }
  }, [queryClient, projectId, selectedThreadMessageId]);
  useThread({
    projectId,
    token: threadSocketToken,
    enabled: canViewThread,
    onCreated: () => {
      void queryClient.invalidateQueries({
        queryKey: [...projectThreadQueryKey, projectId],
      });
    },
    onReplyCreated: (reply) => {
      const parentId =
        reply && typeof reply === 'object' && 'parentId' in reply
          ? String((reply as { parentId?: string }).parentId ?? '')
          : '';

      if (parentId) {
        updateProjectThreadReplyCount(
          parentId,
          (currentCount) => currentCount + 1,
        );
      }

      void queryClient.invalidateQueries({
        queryKey: [...projectThreadQueryKey, projectId],
      });

      if (parentId) {
        void queryClient.invalidateQueries({
          queryKey: [...projectThreadDetailQueryKey, projectId, parentId],
        });
      }
    },
    onUpdated: invalidateThreadQueries,
    onReacted: invalidateThreadQueries,

    onDeleted: () => {
      void queryClient.invalidateQueries({
        queryKey: [...projectThreadQueryKey, projectId],
      });

      if (selectedThreadMessageId) {
        void queryClient.invalidateQueries({
          queryKey: [
            ...projectThreadDetailQueryKey,
            projectId,
            selectedThreadMessageId,
          ],
        });
      }
    },
  });

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
        ticketType: values.ticketType,
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

  const handleDeleteTicket = async () => {
    if (!ticketToDelete || !canDeleteTicket) {
      return;
    }

    try {
      setLoading(true);
      await deleteTicketMutation.mutateAsync({
        projectId,
        ticketId: ticketToDelete.id,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...projectTicketsQueryKey, projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['project-kanban-board', projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['project-kanban-counts', projectId],
        }),
      ]);
      appToast.success('Ticket deleted successfully.');
      setTicketToDelete(null);
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to delete ticket.',
      );
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
    mentionedUserIds,
  }: {
    message: string;
    attachments: File[];
    mentionedUserIds: string[];
  }) => {
    if (!canPostThreadMessage) {
      return;
    }

    await createProjectThreadMutation.mutateAsync({
      message,
      attachments,
      mentionedUserIds,
    });
  };

  const handleSubmitThreadReply = async ({
    message,
    attachments,
    mentionedUserIds,
  }: {
    message: string;
    attachments: File[];
    mentionedUserIds: string[];
  }) => {
    if (!canPostThreadReply || !selectedThreadMessageId) {
      return;
    }

    await createProjectThreadMutation.mutateAsync({
      message,
      attachments,
      parentId: selectedThreadMessageId,
      mentionedUserIds,
    });
  };

  const handleEditProjectThreadReply = async ({
    reply,
    message,
    mentionedUserIds,
  }: {
    reply: DiscussionReply;
    message: string;
    mentionedUserIds: string[];
  }) => {
    setEditingThreadReplyId(reply.id);

    try {
      await updateProjectThreadMutation.mutateAsync({
        messageId: reply.id,
        message,
        mentionedUserIds,
        parentId:
          selectedThreadMessageId && selectedThreadMessageId !== reply.id
            ? selectedThreadMessageId
            : undefined,
      });
    } finally {
      setEditingThreadReplyId('');
    }
  };

  const handleDeleteProjectThreadReply = async (reply: DiscussionReply) => {
    try {
      setDeletingThreadReplyId(reply.id);

      if (selectedThreadMessageId === reply.id) {
        setSelectedThreadMessageId('');
      }

      await deleteProjectThreadMutation.mutateAsync({
        messageId: reply.id,
        parentId:
          selectedThreadMessageId && selectedThreadMessageId !== reply.id
            ? selectedThreadMessageId
            : undefined,
      });
    } finally {
      setDeletingThreadReplyId('');
    }
  };

  const updateThreadReactionInDetail = (
    detail:
      | {
          header: DiscussionReply | null;
          replies: DiscussionReply[];
        }
      | undefined,
    replyId: string,
    emoji: string,
    remove: boolean,
  ) => {
    if (!detail) {
      return detail;
    }

    return {
      ...detail,
      header:
        detail.header?.id === replyId
          ? {
              ...detail.header,
              reactions: applyProjectThreadReactionUpdate(
                detail.header.reactions ?? [],
                emoji,
                remove,
                currentUserId,
              ),
            }
          : detail.header,
      replies: detail.replies.map((reply) =>
        reply.id === replyId
          ? {
              ...reply,
              reactions: applyProjectThreadReactionUpdate(
                reply.reactions ?? [],
                emoji,
                remove,
                currentUserId,
              ),
            }
          : reply,
      ),
    };
  };

  const handleToggleProjectThreadReaction = async (
    reply: DiscussionReply,
    emoji: string,
  ) => {
    const remove = Boolean(
      reply.reactions?.some(
        (reaction) => reaction.emoji === emoji && reaction.reactedByCurrentUser,
      ),
    );

    const threadQueryKey = [
      ...projectThreadQueryKey,
      projectId,
      currentUserId,
    ] as const;
    const detailQueryKeys = selectedThreadMessageId
      ? [
          [
            ...projectThreadDetailQueryKey,
            projectId,
            selectedThreadMessageId,
            currentUserId,
          ],
        ]
      : [];
    const previousThreadReplies =
      queryClient.getQueryData<InfiniteData<ProjectThreadPage>>(threadQueryKey);
    const previousThreadDetails = detailQueryKeys.map((queryKey) => ({
      queryKey,
      data: queryClient.getQueryData<{
        header: DiscussionReply | null;
        replies: DiscussionReply[];
      }>(queryKey),
    }));

    queryClient.setQueryData<InfiniteData<ProjectThreadPage>>(
      threadQueryKey,
      (current) =>
        current
          ? {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                threads: page.threads.map((threadReply) =>
                  threadReply.id === reply.id
                    ? {
                        ...threadReply,
                        reactions: applyProjectThreadReactionUpdate(
                          threadReply.reactions ?? [],
                          emoji,
                          remove,
                          currentUserId,
                        ),
                      }
                    : threadReply,
                ),
              })),
            }
          : current,
    );

    detailQueryKeys.forEach((queryKey) => {
      queryClient.setQueryData<{
        header: DiscussionReply | null;
        replies: DiscussionReply[];
      }>(queryKey, (current) =>
        updateThreadReactionInDetail(current, reply.id, emoji, remove),
      );
    });

    try {
      await toggleProjectThreadReactionMutation.mutateAsync({
        messageId: reply.id,
        emoji,
        remove,
      });

      await queryClient.invalidateQueries({
        queryKey: threadQueryKey,
      });

      if (selectedThreadMessageId) {
        await queryClient.invalidateQueries({
          queryKey: [
            ...projectThreadDetailQueryKey,
            projectId,
            selectedThreadMessageId,
            currentUserId,
          ],
        });
      }
    } catch (error) {
      queryClient.setQueryData(threadQueryKey, previousThreadReplies);
      previousThreadDetails.forEach(({ queryKey, data }) => {
        queryClient.setQueryData(queryKey, data);
      });
      throw error;
    }
  };

  const visibleProjectTabs = projectTabs.filter((tab) => {
    if (tab === 'Tickets') return canViewTickets;
    if (tab === 'Thread') return canViewThread;
    if (tab === 'Files') return canViewFiles;
    if (tab === 'Calendar') return canViewCalendar;
    if (tab === 'Notes') return canViewProjectNotesList;
    return false;
  });
  const defaultProjectTabIndex = useMemo(() => {
    const requestedTab = searchParams.get('t');
    const requestedTabName =
      requestedTab === '1'
        ? 'Thread'
        : requestedTab === '2'
          ? 'Files'
          : requestedTab === '4'
            ? 'Notes'
            : requestedTab === '3'
              ? 'Calendar'
              : null;

    if (!requestedTabName) {
      return 0;
    }

    const requestedTabIndex = visibleProjectTabs.indexOf(requestedTabName);
    return requestedTabIndex >= 0 ? requestedTabIndex : 0;
  }, [searchParams, visibleProjectTabs]);
  const handleProjectTabChange = useCallback(
    (index: number) => {
      const selectedTab = visibleProjectTabs[index];

      if (!selectedTab) {
        return;
      }

      const nextTabQueryValue = projectTabQueryParamMap[selectedTab];
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      const currentTabQueryValue = searchParams.get('t');

      if (nextTabQueryValue) {
        nextSearchParams.set('t', nextTabQueryValue);
      } else {
        nextSearchParams.delete('t');
      }

      const nextUrl = nextSearchParams.toString()
        ? `${pathname}?${nextSearchParams.toString()}`
        : pathname;
      const currentUrl = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

      if (
        (nextTabQueryValue ?? null) === (currentTabQueryValue ?? null) &&
        nextUrl === currentUrl
      ) {
        return;
      }

      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams, visibleProjectTabs],
  );

  // if (projectDetailQuery.isLoading) {
  //   return <ProjectDetailSkeleton onBack={() => router.back()} />;
  // }
  if (projectDetailQuery.isLoading) {
    return <ProjectDetailSkeleton activeTab={searchParams.get('t')} />;
  }

  if (shouldRedirectToNotFound) {
    return null;
  }

  if (!canViewProjectDetail) {
    return (
      <div className="space-y-4 h-full py-8 pe-4">
        <div className="rounded-[20px] h-full border border-gray-200 bg-white px-6 py-10 shadow-[0_0_35px_0_rgb(0_0_0/0.04)]">
          <EmptyState
            imageUrl="/images/EmptyProjectIcon.svg"
            imageAlt="Project not found"
            title="You do not have permission to view project details."
            buttonLabel="Go Back"
            onButtonClick={() => router.back()}
          />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4 h-full py-8 pe-4">
        <div className="rounded-3xl h-full border border-gray-200 bg-white px-6 py-10 shadow-[0_0_35px_0_rgb(0_0_0/0.04)]">
          <EmptyState
            imageUrl="/images/EmptyProjectIcon.svg"
            imageAlt="Project not found"
            title="Project not found"
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
            count: projectThreadReplies.length,
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
  return (
    <>
      <div className="relative z-100 h-full xl:h-dvh overflow-hidden xl:py-5 xl:pr-5 px-4 xl:px-0 pt-2 pb-0 py-4">
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-y-auto overscroll-contain scrollbar-hide xl:overflow-hidden xl:rounded-2xl xl:border xl:border-white xl:bg-white/40 xl:p-3">
          <div className="shrink-0">
            <DashboardSummaryBanner
              imageSrc="/images/bannerBackBtn.svg"
              onBack={() => router.back()}
              imageAlt="Tickets"
              title={project.name}
              badge={project.category}
              stats={projectSummaryStats}
              badgeClr={project.colorHex}
            />
          </div>

          <div className="flex h-auto min-h-0 min-w-0 flex-none flex-col gap-4 overflow-visible rounded-xl bg-white p-3 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:px-5 md:pt-4 xl:h-full xl:flex-1 xl:overflow-hidden">
            <TabGroup
              key={`${projectId}-${searchParams.get('t') ?? '0'}`}
              defaultIndex={defaultProjectTabIndex}
              onChange={handleProjectTabChange}
              className="flex h-auto min-h-0 min-w-0 flex-none flex-col gap-4 overflow-visible xl:h-full xl:flex-1 xl:overflow-hidden"
            >
              <TabList className="flex shrink-0 overflow-x-auto scrollbar-hide border-b border-gray-200">
                {visibleProjectTabs.map((tab) => (
                  <Tab
                    key={tab}
                    className={({ selected }) =>
                      clsx(
                        'shrink-0 border-b-2 px-2 xl:px-4 pt-3 pb-1.5 text-sm font-semibold outline-none transition',
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

              <TabPanels className="flex h-auto min-h-0 min-w-0 flex-none flex-col overflow-visible pb-2  xl:h-full xl:flex-1 xl:overflow-hidden">
                <PermissionGuard permission="tickets.view_list">
                  <TabPanel className="flex h-auto min-h-0 min-w-0 flex-none flex-col gap-4 overflow-visible xl:h-full xl:flex-1 xl:overflow-hidden">
                    <div className="flex shrink-0 flex-col gap-3 rounded-xl md:flex-row md:items-center md:justify-between">
                      {canFilterTickets ? (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 md:max-w-xs">
                              <div className="flex items-center gap-2">
                                <span className="shrink-0">
                                  <SearchIcon fill="#374151" />
                                </span>

                                <input
                                  type="text"
                                  value={searchValue}
                                  onChange={(event) =>
                                    setSearchValue(event.target.value)
                                  }
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

                            {/* Mobile/tablet filter button */}
                            <Popover as="div" className="relative xl:hidden">
                              {({ open }) => (
                                <>
                                  <PopoverButton
                                    className={`flex h-10 shrink-0 items-center justify-center rounded-lg border px-3 text-sm font-medium outline-none ${
                                      open || hasActiveProjectTicketFilters
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
                                        onChange={(value) =>
                                          updateProjectTicketFilters({
                                            status: value,
                                          })
                                        }
                                        placeholder="All Status"
                                        maxMenuHeight={150}
                                      />
                                    </div>

                                    <div className="relative w-full overflow-visible">
                                      <Dropdown
                                        options={priorityFilterOptions}
                                        value={selectedPriority}
                                        onChange={(value) =>
                                          updateProjectTicketFilters({
                                            priority: value,
                                          })
                                        }
                                        placeholder="All Priority"
                                        maxMenuHeight={150}
                                      />
                                    </div>
                                    <div className="relative w-full overflow-visible">
                                      <Dropdown
                                        options={ticketTypeFilterOptions}
                                        value={selectedTicketType}
                                        onChange={(value) =>
                                          updateProjectTicketFilters({
                                            ticketType: value,
                                          })
                                        }
                                        placeholder="All Types"
                                        maxMenuHeight={150}
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      onClick={clearProjectTicketFilters}
                                      disabled={!hasActiveProjectTicketFilters}
                                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Clear Filters
                                    </button>
                                  </PopoverPanel>
                                </>
                              )}
                            </Popover>
                          </div>
                          <div className="flex flex-row items-center gap-3">
                            <div className="hidden items-center rounded-lg border border-gray-200 bg-white xl:flex">
                              <button
                                type="button"
                                onClick={() =>
                                  handleProjectTicketsViewChange('table')
                                }
                                className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
                                  projectTicketsViewMode === 'table'
                                    ? 'bg-linear-[271deg] from-aztec-purple to-cyan-blue text-white shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50'
                                }`}
                                aria-label="Table view"
                              >
                                <TableViewIcon />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleProjectTicketsViewChange('kanban')
                                }
                                className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
                                  projectTicketsViewMode === 'kanban'
                                    ? 'bg-linear-[271deg] from-aztec-purple to-cyan-blue text-white shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50'
                                }`}
                                aria-label="Kanban view"
                              >
                                <KanbanViewIcon />
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Desktop inline filters */}
                              {projectTicketsViewMode === 'table' ? (
                                <div className="hidden w-55 xl:block">
                                  <Dropdown
                                    options={statusFilterOptions}
                                    value={selectedStatus}
                                    onChange={(value) =>
                                      updateProjectTicketFilters({
                                        status: value,
                                      })
                                    }
                                    placeholder="All Status"
                                  />
                                </div>
                              ) : null}

                              <div className="hidden w-55 xl:flex gap-3">
                                <Dropdown
                                  options={priorityFilterOptions}
                                  value={selectedPriority}
                                  onChange={(value) =>
                                    updateProjectTicketFilters({
                                      priority: value,
                                    })
                                  }
                                  placeholder="All Priority"
                                />
                              </div>
                              <div className="hidden w-55 xl:block">
                                <Dropdown
                                  options={ticketTypeFilterOptions}
                                  value={selectedTicketType}
                                  onChange={(value) =>
                                    updateProjectTicketFilters({
                                      ticketType: value,
                                    })
                                  }
                                  placeholder="All Types"
                                />
                              </div>
                              <ThemeButton
                                type="button"
                                variant="secondary"
                                size="md"
                                onClick={clearProjectTicketFilters}
                                disabled={!hasActiveProjectTicketFilters}
                                className="hidden h-10 shrink-0 disabled:cursor-not-allowed disabled:opacity-50 xl:inline-flex"
                              >
                                Clear Filters
                              </ThemeButton>

                              {canCreateTicket ? (
                                <ThemeButton
                                  className="shrink-0 rounded-full hidden xl:flex"
                                  variant="primaryGradient"
                                  icon={<PlusIcon width="20" height="20" />}
                                  onClick={() => setCreateTicketOpen(true)}
                                >
                                  New Ticket
                                </ThemeButton>
                              ) : null}
                            </div>
                          </div>
                        </>
                      ) : canCreateTicket ? (
                        <div className="ml-auto">
                          <ThemeButton
                            className="shrink-0 rounded-full"
                            variant="primaryGradient"
                            icon={<PlusIcon width="20" height="20" />}
                            onClick={() => setCreateTicketOpen(true)}
                          >
                            New Ticket
                          </ThemeButton>
                        </div>
                      ) : null}
                    </div>
                    <div className="min-h-0 min-w-0 flex-none overflow-visible xl:flex-1 xl:overflow-hidden">
                      {isProjectTicketsLoading ? (
                        projectTicketsViewMode === 'kanban' ? (
                          <TicketsKanbanSkeleton />
                        ) : (
                          <RecentTicketsTableSkeleton />
                        )
                      ) : projectTicketsViewMode === 'kanban' ? (
                        <TicketsKanbanView
                          tickets={projectKanbanTickets}
                          onDeleteTicket={
                            canDeleteTicket ? setTicketToDelete : undefined
                          }
                          statusOptions={kanbanStatusOptions}
                          statusCountsByKey={
                            projectKanbanCountsQuery.data ?? {}
                          }
                          hasMoreByStatus={
                            projectKanbanBoardQuery.data?.hasMore ?? {}
                          }
                          loadingByStatus={loadingProjectKanbanStatuses}
                          onLoadMoreStatus={(statusKey) => {
                            void handleLoadMoreProjectKanbanStatus(statusKey);
                          }}
                          onTicketClick={
                            canViewTicketDetail
                              ? (ticket) =>
                                  router.push(
                                    `/tickets/${ticket.id}?projectId=${projectId}`,
                                  )
                              : undefined
                          }
                          onMoveTicket={(ticket, nextStatusKey) => {
                            void handleMoveProjectTicket(ticket, nextStatusKey);
                          }}
                          onReorderColumn={handleReorderProjectStatusColumn}
                          canDragTickets={canEditTicketStatus}
                          canDragColumns={canFilterTickets}
                          movingTicketId={
                            moveProjectTicketMutation.isPending
                              ? (moveProjectTicketMutation.variables?.ticket
                                  .id ?? null)
                              : null
                          }
                        />
                      ) : (
                        <RecentTicketsTable
                          tickets={projectTickets}
                          onDeleteTickets={
                            canDeleteTicket ? setTicketToDelete : undefined
                          }
                          enablePagination
                          pageSizeOptions={[10, 25, 50, 100]}
                          pagination={ticketsPagination}
                          onPaginationChange={
                            handleProjectTicketsPaginationChange
                          }
                          totalRows={projectTicketsQuery.data?.meta.total ?? 0}
                          manualPagination
                          getRowHref={
                            canViewTicketDetail
                              ? (ticket) =>
                                  `/tickets/${ticket.id}?projectId=${projectId}`
                              : undefined
                          }
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
                      )}
                    </div>
                  </TabPanel>
                </PermissionGuard>

                <PermissionGuard permission="thread.view">
                  <TabPanel className="h-auto min-h-0 min-w-0 overflow-visible xl:h-full xl:overflow-hidden">
                    <div
                      className={`grid h-auto min-h-0 min-w-0 overflow-visible rounded-sm border border-gray-200 md:rounded-2xl xl:h-full xl:overflow-hidden ${
                        selectedThreadMessageId && !isMobile
                          ? 'xl:grid-cols-[minmax(0,1fr)_400px] xl:grid-rows-[minmax(0,1fr)] xl:divide-x xl:divide-gray-200'
                          : 'grid-cols-1'
                      }`}
                    >
                      {(!isMobile || !selectedThreadMessageId) && (
                        <div className="h-auto min-h-0 min-w-0 overflow-visible xl:h-full xl:overflow-hidden">
                          {projectThreadQuery.isLoading ? (
                            <ProjectThreadSkeleton />
                          ) : (
                            <ProjectThreadPanel
                              title="Discussion"
                              replies={projectThreadReplies}
                              hasMoreReplies={Boolean(
                                projectThreadQuery.hasNextPage,
                              )}
                              isLoadingMoreReplies={
                                projectThreadQuery.isFetchingNextPage
                              }
                              onLoadMoreReplies={
                                projectThreadQuery.hasNextPage
                                  ? async () => {
                                      await projectThreadQuery.fetchNextPage();
                                    }
                                  : undefined
                              }
                              mentionMembers={projectMembersQuery.data ?? []}
                              emptyTitle="No Threads yet."
                              emptyDescription="No Threads messages have been added to this project yet."
                              composerPlaceholder="Post the project thread..."
                              onSubmitReply={
                                canPostThreadMessage
                                  ? handleSubmitReply
                                  : undefined
                              }
                              onEditReply={
                                canEditThread
                                  ? handleEditProjectThreadReply
                                  : undefined
                              }
                              onDeleteReply={
                                canDeleteThread
                                  ? handleDeleteProjectThreadReply
                                  : undefined
                              }
                              isSubmittingReply={
                                createProjectThreadMutation.isPending &&
                                !selectedThreadMessageId
                              }
                              deletingReplyId={deletingThreadReplyId}
                              editingReplyId={editingThreadReplyId}
                              canCompose={canPostThreadMessage}
                              canAttachFile={canAttachThreadFile}
                              requireMessage={false}
                              currentUserId={currentUserId}
                              showReplyMeta={
                                canViewThreadReplies || canPostThreadReply
                              }
                              onReplyClick={(reply) =>
                                setSelectedThreadMessageId(reply.id)
                              }
                              onDeleteAttachment={handleDeleteThreadAttachment}
                              onToggleReaction={
                                handleToggleProjectThreadReaction
                              }
                              deletingAttachmentId={
                                deleteProjectFileMutation.isPending
                                  ? deleteProjectFileMutation.variables?.fileId
                                  : undefined
                              }
                            />
                          )}
                        </div>
                      )}

                      {selectedThreadMessageId ? (
                        <div
                          // className="h-full min-h-0 min-w-0 overflow-hidden"
                          className="h-auto min-h-0 min-w-0 overflow-visible xl:h-full xl:overflow-hidden"
                        >
                          <ProjectThreadPanel
                            title="Thread"
                            subtitle=""
                            mentionMembers={projectMembersQuery.data ?? []}
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
                                : 'No threads replies yet.'
                            }
                            emptyDescription={
                              projectThreadDetailQuery.isLoading
                                ? 'Fetching thread replies.'
                                : 'No Threads replies have been added to this thread yet.'
                            }
                            composerPlaceholder="Reply to thread..."
                            onSubmitReply={
                              canPostThreadReply
                                ? handleSubmitThreadReply
                                : undefined
                            }
                            onEditReply={
                              canEditThread
                                ? handleEditProjectThreadReply
                                : undefined
                            }
                            onDeleteReply={
                              canDeleteThread
                                ? handleDeleteProjectThreadReply
                                : undefined
                            }
                            isSubmittingReply={
                              createProjectThreadMutation.isPending &&
                              Boolean(selectedThreadMessageId)
                            }
                            deletingReplyId={deletingThreadReplyId}
                            editingReplyId={editingThreadReplyId}
                            canCompose={canPostThreadReply}
                            canAttachFile={
                              canAttachThreadFile && canPostThreadReply
                            }
                            requireMessage={false}
                            currentUserId={currentUserId}
                            onToggleReaction={handleToggleProjectThreadReaction}
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
                  <TabPanel className="h-auto min-h-0 min-w-0 overflow-visible xl:h-full xl:overflow-hidden">
                    {projectFilesQuery.isLoading ? (
                      <ProjectFilesSkeleton />
                    ) : (
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
                        subtitle={`${
                          uploadedFilesState.length +
                          (projectFilesQuery.data?.length ?? 0)
                        } files`}
                      />
                    )}
                  </TabPanel>
                </PermissionGuard>

                <PermissionGuard permission="calendar.view_grid">
                  <TabPanel className="h-auto min-h-0 overflow-visible xl:h-full xl:overflow-y-auto">
                    <Calendar projectId={projectId} />
                  </TabPanel>
                </PermissionGuard>

                <PermissionGuard permission="projects_notes.view_list">
                  <TabPanel className="h-auto min-h-0 overflow-visible xl:h-full border rounded-sm sm:rounded-2xl border-gray-200 xl:overflow-hidden">
                    <div className="grid h-auto min-h-0 min-w-0 xl:h-full xl:grid-cols-[340px_minmax(0,1fr)]">
                      <section className="flex min-h-96 flex-col overflow-hidden border-e border-gray-200 bg-white shadow-[0_0_35px_0_rgb(0_0_0/0.04)]">
                        <div className="border-b border-gray-200 px-3.5 py-3.5 bg-gray-50">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-gray-900">
                                Notes
                              </h3>
                              <p className="text-xs font-medium border border-gray-200 px-1.5 py-0.5 rounded-full bg-white text-gray-600">
                                {projectNotesQuery.data?.meta.total ?? 0} notes
                              </p>
                            </div>
                            {canCreateProjectNote ? (
                              <ThemeButton
                                type="button"
                                variant="primaryGradient"
                                size="sm"
                                icon={<PlusIcon width="14" height="14" />}
                                onClick={handleStartCreatingProjectNote}
                              >
                                New
                              </ThemeButton>
                            ) : null}
                          </div>

                          <div className="mt-4 rounded-lg border border-gray-200 bg-white px-2.5 py-2">
                            <div className="flex items-center gap-2">
                              <span className="shrink-0">
                                <SearchIcon fill="#374151" />
                              </span>

                              <input
                                type="text"
                                value={notesSearchValue}
                                onChange={(event) =>
                                  setNotesSearchValue(event.target.value)
                                }
                                placeholder="Search..."
                                className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto bg-white">
                          {projectNotesQuery.isLoading ? (
                            <ProjectNotesListSkeleton />
                          ) : projectNotes.length ? (
                            <div>
                              {projectNotes.map((note) => {
                                const isActive =
                                  note.id === selectedProjectNoteSummary?.id;

                                return (
                                  <article
                                    key={note.id}
                                    className={clsx(
                                      'border-b px-2.5 py-3 transition last:border-b-0',
                                      isActive
                                        ? 'border-gray-200 bg-blue-50'
                                        : 'border-gray-200 bg-white hover:bg-gray-50',
                                    )}
                                  >
                                    <div className="flex items-start gap-3">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (isMobile) {
                                            setIsProjectNoteMobileModalOpen(
                                              true,
                                            );
                                          }

                                          setIsCreatingProjectNote(false);
                                          setIsEditingProjectNote(false);
                                          setPendingProjectNoteEditId('');
                                          setSelectedProjectNoteId(note.id);
                                        }}
                                        className="min-w-0 flex-1 text-left space-y-1"
                                      >
                                        <h4 className="truncate text-base font-bold text-gray-900">
                                          {note.title}
                                        </h4>
                                        <p className="line-clamp-1 text-sm text-gray-600">
                                          {getProjectNotePreview(
                                            fullNotesById.get(note.id) ?? note,
                                          )}
                                        </p>
                                        <div className="flex items-center gap-1 text-xs font-normal text-gray-500">
                                          <CalendarTabIcon
                                            width="14"
                                            height="14"
                                          />
                                          <span>
                                            {formatProjectNoteDate(note)}
                                          </span>
                                        </div>
                                      </button>

                                      {canEditProjectNote ||
                                      canDeleteProjectNote ? (
                                        <Menu as="div" className="relative">
                                          <MenuButton
                                            type="button"
                                            aria-label="Note actions"
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 outline-none transition hover:bg-white hover:text-gray-700"
                                          >
                                            <ThreedotIcon />
                                          </MenuButton>

                                          <MenuItems
                                            anchor="bottom end"
                                            transition
                                            className="z-100 mt-1 w-32 origin-top-right rounded-xl border border-gray-200 bg-white p-1.5 shadow-[0_10px_30px_rgb(0_0_0/0.12)] outline-none transition duration-150 data-closed:-translate-y-1 data-closed:scale-95 data-closed:opacity-0"
                                          >
                                            {canEditProjectNote ? (
                                              <MenuItem>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (isMobile) {
                                                      setIsProjectNoteMobileModalOpen(
                                                        true,
                                                      );
                                                    }

                                                    setIsCreatingProjectNote(
                                                      false,
                                                    );
                                                    setSelectedProjectNoteId(
                                                      note.id,
                                                    );
                                                    setPendingProjectNoteEditId(
                                                      note.id,
                                                    );
                                                  }}
                                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-gray-700 outline-none transition data-focus:bg-gray-100"
                                                >
                                                  <EditIcon
                                                    width="14"
                                                    height="14"
                                                  />
                                                  Edit
                                                </button>
                                              </MenuItem>
                                            ) : null}
                                            {canDeleteProjectNote ? (
                                              <MenuItem>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setProjectNoteToDelete(note)
                                                  }
                                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-red-500 outline-none transition data-focus:bg-red-50"
                                                >
                                                  <TrashIcon
                                                    width="16"
                                                    height="16"
                                                  />
                                                  Delete
                                                </button>
                                              </MenuItem>
                                            ) : null}
                                          </MenuItems>
                                        </Menu>
                                      ) : null}
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex h-full items-center justify-center p-4 md:p-5">
                              <EmptyState
                                imageUrl="/images/noNotesIllu.svg"
                                imageAlt="No notes yet"
                                title="No notes yet"
                                description="Project notes will appear here once they are available."
                              />
                            </div>
                          )}
                        </div>
                      </section>

                      <section className="flex min-h-96 flex-col overflow-hidden  bg-white shadow-[0_0_35px_0_rgb(0_0_0/0.04)]">
                        {isCreatingProjectNote ? (
                          <>
                            {isMobile ? (
                              <AppModal
                                onClose={handleCloseProjectNoteMobileModal}
                                isOpen={isProjectNoteMobileModalOpen}
                                scrollNeeded={true}
                                title="Create Note"
                                bodyPaddingClasses="flex min-h-0 flex-col"
                              >
                                <div className="border-b border-gray-200 px-4 py-4 md:px-5">
                                  <input
                                    type="text"
                                    value={projectNoteTitleDraft}
                                    onChange={(event) =>
                                      setProjectNoteTitleDraft(
                                        event.target.value,
                                      )
                                    }
                                    className="w-full border-b border-b-gray-300 bg-transparent pb-3 text-base font-semibold text-gray-900 outline-none md:text-xl"
                                    placeholder="Note title"
                                  />
                                </div>

                                <div className="p-4 flex-1 md:p-5">
                                  <RichTextEditor
                                    value={projectNoteDescriptionDraft}
                                    onChange={setProjectNoteDescriptionDraft}
                                    placeholder="Write your project note..."
                                    maxLength={
                                      MAX_PROJECT_NOTE_DESCRIPTION_LENGTH
                                    }
                                    disabled={
                                      createProjectNoteMutation.isPending
                                    }
                                    showCharacterCount
                                    editorHeight="h-[50dvh] min-h-[18rem]"
                                    editorClassName="text-sm font-normal text-gray-700"
                                  />
                                </div>
                                <div className="w-full  px-3 pb-4 md:flex md:justify-end md:px-5">
                                  <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:items-center">
                                    <ThemeButton
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={
                                        handleCloseProjectNoteMobileModal
                                      }
                                      disabled={
                                        createProjectNoteMutation.isPending
                                      }
                                      className="w-full disabled:cursor-not-allowed disabled:opacity-60"
                                      borderclassName="w-full"
                                    >
                                      Cancel
                                    </ThemeButton>

                                    <ThemeButton
                                      type="button"
                                      variant="primaryGradient"
                                      size="sm"
                                      onClick={() =>
                                        void handleCreateProjectNote()
                                      }
                                      disabled={
                                        createProjectNoteMutation.isPending
                                      }
                                      className="w-full disabled:cursor-not-allowed disabled:opacity-60"
                                      borderclassName="w-full"
                                    >
                                      {createProjectNoteMutation.isPending
                                        ? 'Saving...'
                                        : 'Save Note'}
                                    </ThemeButton>
                                  </div>
                                </div>
                              </AppModal>
                            ) : (
                              <>
                                <div className="border-b border-gray-200 px-4 py-4 md:px-5">
                                  <input
                                    type="text"
                                    value={projectNoteTitleDraft}
                                    onChange={(event) =>
                                      setProjectNoteTitleDraft(
                                        event.target.value,
                                      )
                                    }
                                    className="w-full border-b border-b-gray-300 bg-transparent pb-3 text-base font-semibold text-gray-900 outline-none md:text-xl"
                                    placeholder="Note title"
                                  />
                                </div>

                                <div className=" flex flex-col mb-4 flex-1 overflow-y-auto p-4 md:p-5">
                                  <RichTextEditor
                                    value={projectNoteDescriptionDraft}
                                    onChange={setProjectNoteDescriptionDraft}
                                    placeholder="Write your project note..."
                                    maxLength={
                                      MAX_PROJECT_NOTE_DESCRIPTION_LENGTH
                                    }
                                    disabled={
                                      createProjectNoteMutation.isPending
                                    }
                                    showCharacterCount
                                    editorHeight="h-[20rem] xl:h-[calc(100%)] flex-1"
                                    className="h-full"
                                    editorClassName="text-sm font-normal text-gray-700"
                                  />
                                </div>
                                <div className="flex items-center justify-end gap-3 px-3 md:px-5 pb-4">
                                  <div className="flex items-center gap-2">
                                    <ThemeButton
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={handleCancelCreatingProjectNote}
                                      disabled={
                                        createProjectNoteMutation.isPending
                                      }
                                      className="disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      Cancel
                                    </ThemeButton>
                                    <ThemeButton
                                      type="button"
                                      variant="primaryGradient"
                                      size="sm"
                                      onClick={() =>
                                        void handleCreateProjectNote()
                                      }
                                      disabled={
                                        createProjectNoteMutation.isPending
                                      }
                                      className="disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {createProjectNoteMutation.isPending
                                        ? 'Saving...'
                                        : 'Save Note'}
                                    </ThemeButton>
                                  </div>
                                </div>
                              </>
                            )}
                          </>
                        ) : selectedProjectNote ? (
                          <>
                            {isMobile ? (
                              <AppModal
                                onClose={handleCloseProjectNoteMobileModal}
                                isOpen={isProjectNoteMobileModalOpen}
                                scrollNeeded={true}
                                bodyPaddingClasses="flex  flex-col max-h-[calc(100dvh-200px)]"
                                title="projectNoteTitleDraft"
                              >
                                <div className="px-4 pt-4 md:px-5 hidden sm:block">
                                  <input
                                    type="text"
                                    value={projectNoteTitleDraft}
                                    onChange={(event) =>
                                      setProjectNoteTitleDraft(
                                        event.target.value,
                                      )
                                    }
                                    readOnly={!isEditingProjectNote}
                                    className={`w-full ${!isEditingProjectNote ? 'pb-0' : 'border-b border-b-gray-300 pb-2'} bg-transparent text-base font-semibold text-gray-900 outline-none md:text-xl`}
                                    placeholder="Note title"
                                  />
                                </div>
                                <div
                                  className={`${isEditingProjectNote ? 'pt-4' : ''} ps-4 md:ps-5 flex-1 max-h-[90dvh]`}
                                >
                                  {projectNoteDetailQuery.isLoading &&
                                  selectedProjectNoteId ? (
                                    <div className="space-y-4 pb-4 pt-2">
                                      <div className="h-[50dvh] min-h-72 w-full animate-pulse rounded-lg bg-gray-100" />
                                    </div>
                                  ) : (
                                    <>
                                      <RichTextEditor
                                        value={projectNoteDescriptionDraft}
                                        onChange={
                                          setProjectNoteDescriptionDraft
                                        }
                                        placeholder="No note description available."
                                        readOnly={!isEditingProjectNote}
                                        maxLength={
                                          isEditingProjectNote
                                            ? MAX_PROJECT_NOTE_DESCRIPTION_LENGTH
                                            : undefined
                                        }
                                        showCharacterCount={
                                          isEditingProjectNote
                                        }
                                        disabled={
                                          updateProjectNoteMutation.isPending
                                        }
                                        className="flex-1 h-full a pe-2 md:pe-3"
                                        editorHeight="min-h-[18rem] b border-none! h-full"
                                        editorClassName={`text-sm c font-normal h-full text-gray-700 ${!isEditingProjectNote && 'px-0!'}`}
                                      />
                                    </>
                                  )}
                                </div>
                                <div className="md:flex md:items-center md:justify-end  grid grid-cols-2 w-full mt-5 md:mt-0 gap-3  px-4 md:px-5 pb-3">
                                  {isEditingProjectNote && (
                                    <>
                                      <ThemeButton
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleCancelEditingProjectNote}
                                        disabled={
                                          updateProjectNoteMutation.isPending
                                        }
                                        className="disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Cancel
                                      </ThemeButton>
                                      <ThemeButton
                                        type="button"
                                        variant="primaryGradient"
                                        size="sm"
                                        onClick={() =>
                                          void handleUpdateProjectNote()
                                        }
                                        disabled={
                                          updateProjectNoteMutation.isPending
                                        }
                                        className="disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {updateProjectNoteMutation.isPending
                                          ? 'Saving...'
                                          : 'Save'}
                                      </ThemeButton>
                                    </>
                                  )}
                                  <div className="hidden items-center gap-2">
                                    {isEditingProjectNote ? (
                                      <>
                                        <ThemeButton
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          onClick={
                                            handleCancelEditingProjectNote
                                          }
                                          disabled={
                                            updateProjectNoteMutation.isPending
                                          }
                                          className="disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          Cancel
                                        </ThemeButton>
                                        <ThemeButton
                                          type="button"
                                          variant="primaryGradient"
                                          size="sm"
                                          onClick={() =>
                                            void handleUpdateProjectNote()
                                          }
                                          disabled={
                                            updateProjectNoteMutation.isPending
                                          }
                                          className="disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {updateProjectNoteMutation.isPending
                                            ? 'Saving...'
                                            : 'Save'}
                                        </ThemeButton>
                                      </>
                                    ) : canEditProjectNote ||
                                      canDeleteProjectNote ? (
                                      <>
                                        {canEditProjectNote ? (
                                          <ThemeButton
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={
                                              handleStartEditingProjectNote
                                            }
                                          >
                                            Edit
                                          </ThemeButton>
                                        ) : null}
                                        {canDeleteProjectNote ? (
                                          <ThemeButton
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() =>
                                              setProjectNoteToDelete(
                                                selectedProjectNote,
                                              )
                                            }
                                            className="border-red-200 text-red-600 hover:bg-red-50"
                                          >
                                            Delete
                                          </ThemeButton>
                                        ) : null}
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </AppModal>
                            ) : (
                              <>
                                <div className="px-4 pt-4 md:px-5">
                                  <input
                                    type="text"
                                    value={projectNoteTitleDraft}
                                    onChange={(event) =>
                                      setProjectNoteTitleDraft(
                                        event.target.value,
                                      )
                                    }
                                    readOnly={!isEditingProjectNote}
                                    className={`w-full ${!isEditingProjectNote ? 'pb-0' : 'border-b border-b-gray-300 pb-2'} bg-transparent text-base font-semibold text-gray-900 outline-none md:text-xl`}
                                    placeholder="Note title"
                                  />
                                </div>

                                <div
                                  className={` ${isEditingProjectNote && 'pt-4'} min-h-0 flex-1 overflow-y-auto px-4 md:px-5`}
                                >
                                  {projectNoteDetailQuery.isLoading &&
                                  selectedProjectNoteId ? (
                                    <div className="space-y-4 flex flex-col pb-4 pt-2 h-full">
                                      <div className="flex-1 h-full w-full animate-pulse rounded-lg bg-gray-100" />
                                    </div>
                                  ) : (
                                    <>
                                      <RichTextEditor
                                        value={projectNoteDescriptionDraft}
                                        onChange={
                                          setProjectNoteDescriptionDraft
                                        }
                                        placeholder="No note description available."
                                        readOnly={!isEditingProjectNote}
                                        maxLength={
                                          isEditingProjectNote
                                            ? MAX_PROJECT_NOTE_DESCRIPTION_LENGTH
                                            : undefined
                                        }
                                        showCharacterCount={
                                          isEditingProjectNote
                                        }
                                        disabled={
                                          updateProjectNoteMutation.isPending
                                        }
                                        editorHeight={` flex-1 ${!isEditingProjectNote ? 'border-0! h-full' : 'h-[calc(100%-32px)]'}`}
                                        className="h-full "
                                        editorClassName={`text-sm font-normal h-full text-gray-700 ${!isEditingProjectNote && 'px-0!'}`}
                                      />
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center justify-end gap-3  px-4 md:px-5 pb-3">
                                  {isEditingProjectNote && (
                                    <>
                                      <ThemeButton
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleCancelEditingProjectNote}
                                        disabled={
                                          updateProjectNoteMutation.isPending
                                        }
                                        className="disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Cancel
                                      </ThemeButton>
                                      <ThemeButton
                                        type="button"
                                        variant="primaryGradient"
                                        size="sm"
                                        onClick={() =>
                                          void handleUpdateProjectNote()
                                        }
                                        disabled={
                                          updateProjectNoteMutation.isPending
                                        }
                                        className="disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {updateProjectNoteMutation.isPending
                                          ? 'Saving...'
                                          : 'Save'}
                                      </ThemeButton>
                                    </>
                                  )}
                                  <div className="hidden items-center gap-2">
                                    {isEditingProjectNote ? (
                                      <>
                                        <ThemeButton
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          onClick={
                                            handleCancelEditingProjectNote
                                          }
                                          disabled={
                                            updateProjectNoteMutation.isPending
                                          }
                                          className="disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          Cancel
                                        </ThemeButton>
                                        <ThemeButton
                                          type="button"
                                          variant="primaryGradient"
                                          size="sm"
                                          onClick={() =>
                                            void handleUpdateProjectNote()
                                          }
                                          disabled={
                                            updateProjectNoteMutation.isPending
                                          }
                                          className="disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {updateProjectNoteMutation.isPending
                                            ? 'Saving...'
                                            : 'Save'}
                                        </ThemeButton>
                                      </>
                                    ) : canEditProjectNote ||
                                      canDeleteProjectNote ? (
                                      <>
                                        {canEditProjectNote ? (
                                          <ThemeButton
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={
                                              handleStartEditingProjectNote
                                            }
                                          >
                                            Edit
                                          </ThemeButton>
                                        ) : null}
                                        {canDeleteProjectNote ? (
                                          <ThemeButton
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() =>
                                              setProjectNoteToDelete(
                                                selectedProjectNote,
                                              )
                                            }
                                            className="border-red-200 text-red-600 hover:bg-red-50"
                                          >
                                            Delete
                                          </ThemeButton>
                                        ) : null}
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </>
                            )}
                          </>
                        ) : canViewProjectNoteDetail ? (
                          <div className="flex h-full items-center justify-center p-4 md:p-5">
                            <EmptyState
                              imageUrl="/images/noNotesIllu.svg"
                              imageAlt="Select a note"
                              title="Select a note"
                              description="Choose a note from the left sidebar to view its title and description."
                              buttonIcon={
                                canCreateProjectNote ? <PlusIcon /> : undefined
                              }
                              buttonLabel={
                                canCreateProjectNote ? 'Add Note' : undefined
                              }
                              onButtonClick={
                                canCreateProjectNote
                                  ? handleStartCreatingProjectNote
                                  : undefined
                              }
                            />
                          </div>
                        ) : (
                          <div className="flex h-full items-center justify-center p-4 md:p-5">
                            <EmptyState
                              imageUrl="/images/noNotesIllu.svg"
                              imageAlt="No note detail access"
                              title="No detail access"
                              description="You can view the notes list, but you do not have permission to open note details."
                            />
                          </div>
                        )}
                      </section>
                    </div>
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

      <ConfirmActionModal
        isOpen={Boolean(ticketToDelete) && canDeleteTicket}
        onClose={() => setTicketToDelete(null)}
        title="Delete Ticket?"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold">
              “{ticketToDelete?.title ?? 'this ticket'}”
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        isSubmitting={deleteTicketMutation.isPending}
        onConfirm={handleDeleteTicket}
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

      <ConfirmActionModal
        isOpen={Boolean(projectNoteToDelete)}
        onClose={() => setProjectNoteToDelete(null)}
        title="Delete Note?"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold">
              “{projectNoteToDelete?.title ?? 'this note'}”
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        isSubmitting={deleteProjectNoteMutation.isPending}
        onConfirm={handleDeleteProjectNote}
      />
    </>
  );
}

function applyProjectThreadReactionUpdate(
  reactions: DiscussionReaction[],
  emoji: string,
  remove: boolean,
  currentUserId?: string,
) {
  const currentUserReaction = reactions.find(
    (reaction) => reaction.reactedByCurrentUser,
  );
  let nextReactions = reactions.map((reaction) => ({ ...reaction }));

  if (currentUserReaction && (!remove || currentUserReaction.emoji !== emoji)) {
    nextReactions = decrementProjectThreadReaction(
      nextReactions,
      currentUserReaction.emoji,
      currentUserId,
    );
  }

  if (!remove) {
    nextReactions = incrementProjectThreadReaction(
      nextReactions,
      emoji,
      currentUserId,
    );
  }

  return nextReactions;
}

function incrementProjectThreadReaction(
  reactions: DiscussionReaction[],
  emoji: string,
  currentUserId?: string,
) {
  const existingReaction = reactions.find(
    (reaction) => reaction.emoji === emoji,
  );

  if (!existingReaction) {
    return [
      ...reactions,
      {
        emoji,
        count: 1,
        reactedByCurrentUser: true,
        actors: currentUserId
          ? [{ id: currentUserId, name: 'You', isCurrentUser: true }]
          : [{ name: 'You', isCurrentUser: true }],
      },
    ];
  }

  return reactions.map((reaction) =>
    reaction.emoji === emoji
      ? {
          ...reaction,
          count: reaction.count + (reaction.reactedByCurrentUser ? 0 : 1),
          reactedByCurrentUser: true,
          actors: reaction.reactedByCurrentUser
            ? reaction.actors
            : [
                ...(reaction.actors ?? []),
                currentUserId
                  ? { id: currentUserId, name: 'You', isCurrentUser: true }
                  : { name: 'You', isCurrentUser: true },
              ],
        }
      : {
          ...reaction,
          reactedByCurrentUser: false,
          actors:
            reaction.actors?.map((actor) => ({
              ...actor,
              isCurrentUser: false,
            })) ?? reaction.actors,
        },
  );
}

function decrementProjectThreadReaction(
  reactions: DiscussionReaction[],
  emoji: string,
  currentUserId?: string,
) {
  return reactions
    .flatMap((reaction) => {
      if (reaction.emoji !== emoji) {
        return [reaction];
      }

      if (reaction.count <= 1) {
        return [];
      }

      return [
        {
          ...reaction,
          count: reaction.count - 1,
          reactedByCurrentUser: false,
          actors:
            reaction.actors?.filter((actor) =>
              currentUserId ? actor.id !== currentUserId : !actor.isCurrentUser,
            ) ?? reaction.actors,
        },
      ];
    })
    .map((reaction) =>
      reaction.emoji === emoji
        ? reaction
        : {
            ...reaction,
            reactedByCurrentUser: false,
            actors:
              reaction.actors?.map((actor) => ({
                ...actor,
                isCurrentUser: false,
              })) ?? reaction.actors,
          },
    );
}

function renderProjectTabIcon(tab: (typeof projectTabs)[number]) {
  if (tab === 'Tickets') {
    return (
      <TicketsIcon width="20" height="20" fill="currentColor" opacity="0" />
    );
  }

  if (tab === 'Thread') {
    return <ThreadIcon />;
  }

  if (tab === 'Files') {
    return <FilesTabIcon />;
  }

  if (tab === 'Notes') {
    return <NotesTabIcon />;
  }

  return <CalendarTabIcon />;
}

export function FilesTabIcon({
  fill = 'currentColor',
  width = '20',
  height = '20',
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.12533 11.6667C8.12533 11.3215 7.8455 11.0417 7.50033 11.0417C7.15515 11.0417 6.87533 11.3215 6.87533 11.6667C6.87533 12.9323 7.90134 13.9583 9.16699 13.9583H10.8337C12.0993 13.9583 13.1253 12.9323 13.1253 11.6667C13.1253 11.3215 12.8455 11.0417 12.5003 11.0417C12.1551 11.0417 11.8753 11.3215 11.8753 11.6667C11.8753 12.242 11.409 12.7083 10.8337 12.7083H9.16699C8.5917 12.7083 8.12533 12.242 8.12533 11.6667Z"
        fill={fill}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.29033 1.04166H11.7103C12.459 1.04163 13.0834 1.04161 13.5791 1.10825C14.1022 1.17859 14.5746 1.33331 14.9541 1.71287C15.3337 2.09243 15.4884 2.56476 15.5587 3.08793C15.6141 3.49938 15.6234 3.99951 15.625 4.58586C15.6886 4.6107 15.7513 4.63866 15.8132 4.67018C16.3228 4.92984 16.7371 5.34416 16.9968 5.85377C17.1627 6.17938 17.23 6.52805 17.2615 6.9141C17.2909 7.27329 17.292 7.7122 17.292 8.24537L17.3013 8.25118C17.7518 8.53425 18.1327 8.9152 18.4158 9.36571C18.7124 9.83768 18.8394 10.3684 18.8999 10.9914C18.9587 11.5978 18.9587 12.3538 18.9587 13.3008V13.3659C18.9587 14.3128 18.9587 15.0689 18.8999 15.6753C18.8394 16.2983 18.7124 16.829 18.4158 17.3009C18.1327 17.7515 17.7518 18.1324 17.3013 18.4155C16.8293 18.712 16.2986 18.8391 15.6756 18.8995C15.0692 18.9583 14.3132 18.9583 13.3662 18.9583H6.63443C5.6875 18.9583 4.93146 18.9583 4.32502 18.8995C3.70203 18.8391 3.17135 18.712 2.69938 18.4155C2.24887 18.1324 1.86792 17.7515 1.58484 17.3009C1.28829 16.829 1.16121 16.2983 1.10079 15.6753C1.04198 15.0689 1.04198 14.3128 1.04199 13.3659V13.3008C1.04198 12.3538 1.04198 11.5978 1.10079 10.9914C1.16121 10.3684 1.28829 9.83768 1.58484 9.36571C1.86792 8.9152 2.24887 8.53425 2.69938 8.25118L2.70866 8.24537C2.70869 7.71221 2.70977 7.27329 2.73912 6.9141C2.77066 6.52805 2.83794 6.17938 3.00385 5.85377C3.26351 5.34416 3.67783 4.92984 4.18744 4.67018C4.24931 4.63866 4.31201 4.61069 4.37564 4.58586C4.37722 3.99951 4.3866 3.49937 4.44192 3.08793C4.51226 2.56476 4.66698 2.09243 5.04654 1.71287C5.4261 1.33331 5.89843 1.17859 6.42159 1.10825C6.91724 1.04161 7.54161 1.04163 8.29033 1.04166ZM14.3199 3.25449C14.3589 3.54437 14.3705 3.90537 14.3739 4.38476C14.0803 4.37498 13.744 4.37499 13.3598 4.37499H6.64081C6.25662 4.37499 5.92034 4.37498 5.62677 4.38476C5.6302 3.90537 5.6418 3.54437 5.68077 3.25449C5.73248 2.86993 5.82183 2.70535 5.93042 2.59676C6.03902 2.48816 6.2036 2.39881 6.58815 2.34711C6.99068 2.29299 7.53032 2.29166 8.33366 2.29166H11.667C12.4703 2.29166 13.01 2.29299 13.4125 2.34711C13.7971 2.39881 13.9616 2.48816 14.0702 2.59676C14.1788 2.70535 14.2682 2.86993 14.3199 3.25449ZM16.041 7.81257C16.039 7.48556 16.0332 7.22974 16.0157 7.01589C15.9905 6.70714 15.9442 6.54129 15.883 6.42125C15.7432 6.14685 15.5201 5.92376 15.2457 5.78394C15.1257 5.72278 14.9598 5.67652 14.6511 5.6513C14.335 5.62548 13.9274 5.62499 13.3337 5.62499H6.66699C6.07329 5.62499 5.6656 5.62548 5.34956 5.6513C5.04081 5.67652 4.87496 5.72278 4.75492 5.78394C4.48052 5.92376 4.25742 6.14685 4.11761 6.42125C4.05645 6.54129 4.01019 6.70714 3.98497 7.01589C3.96749 7.22974 3.96162 7.48556 3.95965 7.81257C4.07788 7.79416 4.19958 7.77929 4.32502 7.76713C4.93146 7.70831 5.68751 7.70832 6.63444 7.70832H13.3662C14.3131 7.70832 15.0692 7.70831 15.6756 7.76713C15.8011 7.77929 15.9228 7.79416 16.041 7.81257ZM3.36442 9.30958C3.60394 9.15908 3.91627 9.06263 4.44568 9.01129C4.98471 8.95901 5.6801 8.95832 6.66699 8.95832H13.3337C14.3206 8.95832 15.0159 8.95901 15.555 9.01129C16.0844 9.06263 16.3967 9.15908 16.6362 9.30958C16.9277 9.49275 17.1742 9.73924 17.3574 10.0308C17.5079 10.2703 17.6044 10.5826 17.6557 11.112C17.708 11.651 17.7087 12.3464 17.7087 13.3333C17.7087 14.3202 17.708 15.0156 17.6557 15.5546C17.6044 16.0841 17.5079 16.3964 17.3574 16.6359C17.1742 16.9274 16.9277 17.1739 16.6362 17.3571C16.3967 17.5076 16.0844 17.604 15.555 17.6554C15.0159 17.7076 14.3206 17.7083 13.3337 17.7083H6.66699C5.6801 17.7083 4.98471 17.7076 4.44568 17.6554C3.91627 17.604 3.60394 17.5076 3.36442 17.3571C3.07291 17.1739 2.82642 16.9274 2.64325 16.6359C2.49275 16.3964 2.3963 16.0841 2.34496 15.5546C2.29268 15.0156 2.29199 14.3202 2.29199 13.3333C2.29199 12.3464 2.29268 11.651 2.34496 11.112C2.3963 10.5826 2.49275 10.2703 2.64325 10.0308C2.82642 9.73924 3.07291 9.49275 3.36442 9.30958Z"
        fill={fill}
      />
    </svg>
  );
}

export function CalendarTabIcon({
  width = '20',
  height = '20',
  fill = 'currentColor',
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9.16634 10.2083C8.82116 10.2083 8.54134 10.4881 8.54134 10.8333C8.54134 11.1785 8.82116 11.4583 9.16634 11.4583H13.333C13.6782 11.4583 13.958 11.1785 13.958 10.8333C13.958 10.4881 13.6782 10.2083 13.333 10.2083H9.16634Z"
        fill={fill}
      />
      <path
        d="M6.66634 10.2083C6.32116 10.2083 6.04134 10.4881 6.04134 10.8333C6.04134 11.1785 6.32116 11.4583 6.66634 11.4583H6.67383C7.019 11.4583 7.29883 11.1785 7.29883 10.8333C7.29883 10.4881 7.019 10.2083 6.67383 10.2083H6.66634Z"
        fill={fill}
      />
      <path
        d="M6.66634 13.5417C6.32116 13.5417 6.04134 13.8215 6.04134 14.1667C6.04134 14.5118 6.32116 14.7917 6.66634 14.7917H10.833C11.1782 14.7917 11.458 14.5118 11.458 14.1667C11.458 13.8215 11.1782 13.5417 10.833 13.5417H6.66634Z"
        fill={fill}
      />
      <path
        d="M13.3255 13.5417C12.9803 13.5417 12.7005 13.8215 12.7005 14.1667C12.7005 14.5118 12.9803 14.7917 13.3255 14.7917H13.333C13.6782 14.7917 13.958 14.5118 13.958 14.1667C13.958 13.8215 13.6782 13.5417 13.333 13.5417H13.3255Z"
        fill={fill}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.62467 1.66666C5.62467 1.32148 5.34485 1.04166 4.99967 1.04166C4.6545 1.04166 4.37467 1.32148 4.37467 1.66666V2.19565C3.70404 2.38572 3.13842 2.69465 2.66763 3.20362C2.01937 3.90444 1.73122 4.78993 1.59322 5.89958C1.45799 6.98691 1.458 8.38038 1.45801 10.1584V10.675C1.458 12.4529 1.45799 13.8464 1.59322 14.9337C1.73122 16.0434 2.01937 16.9289 2.66763 17.6297C3.32229 18.3374 4.16031 18.6584 5.20908 18.8108C6.22411 18.9584 7.52096 18.9583 9.15737 18.9583H10.842C12.4784 18.9583 13.7752 18.9584 14.7903 18.8108C15.839 18.6584 16.6771 18.3374 17.3317 17.6297C17.98 16.9289 18.2681 16.0434 18.4061 14.9337C18.5414 13.8464 18.5413 12.4529 18.5413 10.6749V10.1584C18.5413 8.38039 18.5414 6.98692 18.4061 5.89958C18.2681 4.78993 17.98 3.90444 17.3317 3.20362C16.8609 2.69465 16.2953 2.38572 15.6247 2.19565V1.66666C15.6247 1.32148 15.3449 1.04166 14.9997 1.04166C14.6545 1.04166 14.3747 1.32148 14.3747 1.66666V1.97157C13.428 1.87497 12.263 1.87498 10.842 1.87499H9.15738C7.73636 1.87498 6.57139 1.87497 5.62467 1.97157V1.66666ZM3.58525 4.05243C3.80137 3.81879 4.05908 3.63991 4.39851 3.50486C4.47306 3.76664 4.71398 3.95832 4.99967 3.95832C5.34485 3.95832 5.62467 3.6785 5.62467 3.33332V3.22881C6.50885 3.12629 7.65165 3.12499 9.20801 3.12499H10.7913C12.3477 3.12499 13.4905 3.12629 14.3747 3.22881V3.33332C14.3747 3.6785 14.6545 3.95832 14.9997 3.95832C15.2854 3.95832 15.5263 3.76664 15.6008 3.50486C15.9403 3.63992 16.198 3.81879 16.4141 4.05243C16.8076 4.47788 17.0409 5.06112 17.1642 6.04166H2.83518C2.95844 5.06112 3.19171 4.47788 3.58525 4.05243ZM2.74044 7.29166C2.70847 8.08906 2.70801 9.04233 2.70801 10.2027V10.6306C2.70801 12.4625 2.70915 13.7783 2.83366 14.7795C2.95652 15.7674 3.19008 16.3537 3.58525 16.7809C3.97402 17.2012 4.49741 17.4442 5.38887 17.5738C6.30364 17.7068 7.50957 17.7083 9.20801 17.7083H10.7913C12.4898 17.7083 13.6957 17.7068 14.6105 17.5738C15.5019 17.4442 16.0253 17.2012 16.4141 16.7809C16.8093 16.3537 17.0428 15.7674 17.1657 14.7795C17.2902 13.7783 17.2913 12.4625 17.2913 10.6306V10.2027C17.2913 9.04233 17.2909 8.08906 17.2589 7.29166H2.74044Z"
        fill={fill}
      />
    </svg>
  );
}

export function NotesTabIcon({
  width = '20',
  height = '20',
  fill = 'currentColor',
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.83337 2.5H10.3418C11.3059 2.5 11.788 2.5 12.2289 2.68062C12.6698 2.86124 13.0107 3.20212 13.6924 3.88388L15.9495 6.14098C16.6312 6.82274 16.9722 7.16362 17.1528 7.60451C17.3334 8.04541 17.3334 8.52747 17.3334 9.49159V12.5C17.3334 14.8577 17.3334 16.0366 16.6016 16.7684C15.8698 17.5 14.6909 17.5 12.3334 17.5H7.66671C5.30922 17.5 4.13043 17.5 3.39857 16.7684C2.66671 16.0366 2.66671 14.8577 2.66671 12.5V7.5C2.66671 5.14231 2.66671 3.96347 3.39857 3.23161C4.13043 2.5 5.30922 2.5 7.66671 2.5"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6667 2.91666V5.83332C10.6667 6.61972 10.6667 7.01297 10.9111 7.2574C11.1554 7.50182 11.5487 7.50182 12.3351 7.50182H15.2517"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.66671 10H13.3334M6.66671 13.3333H10.8334"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getProjectNotePreview(note: ProjectNoteRecord) {
  const description = stripProjectNoteHtml(note.description);

  if (description) {
    return description;
  }

  return 'No description added yet.';
}

function formatProjectNoteDate(note: ProjectNoteRecord) {
  const dateValue = note.updatedAt || note.createdAt;

  if (!dateValue) {
    return 'No timestamp available';
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'No timestamp available';
  }

  return `${note.updatedAt ? 'Updated' : 'Created'} ${new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  ).format(parsedDate)}`;
}

function stripProjectNoteHtml(value: string) {
  if (!value) return '';

  return value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]*>/g, ' ')
    .replace(/<[^>]*$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
        className="inline-block h-2.5 w-2.5 rounded-full"
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

async function fetchSocketToken(): Promise<SocketTokenResponse> {
  const response = await fetch('/api/auth/socket-token', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => null)) as
    | SocketTokenResponse
    | { message?: string }
    | null;

  if (!response.ok || !payload || !('accessToken' in payload)) {
    throw new Error(
      payload && 'message' in payload
        ? payload.message || 'Failed to authorize socket connection.'
        : 'Failed to authorize socket connection.',
    );
  }

  return payload;
}

function isNotFoundError(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const status =
    'status' in error ? (error as { status?: number }).status : undefined;
  const message =
    'message' in error ? (error as { message?: string }).message : undefined;

  return (
    status === 404 ||
    message?.trim().toLowerCase() === 'project not found' ||
    message?.trim().toLowerCase() === 'failed to fetch project.'
  );
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

function getProjectTicketFilterValue(value: string | null) {
  if (!value || !value.trim()) {
    return 'all';
  }

  return value;
}

function getDashboardStatusFilterValue(value: string | null) {
  if (!value || !value.trim()) {
    return 'Active';
  }

  return value;
}

function normalizeStatusValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
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

// function ProjectDetailSkeleton({ onBack }: { onBack: () => void }) {
//   return (
//     <div
//       className="relative z-100 h-dvh overflow-hidden py-5 pr-5"
//       aria-hidden="true"
//     >
//       <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-3xl border border-white bg-white/40 p-3">
//         <div className="flex min-h-0 min-w-0 flex-1 animate-pulse flex-col gap-4 overflow-hidden rounded-3xl bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5">
//           {/* Project summary */}
//           <section className="w-full shrink-0">
//             <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
//               <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200 sm:h-19 sm:w-19" />

//               <div className="min-w-0 flex-1">
//                 {/* Name and category */}
//                 <div className="flex flex-wrap items-center gap-3">
//                   <div className="h-5 w-40 rounded bg-gray-200" />
//                   <div className="h-6 w-24 rounded-full bg-gray-100" />
//                 </div>

//                 {/* Summary metrics */}
//                 <div className="mt-3 flex max-w-full flex-wrap items-center gap-x-5 gap-y-2">
//                   {Array.from({ length: 3 }).map((_, index) => (
//                     <div key={index} className="flex items-center gap-2">
//                       <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-200" />
//                       <div
//                         className={`h-3.5 rounded bg-gray-200 ${
//                           index === 1 ? 'w-20' : 'w-12'
//                         }`}
//                       />
//                       <div className="h-4 w-6 rounded bg-gray-200" />
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           </section>

//           {/* Tabs */}
//           <div className="flex shrink-0 overflow-hidden border-y border-gray-200">
//             {Array.from({ length: 4 }).map((_, index) => (
//               <div
//                 key={index}
//                 className={`border-b-2 px-4 py-3 ${
//                   index === 0 ? 'border-gray-300' : 'border-transparent'
//                 }`}
//               >
//                 <div
//                   className={`h-4 rounded bg-gray-200 ${
//                     index === 3 ? 'w-16' : 'w-12'
//                   }`}
//                 />
//               </div>
//             ))}
//           </div>

//           {/* Active tab content */}
//           <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
//             {/* Search/filter row */}
//             <div className="flex shrink-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
//               <div className="h-10 w-full rounded-lg border border-gray-200 bg-gray-100 md:max-w-xs" />

//               <div className="flex items-center gap-3">
//                 <div className="h-10 w-36 rounded-lg border border-gray-200 bg-gray-100" />
//                 <div className="h-10 w-36 rounded-lg border border-gray-200 bg-gray-100" />
//                 <div className="h-10 w-28 rounded-full bg-gray-200" />
//               </div>
//             </div>

//             {/* Tickets table */}
//             <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
//               {/* Table header */}
//               <div className="grid grid-cols-6 gap-4 border-b border-gray-200 bg-gray-50 px-4 py-4">
//                 {Array.from({ length: 6 }).map((_, index) => (
//                   <div key={index} className="h-4 rounded bg-gray-200" />
//                 ))}
//               </div>

//               {/* Table rows */}
//               <div className="min-h-0 flex-1 overflow-hidden">
//                 {Array.from({ length: 6 }).map((_, rowIndex) => (
//                   <div
//                     key={rowIndex}
//                     className="grid grid-cols-6 gap-4 border-b border-gray-200 px-4 py-4 last:border-b-0"
//                   >
//                     {Array.from({ length: 6 }).map((_, cellIndex) => (
//                       <div
//                         key={cellIndex}
//                         className={`h-4 rounded ${
//                           cellIndex === 3 || cellIndex === 4
//                             ? 'bg-gray-200'
//                             : 'bg-gray-100'
//                         }`}
//                       />
//                     ))}
//                   </div>
//                 ))}
//               </div>

//               {/* Pagination */}
//               <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
//                 <div className="h-8 w-32 rounded bg-gray-100" />
//                 <div className="flex gap-2">
//                   {Array.from({ length: 4 }).map((_, index) => (
//                     <div
//                       key={index}
//                       className="h-8 w-8 rounded-md bg-gray-100"
//                     />
//                   ))}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

type ProjectDetailSkeletonProps = {
  activeTab: string | null;
};

function ProjectDetailSkeleton({ activeTab }: ProjectDetailSkeletonProps) {
  return (
    <div
      className="
        relative z-100 h-auto min-h-dvh overflow-visible
        px-4 pt-2 pb-4
        xl:h-dvh xl:overflow-hidden xl:px-0 xl:py-5 xl:pr-5
      "
      aria-hidden="true"
    >
      <div
        className="
          flex h-auto min-h-0 min-w-0 flex-col gap-3 overflow-visible
          xl:h-full xl:overflow-hidden xl:rounded-2xl
          xl:border xl:border-white xl:bg-white/40 xl:p-3
        "
      >
        <ProjectSummarySkeleton />

        <div
          className="
            flex h-auto min-h-0 min-w-0 flex-none flex-col gap-4
            overflow-visible rounded-xl bg-white p-3
            shadow-[0_0_35px_0_rgb(0_0_0/0.04)]
            md:px-5 md:pt-4
            xl:h-full xl:flex-1 xl:overflow-hidden
          "
        >
          <ProjectTabsSkeleton />

          <div className="min-h-0 flex-1">
            <ProjectActiveTabSkeleton activeTab={activeTab} />
          </div>
        </div>
      </div>
    </div>
  );
}
function ProjectActiveTabSkeleton({ activeTab }: { activeTab: string | null }) {
  switch (activeTab) {
    case '1':
      return <ProjectThreadSkeleton />;

    case '2':
      return <ProjectFilesSkeleton />;

    case '3':
      return <ProjectCalendarSkeleton />;

    case '4':
      return <ProjectNotesSkeleton />;

    default:
      return (
        <div className="flex min-h-0 flex-col gap-4 xl:h-full">
          <ProjectTicketFiltersSkeleton />

          <div className="min-h-0 xl:flex-1 xl:overflow-hidden">
            <RecentTicketsTableSkeleton />
          </div>
        </div>
      );
  }
}

function ProjectNotesSkeleton() {
  return (
    <div
      className="
        grid h-auto min-h-0 animate-pulse
        overflow-hidden rounded-sm border border-gray-200
        xl:h-full xl:grid-cols-[340px_minmax(0,1fr)]
        xl:rounded-2xl
      "
    >
      <section className="flex min-h-96 flex-col border-e border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-3.5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-5 w-14" />
              <SkeletonBlock className="h-5 w-14 rounded-full" />
            </div>

            <SkeletonBlock className="h-9 w-20 rounded-lg" />
          </div>

          <SkeletonBlock className="mt-4 h-10 w-full rounded-lg" />
        </div>

        <ProjectNotesListSkeleton />
      </section>

      <section className="hidden min-h-96 bg-white p-5 xl:block">
        <SkeletonBlock className="h-6 w-40" />

        <div className="mt-5 space-y-3">
          <SkeletonBlock className="h-4 w-full bg-gray-100" />
          <SkeletonBlock className="h-4 w-5/6 bg-gray-100" />
          <SkeletonBlock className="h-4 w-2/3 bg-gray-100" />
        </div>
      </section>
    </div>
  );
}

function ProjectCalendarSkeleton() {
  return (
    <div
      className="h-auto min-h-[500px] animate-pulse rounded-xl border border-gray-200 bg-white p-4 xl:h-full"
      aria-hidden="true"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SkeletonBlock className="h-8 w-40" />

        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
          <SkeletonBlock className="h-9 w-24 rounded-lg" />
          <SkeletonBlock className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 border-t border-l border-gray-200">
        {Array.from({ length: 42 }).map((_, index) => (
          <div
            key={index}
            className="min-h-20 border-r border-b border-gray-200 p-2 md:min-h-24"
          >
            <SkeletonBlock className="h-3 w-5 bg-gray-100" />

            {index % 5 === 0 ? (
              <SkeletonBlock className="mt-3 h-5 w-full rounded-md" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectSummarySkeleton() {
  return (
    <div
      className="
        relative flex w-full shrink-0 animate-pulse
        flex-col items-start gap-2 overflow-hidden
        rounded-xl px-4 py-4
        xl:flex-row xl:items-start xl:gap-4
        xl:px-7.5 xl:py-6
      "
      style={{
        backgroundImage: `
          url('/images/DashboardComponentBgImage.jpg'),
          linear-gradient(
            to right,
            #335C94 0%,
            #665932 25%,
            #7B398E 50%,
            #003F89 75%,
            #070922 100%
          )
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      aria-hidden="true"
    >
      {/* Same dark overlay as actual banner */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Back button, mobile title and category */}
      <div className="relative flex min-w-0 items-center gap-3 xl:contents">
        <div className="h-10 w-10 shrink-0 rounded-full bg-white/15 backdrop-blur-3xl xl:h-12 xl:w-12">
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-3 w-3 rotate-45 border-b-2 border-l-2 border-white/60" />
          </div>
        </div>

        <div className="h-6 w-40 rounded bg-white/25 xl:hidden" />

        <div className="h-6 w-12 rounded-full bg-white/20 xl:hidden" />
      </div>

      <div
        className="
          relative flex min-w-0 w-full flex-1
          flex-col gap-3
          md:flex-row
          xl:items-center xl:justify-between xl:gap-4
        "
      >
        {/* Desktop project name and category */}
        <div className="hidden min-w-0 items-center gap-4 xl:flex">
          <div className="h-9 w-60 rounded bg-white/25" />
          <div className="h-6 w-12 rounded-full bg-white/20" />
        </div>

        {/* Stats box */}
        <div
          className="
            grid w-full grid-cols-2 gap-2
            rounded-xl border border-white/12
            bg-white/10 p-2
            backdrop-blur-3xl
            drop-shadow-[0_14px_44px_0_rgb(0_0_0/0.45)]
            sm:w-fit
            xl:flex xl:max-w-full xl:flex-row
            xl:items-center xl:gap-5.5 xl:px-4
          "
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="contents">
              {index > 0 ? (
                <div
                  className="
                    hidden h-5.25 w-0.5 shrink-0
                    bg-linear-to-b
                    from-white/0 via-white/60 to-white/0
                    xl:block
                  "
                />
              ) : null}

              <div
                className="
                  flex min-w-0 items-center
                  justify-between gap-2
                  xl:shrink-0 xl:justify-start xl:gap-4
                "
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/40">
                    <div className="h-2.5 w-2.5 rounded-full bg-white/30" />
                  </div>

                  <div
                    className={`h-4 rounded bg-white/25 ${
                      index === 1 ? 'w-24' : 'w-14'
                    }`}
                  />
                </div>

                <div className="h-5 w-6 shrink-0 rounded bg-white/30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectTabsSkeleton() {
  return (
    <div
      className="
        flex shrink-0 animate-pulse
        overflow-x-hidden border-b border-gray-200
      "
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={`
            flex shrink-0 items-center gap-2
            border-b-2 px-2 pt-3 pb-2
            xl:px-4
            ${index === 0 ? 'border-gray-300' : 'border-transparent'}
          `}
        >
          <SkeletonBlock className="h-4 w-4 rounded-sm" />
          <SkeletonBlock className={index === 3 ? 'h-4 w-16' : 'h-4 w-12'} />
        </div>
      ))}
    </div>
  );
}

function ProjectTicketFiltersSkeleton() {
  return (
    <div
      className="
        flex shrink-0 animate-pulse
        flex-col gap-3
        md:flex-row md:items-center md:justify-between
      "
    >
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-10 w-full min-w-0 rounded-lg md:w-72" />
        <SkeletonBlock className="h-10 w-10 shrink-0 rounded-lg xl:hidden" />
      </div>

      <div className="hidden items-center gap-3 xl:flex">
        <SkeletonBlock className="h-10 w-20 rounded-lg" />
        <SkeletonBlock className="h-10 w-55 rounded-lg" />
        <SkeletonBlock className="h-10 w-28 rounded-lg" />
        <SkeletonBlock className="h-10 w-32 rounded-full" />
      </div>
    </div>
  );
}

function ProjectThreadSkeleton() {
  return (
    <div
      className="
        flex min-h-[calc(100dvh-260px)] flex-col
        overflow-hidden rounded-xl border border-gray-200
        bg-white animate-pulse
        xl:h-full xl:min-h-0
      "
      aria-hidden="true"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-8 w-8 rounded-full" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-end gap-5 overflow-hidden p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-start gap-3">
            <SkeletonBlock className="h-8 w-8 shrink-0 rounded-full" />

            <div className={`min-w-0 ${index % 2 === 0 ? 'w-3/4' : 'w-1/2'}`}>
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-3.5 w-24" />
                <SkeletonBlock className="h-3 w-20" />
              </div>

              <div className="mt-2 rounded-xl border border-gray-200 p-3">
                <SkeletonBlock className="h-3.5 w-full" />
                {index % 2 === 0 ? (
                  <SkeletonBlock className="mt-2 h-3.5 w-2/3" />
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-gray-200 p-4">
        <SkeletonBlock className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}

function ProjectFilesSkeleton() {
  return (
    <div
      className="flex h-auto min-h-0 flex-col space-y-4 animate-pulse xl:h-full"
      aria-hidden="true"
    >
      {/* Search and upload button */}
      <div className="flex flex-col gap-3 rounded-2xl md:flex-row md:items-center md:justify-between">
        <div className="h-10.5 w-full rounded-lg border border-gray-200 bg-gray-100 md:max-w-xs" />

        <div className="h-10 w-full rounded-lg bg-gray-200 md:w-32" />
      </div>

      {/* Files container */}
      <div
        className="
          flex max-h-none min-h-0 flex-none flex-col
          overflow-visible rounded-xl border border-gray-200 bg-white
          sm:rounded-2xl
          xl:max-h-[calc(100dvh-360px)] xl:flex-1 xl:overflow-hidden
        "
      >
        {/* Files container header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-3 sm:px-4">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-4 w-14" />
        </div>

        {/* File rows */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <ProjectFileRowSkeleton key={index} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectFileRowSkeleton({ index }: { index: number }) {
  return (
    <div className="border-b border-gray-200 px-3 py-4 last:border-b-0 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* File information */}
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          {/* File icon */}
          <SkeletonBlock className="h-10 w-10 shrink-0 rounded-sm" />

          <div className="min-w-0 flex-1">
            {/* File name */}
            <SkeletonBlock
              className={`h-4 ${
                index % 2 === 0 ? 'w-48 max-w-full' : 'w-36 max-w-full'
              }`}
            />

            {/* Size and uploaded date */}
            <div className="mt-2 flex items-center gap-2">
              <SkeletonBlock className="h-3 w-10 bg-gray-100" />

              <div className="h-1 w-1 shrink-0 rounded-full bg-gray-200" />

              <SkeletonBlock className="h-3 w-20 bg-gray-100" />
            </div>

            {/* Source pill */}
            <div className="mt-2">
              <SkeletonBlock className="h-6 w-24 rounded-full bg-gray-100" />
            </div>
          </div>
        </div>

        {/* File actions */}
        <div className="flex items-center justify-end gap-2 sm:justify-start">
          {Array.from({ length: 3 }).map((_, actionIndex) => (
            <SkeletonBlock
              key={actionIndex}
              className="h-9 w-9 shrink-0 rounded-lg"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectNotesListSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-gray-200" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SkeletonBlock className="h-4 w-2/3" />
              <SkeletonBlock className="mt-2 h-3.5 w-full bg-gray-100" />
              <SkeletonBlock className="mt-2 h-3 w-28 bg-gray-100" />
            </div>

            <SkeletonBlock className="h-7 w-7 shrink-0 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
function getProjectTicketTypeFilterValue(value: string | null) {
  if (value === 'bug' || value === 'feature_request') {
    return value;
  }

  return 'all';
}
