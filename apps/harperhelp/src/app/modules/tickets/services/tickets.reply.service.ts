import { FileSource } from '@harperhelp/types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilesService } from '../../files/files.service';
import { UtilityService } from '../../utility/utility.service';
import { TicketReply } from '../entities/ticket.reply.entity';
import { CreateReplyDto } from '../dto/create-reply.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailEventType } from '../../notifications/notifications.types';
import { Ticket } from '../entities/ticket.entity';
import { TicketRepliesGateway } from '../gateway/ticket-reply.gateway';
import { NotificationEntityType, NotificationType } from '@harperhelp/types';
import { UsersService } from '../../users/users.service';
import { extname } from 'path';
import { UpdateReplyDto } from '../dto/update-ticket-reply.dto';
import { ReactionsService } from '../../reactions/reactions.service';
import { Project } from '../../projects/entities/project.entity';
import { ProjectsService } from '../../projects/projects.service';

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
    files?: Express.Multer.File[],
  ) {
    if (!dto.message && !files.length) {
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
          name: m.fullName,
          email: m.email,
          isInvitationAccepted: m.isInvitationAccepted,
        }));

      const participantsMap = new Map<
        string,
        { name: string; email: string; isInvitationAccepted?: boolean }
      >();
      for (const m of members) participantsMap.set(m.email, m);
      if (ticket.reporter && ticket?.reporter?.id !== userId)
        participantsMap.set(ticket.reporter.email, {
          name: ticket.reporter.fullName,
          email: ticket.reporter.email,
          isInvitationAccepted: ticket.reporter.isInvitationAccepted,
        });
      if (ticket.assignee && ticket?.assignee?.id !== userId)
        participantsMap.set(ticket.assignee.email, {
          name: ticket.assignee.fullName,
          email: ticket.assignee.email,
          isInvitationAccepted: ticket.assignee.isInvitationAccepted, // Include the isInvitationAccepted property
        });

      const participants = Array.from(participantsMap.values());

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
            name:
              (
                await this.replyRepo.manager
                  .getRepository('users')
                  .findOne({ where: { id: userId } })
              )?.fullName || '',
            email: '',
          },
          participants,
        },
      });
    } catch (err) {
      // ignore
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

    return createdReply;
  }

  async update(
    projectId: string,
    ticketId: string,
    replyId: string,
    dto: UpdateReplyDto,
    userId: string,
    files?: Express.Multer.File[],
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

    if (dto.mentionedUserIds !== undefined) {
      reply.mentionedUserIds =
        await this.projectsService.filterValidMentionedUserIds(
          projectId,
          dto.mentionedUserIds,
        );
    }
    reply.updatedBy = userId;
    reply.updatedAt = new Date();

    await this.replyRepo.save(reply);

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

    return updatedReply;
  }

  // TODO: optimize N+1 issue
  async findByTicket(ticketId: string) {
    const ticket = await this.replyRepo.manager
      .getRepository(Ticket)
      .findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const replies = await this.replyRepo.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
      relations: {
        author: true,
      },
    });

    return Promise.all(
      replies.map(async (reply) => {
        if (reply.author) {
          delete reply.author.passwordHash;
        }
        // delete reply.author['passwordHash'];

        const [attachments, reactions] = await Promise.all([
          this.filesService.findBySource(FileSource.TICKET_REPLY, reply.id),
          this.reactionsService.getTicketReplyReactions(reply.id),
        ]);

        return {
          ...reply,
          attachments,
          reactions,
          // attachments: await this.filesService.findBySource(
          //   FileSource.TICKET_REPLY,
          //   reply.id,
          // ),
        };
      }),
    );
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
    files: Express.Multer.File[],
    userId: string,
    projectId: string,
  ) {
    for (const file of files) {
      const key = `tickets/replies/${replyId}/${Date.now()}-${file.originalname}`;

      await this.utilityService.uploadFile(file, key);

      const rawExt = extname(file.originalname); // e.g. '.DOCX' or ''
      const extension = rawExt ? rawExt.slice(1).toLowerCase() : 'unknown';

      await this.filesService.create({
        projectId,
        uploadedBy: userId,
        originalName: file.originalname,
        storageKey: key,
        sizeBytes: file.size,
        // extension: file.mimetype.split('/')[1],
        extension: extension,
        mimeType: file.mimetype,
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
