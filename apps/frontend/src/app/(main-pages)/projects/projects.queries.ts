'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  mapApiProjectToProjectRecord,
  type ProjectRecord,
  type ApiProjectRecord,
  type ProjectNameRecord,
  type ProjectFileRecord,
} from './projects.data';
import type { CreateProjectFormValues } from '../../../components/modals/CreateProjectModal';
import type { UploadFileFormValues } from '../../../components/modals/UploadFileModal';
import type { DiscussionReply } from '../../../components/discussion/types';
import type {
  RecentTicket,
  TicketPriority,
  TicketStatus,
} from '../../../components/tables/RecentTicketsTable';

export const projectsQueryKey = ['projects'];
export const projectNamesQueryKey = ['project-names'];
export const projectThreadQueryKey = ['project-thread'];
export const projectThreadDetailQueryKey = ['project-thread-detail'];
export const projectTicketsQueryKey = ['project-tickets'];
export const projectFilesQueryKey = ['project-files'];

type ProjectThreadDetail = {
  header: DiscussionReply | null;
  replies: DiscussionReply[];
};

type ProjectsQueryOptions = {
  page?: number;
  limit?: number;
  search?: string;
};

type ProjectSummary = {
  totalProjects: number | null;
  activeProjects: number | null;
  openTickets: number | null;
  criticalIssues: number | null;
};

type ProjectsPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

type ProjectsResponse = {
  items: ProjectRecord[];
  summary: ProjectSummary; //TODO: later on,may need to remove []
  meta: ProjectsPaginationMeta;
};

export function useProjectsQuery(
  enabled = true,
  { page = 1, limit = 100 }: ProjectsQueryOptions = {},
) {
  return useQuery({
    queryKey: [...projectsQueryKey, page, limit],
    queryFn: () => fetchProjects({ page, limit }),
    enabled,
    select: (data) => data.items,
  });
}

export function useProjectNamesQuery(enabled = true) {
  return useQuery({
    queryKey: projectNamesQueryKey,
    queryFn: fetchProjectNames,
    enabled,
  });
}

export function useProjectsInfiniteQuery(
  enabled = true,
  limit = 12,
  search = '',
) {
  const normalizedSearch = search.trim();

  return useInfiniteQuery({
    queryKey: [...projectsQueryKey, 'infinite', limit, search],
    queryFn: ({ pageParam }) =>
      fetchProjects({
        page: Number(pageParam),
        limit,
        search: normalizedSearch,
      }),
    enabled,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
  });
}

export function useProjectDetailQuery(projectId: string, enabled = true) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...projectsQueryKey, projectId],
    queryFn: () => fetchProjectById(projectId),
    enabled: Boolean(projectId && enabled),
    refetchOnMount: 'always',
    placeholderData: () => {
      const projectQueries = queryClient.getQueriesData<ProjectRecord[]>({
        queryKey: projectsQueryKey,
      });

      return projectQueries
        .flatMap(([, projects]) => (Array.isArray(projects) ? projects : []))
        .find((project) => project.id === projectId);
    },
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
        queryClient.invalidateQueries({ queryKey: projectNamesQueryKey }),
      ]);
    },
  });
}

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProject,
    onSuccess: async (updatedProject, variables) => {
      queryClient.setQueryData(
        [...projectsQueryKey, variables.projectId],
        updatedProject,
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
        queryClient.invalidateQueries({ queryKey: projectNamesQueryKey }),
        queryClient.invalidateQueries({
          queryKey: [...projectsQueryKey, variables.projectId],
        }),
      ]);
    },
  });
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
        queryClient.invalidateQueries({ queryKey: projectNamesQueryKey }),
      ]);
    },
  });
}

export function useProjectThreadQuery(projectId: string, enabled = true) {
  return useQuery({
    queryKey: [...projectThreadQueryKey, projectId],
    queryFn: () => fetchProjectThread(projectId),
    enabled: Boolean(projectId && enabled),
  });
}

export function useProjectThreadDetailQuery(
  projectId: string,
  messageId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: [...projectThreadDetailQueryKey, projectId, messageId],
    queryFn: () => fetchProjectThreadDetail(projectId, messageId),
    enabled: Boolean(projectId && messageId && enabled),
  });
}

type ProjectTicketsQueryOptions = {
  page: number;
  limit: number;
  search?: string;
  statusKey?: string;
  priorityKey?: string;
};

export function useProjectTicketsQuery(
  projectId: string,
  { page, limit, search, statusKey, priorityKey }: ProjectTicketsQueryOptions,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...projectTicketsQueryKey,
      projectId,
      page,
      limit,
      search ?? '',
      statusKey ?? 'all',
      priorityKey ?? 'all',
    ],

    queryFn: () =>
      fetchProjectTickets(projectId, {
        page,
        limit,
        search,
        statusKey,
        priorityKey,
      }),

    enabled: Boolean(projectId && enabled),
  });
}

export function useProjectFilesQuery(projectId: string, enabled = true) {
  return useQuery({
    queryKey: [...projectFilesQueryKey, projectId],
    queryFn: () => fetchProjectFiles(projectId),
    enabled: Boolean(projectId && enabled),
  });
}

export function useUploadProjectFilesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadProjectFiles,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...projectFilesQueryKey, variables.projectId],
      });
    },
  });
}

export function useDeleteProjectFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProjectFile,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...projectFilesQueryKey, variables.projectId],
      });
    },
  });
}

async function fetchProjects({
  page = 1,
  limit = 100,
  search,
}: {
  page: number;
  limit: number;
  search?: string;
}): Promise<ProjectsResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search?.trim()) {
    searchParams.set('search', search.trim());
  }
  const response = await fetch(`/api/projects?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiProjectRecord[]
    | {
        items?: ApiProjectRecord[];
        summary?: Partial<ProjectSummary>;
        meta?: Partial<ProjectsPaginationMeta>;
      }
    | { message?: string }
    | null;
  const projectsResponse = normalizeProjectsResponse(payload, page, limit);

  if (!response.ok || !projectsResponse) {
    throw new Error(
      payload && !Array.isArray(payload) && 'message' in payload
        ? payload.message || 'Failed to fetch projects.'
        : 'Failed to fetch projects.',
    );
  }

  return projectsResponse;
}

type ApiProjectNameRecord = {
  id?: string;
  name?: string;
};

async function fetchProjectNames(): Promise<ProjectNameRecord[]> {
  const response = await fetch('/api/projects/names', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiProjectNameRecord[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch project names.'
        : 'Failed to fetch project names.',
    );
  }

  return payload.flatMap((project) => {
    const id = project.id?.trim();
    const name = project.name?.trim();

    if (!id || !name) {
      return [];
    }

    return [{ id, name }];
  });
}

function normalizeProjectsResponse(
  payload:
    | ApiProjectRecord[]
    | {
        items?: ApiProjectRecord[];
        summary?: Partial<ProjectSummary>;
        meta?: Partial<ProjectsPaginationMeta>;
      }
    | { message?: string }
    | null,
  page: number,
  limit: number,
): ProjectsResponse | null {
  if (Array.isArray(payload)) {
    return {
      items: payload.map(mapApiProjectToProjectRecord),
      summary: {
        totalProjects: payload.length,
        activeProjects: payload.length,
        openTickets: 0,
        criticalIssues: 0,
      },
      meta: {
        page,
        limit,
        total: payload.length,
        totalPages: 1,
        hasNext: false,
        hasPrevious: page > 1,
      },
    };
  }

  if (!payload || typeof payload !== 'object' || !('items' in payload)) {
    return null;
  }

  if (!Array.isArray(payload.items)) {
    return null;
  }

  return {
    items: payload.items.map(mapApiProjectToProjectRecord),
    summary: {
      totalProjects:
        payload.summary?.totalProjects ??
        payload.meta?.total ??
        payload.items.length,

      activeProjects: payload.summary?.activeProjects ?? 0,

      openTickets: payload.summary?.openTickets ?? 0,

      criticalIssues: payload.summary?.criticalIssues ?? 0,
    },
    meta: {
      page: payload.meta?.page ?? page,
      limit: payload.meta?.limit ?? limit,
      total: payload.meta?.total ?? payload.items.length,
      totalPages: payload.meta?.totalPages ?? 1,
      hasNext: payload.meta?.hasNext ?? false,
      hasPrevious: payload.meta?.hasPrevious ?? page > 1,
    },
  };
}

async function fetchProjectById(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiProjectRecord
    | { message?: string }
    | null;

  if (!response.ok || !isApiProjectRecord(payload)) {
    const error = new Error(
      isProjectErrorPayload(payload)
        ? payload.message || 'Failed to fetch project.'
        : 'Failed to fetch project.',
    ) as Error & { status?: number };

    error.status = response.status;

    throw error;
  }

  return mapApiProjectToProjectRecord(payload);
}
async function createProject(values: CreateProjectFormValues) {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      name: values.name,
      category: values.category.toLowerCase(),
      brandColor: values.colorHex,
      logoLetter: getProjectLogoLetter(values.name),
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Failed to create project.');
  }

  return payload;
}

async function updateProject({
  projectId,
  values,
}: {
  projectId: string;
  values: CreateProjectFormValues;
}) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      name: values.name,
      category: values.category.toLowerCase(),
      brandColor: values.colorHex,
      logoLetter: getProjectLogoLetter(values.name),
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Failed to update project.');
  }

  if (isApiProjectRecord(payload)) {
    return mapApiProjectToProjectRecord(payload);
  }

  return {
    id: projectId,
    name: values.name,
    category: values.category,
    colorHex: values.colorHex,
    initials: getInitials(values.name),
  } as ProjectRecord;
}

async function deleteProject(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Failed to delete project.');
  }

  return payload;
}

function getProjectLogoLetter(name: string) {
  return name.replace(/\s+/g, '').slice(0, 2).toLowerCase();
}

function isApiProjectRecord(value: unknown): value is ApiProjectRecord {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      'name' in value &&
      'category' in value &&
      'brandColor' in value &&
      'logoLetter' in value,
  );
}

function isProjectErrorPayload(value: unknown): value is { message?: string } {
  return Boolean(value && typeof value === 'object' && 'message' in value);
}

type ApiProjectThreadMessage = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  isActive?: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  projectId?: string;
  authorId?: string;
  message: string | null;
  replyCount?: string | number | null;
  author?: {
    email?: string;
    fullName?: string;
    name?: string;
  } | null;
  attachments?: ApiDiscussionAttachment[];
  replies?: ApiProjectThreadMessage[];
};

type ApiDiscussionAttachment = {
  id?: string;
  originalName?: string;
  name?: string;
  storageKey?: string | null;
  sizeBytes?: string | number | null;
  extension?: string | null;
  mimeType?: string | null;
};

type ApiProjectTicket = {
  id: string;
  ticketRefNo?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  isActive?: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  projectId?: string;
  title: string;
  description?: string;
  statusKey?: string | null;
  priorityKey?: string | null;
  reporterId?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  project?: {
    id?: string;
    name?: string;
    brandColor?: string;
  } | null;
  status?: {
    key?: string;
    label?: string;
    color?: string;
  } | null;
  priority?: {
    key?: string;
    label?: string;
    color?: string;
  } | null;
  assignee?: {
    id?: string;
    email?: string;
    fullName?: string;
    name?: string;
  } | null;
  reporter: {
    id: string;
    email: string;
    fullName: string;
  };
};

type ApiProjectFile = {
  id?: string;
  projectId?: string | null;
  name?: string;
  fileName?: string;
  originalName?: string;
  type?: string;
  mimeType?: string;
  size?: string | number | null;
  sizeBytes?: string | number | null;
  extension?: string | null;
  uploadedBy?: string | null;
  createdBy?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  thumbnailKey?: string | null;
  storageKey?: string | null;
  source?: string | null;
  sourceId?: string | null;
  status?: string | null;
};

type ApiProjectTicketsResponse = {
  items: ApiProjectTicket[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

async function fetchProjectThread(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/thread`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiProjectThreadMessage[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message
        : 'Failed to fetch project thread.',
    );
  }

  return payload.map(mapApiProjectThreadMessageToReply);
}

async function fetchProjectThreadDetail(projectId: string, messageId: string) {
  const response = await fetch(
    `/api/projects/${projectId}/thread/${messageId}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(
      isProjectErrorPayload(payload)
        ? payload.message || 'Failed to fetch thread details.'
        : 'Failed to fetch thread details.',
    );
  }

  return normalizeProjectThreadDetail(payload, messageId);
}

async function fetchProjectTickets(
  projectId: string,
  { page, limit, search, statusKey, priorityKey }: ProjectTicketsQueryOptions,
) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search?.trim()) {
    searchParams.set('search', search.trim());
  }

  if (statusKey) {
    searchParams.set('statusKey', statusKey);
  }

  if (priorityKey) {
    searchParams.set('priorityKey', priorityKey);
  }

  const response = await fetch(
    `/api/projects/${projectId}/tickets?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | ApiProjectTicketsResponse
    | { message?: string }
    | null;

  if (!response.ok || !isApiProjectTicketsResponse(payload)) {
    throw new Error(
      isProjectErrorPayload(payload)
        ? payload.message || 'Failed to fetch project tickets.'
        : 'Failed to fetch project tickets.',
    );
  }

  return {
    items: payload.items.map(mapApiProjectTicketToRecentTicket),
    meta: payload.meta,
  };
}

async function fetchProjectFiles(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/files`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiProjectFile[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message
        : 'Failed to fetch project files.',
    );
  }

  return payload.map(mapApiProjectFileToProjectFileRecord);
}

async function uploadProjectFiles({
  projectId,
  values,
}: {
  projectId: string;
  values: UploadFileFormValues;
}) {
  const formData = new FormData();

  values.attachments.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch(`/api/projects/${projectId}/files`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Failed to upload project files.');
  }

  return payload;
}

async function deleteProjectFile({
  projectId,
  fileId,
}: {
  projectId: string;
  fileId: string;
}) {
  const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Failed to delete project file.');
  }

  return payload;
}

function mapApiProjectThreadMessageToReply(
  message: ApiProjectThreadMessage,
): DiscussionReply {
  const authorName =
    getNonEmptyString(message.author?.fullName) ??
    getNonEmptyString(message.author?.name) ??
    (message.authorId ? `User ${message.authorId.slice(-4)}` : 'User');
  const authorInitials =
    authorName !== 'User'
      ? getInitials(authorName)
      : message.authorId
        ? message.authorId.slice(-2).toUpperCase()
        : 'US';

  return {
    id: message.id,
    authorId: message.createdBy ?? message.authorId,
    replyCount: normalizeReplyCount(message.replyCount),
    author: {
      name: authorName,
      initials: authorInitials,
    },
    createdAt: formatThreadDate(message.createdAt),
    updatedAt: getNonEmptyString(message.updatedAt) ?? undefined,
    isEdited: Boolean(
      message.updatedAt &&
        Math.floor(new Date(message.updatedAt).getTime() / 1000) >
          Math.floor(new Date(message.createdAt).getTime() / 1000),
    ),
    message: message.message?.trim() ?? '',
    attachments: Array.isArray(message.attachments)
      ? message.attachments.map(mapApiDiscussionAttachment)
      : [],
  };
}

function normalizeProjectThreadDetail(
  payload: unknown,
  messageId: string,
): ProjectThreadDetail {
  const normalizedMessages = extractThreadMessages(payload);
  const mappedReplies = normalizedMessages.map(
    mapApiProjectThreadMessageToReply,
  );
  const header =
    mappedReplies.find((reply) => reply.id === messageId) ??
    mappedReplies[0] ??
    null;

  if (!header) {
    return {
      header: null,
      replies: [],
    };
  }

  return {
    header,
    replies: mappedReplies.filter((reply) => reply.id !== header.id),
  };
}

function extractThreadMessages(payload: unknown): ApiProjectThreadMessage[] {
  if (Array.isArray(payload)) {
    return payload as ApiProjectThreadMessage[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  if ('data' in payload) {
    return extractThreadMessages((payload as { data?: unknown }).data);
  }

  const objectPayload = payload as {
    id?: unknown;
    parent?: unknown;
    replies?: unknown;
    items?: unknown;
  };

  if (typeof objectPayload.id === 'string') {
    const currentMessage = payload as ApiProjectThreadMessage;
    const replyMessages = extractThreadMessages(currentMessage.replies);

    return [currentMessage, ...replyMessages];
  }

  if (objectPayload.parent || objectPayload.replies) {
    const parentMessages = objectPayload.parent
      ? extractThreadMessages([objectPayload.parent])
      : [];
    const replyMessages = extractThreadMessages(objectPayload.replies);

    return [...parentMessages, ...replyMessages];
  }

  if (objectPayload.items) {
    return extractThreadMessages(objectPayload.items);
  }

  return [];
}

function mapApiDiscussionAttachment(attachment: ApiDiscussionAttachment) {
  const name =
    getNonEmptyString(attachment.originalName) ??
    getNonEmptyString(attachment.name) ??
    'Untitled file';

  return {
    id: getNonEmptyString(attachment.id) ?? `${name}-${attachment.storageKey}`,
    name,
    sizeLabel: formatFileSize(attachment.sizeBytes),
    extension:
      getNonEmptyString(attachment.extension) ??
      getNonEmptyString(attachment.mimeType),
    storageKey: getNonEmptyString(attachment.storageKey),
  };
}

function mapApiProjectTicketToRecentTicket(
  ticket: ApiProjectTicket,
): RecentTicket {
  const projectName = getNonEmptyString(ticket.project?.name) ?? 'Project';
  const statusLabel =
    getNonEmptyString(ticket.status?.label) ??
    mapTicketStatus(ticket.statusKey ?? null);
  const priorityLabel =
    getNonEmptyString(ticket.priority?.label) ??
    mapTicketPriority(ticket.priorityKey ?? null);
  const assigneeName =
    getNonEmptyString(ticket.assignee?.fullName) ??
    getNonEmptyString(ticket.assignee?.name) ??
    (ticket.assigneeId ? `User ${ticket.assigneeId.slice(-4)}` : 'Unassigned');

  return {
    id: ticket.id,
    ticketRefNo: ticket.ticketRefNo,
    title: ticket.title,
    project: {
      id: ticket.project?.id ?? ticket.projectId,
      initials: getInitials(projectName),
      name: projectName,
      brandColor: ticket.project?.brandColor ?? '#ffffff',
    },
    status: statusLabel,
    statusColor: getNonEmptyString(ticket.status?.color),
    priority: priorityLabel,
    priorityColor: getNonEmptyString(ticket.priority?.color),
    assignee: {
      name: assigneeName,
      initials: getInitials(assigneeName),
    },
    date: formatTicketDate(ticket.createdAt),
    dueDate: formatTicketDate(ticket.dueDate ?? ticket.createdAt),
    sortDate: ticket.dueDate ?? ticket.createdAt,
    reporter: {
      id: ticket.reporter.id,
      email: ticket.reporter.email,
      fullName: ticket.reporter.fullName,
    },
  };
}

function mapApiProjectFileToProjectFileRecord(
  file: ApiProjectFile,
): ProjectFileRecord {
  const name =
    getNonEmptyString(file.name) ??
    getNonEmptyString(file.fileName) ??
    getNonEmptyString(file.originalName) ??
    'Untitled file';

  return {
    id: getNonEmptyString(file.id) ?? `${name}-${file.createdAt ?? Date.now()}`,
    name,
    type: mapProjectFileType(
      file.type ?? file.mimeType ?? file.extension ?? name,
    ),
    size: formatFileSize(file.size ?? file.sizeBytes),
    uploadedBy:
      getNonEmptyString(file.uploadedBy) ?? getNonEmptyString(file.createdBy),
    uploadedAt: formatProjectFileDate(file.uploadedAt ?? file.createdAt),
    storageKey: getNonEmptyString(file.storageKey),
    extension: getNonEmptyString(file.extension),
    mimeType: getNonEmptyString(file.mimeType),
    source: getNonEmptyString(file.source),
    sourceId: getNonEmptyString(file.sourceId),
    status: getNonEmptyString(file.status),
  };
}

function isApiProjectTicketsResponse(
  value: unknown,
): value is ApiProjectTicketsResponse {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'items' in value &&
      'meta' in value &&
      Array.isArray((value as ApiProjectTicketsResponse).items),
  );
}

function mapTicketStatus(value: string | null): TicketStatus {
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

function mapTicketPriority(value: string | null): TicketPriority | null {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue === 'critical') {
    return 'Critical';
  }

  if (normalizedValue === 'high') {
    return 'High';
  }

  if (normalizedValue === 'medium') {
    return 'Medium';
  }

  if (normalizedValue === 'low') {
    return 'Low';
  }

  return null;
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

function formatThreadDate(value: string) {
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

function normalizeReplyCount(value?: string | number | null) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  if (typeof value === 'string') {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
  }

  return 0;
}

function mapProjectFileType(value: string): ProjectFileRecord['type'] {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue.includes('pdf') || normalizedValue.endsWith('.pdf')) {
    return 'pdf';
  }

  if (
    normalizedValue.includes('word') ||
    normalizedValue.includes('docx') ||
    normalizedValue.endsWith('.doc') ||
    normalizedValue.endsWith('.docx')
  ) {
    return 'docx';
  }

  return 'file';
}

function formatFileSize(value: string | number | null | undefined) {
  if (typeof value === 'string' && value.trim()) {
    const parsedValue = Number(value);

    if (Number.isNaN(parsedValue)) {
      return value;
    }

    return formatBytes(parsedValue);
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }

  return formatBytes(value);
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatProjectFileDate(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

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

function getNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
