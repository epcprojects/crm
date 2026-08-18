import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateReplyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({
    description: 'Array of user IDs mentioned in the message',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Array.isArray(value) ? value : [value];
  })
  @IsUUID('loose', {
    each: true,
    message: 'Each mentioned user ID must be a valid UUID',
  })
  mentionedUserIds?: string[];
}
