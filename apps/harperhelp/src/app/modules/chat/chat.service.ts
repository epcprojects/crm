import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ChatMessageInternal } from './entities/chat-message-internal.entity';
import { ChatMessageExternal } from './entities/chat-message-external.entity';
import { SendMessageDto, GetMessagesQueryDto } from './dto/chat-message.dto';
import { Ticket } from '../tickets/entities/ticket.entity';
import {
  NotificationEntityType,
  NotificationType,
  UserType,
} from '@harperhelp/types';
// } from 'libs/shared/types/src/lib/types';
import { UpdateChatDto } from './dto/update-chat.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { TicketsService } from '../tickets/tickets.service';
import { ReactionsService } from '../reactions/reactions.service';
import { Project } from '../projects/entities/project.entity';
import { ProjectsService } from '../projects/projects.service';

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
    private readonly usersService: UsersService,
    private readonly ticketsService: TicketsService,
    private readonly notificationsService: NotificationsService,
    private readonly reactionsService: ReactionsService,
    private readonly projectsService: ProjectsService,
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
    const mentionedUserIds =
      await this.projectsService.filterValidMentionedUserIds(
        projectId,
        dto.mentionedUserIds ?? [],
      );

    const message = this.repo(channel).create({
      projectId,
      ticketId,
      senderId,
      // receiverId: dto.receiverId,
      messageType: dto.messageType,
      message: dto.message,
      mentionedUserIds: mentionedUserIds,
      attachmentUrls: dto.attachmentUrls ?? null,
      attachmentName: dto.attachmentName ?? null,
      attachmentSize: dto.attachmentSize ?? null,
    });

    const saved = await this.repo(channel).save(message);
    const fullname = await this.usersService.getFullName(senderId);
    const ticketRefNo = await this.ticketsService.findTicketRefNo(ticketId);

    await this.notificationsService.notifyProjectMembers({
      projectId: projectId,
      actorId: senderId,
      type: NotificationType.INTERNAL_MESSAGE,
      entityType: NotificationEntityType.INTERNAL_MESSAGE,
      entityId: saved.id,
      ticketId: ticketId,
      title: `New Internal Message in ticket "${ticketRefNo}" from ${fullname}`,
      message: '',
      // requiredClaimValue: dto.isInternal ? 'view_internal_replies' : undefined,
    });

    if (mentionedUserIds.length) {
      await this.notificationsService.notifyProjectMembers({
        projectId: projectId,
        actorId: senderId,
        type: NotificationType.MENTIONED_IN_INTERNAL_MESSAGE,
        entityType: NotificationEntityType.INTERNAL_MESSAGE,
        entityId: saved.id,
        ticketId: ticketId,
        title: `You were mentioned in an Internal Message in ticket "${ticketRefNo}" from ${fullname}`,
        message: '',
        explicitRecipientIds: mentionedUserIds,
      });
    }

    // Reload with sender/receiver populated for broadcast payload
    return this.repo(channel).findOne({
      where: { id: saved.id },
      relations: {
        sender: true,
      },
    });
  }

  async update(
    channel: ChatChannel,
    messageId: string,
    requesterId: string,
    dto: UpdateChatDto,
  ) {
    const repository = this.repo(channel);

    const message = await repository.findOne({
      where: { id: messageId },
      relations: {
        sender: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.isDeleted) {
      throw new ForbiddenException('Cannot edit a deleted message');
    }

    if (message.senderId !== requesterId) {
      throw new ForbiddenException("Cannot edit another user's message");
    }

    let newlyMentionedUserIds: string[] = [];

    const {
      validMentionedUserIds,
      newlyMentionedUserIds: newMentionedUserIds,
    } = await this.projectsService.getMentionedUserChanges(
      message.projectId,
      message.mentionedUserIds ?? [],
      dto.mentionedUserIds,
    );

    message.mentionedUserIds = validMentionedUserIds;
    newlyMentionedUserIds = newMentionedUserIds;

    repository.merge(message, {
      message: dto.message,
      messageType: dto.messageType ?? message.messageType,
      attachmentUrls: dto.attachmentUrls ?? message.attachmentUrls,
      attachmentName: dto.attachmentName ?? message.attachmentName,
      attachmentSize: dto.attachmentSize ?? message.attachmentSize,
      updatedAt: new Date(),
    });

    const updated = await repository.save(message);
    const fullname = await this.usersService.getFullName(requesterId);
    const ticketRefNo = await this.ticketsService.findTicketRefNo(
      updated.ticketId,
    );

    if (newlyMentionedUserIds.length) {
      await this.notificationsService.notifyProjectMembers({
        projectId: updated.projectId,
        actorId: updated.senderId,
        type: NotificationType.MENTIONED_IN_INTERNAL_MESSAGE,
        entityType: NotificationEntityType.INTERNAL_MESSAGE,
        entityId: updated.id,
        ticketId: updated.ticketId,
        title: `You were mentioned in an Internal Message in ticket "${ticketRefNo}" from ${fullname}`,
        message: '',
        explicitRecipientIds: newlyMentionedUserIds,
      });
    }

    const updatedMessage = await repository.findOne({
      where: { id: updated.id },
      relations: {
        sender: true,
      },
    });

    return {
      ...updatedMessage,
      reactions: await this.reactionsService.getInternalChatReactions(
        updated.id,
      ),
    };
  }

  // Fetch history (cursor-based pagination)

  async getMessages(
  projectId: string,
  channel: ChatChannel,
  ticketId: string,
  query: GetMessagesQueryDto,
) {
  const limit = query.limit ? Math.min(query.limit, 100) : 30;

  const qb = this.repo(channel)
    .createQueryBuilder('msg')
    .leftJoinAndSelect('msg.sender', 'sender')
    .where('msg.ticketId = :ticketId', { ticketId })
    .andWhere('msg.isDeleted = false')
    .andWhere('msg.deletedAt IS NULL')
    .orderBy('msg.createdAt', 'DESC')
    .addOrderBy('msg.id', 'DESC')
    .take(limit + 1);

  if (query.cursorCreatedAt && query.cursorId) {
    qb.andWhere(
      '(msg.createdAt < :cCreatedAt OR (msg.createdAt = :cCreatedAt AND msg.id < :cId))',
      { cCreatedAt: new Date(query.cursorCreatedAt), cId: query.cursorId },
    );
  }

  const rows = await qb.getMany();
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const enriched = await Promise.all(
    page.map(async (msg) => ({
      ...msg,
      reactions: await this.reactionsService.getInternalChatReactions(msg.id),
    })),
  );

  const last = page[page.length - 1];

  return {
    messages: enriched,
    cursor: hasMore ? { createdAt: last.createdAt, id: last.id } : null,
    hasMore,
  };
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
  ) {
    const msg = await this.repo(channel).findOne({ where: { id: messageId } });

    if (!msg) throw new NotFoundException('Message not found');
    if (msg.senderId !== requesterId)
      throw new ForbiddenException("Cannot delete another user's message");

    await this.repo(channel).softDelete(messageId);

    await this.repo(channel).update(messageId, {
      isDeleted: true,
      // deletedAt: new Date(),
      message: '[Message deleted]',
    });

    return {
      messageId,
      pid: msg.projectId,
      tid: msg.ticketId,
      senderId: msg.senderId,
    };
  }

  async addReaction(
    projectId: string,
    ticketId: string,
    channel: ChatChannel,
    messageId: string,
    user,
    emoji: string,
  ) {
    if (channel.toLowerCase() !== 'internal') {
      throw new BadRequestException(
        'Reactions are only supported for internal chat.',
      );
    }

    await this.ensureProjectUserAccess(projectId, user.id);

    const ticket = await this.repo(channel)
      .manager.getRepository(Ticket)
      .findOne({
        where: {
          id: ticketId,
          projectId,
        },
      });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const message = await this.repo(channel).findOne({
      where: {
        id: messageId,
        ticketId,
        isDeleted: false,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.reactionsService.addInternalChatReaction(
      messageId,
      user.id,
      emoji,
    );
    const updated = await this.repo(channel).findOne({
      where: { id: messageId },
      relations: {
        sender: true,
      },
    });

    if (updated.senderId !== user.id) {
      await this.notificationsService.notifyProjectMembers({
        projectId,
        ticketId,
        actorId: user.id,
        explicitRecipientIds: [updated.senderId],

        type: NotificationType.INTERNAL_MESSAGE_REACTION,
        entityType: NotificationEntityType.INTERNAL_MESSAGE,
        entityId: updated.id,

        title: `${user.fullName} reacted to your Message in Internal Chat, ticket "${ticket.ticketRefNo}"`,
        message: emoji,
      });
    }

    const payload = {
      ...updated,
      reactions:
        await this.reactionsService.getInternalChatReactions(messageId),
    };

    return { ...payload };
  }

  async removeReaction(
    projectId: string,
    ticketId: string,
    channel: ChatChannel,
    messageId: string,
    userId: string,
  ) {
    if (channel.toLowerCase() !== 'internal') {
      throw new BadRequestException(
        'Reactions are only supported for internal chat.',
      );
    }

    await this.ensureProjectUserAccess(projectId, userId);

    const ticket = await this.repo(channel)
      .manager.getRepository(Ticket)
      .findOne({
        where: {
          id: ticketId,
          projectId,
        },
      });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const message = await this.repo(channel).findOne({
      where: {
        id: messageId,
        ticketId,
        isDeleted: false,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.reactionsService.removeInternalChatReaction(messageId, userId);
    const updated = await this.repo(channel).findOne({
      where: { id: messageId },
      relations: {
        sender: true,
      },
    });

    const payload = {
      ...updated,
      reactions:
        await this.reactionsService.getInternalChatReactions(messageId),
    };

    return { ...payload };
  }

  private async ensureProjectUserAccess(projectId: string, userId: string) {
    const hasAccess = await this.repo('internal')
      .manager.getRepository(Project)
      .createQueryBuilder('project')
      .innerJoin('project.members', 'member', 'member.id = :userId', { userId })
      .where('project.id = :projectId', { projectId })
      .getExists();

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project.');
    }
  }
}
