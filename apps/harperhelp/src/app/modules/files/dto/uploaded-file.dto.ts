import { IsString, IsNotEmpty, IsInt, Min, IsMimeType } from 'class-validator';

export class UploadedFileDto {
  @IsString()
  @IsNotEmpty()
  storageKey: string;

  @IsString()
  @IsNotEmpty()
  originalName: string;

  @IsMimeType()
  mimeType: string;

  @IsInt()
  @Min(1)
  sizeBytes: number;
}