import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetMembersQueryDto {
  @ApiPropertyOptional({
    description: 'Search users by full name or email.',
    example: 'test',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter users by invitation acceptance status.',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  isInvitationAccepted?: boolean;

  @ApiPropertyOptional({ type: [String], isArray: true })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : Array.isArray(value) ? value : [value],
  )
  @IsArray()
  @IsUUID('loose', { each: true })
  projectIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter users assigned to a specific role.',
    format: 'uuid',
  })
  @IsOptional()
  // @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({
    description:
      'Optional Sort parameter to sort by following fields: updatedAt, createdAt, fullName',
    example: 'updatedAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'fullName' | 'createdAt' | 'updatedAt';
}
