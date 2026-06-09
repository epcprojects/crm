'use client';

import { useEffect, useState } from 'react';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import AddUserModal, {
  type AddUserFormValues,
} from '../../../components/modals/AddUserModal';
import DeleteUserModal from '../../../components/modals/DeleteUserModal';
import { appToast } from '../../../components/toast/AppToast';
import UserCard, {
  type UserCardUser,
} from '../../../components/users/UserCard';
import { usersData } from './users.data';
import { baseProjects } from '../projects/projects.data';

export default function Page() {
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userList, setUserList] = useState(usersData);

  useEffect(() => {
    setHeaderActionOverride(() => setAddUserOpen(true));

    return () => {
      setHeaderActionOverride(null);
    };
  }, [setHeaderActionOverride]);

  const handleCreateUser = async (values: AddUserFormValues) => {
    const nextUser = mapFormValuesToUser(values);
    setUserList((currentUsers) => [nextUser, ...currentUsers]);
    appToast.success('User created successfully.');
  };

  const handleEditUser = async (values: AddUserFormValues) => {
    if (!editingUserId) return;

    const nextUser = mapFormValuesToUser(values, editingUserId);

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
      />

      <AddUserModal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUserId(null)}
        onConfirm={handleEditUser}
        mode="edit"
        initialValues={
          editingUser ? mapUserToFormValues(editingUser) : undefined
        }
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
    projects: baseProjects
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
