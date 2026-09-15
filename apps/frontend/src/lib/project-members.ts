'use client';

export type ProjectMember = {
  id: string;
  fullName: string;
  isInvitationAccepted?: boolean;
  email?: string | null;
};

export async function fetchProjectMembers(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/members`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ProjectMember[]
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

export type AssignableMember = {
  id: string;
  fullName: string;
  email?: string | null;
};

// Members of the given projects, used to power the Created By / Assigned To
// filters on multi-project ticket views (Recent Tickets, All Tickets) —
// scoped to projects the current user can see, same as the Project filter.
// Only users actually added to one of those projects are returned.
export async function fetchAssignableMembers(projectIds: string[] = []) {
  // Never call this unscoped — without projectIds the backend returns every
  // org member regardless of project membership.
  if (projectIds.length === 0) {
    return [];
  }

  const searchParams = new URLSearchParams({ sortBy: 'fullName' });

  projectIds.forEach((projectId) => {
    if (projectId) {
      searchParams.append('projectIds', projectId);
    }
  });

  const response = await fetch(`/api/projects/members?${searchParams}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | { items?: AssignableMember[]; message?: string }
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray((payload as { items?: unknown })?.items)) {
    throw new Error(payload?.message || 'Failed to fetch members.');
  }

  return (payload as { items: AssignableMember[] }).items;
}
