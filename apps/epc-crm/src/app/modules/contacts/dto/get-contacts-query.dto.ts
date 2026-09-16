import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class GetContactsQueryDto {
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by an exact city (territory) id' })
  @IsOptional()
  @IsUUID()
  territoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by province — matches any city under this province',
  })
  @IsOptional()
  @IsUUID()
  provinceId?: string;
}
