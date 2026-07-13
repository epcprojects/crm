'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import AddRoleModal, {
  type AddRoleFormValues,
  type PermissionCatalogItem,
} from '../../../components/modals/AddRoleModal';
import DeleteRoleModal from '../../../components/modals/DeleteRoleModal';
import RoleClaimsModal from '../../../components/modals/RoleClaimsModal';
import RolesTable, {
  RolesTableSkeleton,
  type RoleClaimRecord,
  type RoleRecord,
} from '../../../components/tables/RolesTable';
import { PlusIcon, SearchIcon } from '../../../../public/icons';
import { appToast } from '../../../components/toast/AppToast';
import { useAppSelector } from '../../Redux/store';
import {
  PermissionGuard,
  usePermissions,
} from '../../providers/PermissionProvider';
import DashboardSummaryBanner from '../../../components/ui/DashboardSummaryBanner';
import ThemeButton from '../../../components/ui/ThemeButton';

export default function RolesPage() {
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const queryClient = useQueryClient();
  const currentUserRoles = useAppSelector(
    (state) => state.auth.user?.roles ?? [],
  );
  const { hasPermission } = usePermissions();
  const canViewRoles = hasPermission('roles.view_list');
  const canCreateRole = hasPermission('roles.create');
  const canEditRole = hasPermission('roles.edit_permissions');
  const canDeleteRole = hasPermission('roles.delete');
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [viewingClaimsRole, setViewingClaimsRole] = useState<RoleRecord | null>(
    null,
  );
  const [searchValue, setSearchValue] = useState('');
  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    enabled: canViewRoles,
  });
  const permissionCatalogQuery = useQuery({
    queryKey: ['roles', 'permission-catalog'],
    queryFn: fetchPermissionCatalog,
    enabled: canCreateRole || canEditRole,
  });
  const roleDetailQuery = useQuery({
    queryKey: ['roles', 'detail', editingRoleId],
    queryFn: () => fetchRoleById(editingRoleId ?? ''),
    enabled: Boolean(editingRoleId && canEditRole),
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
    if (canCreateRole) {
      setHeaderActionOverride(() => setAddRoleOpen(true));
    } else {
      setHeaderActionOverride(null);
    }

    return () => {
      setHeaderActionOverride(null);
    };
  }, [canCreateRole, setHeaderActionOverride]);

  const filteredRoles = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    const roleList = rolesQuery.data ?? [];

    return roleList.filter((role) => {
      if (!normalizedSearch) return true;

      return (
        role.id.toLowerCase().includes(normalizedSearch) ||
        role.name.toLowerCase().includes(normalizedSearch) ||
        role.normalizedName.toLowerCase().includes(normalizedSearch) ||
        role.description.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [rolesQuery.data, searchValue]);

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
    rolesQuery.data?.find((role) => role.id === deletingRoleId) ?? null;

  const handleCreateRole = async (values: AddRoleFormValues) => {
    if (!canCreateRole) {
      return;
    }

    await createRoleMutation.mutateAsync(values);
    appToast.success('Role created successfully.');
  };

  const handleEditRole = async (values: AddRoleFormValues) => {
    if (!editingRoleId || !editingRole || !canEditRole) return;

    await updateRoleMutation.mutateAsync({
      roleId: editingRoleId,
      body: {
        name: values.name,
        description: values.description,
        permissions: values.permissions,
      },
    });

    setEditingRoleId(null);
    appToast.success('Role updated successfully.');
  };

  const handleDeleteRole = async () => {
    if (!deletingRoleId || !canDeleteRole) return;

    await deleteRoleMutation.mutateAsync(deletingRoleId);
    setDeletingRoleId(null);
    appToast.success('Role deleted successfully.');
  };

  return (
    <>
      <div className="relative z-100 h-dvh overflow-hidden py-5 pr-5">
        <div className="flex h-full min-h-0 flex-col gap-3 rounded-3xl border border-white bg-white/40 p-3">
          <DashboardSummaryBanner
            imageSrc="/images/UsersIcon.svg"
            imageAlt="Roles"
            title="Roles"
            stats={[]}
          />

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-[20px] bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5">
            <PermissionGuard
              permission="roles.view_list"
              fallback={
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                  You do not have permission to view roles.
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

                  {canCreateRole ? (
                    <ThemeButton
                      className="shrink-0 rounded-full"
                      variant="primaryGradient"
                      icon={<PlusIcon fill="#3889FE" width="20" height="20" />}
                      onClick={() => setAddRoleOpen(true)}
                    >
                      Add Role
                    </ThemeButton>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  {rolesQuery.isLoading ? (
                    <RolesTableSkeleton />
                  ) : (rolesQuery.data?.length ?? 0) ? (
                    <RolesTable
                      roles={filteredRoles}
                      currentUserRoles={currentUserRoles}
                      initialPageSize={10}
                      pageSizeOptions={[10, 20, 30]}
                      onViewClaims={(role) => setViewingClaimsRole(role)}
                      onEdit={
                        canEditRole
                          ? (role) => setEditingRoleId(role.id)
                          : undefined
                      }
                      onDelete={
                        canDeleteRole
                          ? (role) => setDeletingRoleId(role.id)
                          : undefined
                      }
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
                        Create roles to organize access levels and permissions
                        across the workspace.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </PermissionGuard>
          </div>
        </div>
      </div>

      <AddRoleModal
        key="create-role-modal"
        isOpen={addRoleOpen && canCreateRole}
        onClose={() => setAddRoleOpen(false)}
        onConfirm={handleCreateRole}
        permissionCatalog={permissionCatalogQuery.data}
        permissionCatalogLoading={permissionCatalogQuery.isLoading}
      />

      {editingRoleId ? (
        <AddRoleModal
          key={`edit-role-${editingRoleId}-${
            editInitialValues?.permissions.join('|') ?? 'loading'
          }`}
          isOpen={isEditRoleModalOpen && canEditRole}
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
        isOpen={Boolean(deletingRole) && canDeleteRole}
        onClose={() => setDeletingRoleId(null)}
        onConfirm={handleDeleteRole}
        roleName={deletingRole?.name}
      />

      <RoleClaimsModal
        isOpen={Boolean(viewingClaimsRole)}
        onClose={() => setViewingClaimsRole(null)}
        role={viewingClaimsRole}
      />
    </>
   
  );
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
    | {
        roles?: ApiRoleRecord[];
        data?: ApiRoleRecord[];
        items?: ApiRoleRecord[];
      }
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
      !Array.isArray(payload)
        ? payload?.message
        : 'Failed to fetch permission catalog.',
    );
  }

  return payload.map((item) => ({
    module: getString(item.module) ?? '',
    label: getString(item.label) ?? getString(item.module) ?? 'Unknown',
    permissions: Array.isArray(item.permissions)
      ? item.permissions
          .filter(
            (permission): permission is string =>
              typeof permission === 'string',
          )
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
      getString(role.normalizedName) ??
      getString(role.name)?.toUpperCase() ??
      'UNKNOWN_ROLE',
    description: getString(role.description) ?? '',
    permissions: extractPermissions(role),
    roleClaims: mapRoleClaims(role.roleClaims),
    createdAt: formatRoleDate(role.createdAt),
    updatedAt: formatRoleDate(role.updatedAt),
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
  const nestedCandidates = [
    payloadRecord.roles,
    payloadRecord.data,
    payloadRecord.items,
  ];

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
      claim && typeof claim === 'object'
        ? (claim as Record<string, unknown>)
        : {};

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
        .filter(
          (permission): permission is string => typeof permission === 'string',
        )
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

  return (
    normalizedValue === 'true' ||
    normalizedValue === '1' ||
    normalizedValue === 'yes'
  );
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
      <circle cx="8" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.8" />
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
