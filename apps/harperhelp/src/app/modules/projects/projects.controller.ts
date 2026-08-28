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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
// import { Roles } from '../../../common/decorators/roles.decorator';
// import { SystemRoles } from '@harperhelp/types';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { ProjectsFilesService } from './services/project-files.service';
// import { Authorize } from '../../../common/guards/authorize.guard';
import { GetProjectsQueryDto } from './dto/get-projects-query.dto';
import { GetMembersQueryDto } from './dto/get-members-query.dto';
import { UploadedFileDto } from '../files/dto/uploaded-file.dto';
import { UploadProjectFileDto } from './dto/upload-project-file.dto';

@Controller('projects')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,

    private readonly projectsFilesService: ProjectsFilesService,
  ) {}

  @Post()
  // @Authorize({
  //   permissions: ['projects.create'],
  //   roles: [SystemRoles.SUPER_ADMIN],
  // })
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() createProjectDto: CreateProjectDto, @GetUser() user) {
    return this.projectsService.createProject(createProjectDto, user);
  }

  @Get()
  @ApiOperation({
    summary:
      'Find all projects with search and pagination, returns summary too, based on search',
  })
  findAll(@Query() query: GetProjectsQueryDto, @GetUser() user) {
    return this.projectsService.findAll(query, user);
  }

  @Get('names')
  // @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Find all projects with names only' })
  findAllNames(@GetUser() user) {
    return this.projectsService.findAllNames(user);
  }

  @Get('project-summary')
  @ApiOperation({
    summary:
      'Get project dashboard summary. Returns total projects, active projects, open tickets, and critical issues.',
  })
  getGlobalProjectSummary(@GetUser() user) {
    return this.projectsService.getGlobalProjectSummary(user);
  }

  @Get('members')
  // @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Get members with their assigned projects and roles. Supports search and optional filters.',
  })
  findMembersWithProjects(@Query() query: GetMembersQueryDto) {
    return this.projectsService.findMembersWithProjects(query);
  }

  @Get(':id')
  // @Roles(
  //   SystemRoles.SUPER_ADMIN,
  //   SystemRoles.ADMIN,
  //   SystemRoles.PROJECT_MANAGER,
  //   SystemRoles.DEVELOPER,
  //   SystemRoles.VIEWER,
  // )
  @ApiOperation({ summary: 'Find a project by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user) {
    return this.projectsService.findOne(id, false, user);
  }

  @Patch(':id')
  // @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a project' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @GetUser() user,
  ) {
    return this.projectsService.update(id, updateProjectDto, user);
  }

  @Delete(':id')
  // @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a project' })
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user) {
    return this.projectsService.softRemove(id, user);
  }

  @Get(':id/members')
  // @Roles(
  //   SystemRoles.SUPER_ADMIN,
  //   SystemRoles.ADMIN,
  //   SystemRoles.PROJECT_MANAGER,
  //   SystemRoles.DEVELOPER,
  //   SystemRoles.VIEWER,
  // )
  @ApiOperation({ summary: 'Get list of project members.' })
  findProjectMembers(@Param('id', ParseUUIDPipe) id: string, @GetUser() user) {
    return this.projectsService.findProjectMembers(id, user);
  }

  @Get(':id/members/projects')
  @ApiOperation({
    summary:
      'Get list of Project Memebers that needed on projects page (for viewing purposes direclty)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Optional search term for filtering project members',
  })
  findProjectMembersForProjectsPage(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user,
    @Query('search') search?: string,
  ) {
    return this.projectsService.findProjectMembersForProjectsPage(
      id,
      user,
      search,
    );
  }

  @Get(':id/members/available')
  @ApiOperation({
    summary:
      'Get list of available users that can be assigned to a project (not already assigned)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Optional search term for filtering available users',
  })
  findAvailibleUsersForAssigningProject(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user,
    @Query('search') search?: string,
  ) {
    return this.projectsService.findAvailibleUsersForAssigningProject(
      id,
      user,
      search,
    );
  }

  // ---------------- UPLOAD FILES ----------------
  @Post(':projectId/files')
  @ApiOperation({
    summary:
      'Upload files to a project. Files must be uploaded using presigned url first and details should be send.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
  })
  async uploadFiles(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UploadProjectFileDto,
    @GetUser() user,
  ) {
    return this.projectsFilesService.uploadProjectFiles(
      projectId,
      dto.attachments,
      user.id,
    );
  }

  // ---------------- GET FILES ----------------
  @Get(':projectId/files')
  @ApiOperation({ summary: 'Get all project files' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of project files',
  })
  async getFiles(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @GetUser() user,
  ) {
    return this.projectsFilesService.getProjectFiles(projectId, user);
  }

  // ---------------- DELETE FILE ----------------
  @Delete(':projectId/files/:fileId')
  @ApiOperation({ summary: 'Delete a project file' })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiParam({
    name: 'fileId',
    description: 'File ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
  })
  async deleteFile(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.projectsFilesService.deleteFile(fileId, projectId);
  }
}
