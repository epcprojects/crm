import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  MaxLength,
  IsNotEmpty,
  IsArray,
} from 'class-validator';
import { MessageType } from '../entities/chat-message-internal.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SendMessageDto {
  @ApiPropertyOptional()
  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType = MessageType.TEXT;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({
    description: 'Array of user IDs mentioned in the message',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Array.isArray(value) ? value : [value];
  })
  @IsUUID('loose', {
    each: true,
    message: 'Each mentioned user ID must be a valid UUID',
  })
  mentionedUserIds?: string[];

  // Populated server-side after S3 upload — not supplied raw by client
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  attachmentUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  attachmentName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  attachmentSize?: number;
}

export class MarkReadDto {
  @IsUUID('loose', { each: true })
  messageIds: string[];
}

export class GetMessagesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;

  // cursor-based pagination — pass createdAt of oldest loaded message
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  before?: string;
}

export class MessageResponseDto {
  id: string;
  projectId: string;
  ticketId: string;
  senderId: string;
  receiverId: string;
  messageType: MessageType;
  message: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  sender: { id: string; name: string; avatarUrl?: string };
  receiver: { id: string; name: string; avatarUrl?: string };
}

export class UnreadCountDto {
  internal: number;
  external: number;
}
