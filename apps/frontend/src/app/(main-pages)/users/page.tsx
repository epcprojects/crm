'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import type { NotificationItem } from '@harperhelp/interfaces';
import type { ProjectNameRecord } from '../projects/projects.data';
import { useProjectNamesQuery } from '../projects/projects.queries';
import {
  PermissionGuard,
  usePermissions,
} from '../../providers/PermissionProvider';
import { useAppLoader } from '../../providers/AppLoaderProvider';
import { eventEmitter } from '../../../lib/event-emitter';
import DashboardSummaryBanner from '../../../components/ui/DashboardSummaryBanner';
import {
  CloseIcon,
  FiltersIcon,
  PlusIcon,
  SearchIcon,
} from '../../../../public/icons';
import ThemeButton from '../../../components/ui/ThemeButton';
import EmptyState from '../../../components/EmptyState';
import Dropdown from '../../../components/ui/ThemeDropDown';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';

const USERS_INVITATION_STATUS_QUERY_PARAM = 'invitationStatus';
const USERS_PROJECT_QUERY_PARAM = 'project';
const USERS_ROLE_QUERY_PARAM = 'role';
const MEMBER_NOTIFICATION_ENTITY_TYPE = 'member';
const MEMBER_JOINED_NOTIFICATION_TYPE = 'member_joined';

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setHeaderActionOverride, setHeaderCountOverride } =
    useDashboardHeaderAction();
  const queryClient = useQueryClient();
  const { setLoading } = useAppLoader();
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const { hasPermission } = usePermissions();
  const canViewUsers = hasPermission('users.view_list');
  const canCreateUser = hasPermission('users.create');
  const canEditUser = hasPermission('users.edit');
  const canDeleteUser = hasPermission('users.delete');
  const selectedInvitationStatus = getUsersInvitationStatusValue(
    searchParams.get(USERS_INVITATION_STATUS_QUERY_PARAM),
  );
  const selectedProjectIds = getUsersProjectFilterValues(
    searchParams.getAll(USERS_PROJECT_QUERY_PARAM),
    searchParams.get(USERS_PROJECT_QUERY_PARAM),
  );
  const selectedProjectIdsKey = selectedProjectIds.join(',');
  const selectedRoleId = getUsersFilterValue(
    searchParams.get(USERS_ROLE_QUERY_PARAM),
  );
  const projectsQuery = useProjectNamesQuery();
  const projects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );

  const membersQuery = useQuery({
    queryKey: [
      'project-members',
      searchValue.trim(),
      selectedInvitationStatus,
      selectedProjectIdsKey,
      selectedRoleId,
    ],

    queryFn: () =>
      fetchProjectMembers(projects, {
        search: searchValue.trim() || undefined,

        isInvitationAccepted:
          selectedInvitationStatus === 'all'
            ? undefined
            : selectedInvitationStatus === 'accepted',

        projectIds: selectedProjectIds.length ? selectedProjectIds : undefined,

        roleId: selectedRoleId === 'all' ? undefined : selectedRoleId,
      }),

    enabled: projectsQuery.isSuccess && canViewUsers,
  });

  const rolesQuery = useQuery({
    queryKey: ['roles', 'user-invite-options'],
    queryFn: fetchRoleOptions,
    enabled: canViewUsers || canCreateUser || canEditUser,
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

  const userList = useMemo(
    () => membersQuery.data?.items ?? [],
    [membersQuery.data],
  );

  const isUsersLoading =
    projectsQuery.isPending ||
    (projectsQuery.isSuccess && membersQuery.isPending);

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
    setHeaderCountOverride(
      canViewUsers ? (membersQuery.data?.summary.totalUsers ?? 0) : null,
    );
    return () => {
      setHeaderCountOverride(null);
    };
  }, [
    canViewUsers,
    membersQuery.data?.summary.totalUsers,
    setHeaderCountOverride,
  ]);

  useEffect(() => {
    const handleNotificationNew = (payload: NotificationItem) => {
      if (
        payload.entityType !== MEMBER_NOTIFICATION_ENTITY_TYPE ||
        payload.type !== MEMBER_JOINED_NOTIFICATION_TYPE
      ) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: ['project-members'] });
    };

    eventEmitter.on('notification:new', handleNotificationNew);

    return () => {
      eventEmitter.off('notification:new', handleNotificationNew);
    };
  }, [queryClient]);

  const updateUsersPageFilters = ({
    invitationStatus,
    project,
    roleId,
  }: {
    invitationStatus?: 'all' | 'accepted' | 'pending';
    project?: string[];
    roleId?: string;
  }) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    const nextInvitationStatus = invitationStatus ?? selectedInvitationStatus;
    const nextProjectIds = project ?? selectedProjectIds;
    const nextRoleId = roleId ?? selectedRoleId;

    if (nextInvitationStatus === 'all') {
      nextSearchParams.delete(USERS_INVITATION_STATUS_QUERY_PARAM);
    } else {
      nextSearchParams.set(
        USERS_INVITATION_STATUS_QUERY_PARAM,
        nextInvitationStatus,
      );
    }

    nextSearchParams.delete(USERS_PROJECT_QUERY_PARAM);
    nextProjectIds.forEach((projectId) => {
      nextSearchParams.append(USERS_PROJECT_QUERY_PARAM, projectId);
    });

    if (nextRoleId === 'all') {
      nextSearchParams.delete(USERS_ROLE_QUERY_PARAM);
    } else {
      nextSearchParams.set(USERS_ROLE_QUERY_PARAM, nextRoleId);
    }

    const nextQueryString = nextSearchParams.toString();
    const currentQueryString = searchParams.toString();

    if (nextQueryString === currentQueryString) {
      return;
    }

    router.push(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, {
      scroll: false,
    });
  };

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

  const projectFilterOptions = useMemo(
    () => [
      ...projects.map((project) => ({
        label: project.name,
        value: project.id,
      })),
    ],
    [projects],
  );

  const invitationFilterOptions = useMemo(
    () => [
      {
        label: 'All Invitations',
        value: 'all',
      },
      {
        label: 'Accepted',
        value: 'accepted',
      },
      {
        label: 'Pending',
        value: 'pending',
      },
    ],
    [],
  );

  const roleFilterOptions = useMemo(
    () => [
      {
        label: 'All Roles',
        value: 'all',
      },
      ...roleOptions
        .filter((role) => role.id)
        .map((role) => ({
          label: role.label,
          value: role.id as string,
        })),
    ],
    [roleOptions],
  );

  const memberSummary = membersQuery.data?.summary;

  const userStats = useMemo(
    () => [
      {
        title: 'Total Users',
        count: memberSummary?.totalUsers ?? 0,
        color: '#F04438',
      },
      {
        title: 'Active Users',
        count: memberSummary?.activeUsers ?? 0,
        color: '#F79009',
      },
      {
        title: 'Pending Invites',
        count: memberSummary?.pendingInvites ?? 0,
        color: '#17B26A',
      },
      {
        title: 'External Users',
        count: memberSummary?.externalUsers ?? 0,
        color: '#7A5AF8',
      },
    ],
    [memberSummary],
  );

  const hasSearch = Boolean(searchValue.trim());

  const hasFilters =
    selectedInvitationStatus !== 'all' ||
    selectedRoleId !== 'all' ||
    selectedProjectIds.length > 0;

  const hasSearchOrFilters = hasSearch || hasFilters;
  const clearUsersFilters = () => {
    setSearchValue('');
    updateUsersPageFilters({
      invitationStatus: 'all',
      roleId: 'all',
      project: [],
    });
  };

  return (
    <>
      <div className="relative z-100 h-full overflow-hidden py-4 xl:py-5 xl:pr-5 px-4 xl:px-0 pt-2 pb-0 xl:h-dvh">
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain scrollbar-hide xl:overflow-hidden xl:rounded-2xl xl:border xl:border-white xl:bg-white/40 xl:p-3">
          <div className="shrink-0">
            <DashboardSummaryBanner
              imageSrc="/images/UsersIcon.svg"
              imageAlt="Users"
              title="Users"
              stats={userStats}
            />
          </div>

          <div className="flex h-auto min-h-0 flex-none flex-col gap-4 overflow-visible rounded-xl bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5 xl:h-full xl:flex-1 xl:overflow-hidden">
            <PermissionGuard
              permission="users.view_list"
              fallback={
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                  You do not have permission to view users.
                </div>
              }
            >
              <div className="flex h-auto min-h-0 flex-none flex-col gap-4 overflow-visible xl:h-full xl:flex-1 xl:overflow-hidden">
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-2">
                    <div className="w-full">
                      <div className=" w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 md:max-w-100 md:min-w-80">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0">
                            <SearchIcon fill="#374151" />
                          </span>

                          <input
                            type="text"
                            value={searchValue}
                            onChange={(event) =>
                              setSearchValue(event.target.value)
                            }
                            placeholder="Search"
                            className="sm:min-w-0 sm:flex-1 w-full bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
                          />

                          <button
                            type="button"
                            onClick={() => setSearchValue('')}
                            disabled={!searchValue}
                            tabIndex={searchValue ? 0 : -1}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                              searchValue
                                ? 'visible hover:bg-gray-100'
                                : 'pointer-events-none invisible'
                            }`}
                            aria-label="Clear search"
                          >
                            <CloseIcon fill={'white'} width="15" height="15" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <Popover as="div" className="relative xl:hidden">
                      {({ open }) => (
                        <>
                          <PopoverButton
                            className={`flex h-10 shrink-0 items-center justify-center rounded-lg border px-3 text-sm font-medium outline-none ${
                              open
                                ? 'border-primary  text-white'
                                : 'border-gray-200 bg-white text-gray-700'
                            }`}
                            aria-label="Open filters"
                          >
                            <FiltersIcon />
                          </PopoverButton>

                          <PopoverPanel
                            anchor="bottom end"
                            transition
                            className="z-100 mt-2 flex w-56 origin-top-right flex-col gap-3 overflow-visible!  rounded-xl border border-gray-200 bg-white p-3 shadow-[0_14px_44px_rgb(0_0_0/0.14)] outline-none transition duration-150 data-closed:-translate-y-2 data-closed:scale-95 data-closed:opacity-0"
                          >
                            <div className="relative w-full overflow-visible">
                              <Dropdown
                                options={invitationFilterOptions}
                                value={selectedInvitationStatus}
                                onChange={(value) =>
                                  updateUsersPageFilters({
                                    invitationStatus: value as
                                      | 'all'
                                      | 'accepted'
                                      | 'pending',
                                  })
                                }
                                placeholder="All Invitations"
                                maxMenuHeight={150}
                              />
                            </div>

                            <div className="relative w-full overflow-visible">
                              <Dropdown
                                options={roleFilterOptions}
                                value={selectedRoleId}
                                onChange={(value) =>
                                  updateUsersPageFilters({ roleId: value })
                                }
                                placeholder="All Roles"
                                maxMenuHeight={150}
                                showSearch={true}
                              />
                            </div>

                            <div className="relative w-full overflow-visible">
                              <Dropdown
                                options={projectFilterOptions}
                                isMulti
                                value={selectedProjectIds}
                                onChange={(value) =>
                                  updateUsersPageFilters({ project: value })
                                }
                                placeholder="All Projects"
                                maxMenuHeight={150}
                                showSearch={true}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={clearUsersFilters}
                              disabled={!hasSearchOrFilters}
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Clear Filters
                            </button>
                          </PopoverPanel>
                        </>
                      )}
                    </Popover>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-full hidden xl:block xl:w-55">
                      <Dropdown
                        options={invitationFilterOptions}
                        value={selectedInvitationStatus}
                        onChange={(value) =>
                          updateUsersPageFilters({
                            invitationStatus: value as
                              | 'all'
                              | 'accepted'
                              | 'pending',
                          })
                        }
                        placeholder="All Invitations"
                      />
                    </div>

                    <div className="w-full hidden xl:block xl:w-55">
                      <Dropdown
                        options={roleFilterOptions}
                        value={selectedRoleId}
                        onChange={(value) =>
                          updateUsersPageFilters({ roleId: value })
                        }
                        showSearch={true}
                        placeholder="All Roles"
                      />
                    </div>

                    <div className="w-full hidden xl:block xl:w-55">
                      <Dropdown
                        options={projectFilterOptions}
                        isMulti
                        value={selectedProjectIds}
                        onChange={(value) =>
                          updateUsersPageFilters({ project: value })
                        }
                        showSearch={true}
                        placeholder="All Projects"
                      />
                    </div>
                    <ThemeButton
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={clearUsersFilters}
                      disabled={!hasSearchOrFilters}
                      className="hidden h-10 shrink-0 disabled:cursor-not-allowed disabled:opacity-50 xl:inline-flex"
                    >
                      Clear Filters
                    </ThemeButton>

                    {canCreateUser ? (
                      <ThemeButton
                        className="shrink-0 rounded-full hidden xl:flex"
                        variant="primaryGradient"
                        icon={<PlusIcon width="20" height="20" />}
                        onClick={() => setAddUserOpen(true)}
                      >
                        Add User
                      </ThemeButton>
                    ) : null}
                  </div>
                </div>

                <div className="flex-none overflow-visible scrollbar-hide xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain">
                  {isUsersLoading ? (
                    <UserCardsSkeleton />
                  ) : userList.length ? (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {userList.map((user) => (
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
                        hasSearchOrFilters
                          ? '/images/UsersSearchIcon.svg'
                          : '/images/UsersEmptyIcon.svg'
                      }
                      imageAlt={hasSearch ? 'No search results' : 'No users'}
                      title={
                        hasSearchOrFilters ? 'No Results Found' : 'No Users Yet'
                      }
                      description={
                        hasSearch
                          ? "We couldn't find matching results for your search. Try a different keyword or clear the filters."
                          : 'Add your first team member to get started.'
                      }
                      buttonLabel={
                        hasSearchOrFilters ? 'Clear Search' : 'Add User'
                      }
                      buttonIcon={
                        hasSearch ? (
                          <SearchIcon fill="#3889FE" />
                        ) : (
                          <PlusIcon fill="#3889FE" width="20" height="20" />
                        )
                      }
                    />
                  )}
                </div>
              </div>
            </PermissionGuard>
          </div>
        </div>
        {canCreateUser ? (
          <button
            type="button"
            onClick={() => setAddUserOpen(true)}
            aria-label="Add user"
            className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-l from-royal-blue to-crystal-blue text-white shadow-[0_10px_30px_rgb(48_79_253/0.35)] transition hover:opacity-90 active:scale-95 xl:hidden"
          >
            <PlusIcon fill="#FFFFFF" width="24" height="24" />
          </button>
        ) : null}
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
    email: values.email.trim().toLowerCase(),
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
type ProjectMembersQuery = {
  search?: string;
  isInvitationAccepted?: boolean;
  projectIds?: string[];
  roleId?: string;
};

type MemberSummary = {
  totalUsers: number;
  activeUsers: number;
  pendingInvites: number;
  externalUsers: number;
};

type ProjectMembersResponse = {
  items: UserCardUser[];
  summary: MemberSummary;
};

async function fetchProjectMembers(
  projects: ProjectNameRecord[],
  query: ProjectMembersQuery,
): Promise<ProjectMembersResponse> {
  const searchParams = new URLSearchParams();

  if (query.search?.trim()) {
    searchParams.set('search', query.search.trim());
  }

  if (query.isInvitationAccepted !== undefined) {
    searchParams.set(
      'isInvitationAccepted',
      String(query.isInvitationAccepted),
    );
  }

  query.projectIds?.forEach((projectId) => {
    if (projectId) {
      searchParams.append('projectIds', projectId);
    }
  });

  if (query.roleId) {
    searchParams.set('roleId', query.roleId);
  }

  const queryString = searchParams.toString();

  const response = await fetch(
    `/api/projects/members${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | {
        items?: ApiProjectMember[];
        summary?: Partial<MemberSummary>;
      }
    | { message?: string }
    | null;

  if (
    !response.ok ||
    !payload ||
    typeof payload !== 'object' ||
    !('items' in payload) ||
    !Array.isArray(payload.items)
  ) {
    throw new Error(
      payload && 'message' in payload
        ? payload.message || 'Failed to fetch users.'
        : 'Failed to fetch users.',
    );
  }

  return {
    items: payload.items.map((member) =>
      mapApiMemberToUserCard(member, projects),
    ),

    summary: {
      totalUsers: payload.summary?.totalUsers ?? 0,
      activeUsers: payload.summary?.activeUsers ?? 0,
      pendingInvites: payload.summary?.pendingInvites ?? 0,
      externalUsers: payload.summary?.externalUsers ?? 0,
    },
  };
}

type ApiProjectMember = {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  isInvitationAccepted: boolean;
  userType: 'INTERNAL' | 'EXTERNAL' | string;
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
  projects: ProjectNameRecord[],
): UserCardUser {
  const nameParts = member.fullName.split(' ').filter(Boolean);
  const initials = nameParts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const mappedProjects = member.projects.map((project) => {
    return {
      id: project.id,
      initials: getProjectInitials(project.name),
      name: project.name,
      colorHex: '#6172F3',
    };
  });

  return {
    id: member.id,
    name: member.fullName,
    email: member.email,
    userType: member.userType,
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

function getUsersInvitationStatusValue(
  value: string | null,
): 'all' | 'accepted' | 'pending' {
  if (value === 'accepted' || value === 'pending') {
    return value;
  }

  return 'all';
}

function getUsersFilterValue(value: string | null) {
  if (!value || !value.trim()) {
    return 'all';
  }

  return value;
}

function getUsersProjectFilterValues(
  values: string[],
  fallbackValue: string | null,
) {
  const sourceValues =
    values.length > 0 ? values : fallbackValue ? [fallbackValue] : [];

  return Array.from(
    new Set(
      sourceValues
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter((value) => value && value !== 'all'),
    ),
  );
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
  const normalizedUserType = user.userType?.trim().toUpperCase();
  const hasExternalRole = user.roles.some((role) => {
    const normalizedLabel = role.label.trim().toUpperCase();
    const normalizedValue = role.value?.trim().toUpperCase();

    return (
      normalizedLabel.includes('EXTERNAL') ||
      normalizedValue?.includes('EXTERNAL')
    );
  });
  const role = user.roles.find(
    (role) => role.label !== 'Internal' && role.label !== 'External',
  );

  return {
    fullName: user.name,
    email: user.email,
    userType:
      normalizedUserType === 'EXTERNAL'
        ? 'external'
        : normalizedUserType === 'INTERNAL'
          ? 'internal'
          : hasExternalRole
            ? 'external'
            : 'internal',
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
