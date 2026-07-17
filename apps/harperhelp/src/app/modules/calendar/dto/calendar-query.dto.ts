import { IsEnum, IsISO8601, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CalendarView } from '@harperhelp/types';
import { EventType } from '../entities/event.entity';

export class CalendarQueryDto {
  @ApiProperty({
    enum: CalendarView,
    description: 'Calendar view granularity',
    example: 'month',
  })
  @IsEnum(CalendarView, {
    message: 'view must be one of: day, week, month, year',
  })
  view: CalendarView;

  @ApiPropertyOptional({
    enum: EventType,
    description: 'Event type granularity',
    example: 'launch',
  })
  @IsEnum(EventType, {
    message: 'view must be one of: launch, meeting, milestone, event',
  })
  @IsOptional()
  eventType?: EventType;

  @ApiProperty({
    description: 'Reference date in ISO 8601 format (YYYY-MM-DD)',
    example: '2026-06-01',
  })
  @IsISO8601({ strict: true })
  @IsNotEmpty()
  date: string;
}
