'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import DiscussionPanel from '../../../../components/discussion/DiscussionPanel';
import Dropdown from '../../../../components/ui/ThemeDropDown';
import { appToast } from '../../../../components/toast/AppToast';
import {
  getTicketById,
  ticketPriorityDropdownOptions,
  type TicketPerson,
} from '../tickets.data';
import type { TicketPriority } from '../../../../components/tables/RecentTicketsTable';
import {
  PermissionGuard,
  usePermissions,
} from '../../../providers/PermissionProvider';

export default function TicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const ticketId = String(params?.ticketId ?? '');
  const projectId = searchParams.get('projectId') ?? '';
  const { hasPermission } = usePermissions();
  const canViewTicketDetail = hasPermission('tickets.view_detail');
  const canViewReplies = hasPermission('ticket_replies.view');
  const canPostReplies = hasPermission('ticket_replies.post');
  const canAttachReplyFiles = hasPermission('ticket_replies.attach_file');
  const canEditStatus = hasPermission('tickets.edit_status');
  const canEditPriority = hasPermission('tickets.edit_priority');
  const canEditAssignee = hasPermission('tickets.edit_assignee');

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

  const ticketRepliesQuery = useQuery({
    queryKey: ['ticket-replies', ticketId],
    queryFn: () => fetchTicketReplies(ticketId),
    enabled: Boolean(ticketId && canViewReplies),
  });

  const statusListQuery = useQuery({
    queryKey: ['ticket-statuses'],
    queryFn: fetchTicketStatuses,
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
      await queryClient.invalidateQueries({
        queryKey: ['ticket-detail', projectId, ticketId],
      });
      appToast.success('Ticket updated successfully.');
    },
    onError: (error) => {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to update ticket.',
      );
    },
  });

  const ticket = ticketDetailQuery.data ?? fallbackTicket;
  const [selectedStatus, setSelectedStatus] = useState('Open');
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority | ''>(
    'Low',
  );
  const [selectedAssignee, setSelectedAssignee] = useState('');

  const statusOptions = useMemo(
    () =>
      (statusListQuery.data ?? []).map((status) => ({
        label: status.label,
        value: status.label,
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
    setSelectedPriority(ticket.priority ?? '');
    setSelectedAssignee(ticket.assigneeDetail.name);
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

  const handlePriorityChange = async (value: string) => {
    if (!canEditPriority) {
      return;
    }

    const nextPriority = value as TicketPriority;
    setSelectedPriority(nextPriority);

    await updateTicketMutation.mutateAsync({
      title: ticket.title,
      description: ticket.description,
      statusKey: selectedStatus,
      priorityKey: nextPriority,
      assigneeId: selectedAssigneeId,
      dueDate: ticket.dueDateValue ?? '',
    });
  };

  const handleAssigneeChange = async (value: string) => {
    if (!canEditAssignee) {
      return;
    }

    const selectedOption = assigneeOptions.find(
      (option) => option.value === value,
    );
    setSelectedAssignee(selectedOption?.label ?? '');

    await updateTicketMutation.mutateAsync({
      title: ticket.title,
      description: ticket.description,
      statusKey: selectedStatus,
      priorityKey: selectedPriority,
      assigneeId: value,
      dueDate: ticket.dueDateValue ?? '',
    });
  };

  const handleStatusChange = async (value: string) => {
    if (!canEditStatus) {
      return;
    }

    setSelectedStatus(value);

    await updateTicketMutation.mutateAsync({
      title: ticket.title,
      description: ticket.description,
      statusKey: value,
      priorityKey: selectedPriority,
      assigneeId: selectedAssigneeId,
      dueDate: ticket.dueDateValue ?? '',
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
              <MetaItem label="Ticket ID" value={`#${ticket.id}`} />
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
            <DiscussionPanel
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
            />
          </PermissionGuard>
        </div>

        <aside className="space-y-4 xl:col-span-3">
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
                options={ticketPriorityDropdownOptions}
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
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-3"
                  >
                    <FileBadgeIcon extension={attachment.extension} />
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

          <section className="rounded-xl sm:rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-3 sm:px-4 py-3">
              <h3 className="text-sm md:text-base font-semibold text-gray-900">
                Due Date
              </h3>
              {/* <button
                type="button"
                onClick={handleClearDueDate}
                disabled={updateTicketMutation.isPending || !canEditDueDate}
                className="text-sm font-semibold text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear
              </button> */}
            </div>
            <div className="p-3 sm:p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Overdue
              </p>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
                <span className="text-sm text-gray-900">{ticket.dueDate}</span>
                <CalendarIcon />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white">
            <h3 className="border-b border-gray-200 px-3 sm:px-4 py-3 text-sm md:text-base font-semibold text-gray-900">
              People
            </h3>
            <div className="space-y-4 p-3 sm:p-4">
              <PersonCard person={ticket.reporter} />
              <PersonCard person={ticket.assigneeDetail} />
            </div>
          </section>
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

type ApiTicketReply = {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  authorId?: string | null;
  createdBy?: string | null;
  message?: string;
};

type ApiTicketAttachment = {
  id: string;
  originalName: string;
  storageKey: string;
  sizeBytes: string;
  extension: string;
};

type ApiTicketDetail = {
  id: string;
  createdAt: string;
  projectId: string;
  title: string;
  description: string;
  statusKey: string | null;
  priorityKey: string | null;
  reporterId: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  attachments: ApiTicketAttachment[];
};

type UpdateTicketRequest = {
  title: string;
  description: string;
  statusKey: string;
  priorityKey: string;
  assigneeId: string;
  dueDate: string;
};

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
  return {
    id: ticket.id,
    title: ticket.title,
    project: {
      initials: 'PR',
      name: 'Project',
    },
    status: mapTicketStatus(ticket.statusKey),
    priority: mapTicketPriority(ticket.priorityKey),
    assignee: {
      name: ticket.assigneeId
        ? `User ${ticket.assigneeId.slice(-4)}`
        : 'Unassigned',
      initials: ticket.assigneeId
        ? ticket.assigneeId.slice(-2).toUpperCase()
        : 'NA',
    },
    date: formatTicketDate(ticket.createdAt),
    description: ticket.description,
    dueDate: formatTicketDate(ticket.dueDate ?? ticket.createdAt),
    dueDateValue: ticket.dueDate ?? '',
    assigneeId: ticket.assigneeId ?? '',
    attachments: ticket.attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.originalName,
      sizeLabel: formatBytes(attachment.sizeBytes),
      extension: attachment.extension,
      storageKey: attachment.storageKey,
    })),
    reporter: {
      role: 'Reporter',
      name: ticket.reporterId
        ? `User ${ticket.reporterId.slice(-4)}`
        : 'Reporter',
      initials: ticket.reporterId
        ? ticket.reporterId.slice(-2).toUpperCase()
        : 'RP',
    },
    assigneeDetail: {
      role: 'Assignee',
      name: ticket.assigneeId
        ? `User ${ticket.assigneeId.slice(-4)}`
        : 'Unassigned',
      initials: ticket.assigneeId
        ? ticket.assigneeId.slice(-2).toUpperCase()
        : 'NA',
    },
    replies: [],
  };
}

function mapApiTicketReplyToDiscussionReply(reply: ApiTicketReply) {
  const authorId = reply.authorId ?? reply.createdBy ?? '';

  return {
    id: reply.id,
    author: {
      name: authorId ? `User ${authorId.slice(-4)}` : 'User',
      initials: authorId ? authorId.slice(-2).toUpperCase() : 'US',
    },
    createdAt: formatReplyDate(reply.createdAt ?? reply.updatedAt ?? ''),
    message: reply.message?.trim() || '',
  };
}

function mapTicketStatus(value: string | null) {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === 'closed') {
    return 'Closed';
  }

  if (normalizedValue === 'resolved') {
    return 'Resolved';
  }

  if (normalizedValue === 'in progress' || normalizedValue === 'inprogress') {
    return 'In Progress';
  }

  return 'Open';
}

function mapTicketPriority(value: string | null): TicketPriority {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === 'critical') {
    return 'Critical';
  }

  if (normalizedValue === 'high') {
    return 'High';
  }

  if (normalizedValue === 'medium') {
    return 'Medium';
  }

  return 'Low';
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

function formatBytes(sizeBytes: string) {
  const bytes = Number(sizeBytes);

  if (Number.isNaN(bytes) || bytes <= 0) {
    return sizeBytes;
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

function CalendarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.66732 10.0001C6.20708 10.0001 5.83398 10.3732 5.83398 10.8334C5.83398 11.2937 6.20708 11.6667 6.66732 11.6667H6.67479C7.13503 11.6667 7.50813 11.2937 7.50813 10.8334C7.50813 10.3732 7.13503 10.0001 6.67479 10.0001H6.66732Z"
        fill="#1F2937"
      />
      <path
        d="M9.99691 10.0001C9.53668 10.0001 9.16358 10.3732 9.16358 10.8334C9.16358 11.2937 9.53668 11.6667 9.99691 11.6667H10.0044C10.4646 11.6667 10.8377 11.2937 10.8377 10.8334C10.8377 10.3732 10.4646 10.0001 10.0044 10.0001H9.99691Z"
        fill="#1F2937"
      />
      <path
        d="M13.3265 10.0001C12.8663 10.0001 12.4932 10.3732 12.4932 10.8334C12.4932 11.2937 12.8663 11.6667 13.3265 11.6667H13.334C13.7942 11.6667 14.1673 11.2937 14.1673 10.8334C14.1673 10.3732 13.7942 10.0001 13.334 10.0001H13.3265Z"
        fill="#1F2937"
      />
      <path
        d="M6.66732 13.3334C6.20708 13.3334 5.83398 13.7065 5.83398 14.1667C5.83398 14.627 6.20708 15.0001 6.66732 15.0001H6.67479C7.13503 15.0001 7.50813 14.627 7.50813 14.1667C7.50813 13.7065 7.13503 13.3334 6.67479 13.3334H6.66732Z"
        fill="#1F2937"
      />
      <path
        d="M9.99691 13.3334C9.53668 13.3334 9.16358 13.7065 9.16358 14.1667C9.16358 14.627 9.53668 15.0001 9.99691 15.0001H10.0044C10.4646 15.0001 10.8377 14.627 10.8377 14.1667C10.8377 13.7065 10.4646 13.3334 10.0044 13.3334H9.99691Z"
        fill="#1F2937"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.62565 1.66675C5.62565 1.32157 5.34583 1.04175 5.00065 1.04175C4.65547 1.04175 4.37565 1.32157 4.37565 1.66675V2.19574C3.70502 2.38582 3.1394 2.69475 2.6686 3.20372C2.02035 3.90454 1.73219 4.79002 1.59419 5.89967C1.45897 6.987 1.45898 8.38047 1.45898 10.1584V10.6751C1.45898 12.453 1.45897 13.8465 1.59419 14.9338C1.73219 16.0435 2.02035 16.929 2.6686 17.6298C3.32327 18.3375 4.16129 18.6585 5.21006 18.8109C6.22508 18.9584 7.52194 18.9584 9.15835 18.9584H10.8429C12.4794 18.9584 13.7762 18.9584 14.7912 18.8109C15.84 18.6585 16.678 18.3375 17.3327 17.6298C17.981 16.929 18.2691 16.0435 18.4071 14.9338C18.5423 13.8465 18.5423 12.453 18.5423 10.675V10.1585C18.5423 8.38048 18.5423 6.98701 18.4071 5.89967C18.2691 4.79002 17.981 3.90454 17.3327 3.20372C16.8619 2.69475 16.2963 2.38582 15.6256 2.19574V1.66675C15.6256 1.32157 15.3458 1.04175 15.0006 1.04175C14.6555 1.04175 14.3756 1.32157 14.3756 1.66675V1.97166C13.4289 1.87506 12.264 1.87507 10.8429 1.87508H9.15835C7.73734 1.87507 6.57237 1.87506 5.62565 1.97166V1.66675ZM4.39948 3.50495C4.47404 3.76673 4.71496 3.95841 5.00065 3.95841C5.34583 3.95841 5.62565 3.67859 5.62565 3.33341V3.2289C6.50982 3.12638 7.65263 3.12508 9.20898 3.12508H10.7923C12.3487 3.12508 13.4915 3.12638 14.3756 3.2289V3.33341C14.3756 3.67859 14.6555 3.95841 15.0006 3.95841C15.2863 3.95841 15.5273 3.76673 15.6018 3.50495C15.9412 3.64001 16.199 3.81888 16.4151 4.05252C16.8093 4.47874 17.0427 5.06331 17.1658 6.04706C17.139 6.04355 17.1117 6.04175 17.084 6.04175H2.91732C2.88958 6.04175 2.86227 6.04355 2.83549 6.04706C2.95858 5.06332 3.19197 4.47874 3.58623 4.05252C3.80234 3.81888 4.06006 3.64001 4.39948 3.50495ZM2.74243 7.26695C2.70945 8.06937 2.70898 9.03036 2.70898 10.2028V10.6307C2.70898 12.4626 2.71012 13.7784 2.83464 14.7796C2.95749 15.7675 3.19106 16.3538 3.58623 16.781C3.97499 17.2013 4.49838 17.4443 5.38985 17.5739C6.30462 17.7069 7.51055 17.7084 9.20898 17.7084H10.7923C12.4908 17.7084 13.6967 17.7069 14.6114 17.5739C15.5029 17.4443 16.0263 17.2013 16.4151 16.781C16.8102 16.3538 17.0438 15.7675 17.1667 14.7796C17.2912 13.7784 17.2923 12.4626 17.2923 10.6307V10.2028C17.2923 9.03036 17.2918 8.06937 17.2589 7.26695C17.2034 7.28309 17.1447 7.29175 17.084 7.29175H2.91732C2.85661 7.29175 2.79792 7.28309 2.74243 7.26695Z"
        fill="#1F2937"
      />
    </svg>
  );
}

function FileBadgeIcon({ extension }: { extension?: string }) {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-violet-50 text-[10px] font-bold text-violet-600">
      {(extension ?? 'file').slice(0, 3).toUpperCase()}
    </span>
  );
}
