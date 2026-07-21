import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';

import { TicketStatusesService } from './services/ticket.statuses.service';
import { CreateTicketStatusDto } from './dto/create-ticket-status.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { SystemRoles } from '@harperhelp/types';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GetUser } from '../../../common/decorators/get-user.decorator';
import { ReorderTicketStatusDto } from './dto/reorder-ticket-status.dto';

@Controller('ticket-statuses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketStatusesController {
  constructor(private readonly service: TicketStatusesService) { }

  @Post()
  // @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create Ticket Statuses.' })
  create(@Body() dto: CreateTicketStatusDto) {
    return this.service.create(dto);
  }
  @Get()
  @ApiOperation({
    summary: 'Get All Statuses which can be used for tickets.',
  })
  findAll(@GetUser() user) {
    return this.service.findAll(user);
  }


  @Patch('reorder')
  @ApiOperation({
    summary: 'Reorder ticket status columns for the current user',
  })
  reorder(
    @Body() dto: ReorderTicketStatusDto,
    @GetUser() user,
  ) {
    return this.service.reorder(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get added Ticket Status by id.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  // @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update existing ticket status.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  // @Roles(SystemRoles.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete ticket status.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
