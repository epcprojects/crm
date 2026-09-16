import { OmitType, PartialType } from '@nestjs/swagger';
import { InviteUserDto } from './invite-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(InviteUserDto, ['email'] as const),
) {}
