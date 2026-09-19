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
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { UploadedFileDto } from '../../files/dto/uploaded-file.dto';
import { TicketType } from '../enum/ticket-type.enum';

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

  @ApiProperty({ enum: TicketType })
  @IsNotEmpty()
  @IsEnum(TicketType, {
    message: 'ticketType must be either bug or feature_request',
  })
  ticketType: TicketType;

  @Transform(({ value }) => (value === '' ? null : value))
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priorityKey?: string;

  @Transform(({ value }) => (value === '' ? null : value))
  @ApiPropertyOptional({ description: 'User the lead is assigned to' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'Contact (lead) this ticket is for' })
  @IsNotEmpty()
  @IsUUID()
  contactId: string;

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
