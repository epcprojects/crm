import { FileSource } from '@harperhelp/types';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilesService } from '../../files/files.service';
import { UtilityService } from '../../utility/utility.service';
import { TicketReply } from '../entities/ticket.reply.entity';
import { CreateReplyDto } from '../dto/create-reply.dto';

@Injectable()
export class TicketRepliesService {
  constructor(
    @InjectRepository(TicketReply)
    private readonly replyRepo: Repository<TicketReply>,

    private readonly filesService: FilesService,
    private readonly utilityService: UtilityService,
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

    const reply = await this.replyRepo.save(
      this.replyRepo.create({
        ticketId,
        message: dto.message,
        authorId: userId,
        isInternal: dto.isInternal ?? false,
        createdBy: userId,
      }),
    );

    if (files?.length) {
      await this.uploadAttachments(reply.id, files, userId, projectId);
    }

    return this.findOne(reply.id);
  }

  // TODO: optimize N+1 issue
  async findByTicket(ticketId: string) {
    const replies = await this.replyRepo.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
      relations: {
        author: true,
      },
    });

    return Promise.all(
      replies.map(async (reply) => {
        delete reply.author['passwordHash'];

        return {
          ...reply,
          attachments: await this.filesService.findBySource(
            FileSource.TICKET_REPLY,
            reply.id,
          ),
        };
      }),
    );
  }

  async findOne(id: string) {
    const reply = await this.replyRepo.findOne({
      where: { id },
    });

    if (!reply) throw new NotFoundException('Reply not found');

    const attachments = await this.filesService.findBySource(
      FileSource.TICKET_REPLY,
      id,
    );

    return {
      ...reply,
      attachments,
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

      await this.filesService.create({
        projectId,
        uploadedBy: userId,
        originalName: file.originalname,
        storageKey: key,
        sizeBytes: file.size,
        extension: file.mimetype.split('/')[1],
        mimeType: file.mimetype,
        source: FileSource.TICKET_REPLY,
        sourceId: replyId,
      });
    }
  }
}
