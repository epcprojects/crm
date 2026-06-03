import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  name: string;

  @IsString()
  @ApiProperty({ required: false })
  category: string;

  @IsString()
  @ApiProperty({ required: false })
  brandColor: string;

  @IsString()
  @ApiProperty({ required: false })
  logoLetter: string;
}
