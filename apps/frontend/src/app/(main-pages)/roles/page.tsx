'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import AddRoleModal, {
  type AddRoleFormValues,
} from '../../../components/modals/AddRoleModal';
import DeleteRoleModal from '../../../components/modals/DeleteRoleModal';
import RolesTable, {
  type RoleRecord,
} from '../../../components/tables/RolesTable';
import { SearchIcon } from '../../../../public/icons';
import { appToast } from '../../../components/toast/AppToast';

export default function RolesPage() {
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [roleList, setRoleList] = useState<RoleRecord[]>([]);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    setHeaderActionOverride(() => setAddRoleOpen(true));

    return () => {
      setHeaderActionOverride(null);
    };
  }, [setHeaderActionOverride]);

  const filteredRoles = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return roleList.filter((role) => {
      if (!normalizedSearch) return true;

      return (
        role.id.toLowerCase().includes(normalizedSearch) ||
        role.name.toLowerCase().includes(normalizedSearch) ||
        role.type.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [roleList, searchValue]);

  const editingRole =
    roleList.find((role) => role.id === editingRoleId) ?? null;
  const deletingRole =
    roleList.find((role) => role.id === deletingRoleId) ?? null;

  const handleCreateRole = async (values: AddRoleFormValues) => {
    setRoleList((currentRoles) => [
      {
        id: `r${currentRoles.length + 1}`,
        name: values.name,
        type: values.type,
        usersCount: 0,
        projectsCount: 0,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
      ...currentRoles,
    ]);
    appToast.success('Role created successfully.');
  };

  const handleEditRole = async (values: AddRoleFormValues) => {
    if (!editingRoleId) return;

    setRoleList((currentRoles) =>
      currentRoles.map((role) =>
        role.id === editingRoleId
          ? {
              ...role,
              name: values.name,
              type: values.type,
              updatedAt: new Date().toISOString().slice(0, 10),
            }
          : role,
      ),
    );
    setEditingRoleId(null);
    appToast.success('Role updated successfully.');
  };

  const handleDeleteRole = async () => {
    if (!deletingRoleId) return;

    setRoleList((currentRoles) =>
      currentRoles.filter((role) => role.id !== deletingRoleId),
    );
    setDeletingRoleId(null);
    appToast.success('Role deleted successfully.');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl md:flex-row md:items-center md:justify-between">
        <div className="relative flex w-full items-center md:max-w-xs">
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search..."
            className="h-10.5 w-full rounded-lg border border-gray-200 bg-white ps-7 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          <span className="absolute start-2">
            <SearchIcon />
          </span>
        </div>
      </div>

      {roleList.length ? (
        <RolesTable
          roles={filteredRoles}
          initialPageSize={10}
          pageSizeOptions={[10, 20, 30]}
          onEdit={(role) => setEditingRoleId(role.id)}
          onDelete={(role) => setDeletingRoleId(role.id)}
        />
      ) : (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400">
            <RolesEmptyIcon />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            No roles yet.
          </h2>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            Create roles to organize access levels for internal team members and
            external users.
          </p>
        </div>
      )}

      <AddRoleModal
        isOpen={addRoleOpen}
        onClose={() => setAddRoleOpen(false)}
        onConfirm={handleCreateRole}
      />

      <AddRoleModal
        isOpen={Boolean(editingRole)}
        onClose={() => setEditingRoleId(null)}
        onConfirm={handleEditRole}
        mode="edit"
        initialValues={
          editingRole
            ? {
                name: editingRole.name,
                type: editingRole.type,
              }
            : undefined
        }
      />

      <DeleteRoleModal
        isOpen={Boolean(deletingRole)}
        onClose={() => setDeletingRoleId(null)}
        onConfirm={handleDeleteRole}
        roleName={deletingRole?.name}
      />
    </div>
  );
}

function RolesEmptyIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="8"
        cy="8"
        r="2.75"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="16"
        cy="9"
        r="2.25"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3.75 18C3.75 15.9289 5.42893 14.25 7.5 14.25H8.5C10.5711 14.25 12.25 15.9289 12.25 18V18.25H3.75V18Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.25 18.25V17.75C13.25 16.2312 14.4812 15 16 15H16.5C18.0188 15 19.25 16.2312 19.25 17.75V18.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
