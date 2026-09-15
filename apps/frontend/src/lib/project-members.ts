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

// Members across every project the current user is allowed to see, used to
// power the Created By / Assigned To filters on multi-project ticket views
// (Recent Tickets, All Tickets) — scoped the same way the Project filter is.
export async function fetchAssignableMembers() {
  const response = await fetch('/api/projects/members?sortBy=fullName', {
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
