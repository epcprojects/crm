import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class GetTicketAssigneesQueryDto {
  @ApiPropertyOptional({
    type: [String],
    isArray: true,
    description:
      'Restrict to assignees of tickets in these projects (must still be projects the caller can see).',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsUUID('loose', { each: true })
  projectIds?: string[];
}
