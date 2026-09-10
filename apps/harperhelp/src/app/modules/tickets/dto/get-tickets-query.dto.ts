import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  IsArray,
  IsEnum,
} from 'class-validator';
import { TicketType } from '../enum/ticket-type.enum';

export class GetTicketsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusKey?: string;

  @ApiPropertyOptional({ enum: TicketType })
  @IsOptional()
  @IsEnum(TicketType)
  ticketType?: TicketType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priorityKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ type: [String], isArray: true })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsUUID('loose', { each: true })
  projectIds?: string[];

  @ApiProperty()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  page = 1;

  @ApiProperty()
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(100)
  limit = 20;
}
