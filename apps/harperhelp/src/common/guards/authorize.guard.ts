import { applyDecorators, UseGuards } from '@nestjs/common';

import {
  PermissionMetadata,
  RequirePermission,
} from '../decorators/permissions.decorator';
import { PermissionsGuard } from './permissions.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

export const Authorize = (options: PermissionMetadata = {}) =>
  applyDecorators(
    UseGuards(JwtAuthGuard, PermissionsGuard),
    RequirePermission(options),
  );
