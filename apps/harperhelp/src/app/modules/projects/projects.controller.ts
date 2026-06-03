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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SystemRoles } from '@harperhelp/types';

@Controller('projects')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(createProjectDto);
  }

  @Get()
  @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Find all projects' })
  findAll() {
    return this.projectsService.findAll();
  }

  @Get('names')
  @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Find all projects with names only' })
  findAllNames() {
    return this.projectsService.findAllNames();
  }

  @Get(':id')
  @Roles(
    SystemRoles.SUPER_ADMIN,
    SystemRoles.ADMIN,
    SystemRoles.PROJECT_MANAGER,
    SystemRoles.DEVELOPER,
    SystemRoles.VIEWER,
  )
  @ApiOperation({ summary: 'Find a project by ID' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a project' })
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectsService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a project' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
