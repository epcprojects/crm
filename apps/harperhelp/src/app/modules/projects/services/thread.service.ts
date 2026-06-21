import { FileSource } from '@harperhelp/types';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilesService } from '../../files/files.service';
import { UtilityService } from '../../utility/utility.service';
import { ThreadMessage } from '../entities/thread-messages.entity';
import { CreateThreadMessageDto } from '../dto/create-thread-message.dto';

@Injectable()
export class ThreadService {
  constructor(
    @InjectRepository(ThreadMessage)
    private readonly repo: Repository<ThreadMessage>,

    private readonly filesService: FilesService,
    private readonly utilityService: UtilityService,
  ) {}

  async create(
    projectId: string,
    dto: CreateThreadMessageDto,
    userId: string,
    files?: Express.Multer.File[],
  ) {
    const message = await this.repo.save(
      this.repo.create({
        projectId,
        message: dto.message,
        authorId: userId,
        createdBy: userId,
      }),
    );

    if (files?.length) {
      await this.uploadAttachments(message.id, projectId, files, userId);
    }

    return this.findOne(message.id);
  }

  async findAll(projectId: string) {
    return this.repo.find({
      where: { projectId },
      order: { createdAt: 'ASC' },
      relations: {
        author: true,
      },
      select: {
        id: true,
        message: true,
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
  }

  async findOne(id: string) {
    const msg = await this.repo.findOne({ where: { id } });

    const attachments = await this.filesService.findBySource(
      FileSource.THREAD,
      id,
    );

    return {
      ...msg,
      attachments,
    };
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
