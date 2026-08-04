import { PartialType } from '@nestjs/swagger';
import { CreateThreadMessageDto } from './create-thread-message.dto';

export class UpdateThreadMessageDto extends PartialType(
  CreateThreadMessageDto,
) {}
