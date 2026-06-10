'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  mapApiProjectToProjectRecord,
  type ProjectRecord,
  type ApiProjectRecord,
} from './projects.data';
import type { CreateProjectFormValues } from '../../../components/modals/CreateProjectModal';

export const projectsQueryKey = ['projects'];

export function useProjectsQuery() {
  return useQuery({
    queryKey: projectsQueryKey,
    queryFn: fetchProjects,
  });
}

export function useProjectDetailQuery(projectId: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...projectsQueryKey, projectId],
    queryFn: () => fetchProjectById(projectId),
    enabled: Boolean(projectId),
    initialData: () => {
      const projects = queryClient.getQueryData<ProjectRecord[]>(projectsQueryKey);
      return projects?.find((project) => project.id === projectId);
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

async function fetchProjects() {
  const response = await fetch('/api/projects', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiProjectRecord[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload) ? payload?.message : 'Failed to fetch projects.',
    );
  }

  return payload.map(mapApiProjectToProjectRecord);
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
