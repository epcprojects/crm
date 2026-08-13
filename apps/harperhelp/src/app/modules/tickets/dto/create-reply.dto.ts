import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUUID, ValidateNested, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UploadedFileDto } from '../../files/dto/uploaded-file.dto';

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
  @IsUUID('4', {
    each: true,
    message: 'Each mentioned user ID must be a valid UUID',
  })
  mentionedUserIds?: string[];

  @ApiPropertyOptional({
    description: 'Metadata for files already uploaded directly to S3',
    type: [UploadedFileDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadedFileDto)
  attachments?: UploadedFileDto[];
  
}

