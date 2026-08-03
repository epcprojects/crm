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
import { CreateReplyDto } from './dto/create-reply.dto';
import { TicketRepliesService } from './services/tickets.reply.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
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
    description: 'Returns all replies of a ticket.',
  })
  findAll(@Param('ticketId', ParseUUIDPipe) ticketId: string) {
    return this.service.findByTicket(ticketId);
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

  
}
