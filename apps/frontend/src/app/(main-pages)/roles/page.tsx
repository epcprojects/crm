'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { CloseIcon, PlusIcon, SearchIcon } from '../../../../public/icons';
import { appToast } from '../../../components/toast/AppToast';
import { useAppSelector } from '../../Redux/store';
import {
  PermissionGuard,
  usePermissions,
} from '../../providers/PermissionProvider';
import DashboardSummaryBanner from '../../../components/ui/DashboardSummaryBanner';
import ThemeButton from '../../../components/ui/ThemeButton';
import EmptyState from '../../../components/EmptyState';

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
    queryKey: ['roles', searchValue.trim()],
    queryFn: () => fetchRoles(searchValue.trim()),
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

//   const rolesPageScrollRef = useRef<HTMLDivElement | null>(null);
// const rolesSectionRef = useRef<HTMLDivElement | null>(null);

// const [isRolesSectionPinned, setIsRolesSectionPinned] =
//   useState(false);
//   useEffect(() => {
//   const scrollContainer = rolesPageScrollRef.current;
//   const rolesSection = rolesSectionRef.current;

//   if (!scrollContainer || !rolesSection) {
//     return;
//   }

//   const updatePinnedState = () => {
//     if (window.innerWidth >= 1280) {
//       setIsRolesSectionPinned(true);
//       return;
//     }

//     const containerRect = scrollContainer.getBoundingClientRect();
//     const sectionRect = rolesSection.getBoundingClientRect();

//     const hasReachedStickyPosition =
//       Math.ceil(sectionRect.top) <= Math.ceil(containerRect.top);

//     setIsRolesSectionPinned(hasReachedStickyPosition);
//   };

//   updatePinnedState();

//   scrollContainer.addEventListener('scroll', updatePinnedState, {
//     passive: true,
//   });

//   window.addEventListener('resize', updatePinnedState);

//   return () => {
//     scrollContainer.removeEventListener('scroll', updatePinnedState);
//     window.removeEventListener('resize', updatePinnedState);
//   };
// }, []);
  return (
    <>
      <div className="relative z-100 h-full xl:h-dvh overflow-hidden xl:py-5 px-4 xl:px-0 pt-2 pb-0 xl:pr-5">
        <div
        //  ref={rolesPageScrollRef}
          className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain scrollbar-hide xl:overflow-hidden xl:rounded-2xl xl:border xl:border-white xl:bg-white/40 xl:p-3"
          // className="flex h-full min-h-0 flex-col gap-3 xl:rounded-2xl xl:border xl:border-white xl:bg-white/40 xl:p-3"
        >
          <div className="shrink-0">
            <DashboardSummaryBanner
              imageSrc="/images/RolesIconImage.svg"
              imageAlt="Roles"
              title="Roles"
              stats={[]}
            />
          </div>

          <div
          // ref={rolesSectionRef}
            // className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-xl bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5"
            // className="sticky -top-5 z-20 flex h-full min-h-0 flex-none flex-col gap-4 overflow-hidden rounded-xl bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5 xl:static xl:z-auto xl:flex-1"
           className="flex h-auto min-h-0 flex-none flex-col gap-4 overflow-visible rounded-xl bg-white p-4 shadow-[0_0_35px_0_rgb(0_0_0/0.04)] md:p-5 xl:h-full xl:flex-1 xl:overflow-hidden"
          >
            <PermissionGuard
              permission="roles.view_list"
              fallback={
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                  You do not have permission to view roles.
                </div>
              }
            >
              <div 
              // className="flex h-full min-h-0 flex-col gap-4 overflow-hidden"
              className="flex h-auto min-h-0 flex-none flex-col gap-4 overflow-visible xl:h-full xl:flex-1 xl:overflow-hidden"
              >
                <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 md:max-w-100 md:min-w-80">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">
                        <SearchIcon fill="#374151" />
                      </span>

                      <input
                        type="text"
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Search"
                        className="min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
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
                        <CloseIcon width="15" height="15" />
                      </button>
                    </div>
                  </div>

                  {canCreateRole ? (
                    <ThemeButton
                      className="shrink-0 rounded-full hidden xl:flex"
                      variant="primaryGradient"
                      icon={<PlusIcon width="20" height="20" />}
                      onClick={() => setAddRoleOpen(true)}
                    >
                      Add Role
                    </ThemeButton>
                  ) : null}
                </div>

                <div 
                // className="min-h-0 flex-1 overflow-hidden"
                className="min-h-0 flex-none overflow-visible xl:flex-1 xl:overflow-hidden"
                >
                  {rolesQuery.isLoading ? (
                    <RolesTableSkeleton />
                  ) : (rolesQuery.data?.length ?? 0) > 0 ? (
                    <RolesTable
                      roles={rolesQuery.data ?? []}
                      currentUserRoles={currentUserRoles}
                      // internalScrollEnabled={isRolesSectionPinned}
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
                      onAddRole={
                        canCreateRole ? () => setAddRoleOpen(true) : undefined
                      }
                    />
                  ) : (
                    <div className="flex h-full min-h-80 items-center justify-center">
                      <EmptyState
                        imageUrl="/images/NoRolesIcon.svg"
                        imageAlt={
                          searchValue.trim() ? 'No matching roles' : 'No roles'
                        }
                        title={
                          searchValue.trim() ? 'No Roles Found' : 'No Roles Yet'
                        }
                        description={
                          searchValue.trim()
                            ? 'No roles match your search. Try a different keyword.'
                            : 'Create your first role to manage user access.'
                        }
                        buttonLabel={
                          !searchValue.trim() && canCreateRole
                            ? 'Add Role'
                            : undefined
                        }
                        onButtonClick={
                          !searchValue.trim() && canCreateRole
                            ? () => setAddRoleOpen(true)
                            : undefined
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </PermissionGuard>
          </div>
        </div>
        {canCreateRole ? (
          <button
            type="button"
            onClick={() => setAddRoleOpen(true)}
            aria-label="Add role"
            className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-l from-royal-blue to-crystal-blue text-white shadow-[0_10px_30px_rgb(48_79_253/0.35)] transition hover:opacity-90 active:scale-95 xl:hidden"
          >
            <PlusIcon fill="#FFFFFF" width="24" height="24" />
          </button>
        ) : null}
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

async function fetchRoles(search?: string) {
  const searchParams = new URLSearchParams();

  if (search?.trim()) {
    searchParams.set('search', search.trim());
  }
  const queryString = searchParams.toString();
  const response = await fetch(
    `/api/roles${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

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
