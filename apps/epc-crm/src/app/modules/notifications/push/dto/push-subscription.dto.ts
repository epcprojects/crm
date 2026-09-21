import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class PushSubscriptionKeysDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  auth: string;
}

export class SubscribePushDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1024)
  endpoint: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}

export class UnsubscribePushDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  endpoint: string;
}
