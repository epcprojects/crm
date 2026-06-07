import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { Repository } from 'typeorm';
import { FilesService } from '../files/files.service';
import { UtilityService } from '../utility/utility.service';
import { GetTicketsQueryDto } from './dto/get-tickets.dto';
import { FileSource, SYSTEM_TICKET_STATUS } from '@harperhelp/types';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,

    private readonly filesService: FilesService,
    private readonly utilityService: UtilityService,
  ) {}

  // ---------------- CREATE ----------------
  async createTicket(
    projectId: string,
    dto: CreateTicketDto,
    userId: string,
    files?: Express.Multer.File[],
  ) {
    const ticket = this.ticketRepo.create({
      ...dto,
      projectId,
      reporterId: userId,
      createdBy: userId,
      statusKey: dto.statusKey ?? SYSTEM_TICKET_STATUS.OPEN,
    });

    const saved = await this.ticketRepo.save(ticket);

    if (files?.length) {
      await this.handleAttachments(saved.id, projectId, files, userId);
    }

    return this.findOne(projectId, saved.id);
  }

  // ---------------- FIND ALL ----------------
  async findAll(projectId: string, query: GetTicketsQueryDto) {
    const qb = this.ticketRepo.createQueryBuilder('t');

    qb.where('t.projectId = :projectId', { projectId });

    if (query.statusKey) {
      qb.andWhere('t.statusKey = :statusKey', {
        statusKey: query.statusKey,
      });
    }

    if (query.priorityKey) {
      qb.andWhere('t.priorityKey = :priorityKey', {
        priorityKey: query.priorityKey,
      });
    }

    if (query.search) {
      qb.andWhere('t.title ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('t.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
      },
    };
  }

  // ---------------- FIND ONE ----------------
  async findOne(projectId: string, ticketId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, projectId },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const attachments = await this.filesService.findBySource(
      FileSource.TICKET,
      ticketId,
    );

    return {
      ...ticket,
      attachments,
    };
  }

  // ---------------- UPDATE ----------------
  async update(
    projectId: string,
    ticketId: string,
    dto: UpdateTicketDto,
    userId: string,
  ) {
    const ticket = await this.findEntity(projectId, ticketId);

    Object.assign(ticket, {
      ...dto,
      updatedBy: userId,
    });

    return this.ticketRepo.save(ticket);
  }

  // ---------------- DELETE (SOFT) ----------------
  async remove(projectId: string, ticketId: string, userId: string) {
    const ticket = await this.findEntity(projectId, ticketId);

    ticket.updatedBy = userId;

    await this.ticketRepo.softRemove(ticket);

    return { success: true };
  }

  // ---------------- ATTACHMENTS ----------------
  async handleAttachments(
    ticketId: string,
    projectId: string,
    files: Express.Multer.File[],
    userId: string,
  ) {
    for (const file of files) {
      const key = `projects/${projectId}/tickets/${ticketId}/${Date.now()}-${file.originalname}`;

      await this.utilityService.uploadFile(file, key);

      await this.filesService.create({
        projectId,
        uploadedBy: userId,
        originalName: file.originalname,
        storageKey: key,
        sizeBytes: file.size,
        extension: file.mimetype.split('/')[1],
        mimeType: file.mimetype,
        source: FileSource.TICKET,
        sourceId: ticketId,
      });
    }
  }

  private async findEntity(projectId: string, ticketId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, projectId },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    return ticket;
  }
}
