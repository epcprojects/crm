import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';

import { TicketStatusesService } from './services/ticket.statuses.service';
import { CreateTicketStatusDto } from './dto/create-ticket-status.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'apps/harperhelp/src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'apps/harperhelp/src/common/guards/roles.guard';
import { SystemRoles } from '@harperhelp/types';
import { Roles } from 'apps/harperhelp/src/common/decorators/roles.decorator';

@Controller('ticket-statuses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketStatusesController {
  constructor(private readonly service: TicketStatusesService) {}

  @Post()
  // @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create Ticket Statuses.' })
  create(@Body() dto: CreateTicketStatusDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get All Statuses which can be used for tickets.' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get added Ticket Status by id.' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  // @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update existing ticket status.' })
  update(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  // @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete ticket status.' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
