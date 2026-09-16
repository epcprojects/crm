import {
  Controller,
  Get,
  Param,
  Post,
  UseInterceptors,
  Body,
  UploadedFiles,
  UseGuards,
  ParseUUIDPipe,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateThreadMessageDto } from './dto/create-thread-message.dto';
import { ThreadService } from './services/thread.service';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { FileSizeGuard } from '../../../common/guards/file-size.guard';
import { UpdateThreadMessageDto } from './dto/update-thread-message.dto';
import { ApiQuery } from '@nestjs/swagger';
import { Query } from '@nestjs/common';

@Controller('projects/:pid/thread')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ThreadController {
  constructor(private readonly service: ThreadService) {}

  @Get()
  @ApiOperation({
    description: 'Find all thread messages related to a project.',
  })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'cursorCreatedAt', required: false, type: String })
  @ApiQuery({ name: 'cursorId', required: false, type: String })
  findAll(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Query('limit') limit?: string,
    @Query('cursorCreatedAt') cursorCreatedAt?: string,
    @Query('cursorId') cursorId?: string,
  ) {
    const cursor =
      cursorCreatedAt && cursorId
        ? { createdAt: new Date(cursorCreatedAt), id: cursorId }
        : undefined;
    return this.service.findAll(
      pid,
      limit ? Math.min(parseInt(limit, 10), 100) : 30,
      cursor,
    );
  }

  @Post()
  @ApiOperation({
    description: 'Create a thread message for a project.',
  })
  create(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Body() dto: CreateThreadMessageDto,
    @GetUser() user,
  ) {
    return this.service.create(pid, dto, user, dto.attachments);
  }

  @Get(':messageId')
  @ApiOperation({
    description: 'Get full thread (parent + replies + attachments)',
  })
  getThread(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.service.getThread(messageId, pid);
  }

  @Put(':messageId')
  @ApiOperation({
    description: 'Updates thread message.',
  })
  update(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: UpdateThreadMessageDto,
    @GetUser() user,
  ) {
    return this.service.update(messageId, pid, dto, user, dto.attachments);
  }

  @Delete(':messageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    description: 'Deletes a thread message.',
  })
  remove(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @GetUser() user,
  ) {
    return this.service.remove(messageId, pid, user);
  }

  @Post(':messageId/reactions')
  @ApiOperation({
    description: 'Adds or updates a reaction on a thread message.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        emoji: {
          type: 'string',
          example: '❤️',
        },
      },
      required: ['emoji'],
    },
  })
  addReaction(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() { emoji }: { emoji: string },
    @GetUser() user,
  ) {
    return this.service.addReaction(pid, messageId, user, emoji);
  }

  @Delete(':messageId/reactions')
  @ApiOperation({
    description:
      'Removes the authenticated user reaction from a thread message.',
  })
  removeReaction(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @GetUser() user,
  ) {
    return this.service.removeReaction(pid, messageId, user.id);
  }
  
  // @Get(':messageId/replies')
  // @ApiOperation({
  //   description: 'Get replies by parent message id',
  // })
  // getReplies(@Param('pid') pid: string, @Param('messageId') messageId: string) {
  //   return this.service.findReplies(messageId, pid);
  // }
}


@Controller('projects/threads')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectThreadsOverviewController {
  constructor(private readonly service: ThreadService) {}

  @Get('latest')
  @ApiOperation({
    description:
      'Returns, for every project the authenticated user has access to, ' +
      'the most recent top-level thread message (parentId is null) with a ' +
      'timestamp and message preview.',
  })
  getLatestPerProject(@GetUser() user) {
    return this.service.getLatestThreadMessagePerProject(user);
  }
}