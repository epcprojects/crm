/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import clsx from 'clsx';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import DOMPurify from 'dompurify';
import TicketRepliesPanel from '../../../../components/discussion/TicketRepliesPanel';
import AppModal, {
  ModalPosition,
} from '../../../../components/modals/AppModal';
import ConfirmActionModal from '../../../../components/modals/ConfirmActionModal';
import {
  useTicketChat,
  type ChatChannel,
  type ChatMessage,
} from '../../../../components/hooks/useTicketChat';
import { useTicketReplies } from '../../../../components/hooks/useTicketReplies';
import { getSocket } from '../../../../lib/socket';
import Dropdown from '../../../../components/ui/ThemeDropDown';
import { appToast } from '../../../../components/toast/AppToast';
import { getTicketById, type TicketPerson } from '../tickets.data';
import {
  projectsQueryKey,
  useDeleteProjectFileMutation,
  useProjectFilesQuery,
} from '../../projects/projects.queries';
import { usePermissions } from '../../../providers/PermissionProvider';
import { useAppSelector } from '../../../Redux/store';
import {
  ChatIcon,
  DownloadIcon,
  EditIcon,
  EyeOpenedIcon,
  FileTypePlaceholder,
  ProjectsIcon,
  ThreedotIcon,
  TrashIcon,
} from '../../../../../public/icons';
import { getFileUrl } from '../../../../components/projects/ProjectFilesPanel';
import Tooltip from '../../../../components/tooltip';
import Image from 'next/image';
import EmptyState from '../../../../components/EmptyState';
import ImageGalleryLightbox from '../../../../components/ui/ImageGalleryLightbox';
import type {
  DiscussionReaction,
  DiscussionReply,
} from '../../../../components/discussion/types';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { NotificationItem } from '@harperhelp/interfaces';
import { NotificationEntityType } from '@harperhelp/types';
import { eventEmitter } from '../../../../lib/event-emitter';
import { uploadFilesDirectly } from '../../../../lib/attachments';
// eslint-disable-next-line @nx/enforce-module-boundaries
import RichTextEditor from 'apps/frontend/src/components/RichTextEditor';
import {
  CalendarTabIcon,
  FilesTabIcon,
  NotesTabIcon,
} from '../../projects/[projectId]/page';
// eslint-disable-next-line @nx/enforce-module-boundaries
import TicketDescriptionModal from 'apps/frontend/src/components/modals/TicketDescriptionModal';
const MAX_DESCRIPTION_LENGTH = 4000;
const TICKET_REPLIES_PAGE_SIZE = 30;

type GalleryImage = {
  attachmentId: string;
  storageKey?: string;
  fileName?: string;
  src: string;
  alt: string;
};

type TicketAttachmentToDelete = {
  attachmentId: string;
  projectFileId: string;
  name: string;
};

type TicketSidebarTabKey = 'quick-links' | 'timeline';

type TicketTimelineItem = {
  id: string;
  description: string;
  status: string;
  showStatusBadge: boolean;
  statusClassName: string;
  statusStyle?: React.CSSProperties;
  occurredAt: string;
};

export default function TicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const ticketId = String(params?.ticketId ?? '');
  const projectId = searchParams.get('projectId') ?? '';

  const currentUserId = useAppSelector((state) => state.auth.user?.id ?? '');
  const currentUser = useAppSelector((state) => state.auth.user);

  const currentUserName = currentUser?.fullName?.trim() || 'User';

  const currentUserInitials =
    currentUserName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || 'U';
  const userType = useAppSelector((state) => state.auth.user?.userType);
  const isExternalUser = userType === 'EXTERNAL';
  const { hasPermission } = usePermissions();
  const canViewTicketDetail = hasPermission('tickets.view_detail');
  const canViewReplies = hasPermission('ticket_replies.view');
  const canPostReplies = hasPermission('ticket_replies.post');
  const canEditReplies = hasPermission('ticket_replies.edit');
  const canDeleteReplies = hasPermission('ticket_replies.delete');
  const canEditAssignee = hasPermission('tickets.edit_assignee');
  const canAttachReplyFiles = hasPermission('ticket_replies.attach_file');
  const canEditStatus = hasPermission('tickets.edit_status');
  const canEditPriority = hasPermission('tickets.edit_priority');
  const canEditDueDate = hasPermission('tickets.edit_due_date');
  const canViewInternalChatBtn = hasPermission('tickets.internal_chat');
  const canViewProjectDetail = hasPermission('projects.view_detail');
  const canViewProjectThread = hasPermission('thread.view');
  const canViewProjectFiles = hasPermission('files.view');
  const canViewProjectCalendar = hasPermission('calendar.view_grid');
  const canViewProjectNotes = hasPermission('projects_notes.view_list');
  const canEditTitleDescription = hasPermission(
    'tickets.edit_title_description',
  );

  const fallbackTicket = useMemo(() => getTicketById(ticketId), [ticketId]);

  const ticketDetailQuery = useQuery({
    queryKey: ['ticket-detail', projectId, ticketId],
    queryFn: () => fetchTicketDetail(projectId, ticketId),
    enabled: Boolean(projectId && ticketId && canViewTicketDetail),
  });

  const membersQuery = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: Boolean(projectId),
  });

  const ticketRepliesQuery = useInfiniteQuery({
    queryKey: ['ticket-replies', ticketId, currentUserId],
    initialPageParam: null as TicketRepliesCursor | null,
    queryFn: ({ pageParam }) =>
      fetchTicketReplies(
        ticketId,
        currentUserId,
        pageParam as TicketRepliesCursor | null,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.cursor ? lastPage.cursor : undefined,
    enabled: Boolean(ticketId && canViewReplies),
  });
  const ticketTimelineQuery = useQuery({
    queryKey: ['ticket-timeline', projectId, ticketId],
    queryFn: () => fetchTicketTimeline(projectId, ticketId),
    enabled: Boolean(projectId && ticketId && canViewTicketDetail),
  });
  const [replySocketToken, setReplySocketToken] =
    useState<SocketTokenResponse | null>(null);
  const [liveReplies, setLiveReplies] = useState<DiscussionReply[]>([]);

  const statusListQuery = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: fetchTicketStatuses,
    enabled: !isExternalUser,
  });
  const priorityListQuery = useQuery({
    queryKey: ['ticket-priorities'],
    queryFn: fetchTicketPriorities,
    enabled: !isExternalUser,
  });

  const updateTicketMutation = useMutation({
    mutationFn: async (payload: UpdateTicketRequest) => {
      const response = await fetch(
        `/api/projects/${projectId}/tickets/${ticketId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          Array.isArray(data?.message) && data.message.length
            ? data.message.join(', ')
            : data?.message || 'Failed to update ticket.';
        throw new Error(message);
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ticket-detail', projectId, ticketId],
        }),
        invalidateTicketTimeline(),
        queryClient.invalidateQueries({
          queryKey: ['dashboard-project-tickets'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: ['project-tickets'],
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
      ]);
      appToast.success('Ticket updated successfully.');
    },
    onError: (error) => {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to update ticket.',
      );
    },
  });
  const projectFilesQuery = useProjectFilesQuery(projectId, Boolean(projectId));

  const deleteProjectFileMutation = useDeleteProjectFileMutation();
  const [attachmentToDelete, setAttachmentToDelete] =
    useState<TicketAttachmentToDelete | null>(null);
  const createReplyMutation = useMutation({
    mutationFn: async ({
      message,
      attachments,
      mentionedUserIds,
    }: {
      message: string;
      attachments: File[];
      mentionedUserIds: string[];
    }) => {
      const uploadedAttachments = attachments.length
        ? await uploadFilesDirectly(attachments, 'tickets/replies')
        : [];

      const response = await fetch(
        `/api/tickets/${ticketId}/replies?projectId=${encodeURIComponent(projectId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.trim(),
            mentionedUserIds,
            attachments: uploadedAttachments,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          Array.isArray(data?.message) && data.message.length
            ? data.message.join(', ')
            : data?.message || 'Failed to create reply.';
        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ticket-replies', ticketId],
        }),
        invalidateTicketTimeline(),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'ticket-summary'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: projectsQueryKey,
          refetchType: 'all',
        }),
      ]);
      appToast.success('Reply posted successfully.');
    },
    onError: (error) => {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to create reply.',
      );
    },
  });
  const updateReplyMutation = useMutation({
    mutationFn: async ({
      replyId,
      message,
      mentionedUserIds,
    }: {
      replyId: string;
      message: string;
      mentionedUserIds: string[];
    }) => {
      const response = await fetch(
        `/api/tickets/${ticketId}/projects/${projectId}/reply/${replyId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            message: message.trim(),
            mentionedUserIds: mentionedUserIds
              .map((mentionedUserId) => mentionedUserId.trim())
              .filter((mentionedUserId) => mentionedUserId.length > 0),
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          Array.isArray(data?.message) && data.message.length
            ? data.message.join(', ')
            : data?.message || 'Failed to update reply.';
        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ticket-replies', ticketId],
        }),
        invalidateTicketTimeline(),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'ticket-summary'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: projectsQueryKey,
          refetchType: 'all',
        }),
      ]);
      appToast.success('Reply updated successfully.');
    },
    onError: (error) => {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to update reply.',
      );
    },
  });
  const deleteReplyMutation = useMutation({
    mutationFn: async ({ replyId }: { replyId: string }) => {
      const response = await fetch(
        `/api/tickets/${ticketId}/projects/${projectId}/reply/${replyId}`,
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
            : data?.message || 'Failed to delete reply.';
        throw new Error(errorMessage);
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ticket-replies', ticketId],
        }),
        invalidateTicketTimeline(),
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'ticket-summary'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: projectsQueryKey,
          refetchType: 'all',
        }),
      ]);
      appToast.success('Reply deleted successfully.');
    },
    onError: (error) => {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to delete reply.',
      );
    },
  });
  const toggleReplyReactionMutation = useMutation({
    mutationFn: async ({
      replyId,
      emoji,
      remove,
    }: {
      replyId: string;
      emoji: string;
      remove: boolean;
    }) => {
      const response = await fetch(
        `/api/tickets/${ticketId}/projects/${projectId}/reply/${replyId}/reactions`,
        {
          method: remove ? 'DELETE' : 'POST',
          headers: {
            Accept: 'application/json',
            ...(remove ? {} : { 'Content-Type': 'application/json' }),
          },
          body: remove ? undefined : JSON.stringify({ emoji }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          Array.isArray(data?.message) && data.message.length
            ? data.message.join(', ')
            : data?.message || 'Failed to update reply reaction.';
        throw new Error(errorMessage);
      }

      return { replyId, emoji, remove };
    },
    onError: (error) => {
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update reply reaction.',
      );
    },
  });

  const ticket = ticketDetailQuery.data ?? fallbackTicket;
  const ticketTimelineItems = useMemo(
    () =>
      mapApiTicketTimelineToItems(
        ticketTimelineQuery.data ?? [],
        statusListQuery.data ?? [],
      ),
    [statusListQuery.data, ticketTimelineQuery.data],
  );
  const [chatDrawerChannel, setChatDrawerChannel] =
    useState<ChatChannel | null>(null);
  const [hasUnreadInternalChat, setHasUnreadInternalChat] = useState(false);
  const isChatDrawerOpen = Boolean(chatDrawerChannel);
  const internalChatParam = searchParams.get('internal');
  const shouldDefaultToInternalChat = false;
  const isInternalChatActive =
    canViewInternalChatBtn &&
    (internalChatParam === 'true' ||
      (internalChatParam !== 'false' && shouldDefaultToInternalChat));
  const updateInternalChatParam = (isActive: boolean) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (isActive === shouldDefaultToInternalChat) {
      nextSearchParams.delete('internal');
    } else {
      nextSearchParams.set('internal', isActive ? 'true' : 'false');
    }

    const nextQuery = nextSearchParams.toString();

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };
  const {
    messages: internalChatMessages,
    loading: internalChatLoading,
    loadingMore: internalChatLoadingMore,
    hasMore: internalChatHasMore,
    sendMessage: sendInternalChatMessage,
    markRead: markInternalChatRead,
    deleteMessage: deleteInternalChatMessage,
    updateMessage: updateInternalChatMessage,
    toggleReaction: toggleInternalChatReaction,
    loadOlderMessages: loadOlderInternalChatMessages,
  } = useTicketChat({
    projectId: isInternalChatActive ? projectId : '',
    ticketId: isInternalChatActive ? ticketId : '',
    channel: 'internal',
    enabled: isInternalChatActive && canViewInternalChatBtn,
  });
  const {
    messages: externalChatMessages,
    loading: externalChatLoading,
    sendMessage: sendExternalChatMessage,
    markRead: markExternalChatRead,
    deleteMessage: deleteExternalChatMessage,
    updateMessage: updateExternalChatMessage,
    toggleReaction: toggleExternalChatReaction,
  } = useTicketChat({
    projectId:
      isChatDrawerOpen && chatDrawerChannel === 'external' ? projectId : '',
    ticketId:
      isChatDrawerOpen && chatDrawerChannel === 'external' ? ticketId : '',
    channel: 'external',
    enabled: isChatDrawerOpen && chatDrawerChannel === 'external',
  });
  const isTicketLoading =
    Boolean(projectId && ticketId && canViewTicketDetail) &&
    ticketDetailQuery.isLoading &&
    !ticket;
  const [selectedStatus, setSelectedStatus] = useState('Open');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedDueDate, setSelectedDueDate] = useState('');
  const [ticketSidebarTab, setTicketSidebarTab] =
    useState<TicketSidebarTabKey>('quick-links');
  const [isEditContentModalOpen, setIsEditContentModalOpen] = useState(false);

  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);

  const [shouldShowDescriptionToggle, setShouldShowDescriptionToggle] =
    useState(false);
  const descriptionContentRef = useRef<HTMLDivElement | null>(null);

  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const [deletingChatMessageId, setDeletingChatMessageId] = useState('');
  const [deletingTicketReplyId, setDeletingTicketReplyId] = useState('');
  const [editingChatMessageId, setEditingChatMessageId] = useState('');
  const [editingTicketReplyId, setEditingTicketReplyId] = useState('');
  const [chatMessagePendingDelete, setChatMessagePendingDelete] = useState<{
    id: string;
    message: string;
    channel: ChatChannel;
  } | null>(null);
  const [ticketReplyPendingDelete, setTicketReplyPendingDelete] =
    useState<DiscussionReply | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(
    null,
  );
  const unreadListenerSocketRef = useRef<ReturnType<typeof getSocket> | null>(
    null,
  );

  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const todayInputValue = getTodayInputValue();
  const minimumDueDate = getTomorrowInputValue();
  const isDueDateOverdue = Boolean(
    selectedDueDate && selectedDueDate < todayInputValue,
  );

  useEffect(() => {
    if (!canViewReplies || !projectId || !ticketId) {
      setReplySocketToken(null);
      return;
    }

    let isDisposed = false;

    void fetchSocketToken()
      .then((token) => {
        if (!isDisposed) {
          setReplySocketToken(token);
        }
      })
      .catch(() => {
        if (!isDisposed) {
          setReplySocketToken(null);
        }
      });

    return () => {
      isDisposed = true;
    };
  }, [canViewReplies, projectId, ticketId]);

  useEffect(() => {
    if (!canViewReplies) {
      setLiveReplies([]);
      return;
    }

    const pagedReplies = flattenTicketRepliesPages(
      ticketRepliesQuery.data?.pages,
    );

    setLiveReplies(
      ticketRepliesQuery.data ? pagedReplies : (ticket?.replies ?? []),
    );
  }, [canViewReplies, ticket?.replies, ticketRepliesQuery.data?.pages]);

  useTicketReplies({
    projectId,
    ticketId,
    token: replySocketToken,
    enabled: canViewReplies,
    onCreated: () => {
      void queryClient.invalidateQueries({
        queryKey: ['ticket-replies', ticketId],
      });
    },
    onUpdated: () => {
      void queryClient.invalidateQueries({
        queryKey: ['ticket-replies', ticketId],
      });
    },
    onReacted: () => {
      void queryClient.invalidateQueries({
        queryKey: ['ticket-replies', ticketId],
      });
    },
    onDeleted: () => {
      void queryClient.invalidateQueries({
        queryKey: ['ticket-replies', ticketId],
      });
    },
  });

  const statusOptions = useMemo(
    () =>
      (statusListQuery.data ?? []).map((status) => ({
        label: status.label,
        value: status.key,
        icon: (
          <span
            className="inline-block h-2.25 w-2.5 rounded-full"
            style={{ backgroundColor: status.color }}
          />
        ),
      })),
    [statusListQuery.data],
  );

  const assigneeOptions = useMemo(
    () =>
      (membersQuery.data ?? []).map((member) => ({
        label: member.fullName,
        value: member.id,
      })),
    [membersQuery.data],
  );
  const priorityOptions = useMemo(
    () =>
      (priorityListQuery.data ?? []).map((priority) => ({
        label: priority.label,
        value: priority.key,
        icon: (
          <span
            className="inline-block h-2.25 w-2.5 rounded-full"
            style={{ backgroundColor: priority.color }}
          />
        ),
      })),
    [priorityListQuery.data],
  );

  const selectedAssigneeId = useMemo(() => {
    if (!ticket) {
      return '';
    }

    return (
      assigneeOptions.find((option) => option.label === selectedAssignee)
        ?.value ??
      ticket.assigneeId ??
      ''
    );
  }, [assigneeOptions, selectedAssignee, ticket]);

  const ticketAttachmentGalleryImages = useMemo(
    () => buildTicketAttachmentGalleryImages(ticket?.attachments ?? []),
    [ticket?.attachments],
  );

  const invalidateTicketTimeline = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['ticket-timeline', projectId, ticketId],
    });
  };

  const invalidateTicketRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['ticket-detail', projectId, ticketId],
      }),
      invalidateTicketTimeline(),
      queryClient.invalidateQueries({
        queryKey: ['dashboard-project-tickets'],
        refetchType: 'all',
      }),
      queryClient.invalidateQueries({
        queryKey: ['project-tickets'],
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
    ]);
  };
  const sanitizedDescription = useMemo(() => {
    const description = ticket?.description?.trim() ?? '';

    if (!description) {
      return '';
    }

    return DOMPurify.sanitize(description, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'h1',
        'h2',
        'h3',
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'strike',
        'code',
        'pre',
        'blockquote',
        'ul',
        'ol',
        'li',
        'hr',
        'a',
      ],

      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  }, [ticket?.description]);
  const hasDescriptionContent = useMemo(() => {
    if (!sanitizedDescription) {
      return false;
    }

    const parsedDocument = new DOMParser().parseFromString(
      sanitizedDescription,
      'text/html',
    );

    return Boolean(parsedDocument.body.textContent?.trim());
  }, [sanitizedDescription]);

  useEffect(() => {
    if (!ticket) {
      return;
    }

    setSelectedStatus(ticket.status);
    setSelectedPriority(ticket.priorityKey ?? '');
    setSelectedAssignee(ticket.assigneeDetail?.name ?? '');
    setSelectedDueDate(toDateInputValue(ticket.dueDateValue ?? ''));
    setTitleDraft(ticket.title);
    setDescriptionDraft(ticket.description ?? '');
  }, [ticket]);

  useEffect(() => {
    /* empty */
  }, [sanitizedDescription]);

  useEffect(() => {
    const descriptionElement = descriptionContentRef.current;

    if (!descriptionElement || !hasDescriptionContent) {
      setShouldShowDescriptionToggle(false);
      return;
    }

    const measureOverflow = () => {
      setShouldShowDescriptionToggle(
        descriptionElement.scrollHeight > descriptionElement.clientHeight + 1,
      );
    };

    const animationFrameId = window.requestAnimationFrame(measureOverflow);

    const resizeObserver = new ResizeObserver(() => {
      measureOverflow();
    });

    resizeObserver.observe(descriptionElement);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [sanitizedDescription, hasDescriptionContent]);

  useEffect(() => {
    if (!projectId || !ticketId || !currentUserId) {
      setHasUnreadInternalChat(false);
      return;
    }

    let isDisposed = false;

    const syncUnreadState = async () => {
      const [internalUnread] = await Promise.all([
        canViewInternalChatBtn
          ? fetchUnreadIndicator(projectId, ticketId, 'internal')
          : Promise.resolve(false),
      ]);

      if (isDisposed) {
        return;
      }

      setHasUnreadInternalChat(internalUnread);
    };

    void syncUnreadState().catch(() => {
      // Keep the ticket detail page usable if unread bootstrap fails.
    });

    return () => {
      isDisposed = true;
    };
  }, [canViewInternalChatBtn, currentUserId, projectId, ticketId]);

  useEffect(() => {
    if (!projectId || !ticketId || !currentUserId) {
      return;
    }

    let isDisposed = false;
    let cleanup: (() => void) | undefined;

    const connectUnreadListener = async () => {
      const socketToken = await fetchSocketToken();

      if (isDisposed) {
        return;
      }

      const socket = getSocket('chat', socketToken);
      unreadListenerSocketRef.current = socket;

      const joinUnreadRooms = () => {
        if (canViewInternalChatBtn) {
          socket.emit('join', { projectId, ticketId, channel: 'internal' });
        }
      };

      const handleNewMessage = (payload: {
        channel: ChatChannel;
        message: ChatMessage;
      }) => {
        if (payload.message.senderId === currentUserId) {
          return;
        }

        if (payload.channel === 'internal') {
          setHasUnreadInternalChat(true);
        }
      };

      socket.on('connect', joinUnreadRooms);
      socket.on('new_message', handleNewMessage);

      if (socket.connected) {
        joinUnreadRooms();
      }

      cleanup = () => {
        if (canViewInternalChatBtn) {
          socket.emit('leave', { projectId, ticketId, channel: 'internal' });
        }

        socket.off('connect', joinUnreadRooms);
        socket.off('new_message', handleNewMessage);
        unreadListenerSocketRef.current = null;
      };
    };

    void connectUnreadListener().catch(() => {
      // Keep the ticket detail page usable if background socket sync fails.
    });

    return () => {
      isDisposed = true;

      if (cleanup) {
        cleanup();
      }
    };
  }, [
    canViewInternalChatBtn,
    currentUserId,
    isInternalChatActive,
    projectId,
    ticketId,
  ]);

  useEffect(() => {
    if (
      isChatDrawerOpen ||
      isInternalChatActive ||
      !unreadListenerSocketRef.current
    ) {
      return;
    }

    if (canViewInternalChatBtn) {
      unreadListenerSocketRef.current.emit('join', {
        projectId,
        ticketId,
        channel: 'internal',
      });
    }
  }, [
    canViewInternalChatBtn,
    isChatDrawerOpen,
    isInternalChatActive,
    projectId,
    ticketId,
  ]);

  useEffect(() => {
    if (
      !isInternalChatActive ||
      !currentUserId ||
      !internalChatMessages.length
    ) {
      return;
    }

    const unreadMessageIds = internalChatMessages
      .filter(
        (message) => !message.isRead && message.senderId !== currentUserId,
      )
      .map((message) => message.id);

    if (!unreadMessageIds.length) {
      return;
    }

    setHasUnreadInternalChat(false);

    void markInternalChatRead(unreadMessageIds).catch(() => {
      // Keep the UI responsive if read-receipt sync fails.
    });
  }, [
    currentUserId,
    internalChatMessages,
    isInternalChatActive,
    markInternalChatRead,
  ]);

  useEffect(() => {
    if (
      !isChatDrawerOpen ||
      chatDrawerChannel !== 'external' ||
      !currentUserId ||
      !externalChatMessages.length
    ) {
      return;
    }

    const unreadMessageIds = externalChatMessages
      .filter(
        (message) => !message.isRead && message.senderId !== currentUserId,
      )
      .map((message) => message.id);

    if (!unreadMessageIds.length) {
      return;
    }

    void markExternalChatRead(unreadMessageIds).catch(() => {
      // Keep the UI responsive if read-receipt sync fails.
    });
  }, [
    chatDrawerChannel,
    currentUserId,
    externalChatMessages,
    isChatDrawerOpen,
    markExternalChatRead,
  ]);

  // Event listener
  useEffect(() => {
    const handleNotificationNew = (payload: NotificationItem) => {
      if (
        payload.entityType === NotificationEntityType.PROJECT ||
        payload.entityType === NotificationEntityType.TICKET
      ) {
        void invalidateTicketRelated();
      }
    };

    eventEmitter.on('notification:new', handleNotificationNew);

    return () => {
      eventEmitter.off('notification:new', handleNotificationNew);
    };
  }, []);

  const openGallery = (images: GalleryImage[], index: number) => {
    if (!images.length || index < 0) {
      return;
    }

    setGalleryImages(images);
    setActiveGalleryIndex(index);
  };

  const closeGallery = () => {
    setActiveGalleryIndex(null);
    setGalleryImages([]);
  };

  const selectGalleryImage = (index: number) => {
    setActiveGalleryIndex(index);
  };

  const showPreviousGalleryImage = () => {
    setActiveGalleryIndex((current) =>
      current === null || !galleryImages.length
        ? current
        : (current - 1 + galleryImages.length) % galleryImages.length,
    );
  };

  const showNextGalleryImage = () => {
    setActiveGalleryIndex((current) =>
      current === null || !galleryImages.length
        ? current
        : (current + 1) % galleryImages.length,
    );
  };

  if (!canViewTicketDetail) {
    return (
      <div className="space-y-4 h-full py-8 pe-4">
        <div className="rounded-3xl border border-gray-200 bg-white px-6 py-10 shadow-[0_0_35px_0_rgb(0_0_0/0.04)]">
          <EmptyState
            imageUrl="/images/RecentTicketEmpty.svg"
            imageAlt="Tickets detail not found"
            title="You do not have permission to view ticket details."
            // description="Recent tickets will appear here once they are created."
            buttonLabel="Go Back"
            onButtonClick={() => router.back()}
          />
        </div>
      </div>
    );
  }

  if (isTicketLoading) {
    return <TicketDetailSkeleton />;
  }

  if (!ticket) {
    return (
      <div className="space-y-4 h-full py-8 pe-4">
        <div className="rounded-3xl h-full border border-gray-200 bg-white px-6 py-10 shadow-[0_0_35px_0_rgb(0_0_0/0.04)]">
          <EmptyState
            imageUrl="/images/RecentTicketEmpty.svg"
            imageAlt="Tickets detail not found "
            title="Tickets detail not found"
            buttonLabel="Go Back"
            onButtonClick={() => router.back()}
          />
        </div>
      </div>
    );
  }

  const handleStatusChange = async (value: string) => {
    if (!canEditStatus) {
      return;
    }

    setSelectedStatus(value);

    await updateTicketMutation.mutateAsync(
      buildUpdateTicketPayload({
        title: ticket.title,
        description: ticket.description,
        statusKey: value,
        priorityKey: selectedPriority,
        assigneeId: selectedAssigneeId,
        dueDate: selectedDueDate,
      }),
    );
  };

  const handlePriorityChange = async (value: string) => {
    if (!canEditPriority) {
      return;
    }

    setSelectedPriority(value);

    await updateTicketMutation.mutateAsync(
      buildUpdateTicketPayload({
        title: ticket.title,
        description: ticket.description,
        statusKey: selectedStatus,
        priorityKey: value,
        assigneeId: selectedAssigneeId,
        dueDate: selectedDueDate,
      }),
    );
  };

  const handleAssigneeChange = async (value: string) => {
    if (!canEditAssignee) {
      return;
    }

    const selectedOption = assigneeOptions.find(
      (option) => option.value === value,
    );
    setSelectedAssignee(selectedOption?.label ?? '');

    await updateTicketMutation.mutateAsync(
      buildUpdateTicketPayload({
        title: ticket.title,
        description: ticket.description,
        statusKey: selectedStatus,
        priorityKey: selectedPriority,
        assigneeId: value,
        dueDate: selectedDueDate,
      }),
    );
  };

  const handleDueDateChange = async (value: string) => {
    if (!canEditDueDate) {
      return;
    }

    if (value && value < minimumDueDate) {
      return;
    }

    setSelectedDueDate(value);

    await updateTicketMutation.mutateAsync(
      buildUpdateTicketPayload({
        title: ticket.title,
        description: ticket.description,
        statusKey: selectedStatus,
        priorityKey: selectedPriority,
        assigneeId: selectedAssigneeId,
        dueDate: value,
      }),
    );
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
    if (!canPostReplies) {
      return;
    }

    await createReplyMutation.mutateAsync({
      message,
      attachments,
      mentionedUserIds,
    });
  };

  const handleOpenProjectQuickLink = (
    tab?: 'thread' | 'files' | 'calendar' | 'notes',
  ) => {
    if (!projectId || !canViewProjectDetail) {
      return;
    }

    const nextSearchParams = new URLSearchParams();

    if (tab === 'thread') {
      nextSearchParams.set('t', '1');
    } else if (tab === 'files') {
      nextSearchParams.set('t', '2');
    } else if (tab === 'calendar') {
      nextSearchParams.set('t', '3');
    } else if (tab === 'notes') {
      nextSearchParams.set('t', '4');
    }

    const queryString = nextSearchParams.toString();

    router.push(
      queryString
        ? `/projects/${projectId}?${queryString}`
        : `/projects/${projectId}`,
    );
  };

  const handleEditTicketReply = async ({
    reply,
    message,
    mentionedUserIds,
  }: {
    reply: DiscussionReply;
    message: string;
    mentionedUserIds: string[];
  }) => {
    try {
      setEditingTicketReplyId(reply.id);

      setLiveReplies((current) =>
        current.map((currentReply) =>
          currentReply.id === reply.id
            ? {
                ...currentReply,
                message: message.trim(),
                mentionedUserIds,
                isEdited: true,
                updatedAt: new Date().toISOString(),
              }
            : currentReply,
        ),
      );

      await updateReplyMutation.mutateAsync({
        replyId: reply.id,
        message,
        mentionedUserIds,
      });
    } finally {
      setEditingTicketReplyId('');
    }
  };

  const handleSubmitChatMessage = async ({
    message,
    attachments,
    mentionedUserIds,
    channel,
    sendMessage,
  }: {
    message: string;
    attachments: File[];
    mentionedUserIds: string[];
    channel: ChatChannel;
    sendMessage: (payload: {
      message: string;
      messageType?: 'text' | 'attachment';
      attachmentUrl?: string;
      attachmentUrls?: string[];
      attachmentName?: string;
      attachmentSize?: number;
      mentionedUserIds?: string[];
    }) => Promise<ChatMessage>;
  }) => {
    try {
      setIsSendingChatMessage(true);

      const trimmedMessage = message.trim();

      if (attachments.length) {
        const uploadedFiles = await uploadChatAttachments(
          attachments,
          ticketId,
          channel,
        );
        const attachmentUrls = uploadedFiles
          .map((file) => buildAttachmentUrl(file.storageKey))
          .filter((url) => Boolean(url));

        if (attachmentUrls.length) {
          await sendMessage({
            message:
              trimmedMessage ||
              `Sent ${attachmentUrls.length} attachment${
                attachmentUrls.length === 1 ? '' : 's'
              }`,
            messageType: 'attachment',
            attachmentUrls,
            mentionedUserIds,
          });
        }
      } else if (trimmedMessage) {
        await sendMessage({
          message: trimmedMessage,
          messageType: 'text',
          mentionedUserIds,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['dashboard', 'ticket-summary'],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: projectsQueryKey,
          refetchType: 'all',
        }),
      ]);
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to send message.',
      );
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  const handleStartEditingContent = () => {
    if (!canEditTitleDescription) {
      return;
    }

    setTitleDraft(ticket.title);
    setDescriptionDraft(ticket.description ?? '');
    setIsEditContentModalOpen(true);
  };

  const handleCancelEditingContent = () => {
    setTitleDraft(ticket.title);
    setDescriptionDraft(ticket.description ?? '');
    setIsEditContentModalOpen(false);
  };

  const handleSaveTicketContent = async () => {
    if (!canEditTitleDescription) {
      return;
    }

    const nextTitle = titleDraft.trim();
    const nextDescription = descriptionDraft.trim();
    const currentDescription = (ticket.description ?? '').trim();

    if (!nextTitle) {
      appToast.error('Title is required.');
      return;
    }

    if (nextTitle === ticket.title && nextDescription === currentDescription) {
      setIsEditContentModalOpen(false);
      return;
    }

    await updateTicketMutation.mutateAsync(
      buildUpdateTicketPayload({
        title: nextTitle,
        description: nextDescription,
        statusKey: selectedStatus,
        priorityKey: selectedPriority,
        assigneeId: selectedAssigneeId,
        dueDate: selectedDueDate,
      }),
    );

    setIsEditContentModalOpen(false);
  };

  const handleDeleteChatMessage = (reply: { id: string; message: string }) => {
    setChatMessagePendingDelete({
      ...reply,
      channel: isInternalChatActive ? 'internal' : 'external',
    });
  };

  const handleDeleteTicketReply = (reply: DiscussionReply) => {
    setTicketReplyPendingDelete(reply);
  };

  const handleConfirmDeleteChatMessage = async () => {
    if (!chatMessagePendingDelete) {
      return;
    }

    try {
      setDeletingChatMessageId(chatMessagePendingDelete.id);
      if (chatMessagePendingDelete.channel === 'internal') {
        await deleteInternalChatMessage(chatMessagePendingDelete.id);
      } else {
        await deleteExternalChatMessage(chatMessagePendingDelete.id);
      }
      appToast.success('Message deleted successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to delete message.',
      );
    } finally {
      setDeletingChatMessageId('');
      setChatMessagePendingDelete(null);
    }
  };

  const handleConfirmDeleteTicketReply = async () => {
    if (!ticketReplyPendingDelete) {
      return;
    }

    const replyId = ticketReplyPendingDelete.id;

    try {
      setDeletingTicketReplyId(replyId);
      setLiveReplies((current) =>
        current.filter((reply) => reply.id !== replyId),
      );
      await deleteReplyMutation.mutateAsync({ replyId });
      setTicketReplyPendingDelete(null);
    } catch (error) {
      await queryClient.invalidateQueries({
        queryKey: ['ticket-replies', ticketId],
      });
      throw error;
    } finally {
      setDeletingTicketReplyId('');
    }
  };

  const handleEditChatMessage = async ({
    reply,
    message,
    mentionedUserIds,
    updateMessage,
  }: {
    reply: DiscussionReply;
    message: string;
    mentionedUserIds: string[];
    updateMessage: (
      messageId: string,
      payload: {
        message: string;
        messageType?: 'text' | 'attachment';
        attachmentUrls?: string[];
        attachmentName?: string;
        attachmentSize?: number;
        mentionedUserIds?: string[];
      },
    ) => Promise<ChatMessage>;
  }) => {
    try {
      setEditingChatMessageId(reply.id);
      await updateMessage(reply.id, {
        message: message.trim(),
        mentionedUserIds,
      });
      appToast.success('Message updated successfully.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to update message.',
      );
      throw error;
    } finally {
      setEditingChatMessageId('');
    }
  };
  const handleViewAttachment = (
    attachment: (typeof ticket.attachments)[number],
  ) => {
    if (isImageAttachmentExtension(attachment.extension)) {
      const index = ticketAttachmentGalleryImages.findIndex(
        (image) => image.attachmentId === attachment.id,
      );

      openGallery(ticketAttachmentGalleryImages, index);
      return;
    }

    const attachmentUrl = getAttachmentUrl(attachment.storageKey);

    if (attachmentUrl) {
      window.open(attachmentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadAttachment = (
    attachment: (typeof ticket.attachments)[number],
  ) => {
    if (!attachment.storageKey) {
      return;
    }

    const searchParams = new URLSearchParams({
      storageKey: attachment.storageKey,
      fileName: attachment.name,
    });

    const link = document.createElement('a');

    link.href = `/api/projects/files/download?${searchParams.toString()}`;
    link.download = attachment.name;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleRequestDeleteAttachment = (
    attachment: (typeof ticket.attachments)[number],
  ) => {
    const matchingProjectFile = projectFilesQuery.data?.find(
      (file) =>
        file.storageKey === attachment.storageKey &&
        (!file.sourceId || file.sourceId === ticketId),
    );

    if (!matchingProjectFile) {
      appToast.error('Unable to find the corresponding project file.');
      return;
    }

    setAttachmentToDelete({
      attachmentId: attachment.id,
      projectFileId: matchingProjectFile.id,
      name: attachment.name,
    });
  };
  const handleConfirmDeleteAttachment = async () => {
    if (!attachmentToDelete) {
      return;
    }

    try {
      await deleteProjectFileMutation.mutateAsync({
        projectId,
        fileId: attachmentToDelete.projectFileId,
      });

      await queryClient.invalidateQueries({
        queryKey: ['ticket-detail', projectId, ticketId],
      });

      appToast.success('Attachment deleted successfully.');
      setAttachmentToDelete(null);
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to delete attachment.',
      );
    }
  };
  const applyReplyReactionOptimisticUpdate = (
    replies: DiscussionReply[],
    replyId: string,
    emoji: string,
    remove: boolean,
  ) =>
    replies.map((reply) => {
      if (reply.id !== replyId) {
        return reply;
      }

      const currentReactions = reply.reactions ?? [];
      const currentUserReaction = currentReactions.find(
        (reaction) => reaction.reactedByCurrentUser,
      );
      let nextReactions = currentReactions.map((reaction) => ({ ...reaction }));

      if (
        currentUserReaction &&
        (!remove || currentUserReaction.emoji !== emoji)
      ) {
        nextReactions = decrementDiscussionReaction(
          nextReactions,
          currentUserReaction.emoji,
          currentUserId,
        );
      }

      if (!remove) {
        nextReactions = incrementDiscussionReaction(
          nextReactions,
          emoji,
          currentUserId,
        );
      }

      return {
        ...reply,
        reactions: nextReactions,
      };
    });

  const handleToggleTicketReplyReaction = async (
    reply: DiscussionReply,
    emoji: string,
  ) => {
    const remove = Boolean(
      reply.reactions?.some(
        (reaction) => reaction.emoji === emoji && reaction.reactedByCurrentUser,
      ),
    );
    const previousReplies = liveReplies;

    setLiveReplies((current) =>
      applyReplyReactionOptimisticUpdate(current, reply.id, emoji, remove),
    );

    try {
      await toggleReplyReactionMutation.mutateAsync({
        replyId: reply.id,
        emoji,
        remove,
      });
    } catch (error) {
      setLiveReplies(previousReplies);
      throw error;
    }
  };

  const handleToggleChatMessageReaction = async (
    reply: DiscussionReply,
    emoji: string,
    channel: ChatChannel,
  ) => {
    const remove = Boolean(
      reply.reactions?.some(
        (reaction) => reaction.emoji === emoji && reaction.reactedByCurrentUser,
      ),
    );

    if (channel === 'internal') {
      await toggleInternalChatReaction({
        messageId: reply.id,
        emoji,
        remove,
      });
      return;
    }

    await toggleExternalChatReaction({
      messageId: reply.id,
      emoji,
      remove,
    });
  };

  return (
    <div className="relative z-100 h-full xl:h-dvh overflow-hidden py-4 xl:py-5 xl:pr-5 px-3 xl:px-0 pt-2 pb-0">
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-y-auto overscroll-contain scrollbar-hide xl:overflow-hidden xl:rounded-2xl xl:border xl:border-white xl:bg-white/40 xl:p-3">
        <div className="relative shrink-0 flex w-full flex-col gap-2 overflow-hidden rounded-xl bg-[url('/images/DashboardComponentBgImage.jpg')] bg-cover bg-center bg-no-repeat px-4 pt-4 pb-2 xl:flex-row xl:items-center xl:gap-4  xl:px-7.5 xl:py-6">
          {/* Background overlay */}
          <div
            className="absolute inset-0 bg-black/30 z-10"
            aria-hidden="true"
          />
          <div className="relative flex xl:flex-row xl:items-center items-start flex-col min-w-0  gap-3  z-20  w-full">
            <button className="mr-3" onClick={() => router.back()}>
              <Image
                alt={''}
                src="/images/bannerBackBtn.svg"
                width={48}
                height={48}
                className="h-10 w-10 shrink-0 backdrop-blur-3xl drop-shadow xl:h-12 xl:w-12"
              />
            </button>

            <div className="hidden  gap-4 w-full xl:grid sm:grid-cols-5">
              <MetaItem
                label="Ticket ID"
                value={`${ticket.ticketRefNo ?? ticket.id}`}
              />

              <MetaItem label="Created on" value={ticket.date} />
              <MetaItem
                label="Created By"
                value={(ticket as any).createdByDetail?.name ?? 'Unknown'}
              />

              <MetaItem
                label="Project"
                hideTooltip={false}
                value={ticket.project.name}
              />

              {ticket.dueDate ? (
                <div>
                  <span className="block text-sm text-gray-300">Due Date</span>

                  <div
                    className={`flex h-fit items-start gap-2 rounded-lg pt-2 text-white`}
                  >
                    <div className="flex w-full items-center gap-3">
                      <p className="pt-px text-sm font-medium">
                        {ticket.dueDate}
                      </p>

                      {isDueDateOverdue ? (
                        <p className="rounded-full bg-[#F04438] px-2.5 py-0.5 text-sm font-medium text-white">
                          Overdue
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="xl:hidden  flex flex-col gap-4 w-full">
              <div className="grid grid-cols-3 gap-4">
                <MetaItem
                  label="Ticket ID"
                  value={`${ticket.ticketRefNo ?? ticket.id}`}
                />

                <MetaItem label="Created on" value={ticket.date} />
                <MetaItem
                  label="Created By"
                  value={(ticket as any).createdByDetail?.name ?? 'Unknown'}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <MetaItem
                  label="Project"
                  hideTooltip={false}
                  value={ticket.project.name}
                />

                {ticket.dueDate ? (
                  <div className="flex flex-col">
                    <span className="block text-sm text-gray-300 leading-none">
                      Due Date
                    </span>

                    <div
                      className={`flex h-fit items-start gap-2 rounded-lg  text-white`}
                    >
                      <div className="flex w-full items-center gap-3">
                        <p className="pt-px text-sm font-medium ">
                          {ticket.dueDate}
                        </p>

                        {isDueDateOverdue ? (
                          <p className="rounded-full bg-[#F04438] px-2.5 py-0.5 text-sm font-medium text-white">
                            Overdue
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 min-w-0 flex-none overflow-visible xl:flex-1 xl:overflow-hidden">
          <div className="grid h-auto min-h-0 min-w-0 grid-cols-1 gap-4 overflow-visible xl:h-full xl:grid-cols-12 xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden">
            <div className="flex h-auto min-w-0 flex-col space-y-4 overflow-visible xl:col-span-9 xl:h-full xl:min-h-0 xl:overflow-hidden">
              <section className="rounded-xl border border-gray-200 bg-white p-3  md:p-5">
                <div className=" relative">
                  <div className="mb-2 flex absolute top-0 inset-e-0 items-start justify-end">
                    {canEditTitleDescription ? (
                      <button
                        type="button"
                        onClick={handleStartEditingContent}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 transition hover:bg-gray-50"
                        aria-label="Edit ticket content"
                      >
                        <EditIcon />
                      </button>
                    ) : null}
                  </div>

                  <div className="block w-full text-left">
                    <h2 className="pr-10 text-base font-semibold leading-8 text-gray-900 md:text-xl">
                      {ticket.title}
                    </h2>
                  </div>

                  <div className="mt-2 max-h-52 w-full overflow-y-auto text-left tiny-scrollbar">
                    {hasDescriptionContent ? (
                      <>
                        <div
                          ref={descriptionContentRef}
                          className="rich-text-content line-clamp-2 text-sm text-gray-700"
                          dangerouslySetInnerHTML={{
                            __html: sanitizedDescription,
                          }}
                        />

                        {shouldShowDescriptionToggle ? (
                          <button
                            type="button"
                            onClick={() => setIsDescriptionModalOpen(true)}
                            className="mt-1 inline-flex cursor-pointer text-sm font-medium text-[#8A38F5]"
                          >
                            ... read more
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm text-gray-700">Add description</p>
                    )}
                  </div>
                </div>
              </section>
              <div className="h-auto min-h-0 flex-none overflow-visible xl:h-full xl:flex-1 xl:overflow-hidden">
                {canViewReplies || canViewInternalChatBtn ? (
                  <TicketRepliesPanel
                    title={
                      isInternalChatActive && canViewInternalChatBtn
                        ? 'Internal Chat'
                        : 'Replies'
                    }
                    mentionMembers={membersQuery.data ?? []}
                    headerAction={
                      canViewInternalChatBtn ? (
                        <label className="inline-flex items-center gap-2 sborder border-gray-200">
                          {hasUnreadInternalChat && !isInternalChatActive ? (
                            <span className=" h-2.5 w-2.5 rounded-full border border-white bg-green-500 animate-pulse" />
                          ) : null}
                          <span className="text-xs font-medium text-gray-600">
                            Internal Chat
                          </span>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={isInternalChatActive}
                            aria-label="Toggle internal chat"
                            onClick={() => {
                              const nextIsInternalChat = !isInternalChatActive;

                              updateInternalChatParam(nextIsInternalChat);

                              if (nextIsInternalChat) {
                                setHasUnreadInternalChat(false);
                              }
                            }}
                            className={`relative inline-flex h-6 w-10 items-center rounded-full transition ${
                              isInternalChatActive
                                ? 'bg-[#3B82F6]'
                                : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                isInternalChatActive
                                  ? 'translate-x-5'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </label>
                      ) : null
                    }
                    replies={
                      isInternalChatActive && canViewInternalChatBtn
                        ? internalChatMessages.map((message) =>
                            mapChatMessageToDiscussionReply(
                              message,
                              currentUserId,
                            ),
                          )
                        : canViewReplies
                          ? liveReplies
                          : []
                    }
                    hasMoreReplies={
                      isInternalChatActive && canViewInternalChatBtn
                        ? internalChatHasMore
                        : canViewReplies
                          ? Boolean(ticketRepliesQuery.hasNextPage)
                          : false
                    }
                    isLoadingMoreReplies={
                      isInternalChatActive && canViewInternalChatBtn
                        ? internalChatLoadingMore
                        : canViewReplies
                          ? ticketRepliesQuery.isFetchingNextPage
                          : false
                    }
                    onLoadMoreReplies={
                      isInternalChatActive && canViewInternalChatBtn
                        ? loadOlderInternalChatMessages
                        : canViewReplies && ticketRepliesQuery.hasNextPage
                          ? async () => {
                              await ticketRepliesQuery.fetchNextPage();
                            }
                          : undefined
                    }
                    emptyTitle={
                      isInternalChatActive && canViewInternalChatBtn
                        ? internalChatLoading
                          ? 'Loading internal chat...'
                          : 'No messages yet.'
                        : ticketRepliesQuery.isLoading
                          ? 'Loading replies...'
                          : 'No replies yet.'
                    }
                    emptyDescription={
                      isInternalChatActive && canViewInternalChatBtn
                        ? internalChatLoading
                          ? 'Fetching internal chat history.'
                          : 'Start the internal conversation on this ticket.'
                        : ticketRepliesQuery.isLoading
                          ? 'Fetching ticket replies.'
                          : 'No responses have been added to this ticket yet.'
                    }
                    canCompose={
                      isInternalChatActive && canViewInternalChatBtn
                        ? canPostReplies
                        : canPostReplies
                    }
                    canAttachFile={canAttachReplyFiles}
                    isSubmittingReply={
                      isInternalChatActive && canViewInternalChatBtn
                        ? isSendingChatMessage
                        : createReplyMutation.isPending
                    }
                    onSubmitReply={
                      isInternalChatActive && canViewInternalChatBtn
                        ? canPostReplies
                          ? (payload) =>
                              handleSubmitChatMessage({
                                ...payload,
                                channel: 'internal',
                                sendMessage: sendInternalChatMessage,
                              })
                          : undefined
                        : canPostReplies
                          ? handleSubmitReply
                          : undefined
                    }
                    requireMessage={false}
                    currentUserId={currentUserId}
                    onDeleteReply={
                      isInternalChatActive && canViewInternalChatBtn
                        ? canDeleteReplies
                          ? handleDeleteChatMessage
                          : undefined
                        : canDeleteReplies
                          ? handleDeleteTicketReply
                          : undefined
                    }
                    onEditReply={
                      isInternalChatActive && canViewInternalChatBtn
                        ? canEditReplies
                          ? ({ reply, message, mentionedUserIds }) =>
                              handleEditChatMessage({
                                reply,
                                message,
                                mentionedUserIds,
                                updateMessage: updateInternalChatMessage,
                              })
                          : undefined
                        : canEditReplies
                          ? handleEditTicketReply
                          : undefined
                    }
                    onToggleReaction={
                      isInternalChatActive && canViewInternalChatBtn
                        ? (reply, emoji) =>
                            handleToggleChatMessageReaction(
                              reply,
                              emoji,
                              'internal',
                            )
                        : !isInternalChatActive && canViewReplies
                          ? handleToggleTicketReplyReaction
                          : undefined
                    }
                    deletingReplyId={
                      isInternalChatActive && canViewInternalChatBtn
                        ? deletingChatMessageId
                        : deletingTicketReplyId
                    }
                    editingReplyId={
                      isInternalChatActive && canViewInternalChatBtn
                        ? editingChatMessageId
                        : editingTicketReplyId
                    }
                    composerPlaceholder={
                      isInternalChatActive && canViewInternalChatBtn
                        ? 'Write a message, press @ to mention'
                        : ticket.createdByDetail?.name
                          ? `Write to ${ticket.createdByDetail.name}, press @ to mention`
                          : 'Write a reply, press @ to mention'
                    }
                  />
                ) : null}
              </div>
            </div>
            <aside className="h-auto min-h-0 min-w-0 space-y-4 overflow-visible scrollbar-hide xl:col-span-3 xl:h-full xl:overflow-y-auto">
              <section className="rounded-xl border border-gray-200 bg-white">
                <h3 className="border-b border-gray-200 px-3 py-3 text-sm font-semibold text-gray-900 md:text-base">
                  Actions
                </h3>

                <div className="space-y-2 p-3 sm:p-4">
                  <div className="grid items-center grid-cols-[60px_minmax(0,1fr)] 2xl:grid-cols-2 gap-2 2xl:gap-4">
                    <span className="text-sm text-black font-normal">
                      Status
                    </span>
                    <Dropdown
                      options={statusOptions}
                      value={selectedStatus}
                      disabled={
                        updateTicketMutation.isPending || !canEditStatus
                      }
                      onChange={handleStatusChange}
                      applyHeight={false}
                    />
                  </div>
                  <div className="grid items-center grid-cols-[60px_minmax(0,1fr)] 2xl:grid-cols-2 gap-2 2xl:gap-4">
                    <span className="text-sm text-black font-normal">
                      Priority
                    </span>
                    <Dropdown
                      options={priorityOptions}
                      value={selectedPriority}
                      disabled={
                        updateTicketMutation.isPending || !canEditPriority
                      }
                      onChange={handlePriorityChange}
                      applyHeight={false}
                    />
                  </div>
                  <div className="grid items-center grid-cols-[60px_minmax(0,1fr)] 2xl:grid-cols-2 gap-2 2xl:gap-4">
                    <span className="text-sm text-black font-normal">
                      Assignee
                    </span>

                    <Dropdown
                      options={assigneeOptions}
                      value={selectedAssigneeId}
                      disabled={
                        updateTicketMutation.isPending || !canEditAssignee
                      }
                      onChange={handleAssigneeChange}
                    />
                  </div>
                  <section className="grid w-full grid-cols-[60px_minmax(0,1fr)] items-center gap-2 2xl:grid-cols-2 2xl:gap-4">
                    <span className="whitespace-nowrap text-sm font-normal text-black">
                      Due Date
                    </span>

                    <div className="min-w-0 xl:w-[calc(100%+0.5rem)] 2xl:w-full">
                      <label className="flex w-full min-w-0 items-center justify-between rounded-lg border border-gray-200 px-3 py-1.5">
                        <input
                          type="date"
                          value={selectedDueDate}
                          min={minimumDueDate}
                          disabled={
                            updateTicketMutation.isPending || !canEditDueDate
                          }
                          onChange={(event) =>
                            handleDueDateChange(event.target.value)
                          }
                          className="w-full min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none disabled:cursor-not-allowed disabled:text-gray-400"
                        />
                      </label>
                    </div>
                  </section>
                </div>
              </section>
              {projectId && canViewProjectDetail ? (
                <section className="rounded-xl border border-gray-200 bg-white">
                  <div className=" px-3 py-3">
                    <div className="relative grid w-full grid-cols-2 gap-1 rounded-full border border-gray-200 bg-gray-50 p-1 shadow-[inset_0_1px_3px_rgba(15,23,42,0.06)]">
                      <div
                        className="absolute top-1 bottom-1 left-0 rounded-full bg-white shadow-[0_0_25px_0_rgb(27_28_29/0.12)] transition-all duration-300 ease-out"
                        style={{
                          width: 'calc(50% - 0.375rem)',
                          left:
                            ticketSidebarTab === 'quick-links'
                              ? '0.25rem'
                              : 'calc(50% + 0.125rem)',
                          opacity: 1,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setTicketSidebarTab('quick-links')}
                        className={`relative z-10 w-full rounded-full px-4 py-1.25 text-sm font-medium transition-colors duration-300 ${
                          ticketSidebarTab === 'quick-links'
                            ? 'text-gray-950'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Quick Links
                      </button>
                      <button
                        type="button"
                        onClick={() => setTicketSidebarTab('timeline')}
                        className={`relative z-10 w-full rounded-full px-4 py-1.25 text-sm font-medium transition-colors duration-300 ${
                          ticketSidebarTab === 'timeline'
                            ? 'text-gray-950'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Ticket Timeline
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    {ticketSidebarTab === 'quick-links' ? (
                      <div>
                        <QuickLinkButton
                          label="Go to Project"
                          iconBg="bg-blue-500"
                          icon={
                            <ProjectsIcon
                              opacity="0"
                              fill="white"
                              width="22"
                              height="18"
                            />
                          }
                          onClick={() => handleOpenProjectQuickLink()}
                        />
                        {canViewProjectThread ? (
                          <QuickLinkButton
                            label="Thread"
                            iconBg="bg-purple-500"
                            icon={
                              <ChatIcon fill="white" width="16" height="16" />
                            }
                            onClick={() => handleOpenProjectQuickLink('thread')}
                          />
                        ) : null}
                        {canViewProjectFiles ? (
                          <QuickLinkButton
                            label="Files"
                            iconBg="bg-warning-500"
                            icon={
                              <FilesTabIcon
                                fill="white"
                                width="16"
                                height="16"
                              />
                            }
                            onClick={() => handleOpenProjectQuickLink('files')}
                          />
                        ) : null}
                        {canViewProjectCalendar ? (
                          <QuickLinkButton
                            label="Calendar"
                            iconBg="bg-green-500"
                            icon={
                              <CalendarTabIcon
                                fill="white"
                                width="16"
                                height="16"
                              />
                            }
                            onClick={() =>
                              handleOpenProjectQuickLink('calendar')
                            }
                          />
                        ) : null}
                        {canViewProjectNotes ? (
                          <QuickLinkButton
                            label="Notes"
                            iconBg="bg-rose-500"
                            icon={
                              <NotesTabIcon
                                fill="white"
                                width="16"
                                height="16"
                              />
                            }
                            onClick={() => handleOpenProjectQuickLink('notes')}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <div className="px-4 py-4">
                        <TicketTimeline items={ticketTimelineItems} />
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                <section className="rounded-xl border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 px-3 py-3">
                    <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 p-1 shadow-[inset_0_1px_3px_rgba(15,23,42,0.06)]">
                      <span className="w-full rounded-full bg-white px-4 py-1.5 text-center text-sm font-medium text-gray-950 shadow-[0_0_20px_rgba(15,23,42,0.08)]">
                        Ticket Timeline
                      </span>
                    </div>
                  </div>

                  <div className="px-4 py-4">
                    <TicketTimeline items={ticketTimelineItems} />
                  </div>
                </section>
              )}

              <section className="rounded-xl border border-gray-200 bg-white ">
                <h3 className="border-b border-gray-200 px-3 py-3 text-sm font-semibold text-gray-900 sm:px-4 md:text-base">
                  Attachments
                </h3>

                <div className="">
                  {ticket.attachments.length ? (
                    ticket.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleViewAttachment(attachment)}
                        onKeyDown={(event) => {
                          if (event.target !== event.currentTarget) {
                            return;
                          }

                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleViewAttachment(attachment);
                          }
                        }}
                        className="flex cursor-pointer items-center gap-3 border-b border-gray-200 px-4 py-3 transition last:border-b-0 hover:bg-gray-50"
                      >
                        {isImageAttachmentExtension(attachment.extension) ? (
                          <img
                            alt={attachment.name}
                            className="h-10 w-10 shrink-0 rounded-sm border border-gray-200 object-cover"
                            src={getFileUrl(attachment.storageKey)}
                          />
                        ) : (
                          <div className="shrink-0">
                            <FileBadgeIcon extension={attachment.extension} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-800">
                            {attachment.name}
                          </p>

                          <p className="text-sm text-gray-500">
                            {attachment.sizeLabel}
                          </p>
                        </div>

                        <Menu
                          as="div"
                          className="relative ml-auto shrink-0"
                          onClick={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <MenuButton
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                            onMouseDown={(event) => {
                              event.stopPropagation();
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 outline-none transition hover:bg-gray-100 data-open:bg-gray-100"
                            aria-label={`Actions for ${attachment.name}`}
                          >
                            <ThreedotIcon />
                          </MenuButton>

                          <MenuItems
                            anchor="bottom end"
                            transition
                            onClick={(event) => event.stopPropagation()}
                            className="z-100 mt-2 w-40 origin-top-right rounded-xl border border-gray-200 bg-white p-1 shadow-[0_14px_44px_rgb(0_0_0/0.14)] outline-none transition duration-150 data-closed:-translate-y-2 data-closed:scale-95 data-closed:opacity-0"
                          >
                            <MenuItem>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleViewAttachment(attachment);
                                }}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 outline-none transition data-focus:bg-gray-50"
                              >
                                <EyeOpenedIcon fill="#374151" />
                                View
                              </button>
                            </MenuItem>

                            <MenuItem>
                              <button
                                type="button"
                                disabled={!attachment.storageKey}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDownloadAttachment(attachment);
                                }}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 outline-none transition data-focus:bg-gray-50 data-disabled:cursor-not-allowed data-disabled:opacity-50"
                              >
                                <DownloadIcon />
                                Download
                              </button>
                            </MenuItem>

                            <MenuItem>
                              <button
                                type="button"
                                disabled={
                                  projectFilesQuery.isLoading ||
                                  deleteProjectFileMutation.isPending
                                }
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();

                                  handleRequestDeleteAttachment(attachment);
                                }}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 outline-none transition data-focus:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <TrashIcon />
                                Delete
                              </button>
                            </MenuItem>
                          </MenuItems>
                        </Menu>
                      </div>
                    ))
                  ) : (
                    <div className="py-2">
                      <EmptyState
                        imageUrl="/images/EmptyProjectIcon.svg"
                        imageAlt="No attachments"
                        title="No Attachments"
                        description="No attachments have been added to this ticket yet."
                      />
                    </div>
                  )}
                </div>
              </section>

              {!isExternalUser ? (
                <section className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                  <h3 className="border-b border-gray-200 px-3 py-2 md:py-3 text-sm font-semibold text-gray-900 sm:px-4 md:text-base">
                    People
                  </h3>

                  <div>
                    <PersonCard person={ticket.reporter} />

                    {ticket.assigneeDetail ? (
                      <PersonCard person={ticket.assigneeDetail} />
                    ) : null}
                  </div>
                </section>
              ) : null}
            </aside>
          </div>
        </div>
      </div>

      <AppModal
        isOpen={isChatDrawerOpen && chatDrawerChannel === 'external'}
        onClose={() => setChatDrawerChannel(null)}
        title="External Chat"
        position={ModalPosition.RIGHT}
        size="extraLarge"
        showFooter={false}
        bodyPaddingClasses="p-0!"
        outSideClickClose={false}
      >
        <div className="relative flex h-full min-h-0 flex-col bg-[#F8FAFC]">
          {isSendingChatMessage ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 backdrop-blur">
              <div className="flex min-w-65 flex-col items-center gap-4 rounded-2xl px-8 py-7 text-center">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#BFDBFE] border-t-[#1D4ED8]" />
              </div>
            </div>
          ) : null}
          <div className="min-h-0 flex-1  relative">
            <TicketRepliesPanel
              hideHeader={true}
              className="rounded-none!"
              title="Client Chat"
              subtitle=""
              replies={externalChatMessages.map((message) =>
                mapChatMessageToDiscussionReply(message, currentUserId),
              )}
              emptyTitle={
                externalChatLoading ? 'Loading chat...' : 'No messages yet.'
              }
              emptyDescription={
                externalChatLoading
                  ? 'Fetching message history.'
                  : 'Start the conversation on this ticket.'
              }
              canCompose={canPostReplies}
              canAttachFile={canAttachReplyFiles}
              isSubmittingReply={isSendingChatMessage}
              onSubmitReply={
                canPostReplies
                  ? (payload) =>
                      handleSubmitChatMessage({
                        ...payload,
                        channel: 'external',
                        sendMessage: sendExternalChatMessage,
                      })
                  : undefined
              }
              mentionMembers={membersQuery.data ?? []}
              requireMessage={false}
              currentUserId={currentUserId}
              onDeleteReply={handleDeleteChatMessage}
              onEditReply={({ reply, message, mentionedUserIds }) =>
                handleEditChatMessage({
                  reply,
                  message,
                  mentionedUserIds,
                  updateMessage: updateExternalChatMessage,
                })
              }
              deletingReplyId={deletingChatMessageId}
              editingReplyId={editingChatMessageId}
            />
          </div>
        </div>
      </AppModal>

      <AppModal
        isOpen={isEditContentModalOpen}
        onClose={handleCancelEditingContent}
        onCancel={handleCancelEditingContent}
        onConfirm={() => void handleSaveTicketContent()}
        title="Edit Ticket"
        size="large"
        showFooter
        confirmLabel={updateTicketMutation.isPending ? 'Updating...' : 'Update'}
        cancelLabel="Discard"
        confimBtnDisable={updateTicketMutation.isPending || !titleDraft.trim()}
        disableCloseButton={updateTicketMutation.isPending}
        outSideClickClose={!updateTicketMutation.isPending}
        scrollNeeded={false}
        bodyPaddingClasses="flex min-h-0 flex-1 overflow-hidden p-0!"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden p-4 md:p-5">
            <div className="shrink-0">
              <label
                htmlFor="edit-ticket-title"
                className="mb-1.5 block text-sm font-normal text-gray-800 md:text-base"
              >
                Title
              </label>

              <input
                id="edit-ticket-title"
                type="text"
                value={titleDraft}
                autoFocus
                disabled={updateTicketMutation.isPending}
                onChange={(event) => setTitleDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    handleCancelEditingContent();
                  }
                }}
                placeholder="Enter ticket title"
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 outline-none placeholder:text-gray-300 focus:border-gray-400 md:text-base"
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <label className="mb-1.5 block shrink-0 text-sm font-normal text-gray-800 md:text-base">
                Description
              </label>

              <RichTextEditor
                value={descriptionDraft}
                onChange={setDescriptionDraft}
                placeholder="Describe the issue in detail..."
                maxLength={MAX_DESCRIPTION_LENGTH}
                disabled={updateTicketMutation.isPending}
                showCharacterCount
                editorClassName="text-sm font-normal text-gray-700"
                className="
            flex min-h-0 flex-1 flex-col
            [&_.rich-text-editor]:min-h-0
            [&_.rich-text-editor]:flex-1
            [&_.rich-text-scroll-area]:min-h-0
            [&_.rich-text-scroll-area]:flex-1
            [&_.rich-text-scroll-area]:shrink
            [&_.rich-text-scroll-area]:overflow-y-auto
          "
              />
            </div>
          </div>
        </div>
      </AppModal>
      <ConfirmActionModal
        isOpen={Boolean(chatMessagePendingDelete)}
        onClose={() => {
          if (deletingChatMessageId) {
            return;
          }

          setChatMessagePendingDelete(null);
        }}
        title="Delete Message?"
        message={
          chatMessagePendingDelete?.message.trim()
            ? 'Are you sure you want to delete this message? This action cannot be undone.'
            : 'Are you sure you want to delete this attachment message? This action cannot be undone.'
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        isSubmitting={Boolean(deletingChatMessageId)}
        onConfirm={handleConfirmDeleteChatMessage}
      />
      <TicketDescriptionModal
        isOpen={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
        Username={currentUser?.fullName ?? 'User'}
        title={ticket.title}
        descriptionHtml={sanitizedDescription}
        headerUser={
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#6719FC] text-sm font-medium text-white">
            {currentUserInitials}
          </span>
        }
        headerAction={
          canViewInternalChatBtn ? (
            <label className="inline-flex items-center gap-2 border-gray-200">
              {hasUnreadInternalChat && !isInternalChatActive ? (
                <span className="h-2.5 w-2.5 animate-pulse rounded-full border border-white bg-green-500" />
              ) : null}

              <span className="text-xs font-medium text-gray-600">
                Internal Chat
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={isInternalChatActive}
                aria-label="Toggle internal chat"
                onClick={() => {
                  const nextIsInternalChat = !isInternalChatActive;

                  updateInternalChatParam(nextIsInternalChat);

                  if (nextIsInternalChat) {
                    setHasUnreadInternalChat(false);
                  }
                }}
                className={`relative inline-flex h-6 w-10 items-center rounded-full transition ${
                  isInternalChatActive ? 'bg-[#3B82F6]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    isInternalChatActive ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          ) : null
        }
        repliesPanel={
          canViewReplies || canViewInternalChatBtn ? (
            <TicketRepliesPanel
              className="rounded-none!"
              hideHeader
              mentionMembers={membersQuery.data ?? []}
              showBorderTop={false}
              replies={
                isInternalChatActive && canViewInternalChatBtn
                  ? internalChatMessages.map((message) =>
                      mapChatMessageToDiscussionReply(message, currentUserId),
                    )
                  : canViewReplies
                    ? liveReplies
                    : []
              }
              hasMoreReplies={
                isInternalChatActive && canViewInternalChatBtn
                  ? internalChatHasMore
                  : canViewReplies
                    ? Boolean(ticketRepliesQuery.hasNextPage)
                    : false
              }
              isLoadingMoreReplies={
                isInternalChatActive && canViewInternalChatBtn
                  ? internalChatLoadingMore
                  : canViewReplies
                    ? ticketRepliesQuery.isFetchingNextPage
                    : false
              }
              onLoadMoreReplies={
                isInternalChatActive && canViewInternalChatBtn
                  ? loadOlderInternalChatMessages
                  : canViewReplies && ticketRepliesQuery.hasNextPage
                    ? async () => {
                        await ticketRepliesQuery.fetchNextPage();
                      }
                    : undefined
              }
              emptyTitle={
                isInternalChatActive && canViewInternalChatBtn
                  ? internalChatLoading
                    ? 'Loading internal chat...'
                    : 'No messages yet.'
                  : ticketRepliesQuery.isLoading
                    ? 'Loading replies...'
                    : 'No replies yet.'
              }
              emptyDescription={
                isInternalChatActive && canViewInternalChatBtn
                  ? internalChatLoading
                    ? 'Fetching internal chat history.'
                    : 'Start the internal conversation on this ticket.'
                  : ticketRepliesQuery.isLoading
                    ? 'Fetching ticket replies.'
                    : 'No responses have been added to this ticket yet.'
              }
              canCompose={canPostReplies}
              canAttachFile={canAttachReplyFiles}
              isSubmittingReply={
                isInternalChatActive && canViewInternalChatBtn
                  ? isSendingChatMessage
                  : createReplyMutation.isPending
              }
              onSubmitReply={
                isInternalChatActive && canViewInternalChatBtn
                  ? canPostReplies
                    ? (payload) =>
                        handleSubmitChatMessage({
                          ...payload,
                          channel: 'internal',
                          sendMessage: sendInternalChatMessage,
                        })
                    : undefined
                  : canPostReplies
                    ? handleSubmitReply
                    : undefined
              }
              requireMessage={false}
              currentUserId={currentUserId}
              onDeleteReply={
                isInternalChatActive && canViewInternalChatBtn
                  ? canDeleteReplies
                    ? handleDeleteChatMessage
                    : undefined
                  : canDeleteReplies
                    ? handleDeleteTicketReply
                    : undefined
              }
              onEditReply={
                isInternalChatActive && canViewInternalChatBtn
                  ? canEditReplies
                    ? ({ reply, message, mentionedUserIds }) =>
                        handleEditChatMessage({
                          reply,
                          message,
                          mentionedUserIds,
                          updateMessage: updateInternalChatMessage,
                        })
                    : undefined
                  : canEditReplies
                    ? handleEditTicketReply
                    : undefined
              }
              onToggleReaction={
                isInternalChatActive && canViewInternalChatBtn
                  ? (reply, emoji) =>
                      handleToggleChatMessageReaction(reply, emoji, 'internal')
                  : !isInternalChatActive && canViewReplies
                    ? handleToggleTicketReplyReaction
                    : undefined
              }
              deletingReplyId={
                isInternalChatActive && canViewInternalChatBtn
                  ? deletingChatMessageId
                  : deletingTicketReplyId
              }
              editingReplyId={
                isInternalChatActive && canViewInternalChatBtn
                  ? editingChatMessageId
                  : editingTicketReplyId
              }
              composerPlaceholder={
                isInternalChatActive && canViewInternalChatBtn
                  ? 'Write a message, press @ to mention'
                  : ticket.createdByDetail?.name
                    ? `Write to ${ticket.createdByDetail.name}, press @ to mention`
                    : 'Write a reply, press @ to mention'
              }
            />
          ) : null
        }
      />
      <ConfirmActionModal
        isOpen={Boolean(attachmentToDelete)}
        onClose={() => {
          if (deleteProjectFileMutation.isPending) {
            return;
          }

          setAttachmentToDelete(null);
        }}
        title="Delete Attachment?"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold">
              “{attachmentToDelete?.name ?? 'this attachment'}”
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        isSubmitting={deleteProjectFileMutation.isPending}
        onConfirm={handleConfirmDeleteAttachment}
      />
      <ConfirmActionModal
        isOpen={Boolean(ticketReplyPendingDelete)}
        onClose={() => {
          if (deletingTicketReplyId) {
            return;
          }

          setTicketReplyPendingDelete(null);
        }}
        title="Delete Reply?"
        message={
          ticketReplyPendingDelete?.message.trim()
            ? 'Are you sure you want to delete this reply? This action cannot be undone.'
            : 'Are you sure you want to delete this attachment reply? This action cannot be undone.'
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        isSubmitting={Boolean(deletingTicketReplyId)}
        onConfirm={handleConfirmDeleteTicketReply}
      />

      <ImageGalleryLightbox
        images={galleryImages}
        activeIndex={activeGalleryIndex}
        title="Ticket attachments"
        onClose={closeGallery}
        onSelect={selectGalleryImage}
        onPrevious={showPreviousGalleryImage}
        onNext={showNextGalleryImage}
      />
    </div>
  );
}

async function fetchTicketDetail(projectId: string, ticketId: string) {
  const response = await fetch(
    `/api/projects/${projectId}/tickets/${ticketId}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketDetail
    | { message?: string }
    | null;

  if (!response.ok || !isApiTicketDetail(payload)) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? payload.message || 'Failed to fetch ticket details.'
        : 'Failed to fetch ticket details.';
    throw new Error(message);
  }

  return mapApiTicketDetailToRecord(payload);
}

async function fetchProjectMembers(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/members`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiProjectMember[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch members.'
        : 'Failed to fetch members.',
    );
  }

  return payload;
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

async function fetchTicketPriorities() {
  const response = await fetch('/api/ticket-priorities', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketPriority[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch ticket priorities.'
        : 'Failed to fetch ticket priorities.',
    );
  }

  return payload
    .slice()
    .sort((first, second) => first.sortOrder - second.sortOrder);
}

async function fetchTicketReplies(
  ticketId: string,
  currentUserId: string,
  cursor: TicketRepliesCursor | null,
) {
  const searchParams = new URLSearchParams({
    limit: String(TICKET_REPLIES_PAGE_SIZE),
  });

  if (cursor?.createdAt) {
    searchParams.set('cursorCreatedAt', cursor.createdAt);
  }

  if (cursor?.id) {
    searchParams.set('cursorId', cursor.id);
  }

  const response = await fetch(
    `/api/tickets/${ticketId}/replies?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketRepliesResponse
    | ApiTicketReply[]
    | { message?: string }
    | null;

  const normalizedPayload = normalizeTicketRepliesResponse(
    payload,
    currentUserId,
  );

  if (!response.ok || !normalizedPayload) {
    throw new Error(
      normalizedPayload?.message || 'Failed to fetch ticket replies.',
    );
  }

  return normalizedPayload;
}

function normalizeTicketRepliesResponse(
  payload:
    | ApiTicketRepliesResponse
    | ApiTicketReply[]
    | { message?: string }
    | null,
  currentUserId: string,
): TicketRepliesPage | null {
  if (Array.isArray(payload)) {
    return {
      messages: payload.map((reply) =>
        mapApiTicketReplyToDiscussionReply(reply, currentUserId),
      ),
      cursor: null,
      hasMore: false,
    };
  }

  if (!isApiTicketRepliesResponse(payload)) {
    return payload && 'message' in payload
      ? {
          message: payload.message || 'Failed to fetch ticket replies.',
          messages: [],
          cursor: null,
          hasMore: false,
        }
      : null;
  }

  return {
    messages: payload.replies.map((reply: ApiTicketReply) =>
      mapApiTicketReplyToDiscussionReply(reply, currentUserId),
    ),
    cursor:
      payload.cursor?.id && payload.cursor?.createdAt
        ? {
            id: payload.cursor.id,
            createdAt: payload.cursor.createdAt,
          }
        : null,
    hasMore: Boolean(payload.hasMore),
  };
}

function isApiTicketRepliesResponse(
  payload:
    | ApiTicketRepliesResponse
    | ApiTicketReply[]
    | { message?: string }
    | null,
): payload is ApiTicketRepliesResponse & { replies: ApiTicketReply[] } {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      Array.isArray((payload as ApiTicketRepliesResponse).replies),
  );
}

function flattenTicketRepliesPages(
  pages: TicketRepliesPage[] | undefined,
): DiscussionReply[] {
  if (!pages?.length) {
    return [];
  }

  const repliesById = new Map<string, DiscussionReply>();

  pages
    .slice()
    .reverse()
    .forEach((page) => {
      page.messages
        .slice()
        .reverse()
        .forEach((reply) => {
          repliesById.set(reply.id, reply);
        });
    });

  return Array.from(repliesById.values());
}

async function fetchTicketTimeline(projectId: string, ticketId: string) {
  const response = await fetch(
    `/api/activity/project/${projectId}/tickets/${ticketId}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketTimelineActivity[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch ticket timeline.'
        : 'Failed to fetch ticket timeline.',
    );
  }

  return payload;
}

type ApiProjectMember = {
  id: string;
  fullName: string;
};

type TicketRepliesCursor = {
  createdAt: string;
  id: string;
};

type TicketRepliesPage = {
  messages: DiscussionReply[];
  cursor: TicketRepliesCursor | null;
  hasMore: boolean;
  message?: string;
};

type ApiTicketRepliesResponse = {
  replies?: ApiTicketReply[];
  cursor?: {
    createdAt?: string | null;
    id?: string | null;
  } | null;
  hasMore?: boolean | null;
  message?: string;
};

type ApiTicketStatus = {
  id: string;
  key: string;
  label: string;
  color: string;
};

type ApiTicketPriority = ApiTicketStatus & {
  sortOrder: number;
};

type ApiTicketReply = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  authorId?: string | null;
  createdBy?: string | null;
  message?: string | null;
  mentionedUserIds?: string[] | null;
  author?: ApiTicketPerson | null;
  attachments?: ApiTicketReplyAttachment[];
  reactions?: ApiTicketReplyReaction[] | null;
  replyCount?: number | string | null;
};

type ApiTicketTimelineActivity = {
  id: string;
  createdAt?: string | null;
  actorId?: string | null;
  type?: string | null;
  title?: string | null;
};

type ApiTicketReplyReaction = {
  emoji?: string | null;
  count?: number | string | null;
  actors?: Array<{
    id?: string | null;
    fullName?: string | null;
  }> | null;
  reactedByCurrentUser?: boolean | null;
  isCurrentUser?: boolean | null;
  userReacted?: boolean | null;
};

type ApiTicketReplyAttachment = {
  id?: string;
  originalName?: string;
  name?: string;
  storageKey?: string | null;
  sizeBytes?: string | number | null;
  extension?: string | null;
  mimeType?: string | null;
};

type ApiTicketAttachment = {
  id: string;
  originalName: string;
  storageKey: string;
  sizeBytes?: string | number | null;
  extension?: string | null;
};

type ApiTicketPerson = {
  id: string;
  fullName?: string | null;
  name?: string | null;
};

type ApiTicketDetail = {
  id: string;
  ticketRefNo?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  isActive?: boolean;
  createdBy?: { id: string; fullName?: string | null } | null;
  updatedBy?: string | null;
  projectId: string;
  title: string;
  description: string;
  statusKey: string | null;
  priorityKey: string | null;
  reporterId: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  project?: {
    id: string;
    name: string;
    brandColor?: string | null;
  } | null;
  assignee?: ApiTicketPerson | null;
  reporter?: ApiTicketPerson | null;
  attachments: ApiTicketAttachment[];
};

type UpdateTicketRequest = Partial<{
  title: string;
  description: string;
  statusKey: string;
  priorityKey: string;
  assigneeId: string;
  dueDate: string;
}>;

type UpdateTicketPayloadInput = {
  title?: string | null;
  description?: string | null;
  statusKey?: string | null;
  priorityKey?: string | null;
  assigneeId?: string | null;
  reporterId?: string | null;
  dueDate?: string | null;
};

function buildUpdateTicketPayload(
  input: UpdateTicketPayloadInput,
): UpdateTicketRequest {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (typeof value !== 'string') {
        return false;
      }

      return value.trim().length > 0;
    }),
  );
}

function isApiTicketDetail(value: unknown): value is ApiTicketDetail {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      'title' in value &&
      'description' in value,
  );
}

function mapApiTicketDetailToRecord(ticket: ApiTicketDetail) {
  const projectName = ticket.project?.name ?? 'Project';
  const assigneeName =
    ticket.assignee?.fullName ?? ticket.assignee?.name ?? 'Unassigned';
  const reporterName =
    ticket.reporter?.fullName ?? ticket.reporter?.name ?? 'Reporter';

  const createdByName = ticket.createdBy?.fullName ?? 'Unknown';

  return {
    id: ticket.id,
    ticketRefNo: ticket.ticketRefNo,
    title: ticket.title,
    project: {
      id: ticket.project?.id ?? ticket.projectId,
      initials: getInitials(projectName),
      name: projectName,
    },
    status: ticket.statusKey ?? '',
    priority: ticket.priorityKey ?? null,
    assignee: {
      name: assigneeName,
      initials: getInitials(assigneeName),
    },
    date: formatTicketDate(ticket.createdAt),
    description: ticket.description,
    dueDate: ticket.dueDate
      ? formatTicketDate(toDateInputValue(ticket.dueDate))
      : null,
    dueDateValue: ticket.dueDate ?? '',
    assigneeId: ticket.assigneeId ?? '',
    reporterId: ticket.reporterId ?? '',
    priorityKey: ticket.priorityKey,
    attachments: ticket.attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.originalName,
      sizeLabel: formatBytes(attachment.sizeBytes ?? 0),
      extension: attachment.extension ?? undefined,
      storageKey: attachment.storageKey,
    })),
    reporter: {
      role: 'Reporter',
      name: reporterName,
      initials: getInitials(reporterName),
    },
    assigneeDetail: ticket.assignee
      ? {
          role: 'Assignee',
          name: assigneeName,
          initials: getInitials(assigneeName),
        }
      : null,
    createdByDetail: ticket.createdBy
      ? {
          name: createdByName,
          initials: getInitials(createdByName),
        }
      : null,
    replies: [],
  };
}

function mapApiTicketTimelineToItems(
  activities: ApiTicketTimelineActivity[],
  ticketStatuses: ApiTicketStatus[],
): TicketTimelineItem[] {
  return activities.map((activity) => {
    const timelineMeta = getTicketTimelineMeta(activity, ticketStatuses);

    return {
      id: activity.id,
      description:
        activity.title?.replace(/^"+|"+$/g, '').trim() ||
        timelineMeta.description,
      status: timelineMeta.status,
      showStatusBadge: timelineMeta.showStatusBadge,
      statusClassName: timelineMeta.statusClassName,
      statusStyle: timelineMeta.statusStyle,
      occurredAt: activity.createdAt ?? '',
    };
  });
}

function getTicketTimelineMeta(
  activity: ApiTicketTimelineActivity,
  ticketStatuses: ApiTicketStatus[],
) {
  const type = activity.type?.trim() ?? '';
  const normalizedTitle = activity.title?.replace(/"/g, '').trim() ?? '';

  if (type === 'ticket_assignee_changed') {
    return {
      status:
        extractValueAfterKeyword(normalizedTitle, 'assigned to') ?? 'Assigned',
      showStatusBadge: false,
      statusClassName: 'bg-blue-500 text-white',
      description: normalizedTitle || 'Assignment updated.',
    };
  }

  if (type === 'ticket_priority_changed') {
    return {
      status:
        extractValueAfterKeyword(normalizedTitle, 'priority changed to') ??
        'Updated',
      showStatusBadge: true,
      statusClassName: 'bg-yellow-500 text-white',
      description: normalizedTitle || 'Priority changed.',
    };
  }

  if (type === 'ticket_status_changed') {
    const status =
      extractValueAfterKeyword(normalizedTitle, 'status changed to') ??
      'Updated';
    const statusColor = getTicketStatusColorFromSettings(
      status,
      ticketStatuses,
    );

    return {
      status,
      showStatusBadge: true,
      statusClassName: 'text-white',
      statusStyle: statusColor ? { backgroundColor: statusColor } : undefined,
      description: normalizedTitle || 'Status changed.',
    };
  }

  if (type === 'ticket_created') {
    const status = 'Open';
    const statusColor = getTicketStatusColorFromSettings(
      status,
      ticketStatuses,
    );

    return {
      status,
      showStatusBadge: false,
      statusClassName: 'text-white',
      statusStyle: statusColor ? { backgroundColor: statusColor } : undefined,
      description: normalizedTitle || 'Ticket created.',
    };
  }

  return {
    status: 'Updated',
    showStatusBadge: false,
    statusClassName: 'bg-gray-500 text-white',
    description: normalizedTitle || 'Ticket updated.',
  };
}

function extractValueAfterKeyword(value: string, keyword: string) {
  const normalizedValue = value.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();
  const keywordIndex = normalizedValue.indexOf(normalizedKeyword);

  if (keywordIndex < 0) {
    return null;
  }

  const rawMatch = value
    .slice(keywordIndex + keyword.length)
    .split(' by ')[0]
    ?.trim();

  return rawMatch || null;
}

function getTicketStatusColorFromSettings(
  statusValue: string,
  ticketStatuses: ApiTicketStatus[],
) {
  const normalizedStatusValue = normalizeTicketSettingValue(statusValue);
  const matchedStatus = ticketStatuses.find(
    (status) =>
      normalizeTicketSettingValue(status.key) === normalizedStatusValue ||
      normalizeTicketSettingValue(status.label) === normalizedStatusValue,
  );

  return matchedStatus?.color?.trim() || null;
}

function normalizeTicketSettingValue(value: string) {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function mapChatMessageToDiscussionReply(
  message: ChatMessage,
  currentUserId: string,
) {
  const authorName =
    message.sender?.fullName ??
    message.sender?.name ??
    (message.senderId ? `User ${message.senderId.slice(-4)}` : 'User');
  const isDeleted =
    message.message.trim() === '[Message deleted]' ||
    message.message.trim() === 'Message deleted';
  const resolvedAttachmentUrls = Array.isArray(message.attachmentUrls)
    ? message.attachmentUrls.filter(
        (url): url is string =>
          typeof url === 'string' && url.trim().length > 0,
      )
    : message.attachmentUrl
      ? [message.attachmentUrl]
      : [];

  return {
    id: message.id,
    authorId: message.senderId,
    mentionedUserIds: Array.isArray(message.mentionedUserIds)
      ? message.mentionedUserIds.filter(
          (mentionedUserId): mentionedUserId is string =>
            typeof mentionedUserId === 'string' &&
            mentionedUserId.trim().length > 0,
        )
      : [],
    updatedAt: message.updatedAt,
    isEdited: Boolean(
      message.updatedAt &&
        Math.floor(new Date(message.updatedAt).getTime() / 1000) >
          Math.floor(new Date(message.createdAt).getTime() / 1000),
    ),
    author: {
      name: authorName,
      initials: getInitials(authorName),
    },
    createdAt: formatReplyDate(message.createdAt),
    status: message.isRead ? ('read' as const) : ('sent' as const),
    message:
      message.messageType === 'attachment'
        ? isDeleted
          ? 'Message deleted'
          : message.message.trim() &&
              message.message.trim() !== message.attachmentName?.trim() &&
              !/^sent \d+ attachments?$/i.test(message.message.trim())
            ? message.message.trim()
            : ''
        : isDeleted
          ? 'Message deleted'
          : message.message.trim(),
    attachments:
      message.messageType === 'attachment' && resolvedAttachmentUrls.length
        ? resolvedAttachmentUrls.map((attachmentUrl, index) => ({
            id: `${message.id}-attachment-${index}`,
            name:
              index === 0 && message.attachmentName?.trim()
                ? message.attachmentName.trim()
                : extractFileNameFromUrl(attachmentUrl) ||
                  `Attachment ${index + 1}`,
            extension: getAttachmentExtension(attachmentUrl),
            storageKey: attachmentUrl,
            url: attachmentUrl,
          }))
        : [],
    reactions: mapChatMessageReactions(message.reactions, currentUserId),
  };
}

function mapChatMessageReactions(
  reactions: ChatMessage['reactions'] | null | undefined,
  currentUserId: string,
): DiscussionReaction[] {
  if (!Array.isArray(reactions)) {
    return [];
  }

  return reactions.flatMap((reaction) => {
    const emoji = reaction.emoji?.trim();

    if (!emoji) {
      return [];
    }

    const countValue = Number(reaction.count ?? 0);
    const reactedByCurrentUserFromActors = Array.isArray(reaction.actors)
      ? reaction.actors.some((actor) => actor.id?.trim() === currentUserId)
      : false;
    const reactedByCurrentUserFlag =
      reaction.reactedByCurrentUser ??
      reaction.isCurrentUser ??
      reaction.userReacted;

    return [
      {
        emoji,
        count: Number.isFinite(countValue) && countValue > 0 ? countValue : 1,
        reactedByCurrentUser: Boolean(
          reactedByCurrentUserFromActors || reactedByCurrentUserFlag,
        ),
        actors: Array.isArray(reaction.actors)
          ? reaction.actors.map((actor) => ({
              id: actor.id?.trim() || undefined,
              name: actor.fullName?.trim() || undefined,
              isCurrentUser: actor.id?.trim() === currentUserId,
            }))
          : undefined,
      },
    ];
  });
}

function mapApiTicketReplyToDiscussionReply(
  reply: ApiTicketReply,
  currentUserId: string,
) {
  const authorId = reply.authorId ?? reply.createdBy ?? '';
  const authorName =
    reply.author?.fullName ??
    reply.author?.name ??
    (authorId ? `User ${authorId.slice(-4)}` : 'User');

  return {
    id: reply.id,
    authorId,
    mentionedUserIds: Array.isArray(reply.mentionedUserIds)
      ? reply.mentionedUserIds.filter(
          (mentionedUserId): mentionedUserId is string =>
            typeof mentionedUserId === 'string' &&
            mentionedUserId.trim().length > 0,
        )
      : [],
    updatedAt: reply.updatedAt,
    isEdited: Boolean(
      reply.updatedAt &&
        Math.floor(new Date(reply.updatedAt).getTime() / 1000) >
          Math.floor(
            new Date(reply.createdAt ?? reply.updatedAt).getTime() / 1000,
          ),
    ),
    author: {
      name: authorName,
      initials: getInitials(authorName),
    },
    createdAt: formatReplyDate(reply.createdAt ?? reply.updatedAt ?? ''),
    message: reply.message?.trim() || '',
    replyCount: toNumber(reply.replyCount),
    reactions: mapApiTicketReplyReactions(reply.reactions, currentUserId),
    attachments: Array.isArray(reply.attachments)
      ? reply.attachments.map(mapApiTicketReplyAttachment)
      : [],
  };
}

function mapApiTicketReplyAttachment(attachment: ApiTicketReplyAttachment) {
  const name = attachment.originalName ?? attachment.name ?? 'Untitled file';

  return {
    id: attachment.id ?? `${name}-${attachment.storageKey ?? ''}`,
    name,
    sizeLabel: formatBytes(attachment.sizeBytes ?? 0),
    extension: attachment.extension ?? attachment.mimeType ?? undefined,
    storageKey: attachment.storageKey ?? undefined,
  };
}

function mapApiTicketReplyReactions(
  reactions: ApiTicketReplyReaction[] | null | undefined,
  currentUserId: string,
): DiscussionReaction[] {
  if (!Array.isArray(reactions)) {
    return [];
  }

  return reactions.flatMap((reaction) => {
    const emoji = reaction.emoji?.trim();

    if (!emoji) {
      return [];
    }

    const countValue = Number(reaction.count ?? 0);
    const reactedByCurrentUserFromActors = Array.isArray(reaction.actors)
      ? reaction.actors.some((actor) => actor.id?.trim() === currentUserId)
      : false;
    const reactedByCurrentUserFlag =
      reaction.reactedByCurrentUser ??
      reaction.isCurrentUser ??
      reaction.userReacted;

    return [
      {
        emoji,
        count: Number.isFinite(countValue) && countValue > 0 ? countValue : 1,
        reactedByCurrentUser: Boolean(
          reactedByCurrentUserFromActors || reactedByCurrentUserFlag,
        ),
        actors: Array.isArray(reaction.actors)
          ? reaction.actors.map((actor) => ({
              id: actor.id?.trim() || undefined,
              name: actor.fullName?.trim() || undefined,
              isCurrentUser: actor.id?.trim() === currentUserId,
            }))
          : undefined,
      },
    ];
  });
}

function incrementDiscussionReaction(
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

function decrementDiscussionReaction(
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

async function uploadChatAttachments(
  attachments: File[],
  ticketId: string,
  channel: ChatChannel,
) {
  const keyPrefix =
    channel === 'internal'
      ? `tickets/${ticketId}/internal-msg`
      : `tickets/${ticketId}/external-msg`;

  return uploadFilesDirectly(attachments, keyPrefix);
}

function extractFileNameFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const pathnameParts = parsedUrl.pathname.split('/').filter(Boolean);
    return pathnameParts.at(-1) ?? '';
  } catch {
    return url.split('/').filter(Boolean).at(-1) ?? '';
  }
}

function buildTicketAttachmentGalleryImages(
  attachments: {
    id: string;
    name: string;
    extension?: string;
    storageKey?: string;
  }[],
) {
  return attachments
    .filter((attachment) => isImageAttachmentExtension(attachment.extension))
    .map((attachment, index) => ({
      attachmentId: attachment.id,
      storageKey: attachment.storageKey,
      fileName: attachment.name,
      src: getFileUrl(attachment.storageKey),
      alt: `${attachment.name} preview ${index + 1}`,
    }));
}

function getAttachmentExtension(value?: string | null) {
  const name = value?.trim() ?? '';
  const lastSegment = name.split('.').pop()?.trim();

  if (!lastSegment || lastSegment === name) {
    return undefined;
  }

  return lastSegment.toLowerCase();
}

function buildAttachmentUrl(storageKey?: string | null) {
  if (!storageKey) {
    return '';
  }
  return storageKey;
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return 'NA';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function formatTicketDate(value: string) {
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

type SocketTokenResponse = {
  accessToken: string;
  socketUrl: string;
};

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

async function fetchUnreadIndicator(
  projectId: string,
  ticketId: string,
  channel: ChatChannel,
) {
  const response = await fetch(
    `/api/projects/${projectId}/tickets/${ticketId}/chat/${channel}/unread`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | number
    | {
        count?: number;
        unreadCount?: number;
        total?: number;
        internal?: number;
        external?: number;
        message?: string;
      }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === 'object' && 'message' in payload
        ? payload.message || 'Failed to fetch unread chat status.'
        : 'Failed to fetch unread chat status.',
    );
  }

  if (typeof payload === 'number') {
    return payload > 0;
  }

  if (!payload || typeof payload !== 'object') {
    return false;
  }

  if (typeof payload.count === 'number') {
    return payload.count > 0;
  }

  if (typeof payload.unreadCount === 'number') {
    return payload.unreadCount > 0;
  }

  if (typeof payload.total === 'number') {
    return payload.total > 0;
  }

  if (channel === 'internal' && typeof payload.internal === 'number') {
    return payload.internal > 0;
  }

  if (channel === 'external' && typeof payload.external === 'number') {
    return payload.external > 0;
  }

  return false;
}

function toDateInputValue(value: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

function getTomorrowInputValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  return date.toISOString().slice(0, 10);
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatReplyDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatTimelineDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  return formattedTime ? `${formattedDate} • ${formattedTime}` : formattedDate;
}

function formatBytes(sizeBytes: string | number | null | undefined) {
  const bytes = Number(sizeBytes);

  if (Number.isNaN(bytes) || bytes <= 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentUrl(storageKey?: string) {
  if (!storageKey) {
    return '#';
  }

  const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL?.trim() ?? '';
  const normalizedBaseUrl = cloudfrontUrl.replace(/\/+$/, '');
  const normalizedStorageKey = storageKey.replace(/^\/+/, '');

  return normalizedBaseUrl
    ? `${normalizedBaseUrl}/${normalizedStorageKey}`
    : '#';
}

function isImageAttachmentExtension(extension?: string) {
  const normalizedExtension = extension?.trim().toLowerCase();

  return (
    normalizedExtension === 'png' ||
    normalizedExtension === 'svg' ||
    normalizedExtension === 'jpg' ||
    normalizedExtension === 'jpeg'
  );
}

function MetaItem({
  label,
  value,
  hideTooltip = true,
}: {
  label: string;
  value: string;
  hideTooltip?: boolean;
}) {
  return (
    <div className="w-fit">
      <span className="block text-xs sm:text-sm text-gray-300">{label}</span>
      <Tooltip
        heading={value}
        className="w-fit"
        side="bottom"
        content={''}
        hide={hideTooltip}
      >
        <p className="sm:mt-1 text-sm whitespace-break-spaces sm:text-base font-semibold  text-white">
          {value}
        </p>
      </Tooltip>
    </div>
  );
}

function TicketDetailSkeleton() {
  return (
    <div
      className="relative z-100 h-dvh overflow-hidden py-5 pr-5"
      aria-hidden="true"
    >
      <div className="flex h-full min-h-0 min-w-0 animate-pulse flex-col gap-3 overflow-hidden rounded-3xl border border-white bg-white/40 p-3">
        {/* Back button */}
        <div className="shrink-0">
          <div className="h-10 w-24 rounded-lg border border-gray-200 bg-white" />
        </div>

        <div className="min-h-0 min-w-0 flex-1">
          <div className="grid h-full min-h-0 min-w-0 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-12 xl:grid-rows-[minmax(0,1fr)]">
            {/* Main content */}
            <div className="flex min-w-0 flex-col space-y-4 xl:col-span-9">
              {/* Ticket information */}
              <section className="rounded-xl border border-gray-200 bg-white p-3 sm:rounded-2xl md:p-5">
                <div className="flex flex-wrap gap-4 border-b border-gray-200 pb-5 sm:grid sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <div className="h-3.5 w-16 rounded bg-gray-200" />

                      {index === 2 ? (
                        <div className="flex h-7 w-28 items-center gap-2 rounded-full bg-gray-100 px-1">
                          <div className="h-6 w-6 rounded-full bg-gray-200" />
                          <div className="h-3 w-16 rounded bg-gray-200" />
                        </div>
                      ) : (
                        <div className="h-4 w-24 rounded bg-gray-200" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-5">
                  <div className="h-6 w-2/3 rounded bg-gray-200" />
                  <div className="h-4 w-full rounded bg-gray-100" />
                  <div className="h-4 w-5/6 rounded bg-gray-100" />
                </div>
              </section>

              {/* Replies panel */}
              <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white sm:rounded-2xl">
                <div className="border-b border-gray-200 px-4 py-3">
                  <div className="h-5 w-28 rounded bg-gray-200" />
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-hidden p-4">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />

                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-36 rounded bg-gray-200" />
                        <div className="h-4 w-full rounded bg-gray-100" />
                        <div className="h-4 w-4/5 rounded bg-gray-100" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 p-4">
                  <div className="h-20 w-full rounded-xl border border-gray-200 bg-gray-100" />
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <aside className="min-h-0 min-w-0 space-y-4 overflow-hidden rounded-2xl bg-white p-5 xl:col-span-3 xl:h-full">
              {/* Status and priority */}
              <SkeletonSidebarSection fields={3} />

              {/* Attachments */}
              <section className="rounded-xl border border-gray-200 bg-white sm:rounded-2xl">
                <div className="border-b border-gray-200 px-4 py-3">
                  <div className="h-5 w-24 rounded bg-gray-200" />
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5">
                    <div className="h-10 w-10 rounded bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-28 rounded bg-gray-200" />
                      <div className="h-3 w-16 rounded bg-gray-100" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Due date */}
              <SkeletonSidebarSection fields={1} />

              {/* People */}
              <section className="rounded-xl border border-gray-200 bg-white sm:rounded-2xl">
                <div className="border-b border-gray-200 px-4 py-3">
                  <div className="h-5 w-16 rounded bg-gray-200" />
                </div>

                <div className="space-y-4 p-4">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 border-b border-purple-200 pb-4 last:border-b-0 last:pb-0"
                    >
                      <div className="h-12 w-12 shrink-0 rounded-full bg-gray-200" />

                      <div className="space-y-2">
                        <div className="h-3 w-16 rounded bg-gray-200" />
                        <div className="h-4 w-28 rounded bg-gray-200" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonSidebarSection({ fields }: { fields: number }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white sm:rounded-2xl">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="h-5 w-32 rounded bg-gray-200" />
      </div>

      <div className="space-y-4 p-4">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-10 w-full rounded-lg border border-gray-200 bg-gray-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

function PersonCard({ person }: { person: TicketPerson }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-200 py-3 px-4 ">
      <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-purple-100 text-sm md:text-base font-semibold text-purple-700">
        {person.initials}
      </span>
      <div>
        <p className="text-xs sm:text-sm text-gray-900">{person.role}</p>
        <p className="text-sm md:text-base font-semibold text-gray-900">
          {person.name}
        </p>
      </div>
    </div>
  );
}

function FileBadgeIcon({ extension }: { extension?: string }) {
  const label = normalizeAttachmentExtension(extension);
  const badgeClassName = getAttachmentBadgeClassName(label);

  return (
    <span className="relative shrink-0">
      <span
        className={`rounded-xs absolute top-4.5 px-0.75 pt-1 pb-0.75 text-[10px] font-bold uppercase leading-none! text-white ${badgeClassName}`}
      >
        {label}
      </span>
      <FileTypePlaceholder />
    </span>
  );
}

function QuickLinkButton({
  label,
  icon,
  iconBg,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-t border-gray-200 px-3 md:px-4 py-3 text-left transition last:border-b-0 hover:bg-gray-50"
    >
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}
      >
        {icon}
      </span>
      <span className="flex-1 text-sm font-semibold text-gray-900">
        {label}
      </span>
      <span className="text-gray-500">
        <ChevronRightSmallIcon />
      </span>
    </button>
  );
}

function TicketTimeline({ items }: { items: TicketTimelineItem[] }) {
  if (!items.length) {
    return (
      <EmptyState
        imageUrl="/images/NotificationEmptyState.svg"
        imageAlt="No timeline activity"
        title="No Activity"
        description="Timeline activity will appear here once updates happen on this ticket."
      />
    );
  }

  return (
    <div className="space-y-0 mt03">
      {items.map((item, index) => {
        const isLastItem = index === items.length - 1;

        return (
          <div key={item.id} className="relative flex gap-2.5 pb-4 last:pb-0">
            {!isLastItem ? (
              <span
                aria-hidden="true"
                className="absolute left-3 top-6 h-[calc(100%-0.25rem)] border border-dashed border-gray-300"
              />
            ) : null}

            <span className="relative z-10 mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white">
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-gray-300 bg-white">
                <span className="h-1.5 min-w-1.5 rounded-full bg-gray-300" />
              </span>
            </span>

            <div className="min-w-0 mt-1.5 flex-1">
              <p className="text-xs text-gray-500">
                {formatTimelineDateTime(item.occurredAt)}
              </p>
              <p className="mt-1.5 text-sm text-gray-700">{item.description}</p>
              {item.showStatusBadge ? (
                <span
                  className={clsx(
                    'mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-none',
                    item.statusClassName,
                  )}
                  style={item.statusStyle}
                >
                  {item.status}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChevronRightSmallIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M7 4.5L11.5 9L7 13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function normalizeAttachmentExtension(extension?: string) {
  return (extension ?? 'file').replace(/^\./, '').slice(0, 4).toUpperCase();
}

function getAttachmentBadgeClassName(extension: string) {
  if (extension === 'PDF') return 'bg-red-500';
  if (extension === 'DOC' || extension === 'DOCX') return 'bg-blue-600';
  if (extension === 'XLS' || extension === 'XLSX') return 'bg-green-600';
  if (['PNG', 'JPG', 'JPEG', 'SVG'].includes(extension)) return 'bg-violet-500';
  if (extension === 'ZIP') return 'bg-gray-600';

  return 'bg-[#10175A]';
}
