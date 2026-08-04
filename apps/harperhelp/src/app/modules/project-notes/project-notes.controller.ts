import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { ProjectNotesService } from './project-notes.service';
import { CreateProjectNoteDto } from './dto/create-project-note.dto';
import { UpdateProjectNoteDto } from './dto/update-project-note.dto';
import { GetProjectNotesQueryDto } from './dto/get-project-notes-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { GetUser } from '../../../common/decorators/get-user.decorator';

@Controller('projects/:pid/notes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectNotesController {
  constructor(private readonly notesService: ProjectNotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new note for a project' })
  create(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Body() dto: CreateProjectNoteDto,
    @GetUser() user,
  ) {
    return this.notesService.create(pid, dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Get paginated list of notes for a project. Accepts search.',
  })
  findAll(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Query() query: GetProjectNotesQueryDto,
    @GetUser() user,
  ) {
    return this.notesService.findAll(pid, query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single note by id' })
  findOne(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: string },
  ) {
    return this.notesService.findOne(pid, id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing note' })
  update(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectNoteDto,
    @GetUser() user,
  ) {
    return this.notesService.update(pid, id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a note' })
  remove(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user,
  ) {
    return this.notesService.softRemove(pid, id, user);
  }
}
