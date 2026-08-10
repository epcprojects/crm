import { FileSource } from '@harperhelp/types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { FilesService } from '../../files/files.service';
import { UtilityService } from '../../utility/utility.service';
import { ThreadMessage } from '../entities/thread-messages.entity';
import { CreateThreadMessageDto } from '../dto/create-thread-message.dto';
import { EmailEventType } from '../../notifications/notifications.types';
import { NotificationsService } from '../../notifications/notifications.service';
import { Project } from '../entities/project.entity';
import { ThreadGateway } from '../gateway/thread.gateway';
import { NotificationEntityType, NotificationType } from '@harperhelp/types';
import { extname } from 'path';
import { UpdateThreadMessageDto } from '../dto/update-thread-message.dto';
import { ReactionsService } from '../../reactions/reactions.service';
import { ProjectsService } from '../projects.service';

@Injectable()
export class ThreadService {
  constructor(
    @InjectRepository(ThreadMessage)
    private readonly repo: Repository<ThreadMessage>,

    private readonly filesService: FilesService,
    private readonly utilityService: UtilityService,
    private readonly projectsService: ProjectsService,
    private readonly notificationsService: NotificationsService,
    private readonly reactionsService: ReactionsService,
    private readonly threadGateway: ThreadGateway,
  ) {}

  async create(
    projectId: string,
    dto: CreateThreadMessageDto,
    user: any,
    files?: Express.Multer.File[],
  ) {
    if (!dto.message && !files.length) {
      throw new BadRequestException('Atleast one message is required.');
    }

    const project = await this.repo.manager
      .getRepository(Project)
      .findOne({ where: { id: projectId }, relations: { members: true } });
    if (!project) throw new NotFoundException('Project not found');

    const mentionedUserIds =
      await this.projectsService.filterValidMentionedUserIds(
        projectId,
        dto.mentionedUserIds ?? [],
      );
    const message = await this.repo.save(
      this.repo.create({
        projectId,
        message: dto.message,
        mentionedUserIds,
        authorId: user.id,
        createdBy: user.id,
        parentId: dto.parentId,
      }),
    );

    if (dto.parentId) {
      await this.repo.increment({ id: dto.parentId }, 'replyCount', 1);
    }

    if (files?.length) {
      await this.uploadAttachments(message.id, projectId, files, user.id);
    }

    const msg = await this.findOne(message.id, true);

    if (dto.parentId) {
      this.threadGateway.broadcastReply(projectId, {
        id: msg.id,
        message: msg.message,
        parentId: msg.parentId,
        authorId: msg.authorId,
        createdAt: msg.createdAt,
        attachments: msg.attachments,
      });
    } else {
      this.threadGateway.broadcastMessage(projectId, {
        id: msg.id,
        message: msg.message,
        parentId: msg.parentId,
        authorId: msg.authorId,
        createdAt: msg.createdAt,
        attachments: msg.attachments,
      });
    }

    const participants = (msg?.project?.members || [])
      .filter((m) => m.id !== user.id)
      .map((m) => ({
        name: m.fullName,
        email: m.email,
        isInvitationAccepted: m.isInvitationAccepted, // Include the isInviteAccepted property
      }));

    // Call notification service to send email notifications to participants of the thread
    await this.notificationsService.dispatch({
      type: EmailEventType.THREAD_MESSAGE_CREATED,
      payload: {
        messageId: message.id,
        projectId,
        createdBy: { name: user.fullName, email: user.email },
        participants,
      },
    });

    await this.notificationsService.notifyProjectMembers({
      projectId,
      actorId: user.id,
      type: NotificationType.THREAD_REPLY,
      entityType: NotificationEntityType.THREAD_MESSAGE,
      entityId: msg.id,
      title: `New thread in project: "${project.name}" by "${user.fullName}"`,
      // message: message.message.slice(0, 140),
      message: message.message
        ? message.message.slice(0, 140)
        : 'New thread message',
    });

    if (mentionedUserIds.length) {
      await this.notificationsService.notifyProjectMembers({
        projectId,
        actorId: user.id,
        type: NotificationType.MENTIONED_IN_THREAD_MESSAGE,
        entityType: NotificationEntityType.THREAD_MESSAGE,
        entityId: msg.id,
        title: `You were mentioned in a thread message in project "${project.name}" by "${user.fullName}"`,
        message: '',
        explicitRecipientIds: mentionedUserIds,
      });
    }

    return msg;
  }

  async update(
    id: string,
    projectId: string,
    dto: UpdateThreadMessageDto,
    user: any,
    files?: Express.Multer.File[],
  ) {
    const project = await this.repo.manager
      .getRepository(Project)
      .findOne({ where: { id: projectId }, relations: { members: true } });
    if (!project) throw new NotFoundException('Project not found');
    const message = await this.repo.findOne({
      where: {
        id,
        projectId,
      },
    });

    if (!message) {
      throw new NotFoundException('Thread message not found');
    }

    if (message.authorId !== user.id) {
      throw new BadRequestException(
        'You can only edit your own thread messages.',
      );
    }

    if (!dto.message && !files?.length) {
      throw new BadRequestException('Message or attachment is required.');
    }

    message.message = dto.message ?? message.message;

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

    message.updatedBy = user.id;
    message.updatedAt = new Date();

    await this.repo.save(message);

    if (files?.length) {
      await this.uploadAttachments(message.id, projectId, files, user.id);
    }

    const updated = await this.findOne(message.id);

    this.threadGateway.broadcastUpdated(projectId, {
      id: updated.id,
      parentId: updated.parentId,
      message: updated.message,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
      attachments: updated.attachments,
    });
    if (newlyMentionedUserIds.length) {
      await this.notificationsService.notifyProjectMembers({
        projectId,
        actorId: user.id,
        type: NotificationType.MENTIONED_IN_THREAD_MESSAGE,
        entityType: NotificationEntityType.THREAD_MESSAGE,
        entityId: updated.id,
        title: `You were mentioned in a thread message in project "${project?.name}" by "${user.fullName}"`,
        message: '',
        explicitRecipientIds: newlyMentionedUserIds,
      });
    }
    return updated;
  }

  async remove(id: string, projectId: string, user: any) {
    const message = await this.repo.findOne({
      where: {
        id,
        projectId,
      },
    });

    if (!message) {
      throw new NotFoundException('Thread message not found');
    }

    if (message.authorId !== user.id) {
      throw new BadRequestException(
        'You can only delete your own thread messages.',
      );
    }

    if (message.parentId) {
      // It's a reply — decrement the parent's replyCount
      await this.repo.decrement({ id: message.parentId }, 'replyCount', 1);
      await this.repo.softDelete({ id, projectId });
    } else {
      // It's a top-level message — cascade soft-delete to its replies
      const replies = await this.repo.find({
        where: { parentId: id },
        select: { id: true },
      });

      if (replies.length) {
        await this.repo.softDelete(replies.map((r) => r.id));
      }

      await this.repo.softDelete({ id, projectId });
    }

    this.threadGateway.broadcastDeleted(projectId, id);

    return { id, deleted: true };
  }

  // TODO: optimize N+1 issue
  async findAll(projectId: string) {
    const project = await this.repo.manager
      .getRepository(Project)
      .findOne({ where: { id: projectId }, relations: { members: true } });
    if (!project) throw new NotFoundException('Project not found');
    const messages = await this.repo.find({
      where: {
        projectId,
        parentId: IsNull(), // only top-level threads
      },
      order: {
        createdAt: 'ASC',
      },
      relations: {
        author: true,
      },
      select: {
        id: true,
        message: true,
        replyCount: true,
        createdAt: true,
        createdBy: true,
        updatedAt: true,
        updatedBy: true,
        author: {
          fullName: true,
          email: true,
        },
      },
    });

    return Promise.all(
      messages.map(async (message) => ({
        ...message,
        attachments: await this.filesService.findBySource(
          FileSource.THREAD,
          message.id,
        ),
        reactions: await this.reactionsService.getThreadMessageReactions(
          message.id,
        ),
      })),
    );
  }

  async findOne(id: string, members: boolean = false) {
    const msg = await this.repo.findOne({
      where: { id },
      ...(members ? { relations: { project: { members: true } } } : {}),
    });
    if (!msg) {
      throw new NotFoundException('Thread message not found');
    }
    const [attachments, reactions] = await Promise.all([
      this.filesService.findBySource(FileSource.THREAD, id),
      this.reactionsService.getThreadMessageReactions(id),
    ]);

    return {
      ...msg,
      attachments,
      reactions,
    };
  }
  // msgid, projectid
  async getThread(parentId: string, projectId: string) {
    const parent = await this.repo.findOne({
      where: { id: parentId, projectId },
      relations: { author: true },
    });

    if (!parent) throw new NotFoundException('Thread not found');

    const replies = await this.repo.find({
      where: { parentId },
      relations: { author: true },
      order: { createdAt: 'ASC' },
    });

    const allIds = [parent.id, ...replies.map((r) => r.id)];

    const allFiles = await this.filesService.findBySourceBulk(
      FileSource.THREAD,
      allIds,
    );

    const attachMap = new Map<string, any[]>();

    for (const file of allFiles) {
      const arr = attachMap.get(file.sourceId) || [];
      arr.push(file);
      attachMap.set(file.sourceId, arr);
    }

    const parentReactions =
      await this.reactionsService.getThreadMessageReactions(parent.id);

    return {
      ...parent,
      attachments: attachMap.get(parent.id) || [],
      parentReactions: parentReactions,
      replies: await Promise.all(
        replies.map(async (r) => ({
          ...r,
          attachments: attachMap.get(r.id) || [],
          reactions: await this.reactionsService.getThreadMessageReactions(
            r.id,
          ),
        })),
      ),
    };
  }

  async findReplies(messageId: string, projectId: string) {
    const replies = await this.repo.find({
      where: { parentId: messageId, projectId },
      relations: {
        author: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    const allIds = replies.map((r) => r.id);

    const files = await this.filesService.findBySourceBulk(
      FileSource.THREAD,
      allIds,
    );

    const fileMap = new Map<string, any[]>();

    for (const file of files) {
      if (!fileMap.has(file.sourceId)) {
        fileMap.set(file.sourceId, []);
      }
      fileMap.get(file.sourceId)!.push(file);
    }

    return replies.map((reply) => ({
      ...reply,
      attachments: fileMap.get(reply.id) || [],
    }));
  }

  private async uploadAttachments(
    messageId: string,
    projectId: string,
    files: Express.Multer.File[],
    userId: string,
  ) {
    for (const file of files) {
      const key = `projects/${projectId}/thread/${messageId}/${Date.now()}-${file.originalname}`;

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
        source: FileSource.THREAD,
        sourceId: messageId,
      });
    }
  }
  async addReaction(projectId: string, messageId: string, user, emoji: string) {
    await this.ensureProjectUserAccess(projectId, user.id);

    const message = await this.repo.findOne({
      where: {
        id: messageId,
        projectId,
      },
    });

    if (!message) {
      throw new NotFoundException('Thread message not found');
    }

    await this.reactionsService.addThreadMessageReaction(
      messageId,
      user.id,
      emoji,
    );
    const updated = await this.findOne(messageId);
    // console.debug('Updated thread message after adding reaction:', updated);
    const project = await this.repo.manager.getRepository(Project).findOne({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
      },
    });

    if (updated.authorId !== user.id) {
      await this.notificationsService.notifyProjectMembers({
        projectId,
        // ticketId,
        actorId: user.id,
        explicitRecipientIds: [updated.authorId],

        type: NotificationType.THREAD_MESSAGE_REACTION,
        entityType: NotificationEntityType.THREAD_MESSAGE,
        entityId: updated.id,

        title: `${user.fullName} reacted to your thread message in project "${project?.name}"`,
        message: emoji,
      });
    }

    this.threadGateway.broadcastReaction(projectId, {
      id: updated.id,
      parentId: updated.parentId,
      message: updated.message,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
      attachments: updated.attachments,
    });

    console.debug('Updated thread message after adding reaction:', updated);
    return updated;
  }

  async removeReaction(projectId: string, messageId: string, userId: string) {
    await this.ensureProjectUserAccess(projectId, userId);

    const message = await this.repo.findOne({
      where: {
        id: messageId,
        projectId,
      },
    });

    if (!message) {
      throw new NotFoundException('Thread message not found');
    }

    await this.reactionsService.removeThreadMessageReaction(messageId, userId);

    const updated = await this.findOne(messageId);

    this.threadGateway.broadcastReaction(projectId, {
      id: updated.id,
      parentId: updated.parentId,
      message: updated.message,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
      attachments: updated.attachments,
    });

    return updated;
    // return this.reactionsService.removeThreadMessageReaction(messageId, userId);
  }

  private async ensureProjectUserAccess(projectId: string, userId: string) {
    const hasAccess = await this.repo.manager
      .getRepository(Project)
      .createQueryBuilder('project')
      .innerJoin('project.members', 'member', 'member.id = :userId', { userId })
      .where('project.id = :projectId', { projectId })
      .getExists();

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project.');
    }
  }
}
