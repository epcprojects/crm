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
import { Roles } from '../../../common/decorators/roles.decorator';
import { SystemRoles } from '@harperhelp/types';
import { FilesInterceptor } from '@nestjs/platform-express';
import { GetUser } from 'apps/harperhelp/src/common/decorators/get-user.decorator';
import { ProjectsFilesService } from './services/project-files.service';

@Controller('projects')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,

    private readonly projectsFilesService: ProjectsFilesService,
  ) {}

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

  @Get('members')
  @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get list of all members with their assigned projects.',
  })
  findMembersWithProjects() {
    return this.projectsService.findMembersWithProjects();
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

  @Get(':id/members')
  @Roles(
    SystemRoles.SUPER_ADMIN,
    SystemRoles.ADMIN,
    SystemRoles.PROJECT_MANAGER,
    SystemRoles.DEVELOPER,
    SystemRoles.VIEWER,
  )
  @ApiOperation({ summary: 'Get list of project members.' })
  findProjectMembers(@Param('id') id: string) {
    return this.projectsService.findProjectMembers(id);
  }

  // ---------------- UPLOAD FILES ----------------
  @Post('files')
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
  @Get('files')
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
  async getFiles(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectsFilesService.getProjectFiles(projectId);
  }

  // ---------------- DELETE FILE ----------------
  @Delete('files/:fileId')
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
