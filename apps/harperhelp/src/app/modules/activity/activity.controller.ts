import {
  Body,
  Controller,
//   Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ActivityLogService } from './activity-log.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { GetActivityLogsDto } from './dto/get-activity-logs.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('activity')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Post()
  create(@Body() dto: CreateActivityLogDto) {
    return this.activityLogService.createActivity(dto);
  }

  @Get()
  findAll(@Query() query: GetActivityLogsDto) {
    return this.activityLogService.findAllActivities(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activityLogService.findActivityById(id);
  }

//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.activityLogService.deleteActivity(id);
//   }
}