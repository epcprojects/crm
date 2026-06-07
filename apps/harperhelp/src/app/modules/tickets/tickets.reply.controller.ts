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
import { ApiOperation } from '@nestjs/swagger';

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
  @UseInterceptors(FilesInterceptor('attachments', 10))
  @ApiOperation({
    description: 'Creates a reply for a ticket. it also accepts attachments.',
  })
  create(
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateReplyDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.service.create(ticketId, dto, req.user.id, files);
  }
}
