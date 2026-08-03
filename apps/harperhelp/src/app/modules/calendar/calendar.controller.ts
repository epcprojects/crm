import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { CalendarView } from '@harperhelp/types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { EventType } from './entities/event.entity';
import { GetUser } from 'apps/harperhelp/src/common/decorators/get-user.decorator';

@ApiTags('Events')
@Controller('project/:pid/calendar/events')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Param('pid', ParseUUIDPipe) pid: string, @Body() dto: CreateEventDto, @GetUser() user) {
    return this.calendarService.create(pid, dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Get events by calendar view',
    description: `
Returns events whose date falls within the range for the requested view:
- **day**   -> single date
- **week**  -> Monday-Sunday of the week containing the date
- **month** -> all days in that calendar month
- **year**  -> Jan 1 - Dec 31 of that year
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
    description: 'Reference date in YYYY-MM-DD format',
  })
  @ApiQuery({
    name: 'eventType',
    required: false,
    enum: EventType,
    description: 'Filter by event type',
    example: 'launch',
  })
  @ApiResponse({
    status: 200,
    description: 'List of events for the requested range',
    schema: {
      example: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'Sprint Planning',
          type: 'event',
          date: '2026-06-15',
          description: 'Q3 sprint kick-off',
          color: '#0f6e56',
        },
      ],
    },
  })
  findByView(@Param('pid', ParseUUIDPipe) pid: string, @Query() query: CalendarQueryDto) {
    return this.calendarService.findByView(pid, query);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all events (no date filter)' })
  findAll(@Param('pid', ParseUUIDPipe) pid: string) {
    return this.calendarService.findAll(pid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single event by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  findOne(@Param('pid', ParseUUIDPipe) pid: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.calendarService.findOne(pid, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an event (partial update)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  update(
    @Param('pid', ParseUUIDPipe) pid: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.calendarService.update(pid, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an event Softly' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  remove(@Param('pid') pid: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.calendarService.softRemove(pid, id);
  }
}
