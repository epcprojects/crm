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
  ParseUUIDPipe,
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
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { GetTicketsQueryDto } from './dto/get-tickets-query.dto';
import { CalendarView } from '@harperhelp/types';
import { CalendarQueryDto } from '../calendar/dto/calendar-query.dto';
import { FileSizeGuard } from '../../../common/guards/file-size.guard';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { KanbanQueryDto } from './dto/kanban-query.dto';
import { GetKanbanTicketCountsDto } from './dto/get-kanban-ticket-counts.dto';
import { KanbanBoardQueryDto } from './dto/kanban-board-query.dto';

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
  findAll(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Query() query: GetTicketsQueryDto,
  ) {
    return this.ticketsService.findAll(pid, query);
  }

  // ---------------- LIST BY CALENDAR -----------------
  @Get('calendar')
  @ApiOperation({
    summary: 'Get tickets by calendar view (returns title + dueDate)',
    description: `
Returns tickets whose dueDate falls within the range for the requested view.
Response is scoped to: **id, title, dueDate, priority, status**.

View ranges:
- **day**   -> single date only
- **week**  -> Monday-Sunday of the week containing the date
- **month** -> full calendar month
- **year**  -> full calendar year (Jan 1 - Dec 31)
    `,
  })
  @ApiQuery({
    name: 'view',
    enum: CalendarView,
    required: true,
    example: 'month',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    example: '2026-06-01',
    description: 'Any date within the target period (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tickets with dueDate in the requested range',
    schema: {
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Fix login crash on iOS',
          dueDate: '2026-06-20',
          priority: 'critical',
          status: 'in_progress',
        },
        {
          id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          title: 'Implement bulk lead export',
          dueDate: '2026-06-25',
          priority: 'high',
          status: 'open',
        },
      ],
    },
  })
  findByView(@Param('pid') pid: string, @Query() query: CalendarQueryDto) {
    return this.ticketsService.findByView(pid, query);
  }

  // ---------------- CREATE ----------------
  @Post()
  // @UseGuards(FileSizeGuard)
  // @ApiConsumes('multipart/form-data')
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
        type: {
          type: 'string',
          enum: ['feature_request','bug'],
        },
        priorityKey: {
          type: 'string',
        },
        dueDate: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },

      },
      required: ['title', 'type'],
    },
  })
  @ApiOperation({
    summary: 'Create a ticket.',
  })
  create(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Body() dto: CreateTicketDto,
    // @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user,
  ) {
    return this.ticketsService.createTicket(pid, dto, user.id, dto.attachments);
  }

  // ---------------- DETAIL ----------------
  @Get(':id')
  @ApiOperation({
    summary: 'Find specific ticket',
  })
  findOne(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user,
  ) {
    return this.ticketsService.findOne(pid, id, user);
  }

  // ---------------- UPDATE ----------------
  @Patch(':id')
  @ApiOperation({
    summary: 'Update project ticket.',
  })
  update(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('id', ParseUUIDPipe) id: string,
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
  remove(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user,
  ) {
    return this.ticketsService.remove(pid, id, user.id);
  }

  // ---------------- TICKET SUMMARY FOR PROJECT ---------------

  @Get('dashboard/ticket-summary')
  @ApiOperation({
    summary: 'Get All Tickets Summary of a project',
  })
  getTicketSummaryForAProject(@Param('pid', ParseUUIDPipe) pid: string) {
    return this.ticketsService.getTicketSummary(pid);
  }
}

// ==================== DASHBOARD CONTROLLER FOR TICKETS ======

@Controller('dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('tickets')
  findAll(@Query() query: GetTicketsQueryDto, @GetUser() user) {
    return this.ticketsService.findAllProjects(query, user);
  }

  @Get('ticket-summary')
  @ApiOperation({
    summary:
      'Get tickets summary. Returns Open, In Progress, Resolved and Critical counts.',
  })
  getGlobalTicketSummary(@GetUser() user) {
    return this.ticketsService.getGlobalTicketSummary(user);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming tickets' })
  getUpcomingTickets(@Query() query: PaginationQueryDto, @GetUser() user) {
    return this.ticketsService.getUpcomingTickets(query, user);
  }

  @Get('tickets/kanban')
  @ApiOperation({
    summary:
      'Get Kanban board — tickets grouped by status, with per-status counts',
  })
  getKanbanBoard(@Query() query: KanbanQueryDto, @GetUser() user) {
    return this.ticketsService.getKanbanBoards(query, user);
  }

  @Get('kanban-ticket-counts')
  @ApiOperation({
    summary: 'Overall ticket counts per status',
    description:
      'Returns the total ticket count for every status, based on all matching tickets ' +
      '(pagination is not applied — this always reflects the full filtered set).',
  })
  @ApiQuery({
    name: 'priorityKey',
    required: false,
    type: String,
    description: 'Filter counts to tickets with this priority key.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Filter counts to tickets matching this search term (title, description, ticketRefNo).',
  })
  @ApiQuery({
    name: 'projectIds',
    required: false,
    type: [String],
    description: 'Filter counts to tickets within these project IDs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket counts per status retrieved successfully.',
    schema: {
      example: {
        countPerStatus: {
          Open: 14,
          InProgress: 6,
          Resolved: 3,
          Closed: 5,
        },
      },
    },
  })
  // @Get('kanban-ticket-counts')
  async getKanbanTicketCounts(
    @Query() query: GetKanbanTicketCountsDto,
    @GetUser() user,
  ) {
    return this.ticketsService.getKanbanTicketCounts(query, user);
  }

  @Get('kanban-board')
  @ApiOperation({
    summary: 'Kanban board tickets',
    description:
      'No `statusKey` param → returns the first page (default 20) of tickets for every status column, keyed by status, plus `hasMore` per column. ' +
      'With `statusKey` param → returns the next page (default 20) for that column only, using `page`/`limit`.',
  })
  @ApiQuery({
    name: 'statusKey',
    required: false,
    type: String,
    description:
      'Fetch only this status column, paginated. Omit to get the initial per-column snapshot.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description:
      'Page number (only used together with `statusKey`). Defaults to 1.',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page/column (max 100). Defaults to 20.',
    example: 20,
  })
  @ApiQuery({
    name: 'priorityKey',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'projectIds',
    required: false,
    type: [String],
  })
  @ApiResponse({
    status: 200,
    description: 'Kanban board tickets retrieved successfully.',
    schema: {
      oneOf: [
        {
          title: 'Initial load (no statusKey param)',
          example: {
            items: {
              Open: [
                {
                  id: 'a1b2c3d4-...',
                  title: 'Fix login bug',
                  statusKey: 'Open',
                },
              ],
              InProgress: [],
              Resolved: [],
              Closed: [],
            },
            hasMore: {
              Open: true,
              InProgress: false,
              Resolved: false,
              Closed: false,
            },
          },
        },
        {
          title: 'Single column page (statusKey param present)',
          example: {
            statusKey: 'Open',
            items: [
              { id: 'a1b2c3d4-...', title: 'Fix login bug', statusKey: 'Open' },
            ],
            hasMore: true,
          },
        },
      ],
    },
  })
  getKanbanBoard2(@GetUser() user, @Query() query: KanbanBoardQueryDto) {
    return this.ticketsService.getKanbanBoard(query, user);
  }
}
