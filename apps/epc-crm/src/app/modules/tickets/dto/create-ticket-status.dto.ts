import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTicketStatusDto {
  @ApiProperty()
  @IsString()
  @MaxLength(60)
  key: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsHexColor()
  color?: string;

    @ApiPropertyOptional()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Leads in a closed status are not counted as Active',
  })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}
