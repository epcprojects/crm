import { uploadFilesDirectly } from './attachments';

// Lead count per configured status, as returned by the summary endpoints.
export type LeadStatusCount = {
  key: string;
  label: string;
  color: string;
  sortOrder: number;
  isClosed: boolean;
  count: number;
};

export type LeadStatusSummary = {
  total: number;
  statuses: LeadStatusCount[];
};

// Banner stat items, one per configured status.
export function toStatusStats(
  summary?: { statuses?: LeadStatusCount[] | null } | null,
) {
  return (summary?.statuses ?? []).map((status) => ({
    title: status.label,
    count: status.count,
    color: status.color,
  }));
}

export type CreateTicketPayload = {
  projectId: string;
  title: string;
  description?: string;
  statusKey: string;
  priorityKey?: string;
  ticketType: 'feature_request' | 'bug' | '';
  assigneeId?: string;
  dueDate?: string;
  contactId?: string;
  attachments?: File[];
};

export async function createTicket(payload: CreateTicketPayload) {
  const validAttachments = (payload.attachments ?? []).filter(
    (attachment) => attachment.size > 0,
  );

  const uploadedAttachments = validAttachments.length
    ? await uploadFilesDirectly(
        validAttachments,
        `projects/${payload.projectId}/tickets/creation`,
      )
    : [];

  const body: Record<string, unknown> = {
    title: payload.title,
    statusKey: payload.statusKey,
    ticketType: payload.ticketType,
  };

  if (payload.description?.trim()) {
    body.description = payload.description.trim();
  }

  if (payload.priorityKey?.trim()) {
    body.priorityKey = payload.priorityKey.trim();
  }

  if (payload.assigneeId?.trim()) {
    body.assigneeId = payload.assigneeId.trim();
  }

  if (payload.contactId?.trim()) {
    body.contactId = payload.contactId.trim();
  }

  if (payload.dueDate?.trim()) {
    body.dueDate = payload.dueDate.trim();
  }

  if (uploadedAttachments.length) {
    body.attachments = uploadedAttachments;
  }

  const response = await fetch(`/api/projects/${payload.projectId}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      Array.isArray(data?.message) && data.message.length
        ? data.message.join(', ')
        : data?.message || 'Failed to create lead.';

    throw new Error(message);
  }

  return data;
}

export type TicketReporter = {
  id: string;
  fullName: string;
};

// Distinct users who have actually created a ticket in the given projects —
// used for the Created By filter, as opposed to every project member.
export async function fetchTicketReporters(
  projectIds: string[] = [],
): Promise<TicketReporter[]> {
  if (projectIds.length === 0) {
    return [];
  }

  const searchParams = new URLSearchParams();

  projectIds.forEach((projectId) => {
    if (projectId) {
      searchParams.append('projectIds', projectId);
    }
  });

  const response = await fetch(
    `/api/dashboard/tickets/reporters?${searchParams}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | TicketReporter[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch lead creators.'
        : 'Failed to fetch lead creators.',
    );
  }

  return payload;
}

// Same as fetchTicketReporters, scoped to a single project's own tickets.
export async function fetchProjectTicketReporters(
  projectId: string,
): Promise<TicketReporter[]> {
  if (!projectId) {
    return [];
  }

  const response = await fetch(`/api/projects/${projectId}/tickets/reporters`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | TicketReporter[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch lead creators.'
        : 'Failed to fetch lead creators.',
    );
  }

  return payload;
}

export type TicketAssignee = {
  id: string;
  fullName: string;
};

// Distinct users who actually have a ticket assigned to them in the given
// projects — used for the Agent filter, as opposed to every member.
export async function fetchTicketAssignees(
  projectIds: string[] = [],
): Promise<TicketAssignee[]> {
  if (projectIds.length === 0) {
    return [];
  }

  const searchParams = new URLSearchParams();

  projectIds.forEach((projectId) => {
    if (projectId) {
      searchParams.append('projectIds', projectId);
    }
  });

  const response = await fetch(
    `/api/dashboard/tickets/assignees?${searchParams}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | TicketAssignee[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch lead agents.'
        : 'Failed to fetch lead agents.',
    );
  }

  return payload;
}

// Same as fetchTicketAssignees, scoped to a single project's own tickets.
export async function fetchProjectTicketAssignees(
  projectId: string,
): Promise<TicketAssignee[]> {
  if (!projectId) {
    return [];
  }

  const response = await fetch(`/api/projects/${projectId}/tickets/assignees`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | TicketAssignee[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch lead agents.'
        : 'Failed to fetch lead agents.',
    );
  }

  return payload;
}
