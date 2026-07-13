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
import DashboardSummaryBanner from '../../../components/ui/DashboardSummaryBanner';
import { FiltersIcon, PlusIcon, SearchIcon } from '../../../../public/icons';
import ThemeButton from '../../../components/ui/ThemeButton';
import EmptyState from '../../../components/EmptyState';

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
      await inviteUserMutation.mutateAsync(
        mapUserToFormValues(user, roleOptions),
      );
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
  const [searchValue, setSearchValue] = useState('');
  const filteredUserList = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    if (!search) {
      return userList;
    }

    return userList.filter((user) => {
      const searchableValues = [
        user.name,
        user.email,
        ...user.roles.map((role) => role.label),
        ...user.projects.map((project) => project.name),
      ];

      return searchableValues.some((value) =>
        value.toLowerCase().includes(search),
      );
    });
  }, [searchValue, userList]);

  const userStats = useMemo(
    () => [
      {
        title: 'Total Users',
        count: userList.length,
        color: '#F04438',
      },
      {
        title: 'Active Users',
        count: userList.filter((user) => user.isInvitationAccepted).length,
        color: '#F79009',
      },
      {
        title: 'Pending Invites',
        count: userList.filter((user) => !user.isInvitationAccepted).length,
        color: '#17B26A',
      },
      {
        title: 'External Users',
        count: userList.filter((user) =>
          user.roles.some((role) =>
            normalizeRoleName(role.label).includes('EXTERNAL'),
          ),
        ).length,
        color: '#7A5AF8',
      },
    ],
    [userList],
  );
  const hasSearch = Boolean(searchValue.trim());
  return (
    <>
      <div className="relative z-100 h-[calc(100dvh-4.5rem)] overflow-hidden py-5 pr-5 sm:h-dvh">
        <div className="flex h-full min-h-0 flex-col gap-3 rounded-4xl border border-white bg-white/40 p-3">
          <DashboardSummaryBanner
            imageSrc="/images/UsersIcon.svg"
            imageAlt="Users"
            title="Users"
            stats={userStats}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-[20px] bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5">
            <PermissionGuard
              permission="users.view_list"
              fallback={
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                  You do not have permission to view users.
                </div>
              }
            >
              <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 sm:max-w-50">
                    <div className="flex items-center gap-2">
                      <SearchIcon fill="#374151" />

                      <input
                        type="text"
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Search"
                        className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="flex items-center gap-0.75 rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-2"
                    >
                      <FiltersIcon />

                      <span className="text-xs font-medium text-black-olive">
                        Filter
                      </span>
                    </button>

                    {canCreateUser ? (
                      <ThemeButton
                        className="shrink-0 rounded-full"
                        variant="primaryGradient"
                        icon={
                          <PlusIcon fill="#3889FE" width="20" height="20" />
                        }
                        onClick={() => setAddUserOpen(true)}
                      >
                        Add User
                      </ThemeButton>
                    ) : null}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {membersQuery.isLoading ? (
                    <UserCardsSkeleton />
                  ) : filteredUserList.length ? (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {filteredUserList.map((user) => (
                        <UserCard
                          key={user.id}
                          user={user}
                          onEdit={
                            user.isInvitationAccepted && canEditUser
                              ? (selectedUser) =>
                                  setEditingUserId(selectedUser.id)
                              : undefined
                          }
                          onDelete={
                            canDeleteUser
                              ? (selectedUser) =>
                                  setDeletingUserId(selectedUser.id)
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
                    <EmptyState
                      imageUrl={
                        hasSearch
                          ? '/images/UsersSearchIcon.svg'
                          : '/images/UsersEmptyIcon.svg'
                      }
                      imageAlt={hasSearch ? 'No search results' : 'No users'}
                      title={hasSearch ? 'No Results Found' : 'No Users Yet'}
                      description={
                        hasSearch
                          ? "We couldn't find matching results for your search. Try a different keyword or clear the filters."
                          : 'Add your first team member to get started.'
                      }
                      buttonLabel={hasSearch ? 'Clear Search' : 'Add User'}
                      buttonIcon={
                        hasSearch ? (
                          <SearchIcon fill="#3889FE" />
                        ) : (
                          <PlusIcon fill="#3889FE" width="20" height="20" />
                        )
                      }
                      onButtonClick={
                        hasSearch
                          ? () => setSearchValue('')
                          : canCreateUser
                            ? () => setAddUserOpen(true)
                            : undefined
                      }
                    />
                  )}
                </div>
              </div>
            </PermissionGuard>
          </div>
        </div>
      </div>

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
          editingUser
            ? mapUserToFormValues(editingUser, roleOptions)
            : undefined
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
    </>
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
      (role) =>
        normalizeRoleName(role.normalizedName ?? role.name) !== 'SUPER_ADMIN',
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
        id: userRole.role?.id,
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

  if (
    normalizedRoleName.includes('external') ||
    normalizedRoleName.includes('viewer')
  ) {
    return 'teal';
  }

  if (normalizedRoleName.includes('internal')) {
    return 'blue';
  }

  return 'purple';
}

function normalizeRoleName(roleName?: string) {
  return (
    roleName
      ?.trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_') ?? ''
  );
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

function mapUserToFormValues(
  user: UserCardUser,
  roleOptions: Array<{ id?: string; label: string; value: string }> = [],
): AddUserFormValues {
  const hasExternalRole = user.roles.some((role) => role.label === 'External');
  const role = user.roles.find(
    (role) => role.label !== 'Internal' && role.label !== 'External',
  );

  return {
    fullName: user.name,
    email: user.email,
    userType: hasExternalRole ? 'external' : 'internal',
    role: resolveUserRoleValue(role, roleOptions),
    projectAccess: user.projects.map((project) => project.id),
  };
}

function resolveUserRoleValue(
  role: UserCardUser['roles'][number] | undefined,
  roleOptions: Array<{ id?: string; label: string; value: string }>,
) {
  if (!role) {
    return '';
  }

  const normalizedRoleLabel = normalizeRoleName(role.label);
  const normalizedRoleValue = normalizeRoleName(role.value);
  const matchedOption = roleOptions.find(
    (option) =>
      option.value === role.value ||
      option.id === role.id ||
      normalizeRoleName(option.label) === normalizedRoleLabel ||
      normalizeRoleName(option.value) === normalizedRoleValue,
  );

  return matchedOption?.value ?? role.value ?? '';
}
