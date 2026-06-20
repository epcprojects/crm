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
  type ProjectFileRecord,
} from './projects.data';
import type { CreateProjectFormValues } from '../../../components/modals/CreateProjectModal';
import type { UploadFileFormValues } from '../../../components/modals/UploadFileModal';
import type { DiscussionReply } from '../../../components/discussion/DiscussionPanel';
import type {
  RecentTicket,
  TicketPriority,
  TicketStatus,
} from '../../../components/tables/RecentTicketsTable';

export const projectsQueryKey = ['projects'];
export const projectThreadQueryKey = ['project-thread'];
export const projectTicketsQueryKey = ['project-tickets'];
export const projectFilesQueryKey = ['project-files'];

type ProjectsQueryOptions = {
  page?: number;
  limit?: number;
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

export function useProjectsInfiniteQuery(enabled = true, limit = 12) {
  return useInfiniteQuery({
    queryKey: [...projectsQueryKey, 'infinite', limit],
    queryFn: ({ pageParam }) =>
      fetchProjects({ page: Number(pageParam), limit }),
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
    initialData: () => {
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
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
  });
}

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProject,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectsQueryKey }),
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
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
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

export function useProjectTicketsQuery(
  projectId: string,
  page: number,
  limit: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [...projectTicketsQueryKey, projectId, page, limit],
    queryFn: () => fetchProjectTickets(projectId, page, limit),
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
  page,
  limit,
}: {
  page: number;
  limit: number;
}): Promise<ProjectsResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
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

function normalizeProjectsResponse(
  payload:
    | ApiProjectRecord[]
    | {
        items?: ApiProjectRecord[];
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
    throw new Error(
      isProjectErrorPayload(payload)
        ? payload.message || 'Failed to fetch project.'
        : 'Failed to fetch project.',
    );
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

  return payload;
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
  deletedAt: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  projectId: string;
  authorId: string;
  message: string;
};

type ApiProjectTicket = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  projectId: string;
  title: string;
  description: string;
  statusKey: string | null;
  priorityKey: string | null;
  reporterId: string | null;
  assigneeId: string | null;
  dueDate: string | null;
};

type ApiProjectFile = {
  id?: string;
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
  storageKey?: string | null;
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

async function fetchProjectTickets(projectId: string, page: number, limit: number) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

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
  return {
    id: message.id,
    author: {
      name: `User ${message.authorId.slice(-4)}`,
      initials: message.authorId.slice(-2).toUpperCase(),
    },
    createdAt: formatThreadDate(message.createdAt),
    message: message.message,
  };
}

function mapApiProjectTicketToRecentTicket(ticket: ApiProjectTicket): RecentTicket {
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
      name: ticket.assigneeId ? `User ${ticket.assigneeId.slice(-4)}` : 'Unassigned',
      initials: ticket.assigneeId
        ? ticket.assigneeId.slice(-2).toUpperCase()
        : 'NA',
    },
    date: formatTicketDate(ticket.dueDate ?? ticket.createdAt),
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
    type: mapProjectFileType(file.type ?? file.mimeType ?? file.extension ?? name),
    size: formatFileSize(file.size ?? file.sizeBytes),
    uploadedBy:
      getNonEmptyString(file.uploadedBy) ?? getNonEmptyString(file.createdBy),
    uploadedAt: formatProjectFileDate(file.uploadedAt ?? file.createdAt),
    storageKey: getNonEmptyString(file.storageKey),
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
