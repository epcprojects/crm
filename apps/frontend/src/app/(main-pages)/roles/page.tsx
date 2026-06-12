'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [roleList, setRoleList] = useState<RoleRecord[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });
  const createRoleMutation = useMutation({
    mutationFn: async (values: AddRoleFormValues) => {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to create role.');
      }

      return payload;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
  const updateRoleMutation = useMutation({
    mutationFn: async ({
      roleId,
      body,
    }: {
      roleId: string;
      body: Pick<ApiRoleRecord, 'name' | 'description'>;
    }) => {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to update role.');
      }

      return payload;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
        },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to delete role.');
      }

      return payload;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  useEffect(() => {
    setHeaderActionOverride(() => setAddRoleOpen(true));

    return () => {
      setHeaderActionOverride(null);
    };
  }, [setHeaderActionOverride]);

  useEffect(() => {
    if (rolesQuery.data) {
      setRoleList(rolesQuery.data);
    }
  }, [rolesQuery.data]);

  const filteredRoles = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return roleList.filter((role) => {
      if (!normalizedSearch) return true;

      return (
        role.id.toLowerCase().includes(normalizedSearch) ||
        role.name.toLowerCase().includes(normalizedSearch) ||
        role.normalizedName.toLowerCase().includes(normalizedSearch) ||
        role.description.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [roleList, searchValue]);

  const editingRole =
    roleList.find((role) => role.id === editingRoleId) ?? null;
  const deletingRole =
    roleList.find((role) => role.id === deletingRoleId) ?? null;

  const handleCreateRole = async (values: AddRoleFormValues) => {
    const payload = await createRoleMutation.mutateAsync(values);
    const createdRole = getCreatedRoleRecord(payload, values);

    setRoleList((currentRoles) => [
      createdRole,
      ...currentRoles,
    ]);
    appToast.success('Role created successfully.');
  };

  const handleEditRole = async (values: AddRoleFormValues) => {
    if (!editingRoleId || !editingRole) return;

    const payload = await updateRoleMutation.mutateAsync({
      roleId: editingRoleId,
      body: {
        name: values.name,
        description: values.description,
      },
    });

    const updatedRole = mapApiRoleToRoleRecord(getApiRoleRecord(payload, values));

    setRoleList((currentRoles) =>
      currentRoles.map((role) => (role.id === editingRoleId ? updatedRole : role)),
    );
    setEditingRoleId(null);
    appToast.success('Role updated successfully.');
  };

  const handleDeleteRole = async () => {
    if (!deletingRoleId) return;

    await deleteRoleMutation.mutateAsync(deletingRoleId);
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

      {rolesQuery.isLoading ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
          Loading roles...
        </div>
      ) : roleList.length ? (
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
            Create roles to organize access levels and permissions across the
            workspace.
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
                description: editingRole.description ?? '',
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

function getCreatedRoleRecord(
  payload: unknown,
  values: AddRoleFormValues,
): RoleRecord {
  const roleSource = getRoleSource(payload);
  const resolvedId =
    getString(roleSource?.id) ??
    getString(roleSource?._id) ??
    getString(roleSource?.roleId) ??
    crypto.randomUUID();

  return {
    id: resolvedId,
    name: getString(roleSource?.name) ?? values.name,
    normalizedName:
      getString(roleSource?.normalizedName) ?? values.name.toUpperCase(),
    description: getString(roleSource?.description) ?? values.description,
    roleClaims: getArray(roleSource?.roleClaims),
    createdAt: formatRoleDate(roleSource?.createdAt),
    updatedAt: formatRoleDate(roleSource?.updatedAt),
  };
}

function getRoleSource(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const payloadRecord = payload as Record<string, unknown>;
  const nestedRole = payloadRecord.role;
  const nestedData = payloadRecord.data;

  if (nestedRole && typeof nestedRole === 'object') {
    return nestedRole as Record<string, unknown>;
  }

  if (nestedData && typeof nestedData === 'object') {
    return nestedData as Record<string, unknown>;
  }

  return payloadRecord;
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function getArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function formatRoleDate(value: unknown) {
  const rawValue = getString(value);

  if (!rawValue) {
    return new Date().toISOString();
  }

  return rawValue;
}

async function fetchRoles() {
  const response = await fetch('/api/roles', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiRoleRecord[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload) ? payload?.message : 'Failed to fetch roles.',
    );
  }

  return payload.map(mapApiRoleToRoleRecord);
}

type ApiRoleRecord = {
  id: string;
  name: string;
  normalizedName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  roleClaims: unknown[];
};

function mapApiRoleToRoleRecord(role: ApiRoleRecord): RoleRecord {
  return {
    id: role.id,
    name: role.name,
    normalizedName: role.normalizedName,
    description: role.description,
    roleClaims: Array.isArray(role.roleClaims) ? role.roleClaims : [],
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

function getApiRoleRecord(
  payload: unknown,
  values: AddRoleFormValues,
): ApiRoleRecord {
  const roleSource = getRoleSource(payload);

  return {
    id: getString(roleSource?.id) ?? crypto.randomUUID(),
    name: getString(roleSource?.name) ?? values.name,
    normalizedName:
      getString(roleSource?.normalizedName) ?? values.name.toUpperCase(),
    description: getString(roleSource?.description) ?? values.description,
    createdAt: formatRoleDate(roleSource?.createdAt),
    updatedAt: formatRoleDate(roleSource?.updatedAt),
    roleClaims: getArray(roleSource?.roleClaims),
  };
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
