import { IsArray, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TicketType } from '../enum/ticket-type.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetKanbanTicketCountsDto {
  @IsOptional()
  @IsString()
  priorityKey?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TicketType })
  @IsOptional()
  @IsEnum(TicketType)
  ticketType?: TicketType;
  
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
