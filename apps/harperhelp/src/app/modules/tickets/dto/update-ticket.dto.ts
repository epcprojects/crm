import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsOptional,
} from 'class-validator';

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
