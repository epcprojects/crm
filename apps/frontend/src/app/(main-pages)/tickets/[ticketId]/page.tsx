'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import TicketRepliesPanel from '../../../../components/discussion/TicketRepliesPanel';
import Dropdown from '../../../../components/ui/ThemeDropDown';
import { appToast } from '../../../../components/toast/AppToast';
import { getTicketById, type TicketPerson } from '../tickets.data';
import { projectsQueryKey } from '../../projects/projects.queries';
import {
  PermissionGuard,
  usePermissions,
} from '../../../providers/PermissionProvider';
import { useAppSelector } from '../../../Redux/store';
import { AlertIcon, FileTypePlaceholder } from '../../../../../public/icons';
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
  const [selectedStatus, setSelectedStatus] = useState('Open');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [selectedDueDate, setSelectedDueDate] = useState('');
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
  }, [ticket]);

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

  return (
    <div className="space-y-4 flex-1 w-full flex flex-col items-start -mt-16 sm:mt-0">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700"
      >
        <BackArrowIcon />
        Back
      </button>

      <div className="grid grid-cols-1 flex-1 w-full gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-9 flex flex-col">
          <section className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-3 md:p-5">
            <div className="sm:grid flex flex-wrap gap-4 border-b border-gray-200 pb-5 grid-cols-3">
              <MetaItem label="Ticket ID" value={`${ticket.id}`} />
              <MetaItem label="Created" value={ticket.date} />
              <div>
                <span className="block text-sm text-gray-500">Project</span>
                <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-purple-100 py-0.75 pr-2.5 pl-0.75 text-sm font-medium text-purple-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-medium">
                    {ticket.project.initials}
                  </span>
                  {ticket.project.name}
                </span>
              </div>
            </div>

            <div className="pt-2 sm:pt-5">
              <h2 className="text-base md:text-xl leading-8 font-semibold text-gray-900">
                {ticket.title}
              </h2>
              <p className="sm:mt-2 text-sm text-gray-700">
                {ticket.description}
              </p>
            </div>
          </section>

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
              onSubmitReply={canPostReplies ? handleSubmitReply : undefined}
              requireMessage={false}
              currentUserId={currentUserId}
            />
          </PermissionGuard>
        </div>

        <aside className="space-y-4 xl:col-span-3">
          {!isExternalUser ? (
            <section className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white">
              <h3 className="border-b border-gray-200 px-3 py-3 text-sm md:text-base font-semibold text-gray-900">
                Status & Priority
              </h3>
              <div className="space-y-4 p-3 sm:p-4">
                <Dropdown
                  label="Status"
                  options={statusOptions}
                  value={selectedStatus}
                  disabled={updateTicketMutation.isPending || !canEditStatus}
                  onChange={handleStatusChange}
                />
                <Dropdown
                  label="Priority"
                  options={priorityOptions}
                  value={selectedPriority}
                  disabled={updateTicketMutation.isPending || !canEditPriority}
                  onChange={handlePriorityChange}
                />
                <Dropdown
                  label="Assignee"
                  options={assigneeOptions}
                  value={selectedAssigneeId}
                  disabled={updateTicketMutation.isPending || !canEditAssignee}
                  onChange={handleAssigneeChange}
                />
              </div>
            </section>
          ) : null}

          <section className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white">
            <h3 className="border-b border-gray-200 px-3 sm:px-4 py-3 text-sm md:text-base font-semibold text-gray-900">
              Attachments
            </h3>
            <div className="space-y-3 sm:p-4 p-3">
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
                        className="rounded-sm border border-gray-200 h-10 w-10"
                        src={getFileUrl(attachment.storageKey)}
                      />
                    ) : (
                      <FileBadgeIcon extension={attachment.extension} />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {attachment.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {attachment.sizeLabel}
                      </p>
                    </div>
                  </a>
                ))
              ) : (
                <p className="text-sm text-gray-500">No attachments added.</p>
              )}
            </div>
          </section>

          {!isExternalUser ? (
            <section className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 px-3 sm:px-4 py-3">
                <h3 className="text-sm md:text-base font-semibold text-gray-900">
                  Due Date
                </h3>
              </div>
              <div className="p-3 sm:p-4">
                {isDueDateOverdue ? (
                  <div className="mb-3 flex items-start gap-2 rounded-lg bg-red-100 px-3 py-2.5 text-[#B42318]">
                    <AlertIcon fill="#B42318" opacity="0" />
                    <div className="flex items-center gap-3 justify-between w-full">
                      <p className="text-sm font-medium pt-0.25">
                        {selectedDueDate}
                      </p>
                      <p className="text-sm font-medium  bg-[#F04438] text-white py-0.5 px-2.5 rounded-full">
                        Overdue
                      </p>
                    </div>
                  </div>
                ) : null}
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {selectedDueDate ? 'Selected date' : 'No due date'}
                </p>
                <label className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
                  <input
                    type="date"
                    value={selectedDueDate}
                    min={minimumDueDate}
                    disabled={updateTicketMutation.isPending || !canEditDueDate}
                    onChange={(event) =>
                      handleDueDateChange(event.target.value)
                    }
                    className="w-full bg-transparent text-sm text-gray-900 outline-none disabled:cursor-not-allowed disabled:text-gray-400"
                  />
                  {/* <CalendarIcon /> */}
                </label>
              </div>
            </section>
          ) : null}

          {!isExternalUser ? (
            <section className="rounded-2xl border border-gray-200 bg-white">
              <h3 className="border-b border-gray-200 px-3 sm:px-4 py-3 text-sm md:text-base font-semibold text-gray-900">
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
