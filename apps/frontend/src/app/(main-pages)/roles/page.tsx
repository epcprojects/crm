'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import AddRoleModal, {
  type AddRoleFormValues,
} from '../../../components/modals/AddRoleModal';
import DeleteRoleModal from '../../../components/modals/DeleteRoleModal';
import RolesTable from '../../../components/tables/RolesTable';
import { SearchIcon } from '../../../../public/icons';
import { appToast } from '../../../components/toast/AppToast';
import { rolesData } from './roles.data';

export default function RolesPage() {
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [roleList, setRoleList] = useState(rolesData);
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

      <RolesTable
        roles={filteredRoles}
        initialPageSize={10}
        pageSizeOptions={[10, 20, 30]}
        onEdit={(role) => setEditingRoleId(role.id)}
        onDelete={(role) => setDeletingRoleId(role.id)}
      />

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
