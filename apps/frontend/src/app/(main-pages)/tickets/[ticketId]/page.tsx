'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
import { getSocket } from '../../../../lib/socket';
import Dropdown from '../../../../components/ui/ThemeDropDown';
import { appToast } from '../../../../components/toast/AppToast';
import { getTicketById, type TicketPerson } from '../tickets.data';
import {
  projectsQueryKey,
  useDeleteProjectFileMutation,
  useProjectFilesQuery,
} from '../../projects/projects.queries';
import {
  PermissionGuard,
  usePermissions,
} from '../../../providers/PermissionProvider';
import { useAppSelector } from '../../../Redux/store';
import {
  CheckMarkCircleIcon,
  DownloadIcon,
  EditIcon,
  EyeOpenedIcon,
  FileTypePlaceholder,
  ThreedotIcon,
  TrashIcon,
} from '../../../../../public/icons';
import { getFileUrl } from '../../../../components/projects/ProjectFilesPanel';
import Tooltip from '../../../../components/tooltip';
import Image from 'next/image';
import EmptyState from '../../../../components/EmptyState';
import ImageGalleryLightbox from '../../../../components/ui/ImageGalleryLightbox';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { NotificationItem } from '@harperhelp/interfaces';
import { NotificationEntityType } from '@harperhelp/types';
import { eventEmitter } from '../../../../lib/event-emitter';

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

export default function TicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const ticketId = String(params?.ticketId ?? '');
  const projectId = searchParams.get('projectId') ?? '';
  const currentUserId = useAppSelector((state) => state.auth.user?.id ?? '');
  const userType = useAppSelector((state) => state.auth.user?.userType);
  const isExternalUser = userType === 'EXTERNAL';
  const { hasPermission } = usePermissions();
  const canViewTicketDetail = hasPermission('tickets.view_detail');
  const canViewReplies = hasPermission('ticket_replies.view');
  const canPostReplies = hasPermission('ticket_replies.post');
  const canAttachReplyFiles = hasPermission('ticket_replies.attach_file');
  const canEditStatus = hasPermission('tickets.edit_status');
  const canEditPriority = hasPermission('tickets.edit_priority');
  const canEditAssignee = hasPermission('tickets.edit_assignee');
  const canEditDueDate = hasPermission('tickets.edit_due_date');
  const canViewExternalChatBtn = hasPermission('tickets.external_chat');
  const canViewInternalChatBtn = hasPermission('tickets.internal_chat');
  const canEditTicketContent = !isExternalUser;

  const fallbackTicket = useMemo(() => getTicketById(ticketId), [ticketId]);

  const ticketDetailQuery = useQuery({
    queryKey: ['ticket-detail', projectId, ticketId],
    queryFn: () => fetchTicketDetail(projectId, ticketId),
    enabled: Boolean(projectId && ticketId && canViewTicketDetail),
  });

  const membersQuery = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => fetchProjectMembers(projectId),
    enabled: Boolean(projectId && !isExternalUser),
  });

  const ticketRepliesQuery = useQuery({
    queryKey: ['ticket-replies', ticketId],
    queryFn: () => fetchTicketReplies(ticketId),
    enabled: Boolean(ticketId && canViewReplies),
  });

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
    }: {
      message: string;
      attachments: File[];
    }) => {
      const formData = new FormData();
      if (message.trim()) {
        formData.append('message', message.trim());
      }

      attachments.forEach((attachment) => {
        formData.append('attachments', attachment);
      });

      const response = await fetch(
        `/api/tickets/${ticketId}/replies?projectId=${encodeURIComponent(projectId)}`,
        {
          method: 'POST',
          body: formData,
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          Array.isArray(data?.message) && data.message.length
            ? data.message.join(', ')
            : data?.message || 'Failed to create reply.';
        throw new Error(message);
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ticket-replies', ticketId],
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
      appToast.success('Reply posted successfully.');
    },
    onError: (error) => {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to create reply.',
      );
    },
  });

  const ticket = ticketDetailQuery.data ?? fallbackTicket;
  const [chatDrawerChannel, setChatDrawerChannel] =
    useState<ChatChannel | null>(null);
  const [hasUnreadInternalChat, setHasUnreadInternalChat] = useState(false);
  const [hasUnreadExternalChat, setHasUnreadExternalChat] = useState(false);
  const isChatDrawerOpen = Boolean(chatDrawerChannel);
  const {
    messages: chatMessages,
    loading: chatLoading,
    sendMessage,
    markRead,
    deleteMessage,
  } = useTicketChat({
    projectId: isChatDrawerOpen ? projectId : '',
    ticketId: isChatDrawerOpen ? ticketId : '',
    channel: chatDrawerChannel ?? 'external',
    enabled: isChatDrawerOpen,
  });
  const isTicketLoading =
    Boolean(projectId && ticketId && canViewTicketDetail) &&
    ticketDetailQuery.isLoading &&
    !ticket;
  const [selectedStatus, setSelectedStatus] = useState('Open');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedDueDate, setSelectedDueDate] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [shouldShowDescriptionToggle, setShouldShowDescriptionToggle] =
    useState(false);
  const [descriptionPreviewText, setDescriptionPreviewText] = useState('');
  const [descriptionRemainingText, setDescriptionRemainingText] = useState('');
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const [deletingChatMessageId, setDeletingChatMessageId] = useState('');
  const [chatMessagePendingDelete, setChatMessagePendingDelete] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(
    null,
  );
  const unreadListenerSocketRef = useRef<ReturnType<typeof getSocket> | null>(
    null,
  );
  const descriptionMeasureRef = useRef<HTMLParagraphElement | null>(null);
  const descriptionOverflowRef = useRef<HTMLParagraphElement | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const todayInputValue = getTodayInputValue();
  const minimumDueDate = getTomorrowInputValue();
  const isDueDateOverdue = Boolean(
    selectedDueDate && selectedDueDate < todayInputValue,
  );

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

  const invalidateTicketRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['ticket-detail', projectId, ticketId],
      }),
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
    setIsDescriptionExpanded(false);
  }, [ticket]);

  // useEffect(() => {
  //   const description = ticket?.description?.trim() ?? '';
  //   const measurementElement = descriptionMeasureRef.current;
  //   const overflowElement = descriptionOverflowRef.current;

  //   if (!description || !measurementElement || !overflowElement) {
  //     setShouldShowDescriptionToggle(false);
  //     setDescriptionPreviewText(description);
  //     setDescriptionRemainingText('');
  //     return;
  //   }

  //   const measureDescription = () => {
  //     const computedStyle = window.getComputedStyle(measurementElement);
  //     const lineHeight = Number.parseFloat(computedStyle.lineHeight);

  //     if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
  //       setShouldShowDescriptionToggle(false);
  //       setDescriptionPreviewText(description);
  //       setDescriptionRemainingText('');
  //       return;
  //     }

  //     overflowElement.textContent = description;
  //     const maxHeight = lineHeight * 2;
  //     const fullHeight = overflowElement.scrollHeight;

  //     if (fullHeight <= maxHeight + 1) {
  //       setShouldShowDescriptionToggle(false);
  //       setDescriptionPreviewText(description);
  //       setDescriptionRemainingText('');
  //       return;
  //     }

  //     const toggleLabel = ' read more';
  //     let low = 0;
  //     let high = description.length;
  //     let bestFit = '';

  //     while (low <= high) {
  //       const middle = Math.floor((low + high) / 2);
  //       const candidate = `${description.slice(0, middle).trimEnd()}${toggleLabel}`;
  //       overflowElement.textContent = candidate;

  //       if (overflowElement.scrollHeight <= maxHeight + 1) {
  //         bestFit = `${description.slice(0, middle).trimEnd()}`;
  //         low = middle + 1;
  //       } else {
  //         high = middle - 1;
  //       }
  //     }

  //     setShouldShowDescriptionToggle(true);
  //     const previewText = bestFit || description;
  //     setDescriptionPreviewText(previewText);
  //     setDescriptionRemainingText(description.slice(previewText.length));
  //   };

  //   measureDescription();

  //   const resizeObserver = new ResizeObserver(() => {
  //     measureDescription();
  //   });

  //   resizeObserver.observe(measurementElement);

  //   return () => {
  //     resizeObserver.disconnect();
  //   };
  // }, [ticket?.description]);

  useEffect(() => {
    if (isEditingDescription) {
      return;
    }

    const description = ticket?.description?.trim() ?? '';
    const measurementElement = descriptionMeasureRef.current;
    const overflowElement = descriptionOverflowRef.current;

    if (!description || !measurementElement || !overflowElement) {
      setShouldShowDescriptionToggle(false);
      setDescriptionPreviewText(description);
      setDescriptionRemainingText('');
      return;
    }

    const measureDescription = () => {
      const computedStyle = window.getComputedStyle(measurementElement);
      const lineHeight = Number.parseFloat(computedStyle.lineHeight);

      if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
        setShouldShowDescriptionToggle(false);
        setDescriptionPreviewText(description);
        setDescriptionRemainingText('');
        return;
      }

      overflowElement.textContent = description;

      const maxHeight = lineHeight * 2;
      const fullHeight = overflowElement.scrollHeight;

      if (fullHeight <= maxHeight + 1) {
        setShouldShowDescriptionToggle(false);
        setDescriptionPreviewText(description);
        setDescriptionRemainingText('');
        return;
      }

      const toggleLabel = ' read more';
      let low = 0;
      let high = description.length;
      let bestFit = '';

      while (low <= high) {
        const middle = Math.floor((low + high) / 2);

        const candidate = `${description
          .slice(0, middle)
          .trimEnd()}${toggleLabel}`;

        overflowElement.textContent = candidate;

        if (overflowElement.scrollHeight <= maxHeight + 1) {
          bestFit = description.slice(0, middle).trimEnd();
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }

      const previewText = bestFit || description;

      setShouldShowDescriptionToggle(true);
      setDescriptionPreviewText(previewText);
      setDescriptionRemainingText(description.slice(previewText.length));
    };

    const animationFrameId = window.requestAnimationFrame(() => {
      measureDescription();
    });

    const resizeObserver = new ResizeObserver(() => {
      measureDescription();
    });

    resizeObserver.observe(measurementElement);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [ticket?.description, isEditingDescription]);

  useEffect(() => {
    if (!projectId || !ticketId || !currentUserId) {
      setHasUnreadInternalChat(false);
      setHasUnreadExternalChat(false);
      return;
    }

    let isDisposed = false;

    const syncUnreadState = async () => {
      const [internalUnread, externalUnread] = await Promise.all([
        canViewInternalChatBtn
          ? fetchUnreadIndicator(projectId, ticketId, 'internal')
          : Promise.resolve(false),
        canViewExternalChatBtn
          ? fetchUnreadIndicator(projectId, ticketId, 'external')
          : Promise.resolve(false),
      ]);

      if (isDisposed) {
        return;
      }

      setHasUnreadInternalChat(internalUnread);
      setHasUnreadExternalChat(externalUnread);
    };

    void syncUnreadState().catch(() => {
      // Keep the ticket detail page usable if unread bootstrap fails.
    });

    return () => {
      isDisposed = true;
    };
  }, [
    canViewExternalChatBtn,
    canViewInternalChatBtn,
    currentUserId,
    projectId,
    ticketId,
  ]);

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

        if (canViewExternalChatBtn) {
          socket.emit('join', { projectId, ticketId, channel: 'external' });
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

        if (payload.channel === 'external') {
          setHasUnreadExternalChat(true);
        }

        appToast.info(
          getIncomingChatToastMessage(payload.channel, payload.message),
          {
            position: 'top-right',
            toastId: `ticket-chat-${payload.channel}-${payload.message.id}`,
          },
        );
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

        if (canViewExternalChatBtn) {
          socket.emit('leave', { projectId, ticketId, channel: 'external' });
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
    canViewExternalChatBtn,
    canViewInternalChatBtn,
    currentUserId,
    projectId,
    ticketId,
  ]);

  useEffect(() => {
    if (isChatDrawerOpen || !unreadListenerSocketRef.current) {
      return;
    }

    if (canViewInternalChatBtn) {
      unreadListenerSocketRef.current.emit('join', {
        projectId,
        ticketId,
        channel: 'internal',
      });
    }

    if (canViewExternalChatBtn) {
      unreadListenerSocketRef.current.emit('join', {
        projectId,
        ticketId,
        channel: 'external',
      });
    }
  }, [
    canViewExternalChatBtn,
    canViewInternalChatBtn,
    isChatDrawerOpen,
    projectId,
    ticketId,
  ]);

  useEffect(() => {
    if (
      !isChatDrawerOpen ||
      !chatDrawerChannel ||
      !currentUserId ||
      !chatMessages.length
    ) {
      return;
    }

    const unreadMessageIds = chatMessages
      .filter(
        (message) => !message.isRead && message.senderId !== currentUserId,
      )
      .map((message) => message.id);

    if (!unreadMessageIds.length) {
      return;
    }

    if (chatDrawerChannel === 'internal') {
      setHasUnreadInternalChat(false);
    }

    if (chatDrawerChannel === 'external') {
      setHasUnreadExternalChat(false);
    }

    void markRead(unreadMessageIds).catch(() => {
      // Keep the UI responsive if read-receipt sync fails.
    });
  }, [
    chatDrawerChannel,
    chatMessages,
    currentUserId,
    isChatDrawerOpen,
    markRead,
  ]);

  // Event listener
  useEffect(() => {
    eventEmitter.on('notification:new', (payload: NotificationItem) => {
      if (
        payload.entityType === NotificationEntityType.PROJECT ||
        payload.entityType === NotificationEntityType.TICKET
      ) {
        invalidateTicketRelated();
      }
    });

    return () => {
      eventEmitter.off('notification:new');
    };
  }, []);

  const handleOpenChatDrawer = (channel: ChatChannel) => {
    if (channel === 'internal') {
      setHasUnreadInternalChat(false);
    }

    if (channel === 'external') {
      setHasUnreadExternalChat(false);
    }

    setChatDrawerChannel(channel);
  };

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
      <div className="space-y-4 mt-8">
        <div className="rounded-[20px] border border-gray-200 bg-white px-6 py-10 shadow-[0_0_35px_0_rgb(0_0_0/0.04)]">
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
      <div className="space-y-4 mt-8">
        <div className="rounded-[20px] border border-gray-200 bg-white px-6 py-10 shadow-[0_0_35px_0_rgb(0_0_0/0.04)]">
          <EmptyState
            imageUrl="/images/RecentTicketEmpty.svg"
            imageAlt="Tickets detail not found"
            title="Tickets detail not found"
            // description="Recent tickets will appear here once they are created."
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
  }: {
    message: string;
    attachments: File[];
  }) => {
    if (!canPostReplies) {
      return;
    }

    await createReplyMutation.mutateAsync({
      message,
      attachments,
    });
  };

  const handleSubmitChatMessage = async ({
    message,
    attachments,
  }: {
    message: string;
    attachments: File[];
  }) => {
    if (!chatDrawerChannel) {
      return;
    }

    try {
      setIsSendingChatMessage(true);

      const trimmedMessage = message.trim();

      if (trimmedMessage) {
        await sendMessage({
          message: trimmedMessage,
          messageType: 'text',
        });
      }

      if (attachments.length) {
        const uploadedFiles = await uploadChatAttachments(
          projectId,
          attachments,
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
          });
        }
      }

      // appToast.success('Chat updated successfully.');
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

  const handleSaveTitle = async () => {
    if (!canEditTicketContent) {
      return;
    }

    const nextTitle = titleDraft.trim();

    if (!nextTitle) {
      appToast.error('Title is required.');
      return;
    }

    if (nextTitle === ticket.title) {
      setIsEditingTitle(false);
      return;
    }

    await updateTicketMutation.mutateAsync(
      buildUpdateTicketPayload({
        title: nextTitle,
        description: ticket.description,
        statusKey: selectedStatus,
        priorityKey: selectedPriority,
        assigneeId: selectedAssigneeId,
        dueDate: selectedDueDate,
      }),
    );
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (!canEditTicketContent) {
      return;
    }

    const nextDescription = descriptionDraft.trim();

    if (nextDescription === (ticket.description ?? '').trim()) {
      setIsEditingDescription(false);
      return;
    }

    await updateTicketMutation.mutateAsync(
      buildUpdateTicketPayload({
        title: ticket.title,
        description: nextDescription,
        statusKey: selectedStatus,
        priorityKey: selectedPriority,
        assigneeId: selectedAssigneeId,
        dueDate: selectedDueDate,
      }),
    );
    setIsEditingDescription(false);
  };

  const handleStartEditingContent = () => {
    if (!canEditTicketContent) {
      return;
    }

    setTitleDraft(ticket.title);
    setDescriptionDraft(ticket.description ?? '');
    setIsEditingTitle(true);
    setIsEditingDescription(true);
  };

  const handleCancelEditingContent = () => {
    setTitleDraft(ticket.title);
    setDescriptionDraft(ticket.description ?? '');
    setIsEditingTitle(false);
    setIsEditingDescription(false);
  };

  const handleSaveTicketContent = async () => {
    if (!canEditTicketContent) {
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
      setIsEditingTitle(false);
      setIsEditingDescription(false);
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

    setIsEditingTitle(false);
    setIsEditingDescription(false);
  };

  const handleDeleteChatMessage = (reply: { id: string; message: string }) => {
    setChatMessagePendingDelete(reply);
  };

  const handleConfirmDeleteChatMessage = async () => {
    if (!chatMessagePendingDelete) {
      return;
    }

    try {
      setDeletingChatMessageId(chatMessagePendingDelete.id);
      await deleteMessage(chatMessagePendingDelete.id);
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

  return (
    <div className="relative z-100 h-full xl:h-dvh overflow-hidden py-4 xl:py-5 xl:pr-5 px-4 xl:px-0 pt-2 pb-0">
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 xl:overflow-hidden  xl:rounded-4xl xl:border xl:border-white xl:bg-white/40 xl:p-3">
        <div className="relative flex w-full flex-col gap-2 xl:gap-3 overflow-hidden rounded-[10px] bg-[url('/images/DashboardComponentBgImage.jpg')] bg-cover bg-center bg-no-repeat px-4 py-4 xl:flex-row xl:items-center xl:gap-4 xl:rounded-[20px] xl:px-7.5 xl:py-6">
          {/* Background overlay */}
          <div
            className="absolute inset-0 bg-black/30 z-10"
            aria-hidden="true"
          />
          <div className="relative flex min-w-0 items-center gap-3  z-20  w-full">
            <button className="mr-3" onClick={() => router.back()}>
              <Image
                alt={''}
                src="/images/bannerBackBtn.svg"
                width={48}
                height={48}
                className="h-10 w-10 shrink-0 backdrop-blur-3xl drop-shadow xl:h-12 xl:w-12"
              />
            </button>

            <div className="flex flex-wrap gap-4 w-full sm:grid sm:grid-cols-5">
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

              {selectedDueDate ? (
                <div>
                  <span className="block text-sm text-gray-300">Due Date</span>

                  <div
                    className={`flex h-fit items-start gap-2 rounded-lg pt-2 text-white`}
                  >
                    <div className="flex w-full items-center gap-3">
                      <p className="pt-px text-sm font-medium">
                        {selectedDueDate}
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
          <div className="flex  items-center gap-2 relative z-20">
            {canViewInternalChatBtn && (
              <Tooltip content="" heading="Internal Chat">
                <button
                  type="button"
                  onClick={() => handleOpenChatDrawer('internal')}
                  className="inline-flex relative items-center justify-center gap-2 rounded-full bg-black/50  h-10 min-w-10 text-sm font-medium text-[#10175A] transition hover:bg-black"
                >
                  <InternalChatIcon />
                  {hasUnreadInternalChat ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse  inline-block absolute top-0.5 right-0.5"></span>
                  ) : null}
                </button>
              </Tooltip>
            )}
            {canViewExternalChatBtn && (
              <Tooltip content="" heading="External Chat">
                <button
                  type="button"
                  onClick={() => handleOpenChatDrawer('external')}
                  className="inline-flex relative items-center justify-center gap-2 rounded-full bg-black/50  h-10 min-w-10 text-sm font-medium text-[#10175A] transition hover:bg-black"
                >
                  <ExternalChatIcon />

                  {hasUnreadExternalChat ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse inline-block absolute top-0.5 right-0.5"></span>
                  ) : null}
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain  scrollbar-hide xl:overflow-hidden ">
          <div className="grid h-auto min-h-0 min-w-0 grid-cols-1 gap-4 overflow-visible xl:h-full xl:grid-cols-12 xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden">
            <div className="flex min-w-0 flex-col space-y-4 xl:col-span-9">
              <section className="rounded-xl border border-gray-200 bg-white p-3 sm:rounded-2xl md:p-5">
                <div className=" relative">
                  <div className="mb-2 flex absolute top-0 end-0 items-start justify-end">
                    {canEditTicketContent ? (
                      <button
                        type="button"
                        disabled={updateTicketMutation.isPending}
                        onClick={() => {
                          if (isEditingTitle || isEditingDescription) {
                            void handleSaveTicketContent();
                            return;
                          }

                          handleStartEditingContent();
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={
                          isEditingTitle || isEditingDescription
                            ? 'Save ticket content'
                            : 'Edit ticket content'
                        }
                      >
                        {isEditingTitle || isEditingDescription ? (
                          <CheckMarkCircleIcon
                            width="18"
                            height="18"
                            fill="gray"
                            opacity="0"
                          />
                        ) : (
                          <EditIcon />
                        )}
                      </button>
                    ) : null}
                  </div>
                  {isEditingTitle ? (
                    <div className="mr-10">
                      <input
                        type="text"
                        value={titleDraft}
                        autoFocus
                        disabled={updateTicketMutation.isPending}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleSaveTicketContent();
                          }

                          if (event.key === 'Escape') {
                            handleCancelEditingContent();
                          }
                        }}
                        className="w-full border-b border-b-gray-400 pb-2  text-base font-semibold text-gray-900 outline-none md:text-xl"
                      />
                    </div>
                  ) : (
                    <div className="block w-full text-left">
                      <h2 className="text-base font-semibold leading-8 text-gray-900 md:text-xl">
                        {ticket.title}
                      </h2>
                    </div>
                  )}

                  {isEditingDescription ? (
                    <div className="mt-4">
                      <textarea
                        value={descriptionDraft}
                        autoFocus
                        rows={5}
                        disabled={updateTicketMutation.isPending}
                        onChange={(event) =>
                          setDescriptionDraft(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (
                            (event.ctrlKey || event.metaKey) &&
                            event.key === 'Enter'
                          ) {
                            event.preventDefault();
                            void handleSaveTicketContent();
                          }

                          if (event.key === 'Escape') {
                            handleCancelEditingContent();
                          }
                        }}
                        className="w-full rounded-lg border scrollbar-hide border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                      />
                    </div>
                  ) : (
                    <div className="mt-2 block w-full text-left">
                      <p
                        ref={descriptionMeasureRef}
                        className="text-sm text-gray-700"
                      >
                        {ticket.description ? (
                          <>
                            {descriptionPreviewText}
                            {isDescriptionExpanded
                              ? descriptionRemainingText
                              : null}
                            {!isDescriptionExpanded &&
                            shouldShowDescriptionToggle ? (
                              <span
                                className="font-medium cursor-pointer text-[#8A38F5]"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setIsDescriptionExpanded(
                                    (previous) => !previous,
                                  );
                                }}
                              >
                                ... read more
                              </span>
                            ) : null}
                          </>
                        ) : (
                          'Add description'
                        )}
                      </p>
                      {isDescriptionExpanded && shouldShowDescriptionToggle ? (
                        <span
                          className="mt-1 cursor-pointer inline-flex text-sm font-medium text-[#8A38F5]"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setIsDescriptionExpanded(false);
                          }}
                        >
                          read less
                        </span>
                      ) : null}
                      <p
                        ref={descriptionOverflowRef}
                        aria-hidden="true"
                        className="pointer-events-none invisible absolute left-0 top-0 -z-10 w-full text-sm text-gray-700"
                      />
                    </div>
                  )}
                </div>
              </section>
              <div className="min-h-0 xl:flex-1 xl:overflow-hidden">
                <PermissionGuard permission="ticket_replies.view">
                  <TicketRepliesPanel
                    replies={
                      canViewReplies
                        ? (ticketRepliesQuery.data ?? ticket.replies)
                        : []
                    }
                    emptyTitle={
                      ticketRepliesQuery.isLoading
                        ? 'Loading replies...'
                        : 'No replies yet.'
                    }
                    emptyDescription={
                      ticketRepliesQuery.isLoading
                        ? 'Fetching ticket replies.'
                        : 'No responses have been added to this ticket yet.'
                    }
                    canCompose={canPostReplies}
                    canAttachFile={canAttachReplyFiles}
                    isSubmittingReply={createReplyMutation.isPending}
                    onSubmitReply={
                      canPostReplies ? handleSubmitReply : undefined
                    }
                    requireMessage={false}
                    currentUserId={currentUserId}
                  />
                </PermissionGuard>
              </div>
            </div>
            <aside className="min-h-0 min-w-0 space-y-4 overflow-y-auto scrollbar-hide rounded-2xl bg-white p-3 xl:col-span-3 xl:h-full">
              {!isExternalUser ? (
                <section className="rounded-xl border border-gray-200 bg-white sm:rounded-2xl">
                  <h3 className="border-b border-gray-200 px-3 py-3 text-sm font-semibold text-gray-900 md:text-base">
                    Status & Priority
                  </h3>

                  <div className="space-y-2 p-3 sm:p-4">
                    <div className="grid items-center md:grid-cols-2 gap-4">
                      <span className="text-sm text-black font-normal">
                        Status
                      </span>
                      <Dropdown
                        // label="Status"

                        options={statusOptions}
                        value={selectedStatus}
                        disabled={
                          updateTicketMutation.isPending || !canEditStatus
                        }
                        onChange={handleStatusChange}
                        applyHeight={false}
                      />
                    </div>
                    <div className="grid items-center md:grid-cols-2 gap-4">
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

                    <div className="grid items-center md:grid-cols-2 gap-4">
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
                  </div>
                </section>
              ) : null}

              <section className="rounded-xl border border-gray-200 bg-white sm:rounded-2xl">
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
                                <EyeOpenedIcon />
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
                <section className="rounded-xl border border-gray-200 bg-white sm:rounded-2xl">
                  <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3 sm:px-4">
                    <h3 className="text-sm font-semibold text-gray-900 md:text-base">
                      Due Date
                    </h3>
                  </div>

                  <div className="p-3 sm:p-4">
                    {/* <p className="mb-2 text-xs font-medium tracking-wide text-gray-500">
                      {selectedDueDate ? 'Select date' : 'No due date'}
                    </p> */}

                    <label className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
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
                        className="w-full bg-transparent text-base text-gray-900 outline-none disabled:cursor-not-allowed disabled:text-gray-400"
                      />
                    </label>
                  </div>
                </section>
              ) : null}

              {!isExternalUser ? (
                <section className="rounded-2xl border border-gray-200 bg-white">
                  <h3 className="border-b border-gray-200 px-3 py-3 text-sm font-semibold text-gray-900 sm:px-4 md:text-base">
                    People
                  </h3>

                  <div className="space-y-4 p-3 sm:p-4">
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
        isOpen={isChatDrawerOpen}
        onClose={() => setChatDrawerChannel(null)}
        title={chatDrawerChannel === 'internal' ? 'Chat' : 'Chat'}
        // subtitle={getChatSubtitle({
        //   connected: chatConnected,
        //   loading: chatLoading,
        //   typingUsers,
        // })}
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
            {/* {chatConnected ? (
              <span className="min-w-2.5 h-2.5 bg-green-500  animate-pulse rounded-full block absolute z-100 -top-9 end-8"></span>
            ) : (
              <span className="min-w-2 h-2 bg-red-500 rounded-full block absolute -top-9 end-8"></span>
            )} */}
            <TicketRepliesPanel
              hideHeader={true}
              className="rounded-none!"
              title={
                chatDrawerChannel === 'internal' ? 'Team Chat' : 'Client Chat'
              }
              subtitle=""
              replies={chatMessages.map(mapChatMessageToDiscussionReply)}
              emptyTitle={chatLoading ? 'Loading chat...' : 'No messages yet.'}
              emptyDescription={
                chatLoading
                  ? 'Fetching message history.'
                  : 'Start the conversation on this ticket.'
              }
              canCompose={canPostReplies}
              canAttachFile={canAttachReplyFiles}
              isSubmittingReply={isSendingChatMessage}
              onSubmitReply={
                canPostReplies ? handleSubmitChatMessage : undefined
              }
              requireMessage={false}
              currentUserId={currentUserId}
              onDeleteReply={handleDeleteChatMessage}
              deletingReplyId={deletingChatMessageId}
            />
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

async function fetchTicketReplies(ticketId: string) {
  const response = await fetch(`/api/tickets/${ticketId}/replies`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiTicketReply[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch ticket replies.'
        : 'Failed to fetch ticket replies.',
    );
  }

  return payload.map(mapApiTicketReplyToDiscussionReply);
}

type ApiProjectMember = {
  id: string;
  fullName: string;
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
  author?: ApiTicketPerson | null;
  attachments?: ApiTicketReplyAttachment[];
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
    dueDate: ticket.dueDate ? formatTicketDate(ticket.dueDate) : 'No due date',
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

function mapChatMessageToDiscussionReply(message: ChatMessage) {
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
  };
}

function mapApiTicketReplyToDiscussionReply(reply: ApiTicketReply) {
  const authorId = reply.authorId ?? reply.createdBy ?? '';
  const authorName =
    reply.author?.fullName ??
    reply.author?.name ??
    (authorId ? `User ${authorId.slice(-4)}` : 'User');

  return {
    id: reply.id,
    authorId,
    author: {
      name: authorName,
      initials: getInitials(authorName),
    },
    createdAt: formatReplyDate(reply.createdAt ?? reply.updatedAt ?? ''),
    message: reply.message?.trim() || '',
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

type UploadedProjectFile = {
  id?: string;
  originalName?: string | null;
  name?: string | null;
  storageKey?: string | null;
  sizeBytes?: string | number | null;
  extension?: string | null;
  mimeType?: string | null;
};

async function uploadChatAttachments(
  projectId: string,
  attachments: File[],
): Promise<UploadedProjectFile[]> {
  const formData = new FormData();

  attachments.forEach((file) => {
    formData.append('files', file, file.name);
  });

  const response = await fetch(`/api/projects/${projectId}/files`, {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | UploadedProjectFile[]
    | {
        message?: string;
        data?: UploadedProjectFile[];
        items?: UploadedProjectFile[];
      }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && !Array.isArray(payload)
        ? payload.message || 'Failed to upload chat attachments.'
        : 'Failed to upload chat attachments.',
    );
  }

  const uploadedFiles = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

  if (!uploadedFiles.length) {
    return [];
  }

  const expectedFileKeys = attachments.map((file) =>
    buildUploadedFileMatchKey({
      name: file.name,
      sizeBytes: file.size,
    }),
  );
  const remainingKeys = [...expectedFileKeys];
  const matchedFiles = uploadedFiles.filter((file) => {
    const fileKey = buildUploadedFileMatchKey({
      name: file.originalName ?? file.name ?? '',
      sizeBytes: file.sizeBytes,
    });
    const matchingIndex = remainingKeys.indexOf(fileKey);

    if (matchingIndex === -1) {
      return false;
    }

    remainingKeys.splice(matchingIndex, 1);
    return true;
  });

  if (matchedFiles.length) {
    return matchedFiles;
  }

  return uploadedFiles.slice(-attachments.length);
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

  if (/^https?:\/\//i.test(storageKey)) {
    return storageKey;
  }

  const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL?.trim() ?? '';
  const normalizedBaseUrl = cloudfrontUrl.replace(/\/+$/, '');
  const normalizedStorageKey = storageKey.replace(/^\/+/, '');
  const encodedStorageKey = normalizedStorageKey
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  if (normalizedBaseUrl && encodedStorageKey) {
    return `${normalizedBaseUrl}/${encodedStorageKey}`;
  }

  if (typeof window !== 'undefined' && normalizedStorageKey) {
    const searchParams = new URLSearchParams({
      storageKey: normalizedStorageKey,
      fileName: extractFileNameFromUrl(normalizedStorageKey) || 'attachment',
    });

    return `${window.location.origin}/api/projects/files/download?${searchParams.toString()}`;
  }

  return '';
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildUploadedFileMatchKey({
  name,
  sizeBytes,
}: {
  name: string;
  sizeBytes: string | number | null | undefined;
}) {
  return `${name.trim().toLowerCase()}::${toNumber(sizeBytes) ?? ''}`;
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
  const date = new Date(value);

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

function getIncomingChatToastMessage(
  channel: ChatChannel,
  message: ChatMessage,
) {
  const channelLabel =
    channel === 'internal' ? 'Internal chat' : 'External chat';
  const senderName =
    message.sender?.fullName?.trim() ||
    message.sender?.name?.trim() ||
    'Someone';
  const messagePreview = message.message.trim();

  if (message.messageType === 'attachment' && !messagePreview) {
    return `New message in: ${senderName} sent an attachment.`;
  }

  if (message.messageType === 'attachment') {
    return `New message: ${senderName} sent ${messagePreview}.`;
  }

  if (!messagePreview) {
    return `New message in from ${senderName}.`;
  }

  return `New message from ${senderName}: ${messagePreview}`;
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
        <p className="sm:mt-1 text-sm truncate sm:text-base font-semibold text-white">
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
    <div className="flex items-center gap-3 border-b border-purple-200 pb-4 last:border-b-0 last:pb-0">
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

function InternalChatIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.3155 6.2832C13.4372 6.39987 13.593 6.45736 13.7489 6.45736L13.748 6.45573C13.9122 6.45573 14.0764 6.3915 14.1989 6.264C14.4381 6.01566 14.4306 5.61986 14.1814 5.38069C14.0497 5.25464 13.856 5.10237 13.6112 4.91L13.593 4.89567C13.5817 4.88675 13.5698 4.87734 13.5572 4.86746C13.408 4.74986 13.1748 4.56616 12.948 4.37321H18.3322C18.6772 4.37321 18.9572 4.09321 18.9572 3.74821C18.9572 3.40321 18.6772 3.12321 18.3322 3.12321H12.948C13.1756 2.92954 13.4097 2.74512 13.5589 2.62757C13.5708 2.61817 13.5822 2.60919 13.593 2.60067C13.8464 2.40233 14.0464 2.24489 14.1814 2.11572C14.4306 1.87655 14.4381 1.48067 14.1989 1.23234C13.9597 0.984005 13.5647 0.975675 13.3155 1.21484C13.2266 1.30049 13.0343 1.45125 12.8287 1.61243L12.8214 1.61816C11.778 2.4365 11.0397 3.06817 11.0397 3.74984C11.0405 4.42984 11.7789 5.06155 12.8214 5.87988C13.0297 6.04321 13.2255 6.19737 13.3155 6.2832Z"
        fill="white"
      />
      <path
        d="M3.45218 18.959H3.44911C3.40513 18.959 3.36114 18.959 3.31717 18.9574L3.25467 18.9557C2.6805 18.9382 2.1838 18.9224 1.88797 18.429C1.59464 17.9257 1.84051 17.4615 2.18134 16.819L2.19713 16.7899C2.5963 16.0316 2.69465 15.4449 2.48798 15.0466C1.62882 13.7566 1.1538 12.4866 1.07547 11.2724C1.03214 10.5482 1.03214 9.81657 1.07547 9.0949C1.32047 5.25157 4.36217 2.16988 8.1505 1.92571C8.47717 1.90071 8.81627 1.88318 9.14961 1.87485C9.49544 1.86318 9.78131 2.13906 9.79047 2.48406C9.79964 2.82906 9.52634 3.11568 9.18134 3.12485C8.86884 3.13318 8.55215 3.14902 8.23798 3.17319C5.06715 3.37819 2.52713 5.95735 2.32213 9.17319C2.28213 9.83319 2.28213 10.5341 2.32213 11.1957C2.3863 12.1924 2.79716 13.2632 3.543 14.3774C3.553 14.3924 3.56217 14.4074 3.5705 14.4224C4.008 15.2132 3.91713 16.2065 3.3013 17.374L3.28462 17.4049C3.23212 17.5032 3.17717 17.6074 3.12967 17.7007C3.15636 17.7015 3.18367 17.7026 3.21097 17.7036C3.23822 17.7047 3.26546 17.7057 3.2921 17.7066L3.35135 17.7082C4.12135 17.7265 4.70546 17.554 5.24962 17.149C5.25379 17.1457 5.25717 17.1432 5.26134 17.1407L5.31798 17.1007L5.31982 17.0994C5.68192 16.8419 5.86426 16.7123 6.11217 16.674C6.38218 16.6316 6.6165 16.7285 7.0795 16.9198L7.08377 16.9216L7.18712 16.964C7.50129 17.094 7.88046 17.1798 8.22879 17.2015C9.38296 17.2748 10.6063 17.2748 11.768 17.2015C14.9305 16.9898 17.4713 14.4065 17.6747 11.194C17.7147 10.5349 17.7147 9.83654 17.6747 9.17571C17.643 8.74821 17.5805 8.35733 17.4846 7.97983C17.3996 7.64566 17.6013 7.3049 17.9355 7.2199C18.2697 7.1349 18.6105 7.3365 18.6955 7.67067C18.8105 8.1215 18.8847 8.58483 18.9213 9.08733V9.09571C18.9647 9.81738 18.9647 10.549 18.9213 11.2707C18.6772 15.1098 15.6363 18.1948 11.848 18.4482C10.633 18.5248 9.3546 18.5248 8.14961 18.4482C7.66294 18.4182 7.15044 18.3016 6.70877 18.1191L6.53241 18.0465C6.44162 18.0091 6.35405 17.973 6.28632 17.9474C6.22613 17.9882 6.14869 18.043 6.06999 18.0988L6.04129 18.1191L5.99051 18.1557C5.26384 18.6965 4.43128 18.9599 3.45128 18.9599L3.45218 18.959Z"
        fill="white"
      />
      <path
        d="M7.08219 13.124C6.73719 13.124 6.45719 12.844 6.45719 12.499C6.45719 12.154 6.73719 11.874 7.08219 11.874H12.9155C13.2605 11.874 13.5405 12.154 13.5405 12.499C13.5405 12.844 13.2605 13.124 12.9155 13.124H7.08219Z"
        fill="white"
      />
      <path
        d="M9.99886 8.95732H7.08219C6.73719 8.95732 6.45719 8.67732 6.45719 8.33232C6.45719 7.98732 6.73719 7.70732 7.08219 7.70732H9.99886C10.3439 7.70732 10.6239 7.98732 10.6239 8.33232C10.6239 8.67732 10.3439 8.95732 9.99886 8.95732Z"
        fill="white"
      />
    </svg>
  );
}

function ExternalChatIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19.4661 1.42152C19.1773 1.14084 18.7157 1.1474 18.435 1.43617C18.1543 1.72495 18.1609 2.18658 18.4497 2.46726C18.6068 2.61996 18.8568 2.81658 19.0947 3.00347L19.1501 3.04695C19.389 3.23449 19.6444 3.43507 19.8862 3.63989L19.8931 3.64578L13.6107 3.64578C13.208 3.64578 12.8815 3.97224 12.8815 4.37495C12.8815 4.77766 13.208 5.10411 13.6107 5.10411L19.8931 5.10411L19.8862 5.11001C19.6444 5.31483 19.389 5.51538 19.1501 5.70292L19.0947 5.74643C18.8568 5.93332 18.6068 6.12993 18.4497 6.28263C18.1609 6.56331 18.1543 7.02495 18.435 7.31373C18.7157 7.6025 19.1773 7.60906 19.4661 7.32838C19.5548 7.24214 19.7316 7.10056 19.9955 6.89329L20.0538 6.84754C20.2892 6.66275 20.5654 6.44596 20.8289 6.22262C21.1114 5.98326 21.4048 5.71534 21.6329 5.44752C21.7472 5.3133 21.86 5.16203 21.9471 4.99929C22.0311 4.84233 22.1176 4.62606 22.1176 4.37495C22.1176 4.12384 22.0311 3.90756 21.9471 3.75061C21.86 3.58787 21.7472 3.43659 21.6329 3.30238C21.4048 3.03456 21.1114 2.76664 20.8289 2.52727C20.5654 2.30394 20.2892 2.08719 20.0538 1.90241L19.9955 1.85661C19.7316 1.64934 19.5548 1.50776 19.4661 1.42152Z"
        fill="white"
      />
      <path
        d="M11.4229 2.8948C11.4349 3.29733 11.1184 3.63341 10.7158 3.64546C10.3421 3.65665 9.97075 3.67445 9.60432 3.69883C5.91093 3.94453 2.9543 6.93354 2.71078 10.7045C2.66064 11.481 2.66064 12.2861 2.71078 13.0626C2.79627 14.3863 3.38638 15.6532 4.13375 16.7764C4.1449 16.7931 4.15536 16.8103 4.1651 16.828C4.81459 18.0048 4.33842 19.3469 3.8531 20.2673C3.77335 20.4186 3.70787 20.5429 3.65366 20.6512C3.72715 20.6538 3.80989 20.6558 3.90565 20.6581C4.94456 20.6834 5.60324 20.3959 6.1278 20.0088L6.14497 19.9961C6.31381 19.8715 6.46678 19.7586 6.59338 19.6766C6.7033 19.6054 6.90451 19.4798 7.14911 19.4497C7.40531 19.4182 7.65378 19.5053 7.77771 19.5489C7.93634 19.6047 8.13789 19.6878 8.37082 19.7838L8.38967 19.7916C8.75849 19.9436 9.20001 20.0414 9.60432 20.0683C10.9567 20.1582 12.373 20.1584 13.7281 20.0683C17.4215 19.8226 20.3782 16.8336 20.6217 13.0626C20.6718 12.2861 20.6718 11.481 20.6217 10.7045C20.5907 10.2242 20.5156 9.75683 20.4008 9.30642C20.3013 8.91619 20.537 8.51921 20.9273 8.41973C21.3175 8.32025 21.7145 8.55595 21.814 8.94618C21.9509 9.48337 22.0401 10.0398 22.077 10.6105C22.1312 11.4496 22.1312 12.3175 22.077 13.1566C21.7874 17.6411 18.2652 21.228 13.8249 21.5234C12.4052 21.6178 10.9243 21.6176 9.50752 21.5234C8.95822 21.4869 8.36031 21.3569 7.83393 21.1399C7.60261 21.0446 7.44553 20.98 7.33058 20.9379C7.25154 20.9922 7.14657 21.0694 6.99376 21.1822C6.22334 21.7508 5.2506 22.1497 3.87014 22.116L3.82568 22.115C3.55941 22.1086 3.27552 22.1018 3.044 22.057C2.76503 22.003 2.42013 21.868 2.20435 21.4998C1.9696 21.0992 2.06369 20.6942 2.15481 20.439C2.24081 20.1981 2.3899 19.9155 2.54225 19.6267L2.56311 19.5871C3.0165 18.7273 3.14305 18.0242 2.90036 17.5552C2.09117 16.3327 1.36331 14.8263 1.25548 13.1566C1.2013 12.3175 1.2013 11.4496 1.25548 10.6105C1.54507 6.126 5.06729 2.5391 9.50752 2.24371C9.89208 2.21813 10.2811 2.19949 10.6722 2.18778C11.0747 2.17573 11.4108 2.49227 11.4229 2.8948Z"
        fill="white"
      />
      <path
        d="M7.53429 14.5833C7.53429 14.986 7.86075 15.3124 8.26346 15.3124H15.069C15.4717 15.3124 15.7982 14.986 15.7982 14.5833C15.7982 14.1806 15.4717 13.8541 15.069 13.8541H8.26346C7.86075 13.8541 7.53429 14.1806 7.53429 14.5833Z"
        fill="white"
      />
      <path
        d="M7.53429 9.72217C7.53429 10.1249 7.86075 10.4513 8.26346 10.4513H11.6662C12.0689 10.4513 12.3954 10.1249 12.3954 9.72217C12.3954 9.31946 12.0689 8.993 11.6662 8.993H8.26346C7.86075 8.993 7.53429 9.31946 7.53429 9.72217Z"
        fill="white"
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
