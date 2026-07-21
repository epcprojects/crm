import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { TicketPrioritiesService } from './services/ticket.priorities.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreateTicketPriorityDto } from './dto/create-ticket-priority.dto';
import { UpdateTicketPriorityDto } from './dto/update-ticket-priority.dto';

@Controller('ticket-priorities')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketPrioritiesController {
  constructor(
    private readonly ticketPrioritiesService: TicketPrioritiesService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create Ticket Priority',
  })
  create(@Body() dto: CreateTicketPriorityDto) {
    return this.ticketPrioritiesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get All Ticket Priorities',
  })
  findAll() {
    return this.ticketPrioritiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Find Ticket Priority',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketPrioritiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update Ticket Priority',
  })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTicketPriorityDto) {
    return this.ticketPrioritiesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete Ticket Priority',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketPrioritiesService.remove(id);
  }
}
