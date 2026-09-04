import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { UploadedFileDto } from '../../files/dto/uploaded-file.dto';
import { Type } from 'class-transformer';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  name: string;

  @IsString()
  @ApiPropertyOptional()
  category?: string;

  @IsString()
  @ApiPropertyOptional()
  brandColor?: string;

  @IsString()
  @ApiPropertyOptional()
  logoLetter?: string;

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
