import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
// import { Roles } from '../../../common/decorators/roles.decorator';
// import { SystemRoles } from '@harperhelp/types';
import { FilesInterceptor } from '@nestjs/platform-express';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { ProjectsFilesService } from './services/project-files.service';
import { User } from '../users/entities/user.entity';
// import { Authorize } from '../../../common/guards/authorize.guard';
import { GetProjectsQueryDto } from './dto/get-projects-query.dto';
import { GetMembersQueryDto } from './dto/get-members-query.dto';
import { FileSizeGuard } from '../../../common/guards/file-size.guard';

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
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id);
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
    return this.projectsService.remove(id, user);
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

  // ---------------- UPLOAD FILES ----------------
  @Post(':projectId/files')
  @UseGuards(FileSizeGuard)
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Upload files to a project' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: String,
  })
  @ApiBody({
    description: 'Project file upload',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
  })
  async uploadFiles(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user,
  ) {
    return this.projectsFilesService.uploadProjectFiles(
      projectId,
      files,
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
