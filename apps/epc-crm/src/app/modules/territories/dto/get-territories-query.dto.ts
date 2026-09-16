import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TerritoryType } from '../entities/territory.entity';

export class GetTerritoriesQueryDto {
  @ApiPropertyOptional({ enum: TerritoryType })
  @IsOptional()
  @IsEnum(TerritoryType)
  type?: TerritoryType;

  @ApiPropertyOptional({
    description: 'Filter by parent territory (e.g. cities of a province)',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
