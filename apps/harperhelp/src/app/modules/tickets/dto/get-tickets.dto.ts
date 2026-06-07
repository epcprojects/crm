import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class GetTicketsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  statusKey?: string;

  @IsOptional()
  @IsString()
  priorityKey?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  reporterId?: string;

  @IsOptional()
  @Type(() => Number)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  limit = 20;
}
