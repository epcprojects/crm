import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';

import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { SystemRoles } from '@epc-crm/types';
import { Roles } from '../../../common/decorators/roles.decorator';
import { MODULE_DEFINITIONS } from '@epc-crm/utils';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import {  GetRoleQueryDTO } from './dto/get-role-query.dto';

@Controller('roles')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  // @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new role' })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get All Roles with optional Search' })
  findAll(@Query() query: GetRoleQueryDTO,) {
    return this.rolesService.findAll(query);
  }

  @Get('permissions/catalog')
  // @Roles(SystemRoles.SUPER_ADMIN)
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
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  // @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update existing role.' })
  update(@Param('id', ParseUUIDPipe) id: string, @GetUser() currentUser, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto, currentUser);
  }

  @Delete(':id')
  // @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove specific role from system.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.softRemove(id);
  }
}
