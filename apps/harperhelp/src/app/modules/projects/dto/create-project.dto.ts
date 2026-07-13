import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

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
}
