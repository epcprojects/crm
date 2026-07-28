'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../Redux/store';

export type PermissionCatalogItem = {
  module: string;
  label: string;
  permissions: string[];
};

type PermissionContextValue = {
  catalog: PermissionCatalogItem[];
  permissions: string[];
  isLoadingCatalog: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
};

type PermissionGuardProps = {
  permission?: string;
  anyPermissions?: string[];
  allPermissions?: string[];
  fallback?: ReactNode;
  children: ReactNode;
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

export default function PermissionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const authStatus = useAppSelector((state) => state.auth.status);
  const catalogQuery = useQuery({
    queryKey: ['permission-catalog'],
    queryFn: fetchPermissionCatalog,
    enabled: isAuthenticated && authStatus !== 'loading',
  });

  const knownPermissions = useMemo(
    () =>
      new Set(
        (catalogQuery.data ?? []).flatMap((catalogItem) =>
          catalogItem.permissions.map(normalizePermission),
        ),
      ),
    [catalogQuery.data],
  );
  const userPermissions = useMemo(
    () => (user?.permissions ?? []).map(normalizePermission),
    [user?.permissions],
  );
  const userPermissionSet = useMemo(
    () => new Set(userPermissions),
    [userPermissions],
  );
  // const isSuperAdmin = useMemo(
  //   () =>
  //     (user?.roles ?? []).some((role) =>
  //       typeof role === 'string'
  //         ? role === 'SUPER_ADMIN'
  //         : role.key === 'SUPER_ADMIN' || role.name === 'SUPER_ADMIN',
  //     ),
  //   [user?.roles],
  // );

  const hasPermission = useCallback(
    (permission: string) => {
      const normalizedPermission = normalizePermission(permission);

      if (!normalizedPermission) {
        return false;
      }

      // if (isSuperAdmin && knownPermissions.has(normalizedPermission)) {
      //   return true;
      // }

      return userPermissionSet.has(normalizedPermission);
    },
    [knownPermissions, userPermissionSet],
    // [isSuperAdmin, knownPermissions, userPermissionSet],
  );
  const hasAnyPermission = useCallback(
    (permissions: string[]) =>
      permissions.some((permission) => hasPermission(permission)),
    [hasPermission],
  );
  const hasAllPermissions = useCallback(
    (permissions: string[]) =>
      permissions.every((permission) => hasPermission(permission)),
    [hasPermission],
  );
  const value = useMemo<PermissionContextValue>(
    () => ({
      catalog: catalogQuery.data ?? [],
      permissions: userPermissions,
      isLoadingCatalog:
        authStatus === 'loading' || (isAuthenticated && catalogQuery.isLoading),
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }),
    [
      catalogQuery.data,
      catalogQuery.isLoading,
      authStatus,
      hasAllPermissions,
      hasAnyPermission,
      hasPermission,
      isAuthenticated,
      userPermissions,
    ],
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }

  return context;
}

export function PermissionGuard({
  permission,
  anyPermissions,
  allPermissions,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } =
    usePermissions();
  const isAllowed = permission
    ? hasPermission(permission)
    : anyPermissions?.length
      ? hasAnyPermission(anyPermissions)
      : allPermissions?.length
        ? hasAllPermissions(allPermissions)
        : true;

  return isAllowed ? <>{children}</> : <>{fallback}</>;
}

async function fetchPermissionCatalog() {
  const response = await fetch('/api/roles/permissions/catalog', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => null)) as
    | PermissionCatalogItem[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch permission catalog.'
        : 'Failed to fetch permission catalog.',
    );
  }

  return payload.map((catalogItem) => ({
    module: catalogItem.module,
    label: catalogItem.label,
    permissions: catalogItem.permissions.map(normalizePermission),
  }));
}

function normalizePermission(permission: string) {
  return permission.replace(/:/g, '.').trim();
}
