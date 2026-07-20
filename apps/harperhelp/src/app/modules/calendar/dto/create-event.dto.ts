import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType } from '../entities/event.entity';

export class CreateEventDto {
  @ApiProperty({ example: 'Sprint Planning', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ enum: EventType })
  @IsEnum(EventType)
  type: EventType;

  @ApiProperty({ example: '2026-06-15', description: 'YYYY-MM-DD' })
  @IsISO8601({ strict: true })
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ example: 'Quarterly sprint kick-off' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: '#0f6e56',
    description: 'Hex color code',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{3,8}$/, {
    message: 'color must be a valid hex code e.g. #0f6e56',
  })
  color?: string;
}
