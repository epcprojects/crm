import {
  Controller,
  Get,
  Param,
  Post,
  UseInterceptors,
  Body,
  UploadedFiles,
  UseGuards,
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
import { GetUser } from 'apps/harperhelp/src/common/decorators/get-user.decorator';
import { JwtAuthGuard } from 'apps/harperhelp/src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'apps/harperhelp/src/common/guards/roles.guard';
import { FileSizeGuard } from 'apps/harperhelp/src/common/guards/file-size.guard';

@Controller('tickets/:ticketId')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketRepliesController {
  constructor(private readonly service: TicketRepliesService) {}

  @Get('replies')
  @ApiOperation({
    description: 'Returns all replies of a ticket.',
  })
  findAll(@Param('ticketId') ticketId: string) {
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
    @Param('pid') pid: string,
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateReplyDto,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user,
  ) {
    return this.service.create(pid, ticketId, dto, user.id, files);
  }
}
