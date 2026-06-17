import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';

import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'apps/harperhelp/src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'apps/harperhelp/src/common/guards/roles.guard';
import { SystemRoles } from '@harperhelp/types';
import { Roles } from '../../../common/decorators/roles.decorator';
import { MODULE_DEFINITIONS } from '@harperhelp/utils';
import { GetUser } from 'apps/harperhelp/src/common/decorators/get-user.decorator';

@Controller('roles')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new role' })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get All Roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('permissions/catalog')
  @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get All Permissions of the system' })
  getPermissionCatalog() {
    return MODULE_DEFINITIONS.map((module) => ({
      module: module.key,
      label: module.label,
      permissions: module.actions.map((action) => `${module.key}.${action}`),
    }));
  }

  @Get('permissions/user')
  @ApiOperation({ summary: 'Get all permissions of the auth user' })
  getUserPermission(@GetUser() user) {
    return this.rolesService.getUserPermissions(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role based on id.' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update existing role.' })
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove specific role from system.' })
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
