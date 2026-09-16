import { PartialType } from '@nestjs/swagger';
import { NotifyProjectMembersDto } from './create-notification.dto';

export class UpdateNotificationDto extends PartialType(
  NotifyProjectMembersDto,
) {}
