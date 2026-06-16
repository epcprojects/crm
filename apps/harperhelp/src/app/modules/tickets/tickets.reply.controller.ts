import {
  Controller,
  Get,
  Param,
  Post,
  UseInterceptors,
  Body,
  UploadedFiles,
  Req,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateReplyDto } from './dto/create-reply.dto';
import { TicketRepliesService } from './services/tickets.reply.service';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { GetUser } from 'apps/harperhelp/src/common/decorators/get-user.decorator';

@Controller('tickets/:ticketId/replies')
export class TicketRepliesController {
  constructor(private readonly service: TicketRepliesService) {}

  @Get()
  @ApiOperation({
    description: 'Returns all replies of a ticket.',
  })
  findAll(@Param('ticketId') ticketId: string) {
    return this.service.findByTicket(ticketId);
  }

  @Post()
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
  @UseInterceptors(FilesInterceptor('attachments', 10))
  @ApiOperation({
    description: 'Creates a reply for a ticket. it also accepts attachments.',
  })
  create(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateReplyDto,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user,
  ) {
    return this.service.create(ticketId, dto, user.id, files);
  }
}
