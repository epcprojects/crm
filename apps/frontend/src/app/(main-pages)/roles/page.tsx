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
  type PermissionCatalogItem,
} from '../../../components/modals/AddRoleModal';
import DeleteRoleModal from '../../../components/modals/DeleteRoleModal';
import RoleClaimsModal from '../../../components/modals/RoleClaimsModal';
import RolesTable, {
  type RoleClaimRecord,
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
  const [viewingClaimsRole, setViewingClaimsRole] =
    useState<RoleRecord | null>(null);
  const [roleList, setRoleList] = useState<RoleRecord[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });
  const permissionCatalogQuery = useQuery({
    queryKey: ['roles', 'permission-catalog'],
    queryFn: fetchPermissionCatalog,
  });
  const roleDetailQuery = useQuery({
    queryKey: ['roles', 'detail', editingRoleId],
    queryFn: () => fetchRoleById(editingRoleId ?? ''),
    enabled: Boolean(editingRoleId),
    staleTime: 0,
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
          permissions: values.permissions,
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
      body: Pick<ApiRoleRecord, 'name' | 'description' | 'permissions'>;
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

  const editingRole = roleDetailQuery.data ?? null;
  const editInitialValues = useMemo(() => {
    if (!editingRole || !permissionCatalogQuery.data?.length) {
      return undefined;
    }

    return {
      name: editingRole.name,
      description: editingRole.description ?? '',
      permissions: getMatchedRoleClaimPermissions(
        editingRole.roleClaims,
        permissionCatalogQuery.data ?? [],
      ),
    };
  }, [editingRole, permissionCatalogQuery.data]);
  const isEditRoleModalOpen = Boolean(editingRoleId && editInitialValues);
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
        permissions: values.permissions,
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
          onViewClaims={(role) => setViewingClaimsRole(role)}
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
        key="create-role-modal"
        isOpen={addRoleOpen}
        onClose={() => setAddRoleOpen(false)}
        onConfirm={handleCreateRole}
        permissionCatalog={permissionCatalogQuery.data}
        permissionCatalogLoading={permissionCatalogQuery.isLoading}
      />

      {editingRoleId ? (
        <AddRoleModal
          key={`edit-role-${editingRoleId}-${editInitialValues?.permissions.join('|') ?? 'loading'}`}
          isOpen={isEditRoleModalOpen}
          onClose={() => setEditingRoleId(null)}
          onConfirm={handleEditRole}
          mode="edit"
          initialValues={editInitialValues}
          permissionCatalog={permissionCatalogQuery.data}
          permissionCatalogLoading={
            permissionCatalogQuery.isLoading || roleDetailQuery.isLoading
          }
        />
      ) : null}

      <DeleteRoleModal
        isOpen={Boolean(deletingRole)}
        onClose={() => setDeletingRoleId(null)}
        onConfirm={handleDeleteRole}
        roleName={deletingRole?.name}
      />

      <RoleClaimsModal
        isOpen={Boolean(viewingClaimsRole)}
        onClose={() => setViewingClaimsRole(null)}
        role={viewingClaimsRole}
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
    permissions: extractPermissions(roleSource, values.permissions),
    roleClaims: mapRoleClaims(roleSource?.roleClaims),
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
    | { roles?: ApiRoleRecord[]; data?: ApiRoleRecord[]; items?: ApiRoleRecord[] }
    | { message?: string }
    | null;
  const roles = extractApiRoles(payload);

  if (!response.ok) {
    throw new Error(
      payload && !Array.isArray(payload) && 'message' in payload
        ? payload.message
        : 'Failed to fetch roles.',
    );
  }

  return roles.map(mapApiRoleToRoleRecord);
}

async function fetchPermissionCatalog() {
  const response = await fetch('/api/roles/permissions/catalog', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | PermissionCatalogItem[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload) ? payload?.message : 'Failed to fetch permission catalog.',
    );
  }

  return payload.map((item) => ({
    module: getString(item.module) ?? '',
    label: getString(item.label) ?? getString(item.module) ?? 'Unknown',
    permissions: Array.isArray(item.permissions)
      ? item.permissions
          .filter((permission): permission is string => typeof permission === 'string')
          .map(normalizePermission)
      : [],
  }));
}

async function fetchRoleById(roleId: string) {
  const response = await fetch(`/api/roles/${roleId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiRoleRecord
    | { role?: ApiRoleRecord; data?: ApiRoleRecord; message?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === 'object' && 'message' in payload
        ? payload.message
        : 'Failed to fetch role details.',
    );
  }

  const roleSource = getRoleSource(payload);

  if (!roleSource) {
    throw new Error('Failed to parse role details.');
  }

  return mapApiRoleToRoleRecord(roleSource as ApiRoleRecord);
}

type ApiRoleRecord = {
  id?: string;
  name?: string;
  normalizedName?: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  permissions?: string[];
  roleClaims?: ApiRoleClaimRecord[];
};

type ApiRoleClaimRecord = {
  id?: string;
  roleId?: string;
  claimType?: string;
  claimValue?: string;
  createdAt?: string;
  updatedAt?: string;
};

function mapApiRoleToRoleRecord(role: ApiRoleRecord): RoleRecord {
  return {
    id: getString(role.id) ?? crypto.randomUUID(),
    name: getString(role.name) ?? 'Unknown Role',
    normalizedName:
      getString(role.normalizedName) ?? getString(role.name)?.toUpperCase() ?? 'UNKNOWN_ROLE',
    description: getString(role.description) ?? '',
    permissions: extractPermissions(role),
    roleClaims: mapRoleClaims(role.roleClaims),
    createdAt: formatRoleDate(role.createdAt),
    updatedAt: formatRoleDate(role.updatedAt),
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
    permissions: extractPermissions(roleSource, values.permissions),
    createdAt: formatRoleDate(roleSource?.createdAt),
    updatedAt: formatRoleDate(roleSource?.updatedAt),
    roleClaims: mapRoleClaims(roleSource?.roleClaims),
  };
}

function extractApiRoles(payload: unknown): ApiRoleRecord[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const payloadRecord = payload as Record<string, unknown>;
  const nestedCandidates = [payloadRecord.roles, payloadRecord.data, payloadRecord.items];

  for (const candidate of nestedCandidates) {
    if (Array.isArray(candidate)) {
      return candidate as ApiRoleRecord[];
    }
  }

  return [];
}

function mapRoleClaims(value: unknown): RoleClaimRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((claim) => {
    const claimRecord =
      claim && typeof claim === 'object' ? (claim as Record<string, unknown>) : {};

    return {
      id: getString(claimRecord.id) ?? crypto.randomUUID(),
      roleId: getString(claimRecord.roleId) ?? '',
      claimType: getString(claimRecord.claimType) ?? '',
      claimValue: getClaimValue(claimRecord.claimValue),
      createdAt: formatRoleDate(claimRecord.createdAt),
      updatedAt: formatRoleDate(claimRecord.updatedAt),
    };
  });
}

function extractPermissions(
  source: unknown,
  fallbackPermissions: string[] = [],
) {
  if (!source || typeof source !== 'object') {
    return fallbackPermissions;
  }

  const sourceRecord = source as Record<string, unknown>;
  const permissionsFromPayload = Array.isArray(sourceRecord.permissions)
    ? sourceRecord.permissions
        .filter((permission): permission is string => typeof permission === 'string')
        .map(normalizePermission)
    : [];

  if (permissionsFromPayload.length) {
    return Array.from(new Set(permissionsFromPayload));
  }

  const permissionsFromClaims = mapRoleClaims(sourceRecord.roleClaims)
    .map(getPermissionFromRoleClaim)
    .filter(Boolean);

  if (permissionsFromClaims.length) {
    return Array.from(new Set(permissionsFromClaims));
  }

  return fallbackPermissions;
}

function getMatchedRoleClaimPermissions(
  roleClaims: RoleClaimRecord[],
  permissionCatalog: PermissionCatalogItem[],
) {
  const catalogPermissions = new Set(
    permissionCatalog.flatMap((catalogItem) =>
      catalogItem.permissions.map(normalizePermission),
    ),
  );

  return Array.from(
    new Set(
      roleClaims
        .map(getPermissionFromRoleClaim)
        .filter((permission) => catalogPermissions.has(permission)),
    ),
  );
}

function getPermissionFromRoleClaim(claim: RoleClaimRecord) {
  if (normalizePermission(claim.claimType) === 'permission') {
    return normalizePermission(claim.claimValue);
  }

  if (isTruthyClaimValue(claim.claimValue)) {
    return normalizePermission(claim.claimType);
  }

  return '';
}

function normalizePermission(permission: string) {
  return permission.replace(/:/g, '.').trim();
}

function isTruthyClaimValue(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  return normalizedValue === 'true' || normalizedValue === '1' || normalizedValue === 'yes';
}

function getClaimValue(value: unknown) {
  if (typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return getString(value) ?? '';
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
