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
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
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
