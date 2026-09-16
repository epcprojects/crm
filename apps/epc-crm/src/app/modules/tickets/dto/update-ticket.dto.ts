import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
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
    message: 'ticketType must be either bug or feature_request',
  })
  ticketType: TicketType;

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

  @ApiPropertyOptional({ description: 'Contact (lead) this ticket is for' })
  @IsOptional()
  @IsUUID()
  contactId?: string;
}
