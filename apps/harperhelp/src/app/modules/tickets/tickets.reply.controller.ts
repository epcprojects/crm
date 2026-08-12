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
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateReplyDto } from './dto/create-reply.dto';
import { TicketRepliesService } from './services/tickets.reply.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { FileSizeGuard } from '../../../common/guards/file-size.guard';
import { UpdateReplyDto } from './dto/update-ticket-reply.dto';

@Controller('tickets/:ticketId')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketRepliesController {
  constructor(private readonly service: TicketRepliesService) {}

  @Get('replies')
  @ApiOperation({
    description: 'Returns all replies of a ticket. now using Pagination',
  })
  @ApiQuery({name: 'limit',required: false,type: String,description: 'Page size (default 30, max 100)',})
  @ApiQuery({name: 'cursorCreatedAt',required: false, type: String, description: 'createdAt of the oldest reply from the previous page',})
  @ApiQuery({name: 'cursorId',required: false,type: String,description: 'id of the oldest reply from the previous page', })
  findAll(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Query('limit') limit?: string,
    @Query('cursorCreatedAt') cursorCreatedAt?: string,
    @Query('cursorId') cursorId?: string,
  ) {
    const cursor =
      cursorCreatedAt && cursorId
        ? { createdAt: new Date(cursorCreatedAt), id: cursorId }
        : undefined;
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 100) : 30;
    return this.service.findByTicket(ticketId, parsedLimit, cursor);
  }

  @Post('projects/:pid')
  @UseGuards(FileSizeGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
        },
        attachments: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['message'],
    },
  })
  @UseInterceptors(FilesInterceptor('attachments'))
  @ApiOperation({
    description: 'Creates a reply for a ticket. it also accepts attachments.',
  })
  create(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateReplyDto,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user,
  ) {
    return this.service.create(pid, ticketId, dto, user.id, files);
  }

  @Put('projects/:pid/reply/:replyId')
  @UseGuards(FileSizeGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
        },
        attachments: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['message'],
    },
  })
  @UseInterceptors(FilesInterceptor('attachments'))
  @ApiOperation({
    description: 'Updates a reply for a ticket',
  })
  update(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('replyId', ParseUUIDPipe) replyId: string,
    @Body() dto: UpdateReplyDto,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user,
  ) {
    return this.service.update(pid, ticketId, replyId, dto, user.id, files);
  }

  @Delete('projects/:pid/reply/:replyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    description: 'Soft deletes a reply for a ticket.',
  })
  remove(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('replyId', ParseUUIDPipe) replyId: string,
    @GetUser() user,
  ) {
    return this.service.softRemove(pid, ticketId, replyId, user.id);
  }

  @Post('projects/:pid/reply/:replyId/reactions')
  @ApiOperation({
    description: 'Adds or updates a reaction on a ticket reply.',
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
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('replyId', ParseUUIDPipe) replyId: string,
    @Body() emoji: { emoji: string },
    @GetUser() user,
  ) {
    return this.service.addReaction(pid, ticketId, replyId, user, emoji.emoji);
  }

  @Delete('projects/:pid/reply/:replyId/reactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    description: 'Removes the authenticated user reaction from a ticket reply.',
  })
  removeReaction(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Param('replyId', ParseUUIDPipe) replyId: string,
    @GetUser() user,
  ) {
    return this.service.removeReaction(pid, ticketId, replyId, user.id);
  }
}
