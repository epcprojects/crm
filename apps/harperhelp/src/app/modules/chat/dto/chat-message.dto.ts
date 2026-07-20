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
  @IsUUID('4', { each: true })
  messageIds: string[];
}

export class GetMessagesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number = 50;

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
