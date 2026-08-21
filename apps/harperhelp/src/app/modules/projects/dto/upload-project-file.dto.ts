import { ApiPropertyOptional } from "@nestjs/swagger";
import { UploadedFileDto } from "../../files/dto/uploaded-file.dto";
import { IsArray, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

  export class UploadProjectFileDto {
  @ApiPropertyOptional({
    description: 'Metadata for files already uploaded directly to S3',
    type: [UploadedFileDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadedFileDto)
  attachments?: UploadedFileDto[];}