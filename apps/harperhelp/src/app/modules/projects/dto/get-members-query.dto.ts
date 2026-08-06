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

  @ApiPropertyOptional({
    description: 'Filter users assigned to any of the specified projects.',
    type: [String],
    format: 'uuid',
  })
  @IsOptional()
  @Transform(({ value }) => {
    const values = Array.isArray(value) ? value : [value];

    return values
      .flatMap((item) =>
        typeof item === 'string' ? item.split(',') : [item],
      )
      .map((item) => (typeof item === 'string' ? item.trim() : item))
      .filter(Boolean);
  })
  @IsArray()
  @IsUUID('4', { each: true })
  projectIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter users assigned to a specific role.',
    format: 'uuid',
  })
  @IsOptional()
  // @IsUUID()
  roleId?: string;

    @ApiPropertyOptional({
    description: 'Optional Sort parameter to sort by following fields: updatedAt, createdAt, fullName',
    example: 'updatedAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'fullName' | 'createdAt' | 'updatedAt';
}
