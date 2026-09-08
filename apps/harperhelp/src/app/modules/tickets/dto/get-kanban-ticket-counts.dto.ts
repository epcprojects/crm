import { IsArray, IsOptional, IsString, IsUUID } from "class-validator";

export class GetKanbanTicketCountsDto {
  @IsOptional()
  @IsString()
  priorityKey?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  projectIds?: string[];
}