import { IsBoolean } from 'class-validator';

export class UpdateEmailPreferenceDto {
  @IsBoolean()
  enabled: boolean;
}