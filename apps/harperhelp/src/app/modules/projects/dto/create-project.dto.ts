import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  category: string;

  @ApiProperty({ required: false })
  brandColor: string;

  @ApiProperty({ required: false })
  logoLetter: string;
}
