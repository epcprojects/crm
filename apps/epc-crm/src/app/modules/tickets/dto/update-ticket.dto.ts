import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsOptional,
  IsEnum,
  IsUUID,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { TicketType } from '../enum/ticket-type.enum';
import { UploadedFileDto } from '../../files/dto/uploaded-file.dto';
import { Type } from 'class-transformer';

export class UpdateTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusKey?: string;

  @IsOptional()
  @IsEnum(TicketType, {
    message: 'ticketType must be either bug or feature_request',
  })
  ticketType: TicketType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priorityKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Contact (lead) this ticket is for' })
  @IsOptional()
  @IsUUID()
  contactId?: string;

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
