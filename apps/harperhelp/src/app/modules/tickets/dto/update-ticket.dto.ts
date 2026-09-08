import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { TicketType } from '../enum/ticket-type.enum';

export class UpdateTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusKey?: string;

  @IsOptional()
  @IsEnum(TicketType, {
    message: 'type must be either bug or feature_request',
  })
  type: TicketType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priorityKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  dueDate?: string;
}
