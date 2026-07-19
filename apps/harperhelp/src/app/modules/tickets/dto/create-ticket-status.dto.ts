import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
