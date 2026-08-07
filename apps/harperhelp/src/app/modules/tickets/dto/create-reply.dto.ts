import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateReplyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

@IsOptional()
  @ApiPropertyOptional({
    description: 'Array of user IDs mentioned in the reply',
    type: [String],
  })
  @IsUUID('4', { each: true, message: 'Each mentioned user ID must be a valid UUID' })
  mentionedUserIds?: string[];
}
