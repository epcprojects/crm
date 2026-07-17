'use client';

import AppModal from './AppModal';
import type { RoleClaimRecord, RoleRecord } from '../tables/RolesTable';

type RoleClaimsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  role: RoleRecord | null;
};

export default function RoleClaimsModal({
  isOpen,
  onClose,
  role,
}: RoleClaimsModalProps) {
  const claims = role?.roleClaims ?? [];
  const claimGroups = groupClaimsByModule(claims);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={role ? `${role.name} Claims` : 'Role Claims'}
      showFooter={false}
      roundedCustom
      outSideClickClose={false}
      size="medium"
    >
      <div className="space-y-4 p-4 md:p-5">
        {claimGroups.length ? (
          <div className="min-h-80 space-y-3 pr-1">
            {claimGroups.map((group) => (
              <div
                key={group.module}
                className="rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <p className="text-sm font-semibold text-gray-900 md:text-base">
                  {group.title}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700"
                    >
                      {formatPermissionLabel(permission)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            No role claims found.
          </div>
        )}
      </div>
    </AppModal>
  );
}

function groupClaimsByModule(claims: RoleClaimRecord[]) {
  const groups = new Map<string, Set<string>>();

  claims.forEach((claim) => {
    const permission = getPermissionValue(claim);

    if (!permission) {
      return;
    }

    const [module] = permission.split('.');

    if (!module) {
      return;
    }

    if (!groups.has(module)) {
      groups.set(module, new Set());
    }

    groups.get(module)?.add(permission);
  });

  return Array.from(groups.entries()).map(([module, permissions]) => ({
    module,
    title: formatModuleTitle(module),
    permissions: Array.from(permissions),
  }));
}

function getPermissionValue(claim: RoleClaimRecord) {
  if (claim.claimType === 'permission') {
    return normalizePermission(claim.claimValue);
  }

  if (claim.claimValue.trim().toLowerCase() === 'true') {
    return normalizePermission(claim.claimType);
  }

  return '';
}

function formatModuleTitle(module: string) {
  return toTitleCase(module.replace(/_/g, ' '));
}

function formatPermissionLabel(permission: string) {
  const permissionName = permission.split('.').slice(1).join(' ');

  return toTitleCase(permissionName.replace(/_/g, ' '));
}

function normalizePermission(permission: string) {
  return permission.replace(/:/g, '.').trim();
}

function toTitleCase(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
