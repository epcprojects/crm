import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import {
  PERMISSION_KEY,
  PermissionMetadata,
} from '../decorators/permissions.decorator';
import { SystemRoles } from '@epc-crm/types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionMetadata>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) return true;

    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      return false;
    }

    if (user.roles?.includes(SystemRoles.SUPER_ADMIN)) {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    const userRoles: string[] = user.roles || [];

    // ---- ROLE CHECK ----
    if (required.roles?.length) {
      const hasRole = required.roles.some((role) => userRoles.includes(role));

      if (!hasRole) {
        throw new ForbiddenException('Insufficient role');
      }
    }

    // ---- PERMISSION CHECK ----
    if (required.permissions?.length) {
      const hasPermission = required.permissions.some((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}
