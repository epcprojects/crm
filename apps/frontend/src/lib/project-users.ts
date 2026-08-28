'use client';

import type { ProjectUserRecord } from '../components/modals/ProjectUsersModal';

export async function fetchProjectUsers(projectId: string, search?: string) {
  const searchParams = new URLSearchParams();

  if (search?.trim()) {
    searchParams.set('search', search.trim());
  }

  const queryString = searchParams.toString();
  const response = await fetch(
    `/api/projects/${projectId}/members/projects${
      queryString ? `?${queryString}` : ''
    }`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | ProjectUserRecord[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch project users.'
        : 'Failed to fetch project users.',
    );
  }

  return payload;
}

export async function removeProjectUser(projectId: string, userId: string) {
  const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  if (response.status === 204) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.message || 'Failed to remove project user.');
  }

  return payload;
}

export async function fetchAvailableProjectUsers(
  projectId: string,
  search?: string,
) {
  const searchParams = new URLSearchParams();

  if (search?.trim()) {
    searchParams.set('search', search.trim());
  }

  const queryString = searchParams.toString();
  const response = await fetch(
    `/api/projects/${projectId}/members/available${
      queryString ? `?${queryString}` : ''
    }`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | ProjectUserRecord[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch available project users.'
        : 'Failed to fetch available project users.',
    );
  }

  return payload;
}

export async function assignProjectUsers(projectId: string, userIds: string[]) {
  const response = await fetch(`/api/projects/${projectId}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(userIds),
  });

  if (response.status === 204) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.message || 'Failed to assign project users.');
  }

  return payload;
}
