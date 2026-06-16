import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

export interface PermissionMetadata {
  permissions?: string[];
  roles?: string[];
}

export const RequirePermission = (options: PermissionMetadata) =>
  SetMetadata(PERMISSION_KEY, options);
