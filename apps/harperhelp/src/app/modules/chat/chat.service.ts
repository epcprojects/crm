import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ChatMessageInternal } from './entities/chat-message-internal.entity';
import { ChatMessageExternal } from './entities/chat-message-external.entity';
import { SendMessageDto, GetMessagesQueryDto } from './dto/chat-message.dto';
import { Ticket } from '../tickets/entities/ticket.entity';
import { UserType } from 'libs/shared/types/src/lib/types';

export type ChatChannel = 'internal' | 'external';

// Role access matrix
const CHANNEL_ACCESS: Record<string, ChatChannel[]> = {
  admin: ['internal', 'external'],
  project_manager: ['internal', 'external'],
  developer: ['internal'],
  external: ['external'],
};

@Injectable()
export class ChatMessagesService {
  private readonly logger = new Logger(ChatMessagesService.name);

  constructor(
    @InjectRepository(ChatMessageInternal)
    private readonly internalRepo: Repository<ChatMessageInternal>,

    @InjectRepository(ChatMessageExternal)
    private readonly externalRepo: Repository<ChatMessageExternal>,
  ) {}

  // Access helpers

  getAllowedChannels(role: string): ChatChannel[] {
    return CHANNEL_ACCESS[role] ?? [];
  }

  canAccessChannel(role: string, channel: ChatChannel): boolean {
    return this.getAllowedChannels(role).includes(channel);
  }

  assertAccess(role: string, channel: ChatChannel): void {
    if (!this.canAccessChannel(role, channel)) {
      throw new ForbiddenException(
        `Role '${role}' cannot access '${channel}' channel`,
      );
    }
  }

  // External users may only read their own ticket conversations
  async assertExternalTicketAccess(
    userId: string,
    ticketId: string,
  ): Promise<void> {
    const owns = await this.externalRepo.manager
      .getRepository(Ticket)
      .exists({ where: { id: ticketId, reporterId: userId } });

    if (!owns) {
      throw new ForbiddenException('Access denied to this ticket');
    }
  }

  private repo(channel: ChatChannel) {
    return channel === 'internal' ? this.internalRepo : this.externalRepo;
  }

  // Send

  async send(
    channel: ChatChannel,
    projectId: string,
    ticketId: string,
    senderId: string,
    dto: SendMessageDto,
  ) {
    const message = this.repo(channel).create({
      projectId,
      ticketId,
      senderId,
      // receiverId: dto.receiverId,
      messageType: dto.messageType,
      message: dto.message,
      attachmentUrls: dto.attachmentUrls ?? null,
      attachmentName: dto.attachmentName ?? null,
      attachmentSize: dto.attachmentSize ?? null,
    });

    const saved = await this.repo(channel).save(message);

    // Reload with sender/receiver populated for broadcast payload
    return this.repo(channel).findOne({
      where: { id: saved.id },
      relations: {
        sender: true,
      },
    });
  }

  // Fetch history (cursor-based pagination)

  async getMessages(
    channel: ChatChannel,
    ticketId: string,
    query: GetMessagesQueryDto,
  ) {
    const where: any = { ticketId, isDeleted: false };

    if (query.before) {
      where.createdAt = LessThan(new Date(query.before));
    }

    return this.repo(channel).find({
      where,
      relations: {
        sender: true,
      },
      order: { createdAt: 'ASC' },
      take: query.limit ?? 50,
    });
  }

  // - Mark read
  async markRead(
    channel: ChatChannel,
    ticketId: string,
    receiverId: string,
    messageIds: string[],
  ): Promise<void> {
    await this.repo(channel)
      .createQueryBuilder()
      .update()
      .set({ isRead: true, readAt: new Date() })
      .where('id IN (:...ids)', { ids: messageIds })
      .andWhere('ticket_id = :ticketId', { ticketId })
      // .andWhere('receiver_id = :receiverId', { receiverId })
      .andWhere('is_read = false')
      .execute();
  }

  // - Unread counts
  async getUnreadCounts(
    ticketId: string,
    userId: string,
    userType: string,
  ): Promise<{ internal: number; external: number }> {
    const [internal, external] = await Promise.all([
      userType === UserType.INTERNAL
        ? this.internalRepo.count({
            where: {
              ticketId,
              senderId: userId,
              isRead: false,
              isDeleted: false,
            },
          })
        : Promise.resolve(0),

      userType === UserType.EXTERNAL
        ? this.externalRepo.count({
            where: {
              ticketId,
              senderId: userId,
              isRead: false,
              isDeleted: false,
            },
          })
        : Promise.resolve(0),
    ]);

    return { internal, external };
  }

  // - Soft delete

  async softDelete(
    channel: ChatChannel,
    messageId: string,
    requesterId: string,
  ): Promise<void> {
    const msg = await this.repo(channel).findOne({ where: { id: messageId } });

    if (!msg) throw new NotFoundException('Message not found');
    if (msg.senderId !== requesterId)
      throw new ForbiddenException("Cannot delete another user's message");

    await this.repo(channel).update(messageId, {
      isDeleted: true,
      deletedAt: new Date(),
      message: '[Message deleted]',
    });
  }
}
