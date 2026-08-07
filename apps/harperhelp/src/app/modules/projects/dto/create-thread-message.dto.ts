import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateThreadMessageDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
  description: 'Array of user IDs mentioned in the message',
  type: [String],
})
@IsOptional()
@IsUUID('4', {
  each: true,
  message: 'Each mentioned user ID must be a valid UUID',
})
mentionedUserIds?: string[];

}
