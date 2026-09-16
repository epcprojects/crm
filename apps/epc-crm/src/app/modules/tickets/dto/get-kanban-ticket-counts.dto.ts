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
}
