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
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'apps/harperhelp/src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'apps/harperhelp/src/common/guards/roles.guard';
import { GetUser } from 'apps/harperhelp/src/common/decorators/get-user.decorator';
import { GetTicketsQueryDto } from './dto/get-tickets-query.dto';

@Controller('projects/:pid/tickets')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ---------------- LIST ----------------
  @Get()
  @ApiOperation({
    summary:
      'Get Paginated list of tickets. Accepts search, status, priority as filters.',
  })
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
        dueDate: {
          type: 'string',
          format: 'date-time',
          nullable: true
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
  @ApiOperation({
    summary: 'Create a ticket.',
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
  @ApiOperation({
    summary: 'Find specific ticket',
  })
  findOne(@Param('pid') pid: string, @Param('id') id: string) {
    return this.ticketsService.findOne(pid, id);
  }

  // ---------------- UPDATE ----------------
  @Patch(':id')
  @ApiOperation({
    summary: 'Update project ticket.',
  })
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
  @ApiOperation({
    summary: 'Soft delete the ticket.',
  })
  remove(@Param('pid') pid: string, @Param('id') id: string, @GetUser() user) {
    return this.ticketsService.remove(pid, id, user.id);
  }

  // ---------------- TICKET SUMMARY FOR PROJECT ---------------

  @Get('dashboard/ticket-summary')
  @ApiOperation({
    summary: 'Get All Tickets Summary of a project',
  })
  getTicketSummaryForAProject(@Param('pid') pid: string) {
    return this.ticketsService.getTicketSummary(pid);
  }
}

// ==================== DASHBOARD CONTROLLER FOR TICKETS ======

@Controller('dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('projects')
  findAll(@Query() query: GetTicketsQueryDto, @GetUser() user) {
    return this.ticketsService.findAllProjects(query, user);
  }

  @Get('ticket-summary')
    @ApiOperation({summary: 'Get tickets summary. Returns Open, In Progress, Resolved and Critical counts.'})
  getGlobalTicketSummary(@GetUser() user) {
    return this.ticketsService.getGlobalTicketSummary(user);
  }

  @Get('upcoming')
  @ApiOperation({summary: 'Get upcoming tickets'})
  getUpcomingTickets(@GetUser() user){
    return this.ticketsService.getUpcomingTickets(user)
  }
}
