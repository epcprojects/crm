// dto/kanban-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class KanbanQueryDto {
  @ApiPropertyOptional({ description: 'Search title, description, ticketRefNo' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ type: [String], description: 'Filter to specific project IDs' })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsUUID('4', { each: true })
  projectIds?: string[];

  @ApiPropertyOptional({ description: 'Filter by priority key' })
  @IsOptional()
  @IsString()
  priorityKey?: string;
}