import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  MaxLength,
  IsOptional,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { UploadedFileDto } from '../../files/dto/uploaded-file.dto';

export class CreateTicketDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  statusKey: string;

  @Transform(({ value }) => (value === '' ? null : value))
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priorityKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
  
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
