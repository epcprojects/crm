import { FileSource } from '@epc-crm/types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FilesService } from '../../files/files.service';
import { UtilityService } from '../../utility/utility.service';
import { TicketReply } from '../entities/ticket.reply.entity';
import { CreateReplyDto } from '../dto/create-reply.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailEventType } from '../../notifications/notifications.types';
import { Ticket } from '../entities/ticket.entity';
import { TicketRepliesGateway } from '../gateway/ticket-reply.gateway';
import { NotificationEntityType, NotificationType } from '@epc-crm/types';
import { UsersService } from '../../users/users.service';
import { extname } from 'path';
import { UpdateReplyDto } from '../dto/update-ticket-reply.dto';
import { ReactionsService } from '../../reactions/reactions.service';
import { Project } from '../../projects/entities/project.entity';
import { ProjectsService } from '../../projects/projects.service';
import { UploadedFileDto } from '../../files/dto/uploaded-file.dto';

@Injectable()
export class TicketRepliesService {
  constructor(
    @InjectRepository(TicketReply)
    private readonly replyRepo: Repository<TicketReply>,

    private readonly reactionsService: ReactionsService,
    private readonly projectsService: ProjectsService,
    private readonly filesService: FilesService,
    private readonly utilityService: UtilityService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly ticketRepliesGateway: TicketRepliesGateway,
  ) {}

  async create(
    projectId: string,
    ticketId: string,
    dto: CreateReplyDto,
    userId: string,
    files?: UploadedFileDto[],
  ) {
    if (!dto.message && !files?.length) {
      throw new BadRequestException(
        'Atleast one message is required to send a reply.',
      );
    }
    // const project = await this.ticketRepo.manager
    //   .getRepository('projects')
    //   .findOne({ where: { id: projectId } });
    // if (!project) throw new NotFoundException('Project not found');
    const ticket = await this.replyRepo.manager
      .getRepository(Ticket)
      .findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    await this.ensureProjectUserAccess(projectId, userId);

    const validMentionedUserIds =
      await this.projectsService.filterValidMentionedUserIds(
        projectId,
        dto.mentionedUserIds ?? [],
      );

    const reply = await this.replyRepo.save(
      this.replyRepo.create({
        ticketId,
        message: dto.message,
        authorId: userId,
        isInternal: dto.isInternal ?? false,
        mentionedUserIds: validMentionedUserIds,
        createdBy: userId,
      }),
    );

    if (files?.length) {
      await this.uploadAttachments(reply.id, files, userId, projectId);
    }

    // Dispatch reply notification (non-blocking)
    try {
      const ticket = await this.replyRepo.manager
        .getRepository(Ticket)
        .findOne({
          where: { id: ticketId },
          relations: {
            reporter: true,
            assignee: true,
            project: {
              members: true,
            },
          },
        });

      const members = (ticket.project?.members || [])
        .filter((m) => m.id !== userId)
        .map((m) => ({
          userId: m.id,
          name: m.fullName,
          email: m.email,
          isInvitationAccepted: m.isInvitationAccepted,
        }));

      const participantsMap = new Map<
        string,
        {
          userId: string;
          name: string;
          email: string;
          isInvitationAccepted?: boolean;
        }
      >();
      for (const m of members) participantsMap.set(m.email, m);
      if (ticket.reporter && ticket?.reporter?.id !== userId)
        participantsMap.set(ticket.reporter.email, {
          userId: ticket.reporter.id,
          name: ticket.reporter.fullName,
          email: ticket.reporter.email,
          isInvitationAccepted: ticket.reporter.isInvitationAccepted,
        });
      if (ticket.assignee && ticket?.assignee?.id !== userId)
        participantsMap.set(ticket.assignee.email, {
          userId: ticket.assignee.id,
          name: ticket.assignee.fullName,
          email: ticket.assignee.email,
          isInvitationAccepted: ticket.assignee.isInvitationAccepted, // Include the isInvitationAccepted property
        });

      const participants = Array.from(participantsMap.values());

      const filteredParticipants =
        await this.notificationsService.filterEmailRecipients(
          participants,
          EmailEventType.TICKET_REPLY_POSTED,
        );

      // const attachments = await this.utilityService.getEmailAttachmentLinks(
      //   files ?? []
      // );

      await this.notificationsService.dispatch({
        type: EmailEventType.TICKET_REPLY_POSTED,
        payload: {
          projectId: ticket?.project?.id,
          ticketId: ticketId,
          ticketNumber: ticket.ticketRefNo,
          ticketTitle: ticket.title,
          projectName: ticket.project?.name || '',
          replyContent: reply.message,
          isInternal: reply.isInternal,
          postedBy: {
            userId: userId,
            name:
              (
                await this.replyRepo.manager
                  .getRepository('users')
                  .findOne({ where: { id: userId } })
              )?.fullName || '',
            email: '',
          },
          participants: filteredParticipants,
          // attachments,
        },
      });
    } catch (err) {
      // ignore
    }

    // Email notifications for mentioned users (skip internal-only replies —
    // MENTIONED_IN_TICKET_REPLY is for external/regular replies)
    if (validMentionedUserIds?.length && !reply.isInternal) {
      const author = await this.replyRepo.manager
        .getRepository('users')
        .findOne({ where: { id: userId } });

      const mentionedUsersData = await this.replyRepo.manager
        .getRepository('users')
        .find({ where: { id: In(validMentionedUserIds) } });

      const mentionedRecipients = mentionedUsersData
        .filter((u) => u.id !== userId)
        .map((u) => ({
          userId: u.id,
          name: u.fullName,
          email: u.email,
        }));

      const filteredMentioned =
        await this.notificationsService.filterEmailRecipients(
          mentionedRecipients,
          EmailEventType.MENTIONED_IN_TICKET_REPLY,
        );

      for (const mentionedUser of filteredMentioned) {
        await this.notificationsService.dispatch({
          type: EmailEventType.MENTIONED_IN_TICKET_REPLY,
          payload: {
            projectId: ticket?.project?.id,
            ticketId: ticketId,
            ticketNumber: ticket.ticketRefNo,
            ticketTitle: ticket.title,
            projectName: ticket.project?.name || '',
            replyContent: reply.message,
            mentionedBy: {
              userId,
              name: author?.fullName || '',
              email: '',
            },
            mentionedUser,
          },
        });
      }
    }
    const createdReply = await this.findOne(reply.id);

    this.ticketRepliesGateway.broadcastReply(projectId, ticketId, createdReply);
    const fullname = await this.usersService.getFullName(userId);

    await this.notificationsService.notifyProjectMembers({
      projectId: ticket.projectId,
      actorId: userId,
      type: NotificationType.TICKET_REPLY,
      entityType: NotificationEntityType.TICKET_REPLY,
      entityId: reply.id,
      ticketId: ticket.id,
      title: `New reply in ticket: "${ticket.ticketRefNo}" by ${fullname}`,
      message: '',
      requiredClaimValue: dto.isInternal ? 'view_internal_replies' : undefined,
    });

    // Notify mentioned users
    if (validMentionedUserIds?.length) {
      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: userId,
        type: NotificationType.MENTIONED_IN_TICKET_REPLY,
        entityType: NotificationEntityType.TICKET_REPLY,
        entityId: reply.id,
        ticketId: ticket.id,
        title: `You were mentioned in a reply in ticket: "${ticket.ticketRefNo}" by ${fullname}`,
        message: '',
        explicitRecipientIds: validMentionedUserIds,
      });
    }
    return createdReply;
  }

  async update(
    projectId: string,
    ticketId: string,
    replyId: string,
    dto: UpdateReplyDto,
    userId: string,
    files?: UploadedFileDto[],
  ) {
    await this.ensureProjectUserAccess(projectId, userId);

    const reply = await this.replyRepo.findOne({
      where: {
        id: replyId,
        ticketId,
      },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    if (reply.authorId !== userId) {
      throw new BadRequestException('You can only edit your own replies.');
    }

    if (!dto.message && !files?.length) {
      throw new BadRequestException('Message or attachment is required.');
    }

    reply.message = dto.message ?? reply.message;

    let newlyMentionedUserIds: string[] = [];

    const {
      validMentionedUserIds,
      newlyMentionedUserIds: newMentionedUserIds,
    } = await this.projectsService.getMentionedUserChanges(
      projectId,
      reply.mentionedUserIds ?? [],
      dto.mentionedUserIds,
    );

    reply.mentionedUserIds = validMentionedUserIds;
    newlyMentionedUserIds = newMentionedUserIds;

    reply.updatedBy = userId;
    reply.updatedAt = new Date();

    await this.replyRepo.save(reply);

    const ticket = await this.replyRepo.manager.getRepository(Ticket).findOne({
      where: {
        id: ticketId,
        projectId,
      },
      relations: {project:true}
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Upload newly attached files
    if (files?.length) {
      await this.uploadAttachments(reply.id, files, userId, projectId);
    }

    const updatedReply = await this.findOne(reply.id);

    this.ticketRepliesGateway.broadcastUpdated(
      projectId,
      ticketId,
      updatedReply,
    );

    if (newlyMentionedUserIds.length) {
      const fullname = await this.usersService.getFullName(userId);

      await this.notificationsService.notifyProjectMembers({
        projectId,
        actorId: userId,
        type: NotificationType.MENTIONED_IN_TICKET_REPLY,
        entityType: NotificationEntityType.TICKET_REPLY,
        entityId: reply.id,
        ticketId: ticket.id,
        title: `You were mentioned in a reply in ticket: "${ticket.ticketRefNo}" by ${fullname}`,
        message: '',
        explicitRecipientIds: newlyMentionedUserIds,
      });
    
    if (!reply.isInternal) {
        try {
          const mentionedUsersData = await this.replyRepo.manager
            .getRepository('users')
            .find({ where: { id: In(newlyMentionedUserIds) } });

          const mentionedRecipients = mentionedUsersData
            .filter((u) => u.id !== userId)
            .map((u) => ({
              userId: u.id,
              name: u.fullName,
              email: u.email,
            }));

          const filteredMentioned =
            await this.notificationsService.filterEmailRecipients(
              mentionedRecipients,
              EmailEventType.MENTIONED_IN_TICKET_REPLY,
            );

          for (const mentionedUser of filteredMentioned) {
            await this.notificationsService.dispatch({
              type: EmailEventType.MENTIONED_IN_TICKET_REPLY,
              payload: {
                projectId,
                ticketId: ticket.id,
                ticketNumber: ticket.ticketRefNo,
                ticketTitle: ticket.title,
                projectName: ticket.project?.name || '',
                replyContent: reply.message,
                mentionedBy: {
                  userId,
                  name: fullname,
                  email: '',
                },
                mentionedUser,
              },
            });
          }
        } catch (err) {
          // ignore
        }
      }
    }
    return updatedReply;
  }

  // TODO: optimize N+1 issue
  async findByTicket(
    ticketId: string,
    limit = 30,
    cursor?: { createdAt: Date; id: string },
  ) {
    const ticket = await this.replyRepo.manager
      .getRepository(Ticket)
      .findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const qb = this.replyRepo
      .createQueryBuilder('reply')
      .leftJoinAndSelect('reply.author', 'author')
      .where('reply.ticketId = :ticketId', { ticketId })
      .andWhere('reply.deletedAt IS NULL')
      .orderBy('reply.createdAt', 'DESC')
      .addOrderBy('reply.id', 'DESC')
      .take(limit + 1); // Fetch one extra to check if there's a next page

    if (cursor) {
      qb.andWhere(
        '(reply.createdAt < :cursorCreatedAt OR (reply.createdAt = :cursorCreatedAt AND reply.id < :cursorId))',
        { cursorCreatedAt: cursor.createdAt, cursorId: cursor.id },
      );
    }
    const replies = await qb.getMany();

    const hasMore = replies.length > limit;
    const page = hasMore ? replies.slice(0, limit) : replies;

    const enriched = await Promise.all(
      page.map(async (reply) => {
        if (reply.author) delete reply.author.passwordHash;

        const [attachments, reactions] = await Promise.all([
          this.filesService.findBySource(FileSource.TICKET_REPLY, reply.id),
          this.reactionsService.getTicketReplyReactions(reply.id),
        ]);

        return { ...reply, attachments, reactions };
      }),
    );

    const last = page[page.length - 1];

    return {
      replies: enriched,
      hasMore,
      cursor: last ? { createdAt: last.createdAt, id: last.id } : undefined,
    };

    // const replies = await this.replyRepo.find({
    //   where: { ticketId },
    //   order: { createdAt: 'ASC' },
    //   relations: {
    //     author: true,
    //   },
    // });

    // return Promise.all(
    //   replies.map(async (reply) => {
    //     if (reply.author) {
    //       delete reply.author.passwordHash;
    //     }
    //     // delete reply.author['passwordHash'];

    //     const [attachments, reactions] = await Promise.all([
    //       this.filesService.findBySource(FileSource.TICKET_REPLY, reply.id),
    //       this.reactionsService.getTicketReplyReactions(reply.id),
    //     ]);

    //     return {
    //       ...reply,
    //       attachments,
    //       reactions,
    //       // attachments: await this.filesService.findBySource(
    //       //   FileSource.TICKET_REPLY,
    //       //   reply.id,
    //       // ),
    //     };
    //   }),
    // );
  }

  async findOne(id: string) {
    const reply = await this.replyRepo.findOne({
      where: { id },
    });

    if (!reply) throw new NotFoundException('Reply not found');

    const [attachments, reactions] = await Promise.all([
      this.filesService.findBySource(FileSource.TICKET_REPLY, id),
      this.reactionsService.getTicketReplyReactions(id),
    ]);

    return {
      ...reply,
      attachments,
      reactions,
    };
  }

  async uploadAttachments(
    replyId: string,
    files: UploadedFileDto[],
    userId: string,
    projectId: string,
  ) {
    for (const file of files) {
      // const key = `tickets/replies/${replyId}/${Date.now()}-${file.originalName}`;

      // await this.utilityService.uploadFile(file, key);

      const rawExt = extname(file.originalName); // e.g. '.DOCX' or ''
      const extension = rawExt ? rawExt.slice(1).toLowerCase() : 'unknown';

      await this.filesService.create({
        projectId,
        uploadedBy: userId,
        originalName: file.originalName,
        storageKey: file.storageKey,
        sizeBytes: file.sizeBytes,
        // extension: file.mimetype.split('/')[1],
        extension: extension,
        mimeType: file.mimeType,
        source: FileSource.TICKET_REPLY,
        sourceId: replyId,
      });
    }
  }

  async softRemove(
    projectId: string,
    ticketId: string,
    replyId: string,
    userId: string,
  ) {
    await this.ensureProjectUserAccess(projectId, userId);

    const reply = await this.replyRepo.findOne({
      where: {
        id: replyId,
        ticketId,
      },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    if (reply.authorId !== userId) {
      throw new BadRequestException('You can only delete your own replies.');
    }

    reply.updatedBy = userId;
    await this.replyRepo.save(reply);

    await this.replyRepo.softDelete({ id: replyId, ticketId });

    this.ticketRepliesGateway.broadcastDeleted(projectId, ticketId, replyId);

    return { id: replyId, deleted: true };
  }

  async addReaction(
    projectId: string,
    ticketId: string,
    replyId: string,
    user,
    emoji: string,
  ) {
    await this.ensureProjectUserAccess(projectId, user.id);
    const ticket = await this.replyRepo.manager.getRepository(Ticket).findOne({
      where: {
        id: ticketId,
        projectId,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const reply = await this.replyRepo.findOne({
      where: {
        id: replyId,
        ticketId,
      },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    await this.reactionsService.addTicketReplyReaction(replyId, user.id, emoji);

    const updated = await this.findOne(replyId);

    if (updated.authorId !== user.id) {
      await this.notificationsService.notifyProjectMembers({
        projectId,
        ticketId,
        actorId: user.id,
        explicitRecipientIds: [updated.authorId],

        type: NotificationType.TICKET_REPLY_REACTION,
        entityType: NotificationEntityType.TICKET_REPLY,
        entityId: updated.id,

        title: `${user.fullName} reacted to your reply in ticket "${ticket.ticketRefNo}"`,
        message: emoji,
      });
    }

    this.ticketRepliesGateway.broadcastReacted(projectId, ticketId, updated);
    // console.debug(`after broadcast Broadcasting updated reply for ticket ${ticketId} in project ${projectId}:`, updated);
    return updated;
  }

  async removeReaction(
    projectId: string,
    ticketId: string,
    replyId: string,
    userId: string,
  ) {
    await this.ensureProjectUserAccess(projectId, userId);

    const ticket = await this.replyRepo.manager.getRepository(Ticket).findOne({
      where: {
        id: ticketId,
        projectId,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const reply = await this.replyRepo.findOne({
      where: {
        id: replyId,
        ticketId,
      },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }
    await this.reactionsService.removeTicketReplyReaction(replyId, userId);

    const updated = await this.findOne(replyId);

    this.ticketRepliesGateway.broadcastReacted(projectId, ticketId, updated);
    return updated;
    //
  }

  private async ensureProjectUserAccess(projectId: string, userId: string) {
    const hasAccess = await this.replyRepo.manager
      .getRepository(Project)
      .createQueryBuilder('p')
      .innerJoin('p.members', 'm', 'm.id = :userId', { userId })
      .where('p.id = :projectId', { projectId })
      .getExists();

    if (!hasAccess) {
      throw new ForbiddenException('Project Not Found or Access Denied');
    }
  }
}
