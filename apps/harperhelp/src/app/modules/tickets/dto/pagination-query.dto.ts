// pagination-query.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, Min, Max } from 'class-validator';

export class PaginationQueryDto {
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