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
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailEventType } from '../../notifications/notifications.types';
import { Ticket } from '../entities/ticket.entity';

@Injectable()
export class TicketRepliesService {
  constructor(
    @InjectRepository(TicketReply)
    private readonly replyRepo: Repository<TicketReply>,

    private readonly filesService: FilesService,
    private readonly utilityService: UtilityService,
    private readonly notificationsService: NotificationsService,
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

      const members = (ticket.project?.members || []).map((m) => ({
        name: m.fullName,
        email: m.email,
      }));

      const participantsMap = new Map<
        string,
        { name: string; email: string }
      >();
      for (const m of members) participantsMap.set(m.email, m);
      if (ticket.reporter)
        participantsMap.set(ticket.reporter.email, {
          name: ticket.reporter.fullName,
          email: ticket.reporter.email,
        });
      if (ticket.assignee)
        participantsMap.set(ticket.assignee.email, {
          name: ticket.assignee.fullName,
          email: ticket.assignee.email,
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
