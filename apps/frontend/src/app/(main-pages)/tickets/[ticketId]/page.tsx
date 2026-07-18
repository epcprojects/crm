'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
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
import Dropdown from '../../../../components/ui/ThemeDropDown';
import { appToast } from '../../../../components/toast/AppToast';
import { getTicketById, type TicketPerson } from '../tickets.data';
import { projectsQueryKey } from '../../projects/projects.queries';
import {
  PermissionGuard,
  usePermissions,
} from '../../../providers/PermissionProvider';
import { useAppSelector } from '../../../Redux/store';
import { FileTypePlaceholder } from '../../../../../public/icons';
import { getFileUrl } from '../../../../components/projects/ProjectFilesPanel';

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
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const [deletingChatMessageId, setDeletingChatMessageId] = useState('');
  const [chatMessagePendingDelete, setChatMessagePendingDelete] = useState<{
    id: string;
    message: string;
  } | null>(null);
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

  useEffect(() => {
    if (!ticket) {
      return;
    }

    setSelectedStatus(ticket.status);
    setSelectedPriority(ticket.priorityKey ?? '');
    setSelectedAssignee(ticket.assigneeDetail?.name ?? '');
    setSelectedDueDate(toDateInputValue(ticket.dueDateValue ?? ''));
    setTitleDraft(ticket.title);
    setDescriptionDraft(ticket.description);
  }, [ticket]);

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
        (message) =>
          message.id === currentUserId &&
          !message.isRead &&
          message.senderId !== currentUserId,
      )
      .map((message) => message.id);

    if (!unreadMessageIds.length) {
      return;
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

  if (!canViewTicketDetail) {
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
          You do not have permission to view ticket details.
        </div>
      </div>
    );
  }

  if (isTicketLoading) {
    return <TicketDetailSkeleton />;
  }

  if (!ticket) {
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
          Ticket not found.
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

      appToast.success('Chat updated successfully.');
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

    if (nextDescription === ticket.description.trim()) {
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

  return (
    <div className="relative z-100 h-full xl:h-dvh overflow-hidden py-4 xl:py-5 xl:pr-5 px-4 xl:px-0 pt-2 pb-0">
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 xl:overflow-hidden  xl:rounded-3xl xl:border xl:border-white xl:bg-white/40 xl:p-3">
        <div className="shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
            >
              <BackArrowIcon />
              Back
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {canViewInternalChatBtn && (
                <button
                  type="button"
                  onClick={() => setChatDrawerChannel('internal')}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#10175A] bg-white px-4 py-2 text-sm font-medium text-[#10175A] transition hover:bg-[#F4F6FF]"
                >
                  Internal Chat
                </button>
              )}
              {canViewExternalChatBtn && (
                <button
                  type="button"
                  onClick={() => setChatDrawerChannel('external')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#10175A] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1C257A]"
                >
                  External Chat
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain  scrollbar-hide xl:overflow-hidden ">
          <div className="grid h-auto min-h-0 min-w-0 grid-cols-1 gap-4 overflow-visible xl:h-full xl:grid-cols-12 xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden">
            <div className="flex min-w-0 flex-col space-y-4 xl:col-span-9">
              <section className="rounded-xl border border-gray-200 bg-white p-3 sm:rounded-2xl md:p-5">
                <div className="flex flex-wrap gap-4 border-b border-gray-200 pb-5 sm:grid sm:grid-cols-4">
                  <MetaItem
                    label="Ticket ID"
                    value={`${ticket.ticketRefNo ?? ticket.id}`}
                  />

                  <MetaItem label="Created on" value={ticket.date} />

                  <div>
                    <span className="block text-sm text-gray-500">Project</span>

                    <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-purple-100 py-0.75 pr-2.5 pl-0.75 text-sm font-medium text-purple-700">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-medium">
                        {ticket.project.initials}
                      </span>

                      {ticket.project.name}
                    </span>
                  </div>
                  {selectedDueDate ? (
                    <div>
                      <span className="block text-sm text-gray-500">
                        Due Date
                      </span>

                      <div
                        className={`flex h-fit items-start gap-2 rounded-lg pt-2 ${
                          isDueDateOverdue ? 'text-[#B42318]' : 'text-gray-700'
                        }`}
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

                <div className="pt-2 sm:pt-5">
                  {isEditingTitle ? (
                    <div>
                      <input
                        type="text"
                        value={titleDraft}
                        autoFocus
                        disabled={updateTicketMutation.isPending}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        onBlur={() => {
                          void handleSaveTitle();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleSaveTitle();
                          }

                          if (event.key === 'Escape') {
                            setIsEditingTitle(false);
                            setTitleDraft(ticket.title);
                          }
                        }}
                        className="w-full border-b border-b-gray-400 pb-2 text-base font-semibold text-gray-900 outline-none md:text-xl"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canEditTicketContent}
                      onClick={() => {
                        if (!canEditTicketContent) {
                          return;
                        }

                        setIsEditingDescription(false);
                        setDescriptionDraft(ticket.description);
                        setIsEditingTitle(true);
                      }}
                      className="block w-full text-left disabled:cursor-default"
                    >
                      <h2 className="text-base font-semibold leading-8 text-gray-900 md:text-xl">
                        {ticket.title}
                      </h2>
                    </button>
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
                        onBlur={() => {
                          void handleSaveDescription();
                        }}
                        onKeyDown={(event) => {
                          if (
                            (event.ctrlKey || event.metaKey) &&
                            event.key === 'Enter'
                          ) {
                            event.preventDefault();
                            void handleSaveDescription();
                          }

                          if (event.key === 'Escape') {
                            setIsEditingDescription(false);
                            setDescriptionDraft(ticket.description);
                          }
                        }}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!canEditTicketContent}
                      onClick={() => {
                        if (!canEditTicketContent) {
                          return;
                        }

                        setIsEditingTitle(false);
                        setTitleDraft(ticket.title);
                        setIsEditingDescription(true);
                      }}
                      className="mt-2 block w-full text-left disabled:cursor-default"
                    >
                      <p className="text-sm text-gray-700">
                        {ticket.description || 'Add description'}
                      </p>
                    </button>
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
            <aside className="min-h-0 min-w-0 space-y-4 overflow-y-auto scrollbar-hide rounded-2xl bg-white p-5 xl:col-span-3 xl:h-full">
              {!isExternalUser ? (
                <section className="rounded-xl border border-gray-200 bg-white sm:rounded-2xl">
                  <h3 className="border-b border-gray-200 px-3 py-3 text-sm font-semibold text-gray-900 md:text-base">
                    Status & Priority
                  </h3>

                  <div className="space-y-4 p-3 sm:p-4">
                    <Dropdown
                      label="Status"
                      options={statusOptions}
                      value={selectedStatus}
                      disabled={
                        updateTicketMutation.isPending || !canEditStatus
                      }
                      onChange={handleStatusChange}
                    />

                    <Dropdown
                      label="Priority"
                      options={priorityOptions}
                      value={selectedPriority}
                      disabled={
                        updateTicketMutation.isPending || !canEditPriority
                      }
                      onChange={handlePriorityChange}
                    />

                    <Dropdown
                      label="Assignee"
                      options={assigneeOptions}
                      value={selectedAssigneeId}
                      disabled={
                        updateTicketMutation.isPending || !canEditAssignee
                      }
                      onChange={handleAssigneeChange}
                    />
                  </div>
                </section>
              ) : null}

              <section className="rounded-xl border border-gray-200 bg-white sm:rounded-2xl">
                <h3 className="border-b border-gray-200 px-3 py-3 text-sm font-semibold text-gray-900 sm:px-4 md:text-base">
                  Attachments
                </h3>

                <div className="space-y-3 p-3 sm:p-4">
                  {ticket.attachments.length ? (
                    ticket.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={getAttachmentUrl(attachment.storageKey)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5 transition hover:bg-gray-50"
                      >
                        {attachment.extension === 'png' ||
                        attachment.extension === 'svg' ||
                        attachment.extension === 'jpg' ||
                        attachment.extension === 'jpeg' ? (
                          <img
                            alt={attachment.name}
                            className="h-10 w-10 rounded-sm border border-gray-200"
                            src={getFileUrl(attachment.storageKey)}
                          />
                        ) : (
                          <FileBadgeIcon extension={attachment.extension} />
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-800">
                            {attachment.name}
                          </p>

                          <p className="text-sm text-gray-500">
                            {attachment.sizeLabel}
                          </p>
                        </div>
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No attachments added.
                    </p>
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
                    <p className="mb-2 text-xs font-medium tracking-wide text-gray-500">
                      {selectedDueDate ? 'Select date' : 'No due date'}
                    </p>

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
                {/* <div className="space-y-1">
                  <p className="text-base font-semibold text-[#1E3A8A]">
                    Uploading attachments
                  </p>
                  <p className="text-sm text-[#3B82F6]">
                    Please wait while we upload files and send your message.
                  </p>
                </div> */}
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
  createdBy?: string | null;
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
  const readReceipt =
    message.isRead && message.senderId
      ? 'Read'
      : message.senderId
        ? 'Sent'
        : '';
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
    createdAt: `${formatReplyDate(message.createdAt)}${readReceipt ? ` • ${readReceipt}` : ''}`,
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

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs sm:text-sm text-gray-500">{label}</span>
      <p className="sm:mt-1 text-base sm:text-xl font-semibold text-gray-900">
        {value}
      </p>
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
        <p className="text-sm md:text-lg font-semibold text-gray-900">
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
