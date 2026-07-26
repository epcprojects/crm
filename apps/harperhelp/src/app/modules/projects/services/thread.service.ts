import { FileSource } from '@harperhelp/types';
import {
  BadRequestException,
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
import { NotificationEntityType, NotificationType } from '../../notifications/entities/notification.entity';

@Injectable()
export class ThreadService {
  constructor(
    @InjectRepository(ThreadMessage)
    private readonly repo: Repository<ThreadMessage>,

    private readonly filesService: FilesService,
    private readonly utilityService: UtilityService,
    private readonly notificationService: NotificationsService,

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
    const message = await this.repo.save(
      this.repo.create({
        projectId,
        message: dto.message,
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

    const participants = msg.project.members.map((m) => ({
      name: m.fullName,
      email: m.email,
    }));

    // Call notification service to send email notifications to participants of the thread
    await this.notificationService.dispatch({
      type: EmailEventType.THREAD_MESSAGE_CREATED,
      payload: {
        messageId: message.id,
        projectId,
        createdBy: { name: user.fullName, email: user.email },
        participants,
      },
    });

    await this.notificationService.notifyProjectMembers({
      projectId,
      actorId: user.id,
      type: NotificationType.THREAD_REPLY,
      entityType: NotificationEntityType.THREAD_MESSAGE,
      entityId: msg.id,
      title: 'New reply in a discussion you can see',
      message: message.message.slice(0, 140),
    });

    return msg;
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
      })),
    );
  }

  async findOne(id: string, members: boolean = false) {
    const msg = await this.repo.findOne({
      where: { id },
      ...(members ? { relations: { project: { members: true } } } : {}),
    });

    const attachments = await this.filesService.findBySource(
      FileSource.THREAD,
      id,
    );

    return {
      ...msg,
      attachments,
    };
  }

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

    return {
      ...parent,
      attachments: attachMap.get(parent.id) || [],
      replies: replies.map((r) => ({
        ...r,
        attachments: attachMap.get(r.id) || [],
      })),
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

      await this.filesService.create({
        projectId,
        uploadedBy: userId,
        originalName: file.originalname,
        storageKey: key,
        sizeBytes: file.size,
        extension: file.mimetype.split('/')[1],
        mimeType: file.mimetype,
        source: FileSource.THREAD,
        sourceId: messageId,
      });
    }
  }
}
