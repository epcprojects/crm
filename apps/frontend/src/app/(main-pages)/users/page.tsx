'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import AddUserModal, {
  type AddUserFormValues,
} from '../../../components/modals/AddUserModal';
import DeleteUserModal from '../../../components/modals/DeleteUserModal';
import { appToast } from '../../../components/toast/AppToast';
import UserCard, {
  UserCardsSkeleton,
  type UserCardUser,
} from '../../../components/users/UserCard';
import type { ProjectRecord } from '../projects/projects.data';
import { useProjectsQuery } from '../projects/projects.queries';
import {
  PermissionGuard,
  usePermissions,
} from '../../providers/PermissionProvider';
import { useAppLoader } from '../../providers/AppLoaderProvider';

export default function Page() {
  const { setHeaderActionOverride, setHeaderCountOverride } =
    useDashboardHeaderAction();
  const queryClient = useQueryClient();
  const { setLoading } = useAppLoader();
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userList, setUserList] = useState<UserCardUser[]>([]);
  const { hasPermission } = usePermissions();
  const canViewUsers = hasPermission('users.view_list');
  const canCreateUser = hasPermission('users.create');
  const canEditUser = hasPermission('users.edit');
  const canDeleteUser = hasPermission('users.delete');
  const projectsQuery = useProjectsQuery();
  const projects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );
  const membersQuery = useQuery({
    queryKey: ['project-members'],
    queryFn: () => fetchProjectMembers(projects),
    enabled: projectsQuery.isSuccess && canViewUsers,
  });
  const rolesQuery = useQuery({
    queryKey: ['roles', 'user-invite-options'],
    queryFn: fetchRoleOptions,
    enabled: canCreateUser || canEditUser,
  });
  const roleOptions = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const inviteUserMutation = useMutation({
    mutationFn: async (values: AddUserFormValues) => {
      const response = await fetch('/api/users/invite/project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(getInviteUserPayload(values, roleOptions)),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to invite user.');
      }

      return payload;
    },
  });
  const updateUserMutation = useMutation({
    mutationFn: async ({
      userId,
      values,
    }: {
      userId: string;
      values: AddUserFormValues;
    }) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(getUpdateUserPayload(values)),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to update user.');
      }

      return payload;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-members'] });
    },
  });
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
        },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to delete user.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-members'] });
    },
  });

  useEffect(() => {
    if (canCreateUser) {
      setHeaderActionOverride(() => setAddUserOpen(true));
    } else {
      setHeaderActionOverride(null);
    }

    return () => {
      setHeaderActionOverride(null);
    };
  }, [canCreateUser, setHeaderActionOverride]);

  useEffect(() => {
    if (membersQuery.data) {
      setUserList(membersQuery.data);
    }
  }, [membersQuery.data]);

  useEffect(() => {
    setHeaderCountOverride(canViewUsers ? userList.length : null);

    return () => {
      setHeaderCountOverride(null);
    };
  }, [canViewUsers, setHeaderCountOverride, userList.length]);

  const handleCreateUser = async (values: AddUserFormValues) => {
    if (!canCreateUser) {
      return;
    }

    try {
      setLoading(true);
      await inviteUserMutation.mutateAsync(values);
      await queryClient.invalidateQueries({ queryKey: ['project-members'] });
      appToast.success('User invited successfully.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (values: AddUserFormValues) => {
    if (!editingUserId || !canEditUser) return;

    try {
      setLoading(true);
      await updateUserMutation.mutateAsync({
        userId: editingUserId,
        values,
      });
      setEditingUserId(null);
      appToast.success('User updated successfully.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUserId || !canDeleteUser) return;

    try {
      setLoading(true);
      await deleteUserMutation.mutateAsync(deletingUserId);
      setDeletingUserId(null);
      appToast.success('User deleted successfully.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async (user: UserCardUser) => {
    if (!canCreateUser) {
      return;
    }

    try {
      setLoading(true);
      await inviteUserMutation.mutateAsync(mapUserToFormValues(user));
      await queryClient.invalidateQueries({ queryKey: ['project-members'] });
      appToast.success('Invitation resent successfully.');
    } finally {
      setLoading(false);
    }
  };

  const editingUser =
    userList.find((user) => user.id === editingUserId) ?? null;
  const deletingUser =
    userList.find((user) => user.id === deletingUserId) ?? null;

  return (
    <div className="">
      <PermissionGuard
        permission="users.view_list"
        fallback={
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            You do not have permission to view users.
          </div>
        }
      >
        {membersQuery.isLoading ? (
          <UserCardsSkeleton />
        ) : userList.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {userList.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onEdit={
                  user.isInvitationAccepted && canEditUser
                    ? (selectedUser) => setEditingUserId(selectedUser.id)
                    : undefined
                }
                onDelete={
                  canDeleteUser
                    ? (selectedUser) => setDeletingUserId(selectedUser.id)
                    : undefined
                }
                onResendInvite={
                  !user.isInvitationAccepted && canCreateUser
                    ? handleResendInvite
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400">
              <UsersEmptyIcon />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              No users yet.
            </h2>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              Invite team members or clients to give them access to projects,
              tickets, and collaboration spaces.
            </p>
          </div>
        )}
      </PermissionGuard>

      <AddUserModal
        isOpen={addUserOpen && canCreateUser}
        onClose={() => setAddUserOpen(false)}
        onConfirm={handleCreateUser}
        projects={projects}
        roleOptions={roleOptions}
      />

      <AddUserModal
        isOpen={Boolean(editingUser) && canEditUser}
        onClose={() => setEditingUserId(null)}
        onConfirm={handleEditUser}
        mode="edit"
        initialValues={
          editingUser ? mapUserToFormValues(editingUser) : undefined
        }
        projects={projects}
        roleOptions={roleOptions}
      />

      <DeleteUserModal
        isOpen={Boolean(deletingUser) && canDeleteUser}
        onClose={() => setDeletingUserId(null)}
        onConfirm={handleDeleteUser}
        userName={deletingUser?.name}
      />
    </div>
  );
}

function getInviteUserPayload(
  values: AddUserFormValues,
  roleOptions: Array<{ id?: string; value: string }>,
) {
  return {
    email: values.email,
    ...getUpdateUserPayload({
      ...values,
      role:
        roleOptions.find((role) => role.value === values.role)?.id ??
        values.role,
    }),
  };
}

function getUpdateUserPayload(values: AddUserFormValues) {
  return {
    fullName: values.fullName,
    userType: values.userType === 'internal' ? 'INTERNAL' : 'EXTERNAL',
    roleKey: values.role,
    projectIds: values.projectAccess,
  };
}

async function fetchProjectMembers(projects: ProjectRecord[]) {
  const response = await fetch('/api/projects/members', {
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
      !Array.isArray(payload) ? payload?.message : 'Failed to fetch users.',
    );
  }

  return payload.map((member) => mapApiMemberToUserCard(member, projects));
}

type ApiProjectMember = {
  id: string;
  email: string;
  fullName: string;
  isInvitationAccepted: boolean;
  projects: Array<{
    id: string;
    name: string;
  }>;
  userRoles?: Array<{
    id: string;
    role?: {
      id: string;
      key?: string;
      name: string;
      normalizedName?: string;
    };
  }>;
};

type ApiRoleOption = {
  id?: string;
  key?: string;
  name?: string;
  normalizedName?: string;
};

async function fetchRoleOptions() {
  const response = await fetch('/api/roles', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiRoleOption[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload) ? payload?.message : 'Failed to fetch roles.',
    );
  }

  return payload
    .filter(
      (role) => normalizeRoleName(role.normalizedName ?? role.name) !== 'SUPER_ADMIN',
    )
    .map((role) => ({
      id: role.id,
      label: role.name ?? 'Unknown Role',
      value: getRoleKey(role),
    }))
    .filter((role) => role.value);
}

function mapApiMemberToUserCard(
  member: ApiProjectMember,
  projects: ProjectRecord[],
): UserCardUser {
  const nameParts = member.fullName.split(' ').filter(Boolean);
  const initials = nameParts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const mappedProjects = member.projects.map((project) => {
    const matchedProject = projects.find((item) => item.id === project.id);

    return {
      id: project.id,
      initials: getProjectInitials(project.name),
      name: project.name,
      colorHex: matchedProject?.colorHex ?? '#6172F3',
    };
  });

  return {
    id: member.id,
    name: member.fullName,
    email: member.email,
    isInvitationAccepted: member.isInvitationAccepted,
    initials: initials || 'NU',
    accentColor: mappedProjects[0]?.colorHex ?? '#875BF7',
    roles: mapApiMemberRoles(member.userRoles),
    projects: mappedProjects,
  };
}

function mapApiMemberRoles(
  userRoles: ApiProjectMember['userRoles'],
): UserCardUser['roles'] {
  if (!Array.isArray(userRoles)) {
    return [];
  }

  return userRoles.flatMap((userRole) => {
    const roleName = userRole.role?.name?.trim();

    if (!roleName) {
      return [];
    }

    return [
      {
        label: roleName,
        value: getRoleKey(userRole.role),
        tone: getRoleTone(roleName),
      },
    ];
  });
}

function getRoleKey(role?: {
  key?: string;
  normalizedName?: string;
  name?: string;
}) {
  return (
    role?.key?.trim() ||
    role?.normalizedName?.trim() ||
    normalizeRoleName(role?.name)
  );
}

function getRoleTone(roleName: string): UserCardUser['roles'][number]['tone'] {
  const normalizedRoleName = roleName.trim().toLowerCase();

  if (normalizedRoleName.includes('admin')) {
    return 'orange';
  }

  if (normalizedRoleName.includes('external') || normalizedRoleName.includes('viewer')) {
    return 'teal';
  }

  if (normalizedRoleName.includes('internal')) {
    return 'blue';
  }

  return 'purple';
}

function normalizeRoleName(roleName?: string) {
  return roleName?.trim().toUpperCase().replace(/[\s-]+/g, '_') ?? '';
}

function getProjectInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function mapUserToFormValues(user: UserCardUser): AddUserFormValues {
  const hasExternalRole = user.roles.some((role) => role.label === 'External');
  const role = user.roles.find(
    (role) => role.label !== 'Internal' && role.label !== 'External',
  );

  return {
    fullName: user.name,
    email: user.email,
    userType: hasExternalRole ? 'external' : 'internal',
    role: role?.value ?? '',
    projectAccess: user.projects.map((project) => project.id),
  };
}

function UsersEmptyIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 21V19C16 17.1362 14.2091 15.5 12 15.5H7C4.79086 15.5 3 17.1362 3 19V21M21 21V19.5C21 18.0876 19.9704 16.8585 18.5 16.402M15.5 3.40198C16.9704 3.85853 18 5.08765 18 6.5C18 7.91235 16.9704 9.14147 15.5 9.59802M13.5 6.5C13.5 8.15685 12.1569 9.5 10.5 9.5C8.84315 9.5 7.5 8.15685 7.5 6.5C7.5 4.84315 8.84315 3.5 10.5 3.5C12.1569 3.5 13.5 4.84315 13.5 6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
