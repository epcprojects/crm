import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';

export class GetTicketsQueryDto {
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
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;
  
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
