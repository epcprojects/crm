import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { TicketType } from '../enum/ticket-type.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class KanbanBoardQueryDto {
  @IsOptional()
  @IsString()
  statusKey?: string; // present = paginate just this column

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: TicketType })
  @IsOptional()
  @IsEnum(TicketType)
  ticketType?: TicketType;

  @IsOptional()
  @IsString()
  priorityKey?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  projectIds?: string[];

  @ApiPropertyOptional({
    description:
      'Filter tickets by agent id, or "unassigned" for tickets with no agent.',
  })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({
    description: 'Filter tickets created by this user (the reporter).',
  })
  @IsOptional()
  @IsUUID('loose')
  reporterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('loose')
  contactId?: string;
}
