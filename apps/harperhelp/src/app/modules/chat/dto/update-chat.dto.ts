import { PartialType } from '@nestjs/swagger';
import { SendMessageDto } from './chat-message.dto';

export class UpdateChatDto extends PartialType(SendMessageDto) {}
