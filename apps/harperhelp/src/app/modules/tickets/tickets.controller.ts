import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { GetTicketsQueryDto } from './dto/get-tickets.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from 'apps/harperhelp/src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'apps/harperhelp/src/common/guards/roles.guard';
import { GetUser } from 'apps/harperhelp/src/common/decorators/get-user.decorator';

@Controller('projects/:pid/tickets')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ---------------- LIST ----------------
  @Get()
  findAll(@Param('pid') pid: string, @Query() query: GetTicketsQueryDto) {
    return this.ticketsService.findAll(pid, query);
  }

  // ---------------- CREATE ----------------
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        statusKey: {
          type: 'string',
        },
        priorityKey: {
          type: 'string',
        },
        assigneeId: {
          type: 'string',
          format: 'uuid',
        },
        dueDate: {
          type: 'string',
          format: 'date-time',
        },
        attachments: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['title'],
    },
  })
  @UseInterceptors(FilesInterceptor('attachments', 10))
  create(
    @Param('pid') pid: string,
    @Body() dto: CreateTicketDto,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user,
  ) {
    return this.ticketsService.createTicket(pid, dto, user.id, files);
  }

  // ---------------- DETAIL ----------------
  @Get(':id')
  findOne(@Param('pid') pid: string, @Param('id') id: string) {
    return this.ticketsService.findOne(pid, id);
  }

  // ---------------- UPDATE ----------------
  @Patch(':id')
  update(
    @Param('pid') pid: string,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @GetUser() user,
  ) {
    return this.ticketsService.update(pid, id, dto, user.id);
  }

  // ---------------- DELETE ----------------
  @Delete(':id')
  remove(@Param('pid') pid: string, @Param('id') id: string, @GetUser() user) {
    return this.ticketsService.remove(pid, id, user.id);
  }
}
