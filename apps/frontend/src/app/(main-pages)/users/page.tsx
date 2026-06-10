'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import AddUserModal, {
  type AddUserFormValues,
} from '../../../components/modals/AddUserModal';
import DeleteUserModal from '../../../components/modals/DeleteUserModal';
import { appToast } from '../../../components/toast/AppToast';
import UserCard, {
  type UserCardUser,
} from '../../../components/users/UserCard';
import type { ProjectRecord } from '../projects/projects.data';
import { useProjectsQuery } from '../projects/projects.queries';
import { usersData } from './users.data';

export default function Page() {
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userList, setUserList] = useState(usersData);
  const projectsQuery = useProjectsQuery();
  const projects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );
  const inviteUserMutation = useMutation({
    mutationFn: async (values: AddUserFormValues) => {
      const response = await fetch('/api/users/invite/project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          fullName: values.fullName,
          userType: values.userType === 'internal' ? 'INTERNAL' : 'EXTERNAL',
          roleKey:
            values.userType === 'external'
              ? 'VIEWER'
              : values.role === 'admin'
                ? 'PROJECT_ADMIN'
                : values.role === 'pm'
                  ? 'PROJECT_MANAGER'
                  : 'DEVELOPER',
          projectIds: values.projectAccess,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to invite user.');
      }

      return payload;
    },
  });

  useEffect(() => {
    setHeaderActionOverride(() => setAddUserOpen(true));

    return () => {
      setHeaderActionOverride(null);
    };
  }, [setHeaderActionOverride]);

  const handleCreateUser = async (values: AddUserFormValues) => {
    await inviteUserMutation.mutateAsync(values);
    const nextUser = mapFormValuesToUser(values, projects);
    setUserList((currentUsers) => [nextUser, ...currentUsers]);
    appToast.success('User invited successfully.');
  };

  const handleEditUser = async (values: AddUserFormValues) => {
    if (!editingUserId) return;

    const nextUser = mapFormValuesToUser(values, projects, editingUserId);

    setUserList((currentUsers) =>
      currentUsers.map((user) => (user.id === editingUserId ? nextUser : user)),
    );
    setEditingUserId(null);
    appToast.success('User updated successfully.');
  };

  const handleDeleteUser = async () => {
    if (!deletingUserId) return;

    setUserList((currentUsers) =>
      currentUsers.filter((user) => user.id !== deletingUserId),
    );
    setDeletingUserId(null);
    appToast.success('User deleted successfully.');
  };

  const editingUser =
    userList.find((user) => user.id === editingUserId) ?? null;
  const deletingUser =
    userList.find((user) => user.id === deletingUserId) ?? null;

  return (
    <div className="">
      {userList.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {userList.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={(selectedUser) => setEditingUserId(selectedUser.id)}
              onDelete={(selectedUser) => setDeletingUserId(selectedUser.id)}
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

      <AddUserModal
        isOpen={addUserOpen}
        onClose={() => setAddUserOpen(false)}
        onConfirm={handleCreateUser}
        projects={projects}
      />

      <AddUserModal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUserId(null)}
        onConfirm={handleEditUser}
        mode="edit"
        initialValues={
          editingUser ? mapUserToFormValues(editingUser) : undefined
        }
        projects={projects}
      />

      <DeleteUserModal
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUserId(null)}
        onConfirm={handleDeleteUser}
        userName={deletingUser?.name}
      />
    </div>
  );
}

function mapFormValuesToUser(
  values: AddUserFormValues,
  projects: ProjectRecord[],
  userId?: string,
): UserCardUser {
  const nameParts = values.fullName.split(' ').filter(Boolean);
  const initials = nameParts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return {
    id: userId ?? values.email.toLowerCase(),
    name: values.fullName,
    email: values.email,
    initials: initials || 'NU',
    accentColor: values.userType === 'internal' ? '#875BF7' : '#14B8A6',
    roles:
      values.userType === 'internal'
        ? [
            { label: 'Internal', tone: 'blue' },
            {
              label:
                values.role === 'admin'
                  ? 'Admin'
                  : values.role === 'pm'
                    ? 'Project Manager'
                    : 'Developer',
              tone: values.role === 'admin' ? 'orange' : 'purple',
            },
          ]
        : [{ label: 'External', tone: 'teal' }],
    projects: projects
      .filter((project) => values.projectAccess.includes(project.id))
      .map((project) => ({
        id: project.id,
        initials: project.initials,
        name: project.name,
        colorHex: project.colorHex,
      })),
  };
}

function mapUserToFormValues(user: UserCardUser): AddUserFormValues {
  const hasExternalRole = user.roles.some((role) => role.label === 'External');
  const roleLabel = user.roles.find(
    (role) => role.label !== 'Internal' && role.label !== 'External',
  )?.label;

  return {
    fullName: user.name,
    email: user.email,
    userType: hasExternalRole ? 'external' : 'internal',
    role:
      roleLabel === 'Admin'
        ? 'admin'
        : roleLabel === 'Project Manager'
          ? 'pm'
          : roleLabel === 'Developer'
            ? 'developer'
            : 'admin',
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
