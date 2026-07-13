import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { DataSource, Repository } from 'typeorm';
import { FilesService } from '../files/files.service';
import { UtilityService } from '../utility/utility.service';
import { FileSource, FileStatus } from '@harperhelp/types';
import { GetTicketsQueryDto } from './dto/get-tickets-query.dto';
import { Project } from '../projects/entities/project.entity';

import { format } from 'date-fns';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,

    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

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
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: {
        id: true,
        projectCode: true,
      },
    });

    if (!project || !project.projectCode) {
      throw new NotFoundException('Project not found');
    }

    return this.dataSource
      .transaction(async (manager) => {
        const dateKey = format(new Date(), 'yyyyMMdd');

        const [{ ticket_number }] = await manager.query<
          { ticket_number: string }[]
        >(`SELECT generate_ticket_number($1, $2) AS ticket_number`, [
          project.projectCode.toUpperCase(),
          dateKey,
        ]);

        const ticket = manager.create(Ticket, {
          ...dto,
          projectId,
          reporterId: userId,
          createdBy: userId,
          ticketRefNo: ticket_number,
        });

        const saved = await manager.save(ticket);

        if (files?.length) {
          await this.handleAttachments(saved.id, projectId, files, userId);
        }

        return saved;
      })
      .catch((error) => {
        if (error.code === '23503') {
          // PostgreSQL foreign key violation

          if (error.constraint?.includes('status')) {
            throw new BadRequestException(
              `Status '${dto.statusKey}' does not exist`,
            );
          }

          if (error.constraint?.includes('priority')) {
            throw new BadRequestException(
              `Priority '${dto.priorityKey}' does not exist`,
            );
          }

          throw new BadRequestException(
            'Invalid statusKey or priorityKey:' + error.constraint.toString(),
          );
        }

        throw new BadRequestException(error.message);
      });
  }

  // ---------------- FIND ALL ----------------
  async findAll(projectId: string, query: GetTicketsQueryDto) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.project', 'p')
      .leftJoin('t.status', 's')
      .leftJoin('t.priority', 'pr')
      .leftJoin('t.assignee', 'a')
      .where('t.projectId = :projectId', { projectId });

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

    if (query.assigneeId) {
      qb.andWhere('t.assigneeId = :assigneeId', {
        assigneeId: query.assigneeId,
      });
    }

    if (query.search) {
      qb.andWhere(`(t.title ILIKE :search OR t.description ILIKE :search)`, {
        search: `%${query.search}%`,
      });
    }

    qb.select([
      't.id',
      't.title',
      't.createdAt',

      'p.id',
      'p.name',

      's.key',
      's.label',
      's.color',

      'pr.key',
      'pr.label',
      'pr.color',

      'a.id',
      'a.fullName',
      'a.email',
    ]);

    qb.orderBy('t.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasNext: query.page * query.limit < total,
        hasPrevious: query.page > 1,
      },
    };
  }

  //
  async findAllProjects(query: GetTicketsQueryDto, user) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.project', 'p')
      .innerJoin('p.members', 'u', 'u.id = :userId', {
        userId: user.id,
      })
      .leftJoin('t.status', 's')
      .leftJoin('t.priority', 'pr')
      .leftJoin('t.assignee', 'a');

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

    if (query.assigneeId) {
      qb.andWhere('t.assigneeId = :assigneeId', {
        assigneeId: query.assigneeId,
      });
    }

    if (query.search) {
      qb.andWhere('(t.title ILIKE :search OR t.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.select([
      't.id',
      't.title',
      't.createdAt',
      't.ticketRefNo',

      'p.id',
      'p.name',

      's.key',
      's.label',
      's.color',

      'pr.key',
      'pr.label',
      'pr.color',

      'a.id',
      'a.fullName',
      'a.email',
    ]);

    qb.orderBy('t.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasNext: query.page * query.limit < total,
        hasPrevious: query.page > 1,
      },
    };
  }

  // ---------------- FIND ONE ----------------
  async findOne(projectId: string, ticketId: string) {
    const ticket = await this.ticketRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.project', 'p')
      .leftJoinAndSelect('t.assignee', 'a')
      .leftJoinAndSelect('t.reporter', 'r')
      .where('t.id = :ticketId', { ticketId })
      .andWhere('t.projectId = :projectId', { projectId })
      .select([
        't',

        'p.id',
        'p.name',
        'p.brandColor',

        'a.id',
        'a.fullName',

        'r.id',
        'r.fullName',
      ])
      .getOne();

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

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

  // ---------------- TICKET'S SUMMARY -------------------
  // TODO: needs to re-think on how we manage these? as statuses and priorities are dynamic

  async getTicketSummary(projectId: string) {
    const result = await this.ticketRepo
      .createQueryBuilder('t')
      .select([
        `SUM(CASE WHEN UPPER(t.statusKey) = 'OPEN' THEN 1 ELSE 0 END) AS open`,
        `SUM(CASE WHEN UPPER(t.statusKey) = 'INPROGRESS' THEN 1 ELSE 0 END) AS inprogress`,
        `SUM(CASE WHEN UPPER(t.statusKey) = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved`,
        `SUM(CASE WHEN UPPER(t.priorityKey) = 'CRITICAL' THEN 1 ELSE 0 END) AS critical`,
      ])
      .where('t.projectId = :projectId', { projectId })
      .getRawOne();

    return {
      open: Number(result.open),
      inProgress: Number(result.inProgress),
      resolved: Number(result.resolved),
      critical: Number(result.critical),
    };
  }

  async getGlobalTicketSummary(user) {
    const result = await this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.project', 'p')
      .innerJoin('p.members', 'u', 'u.id = :userId', {
        userId: user.id,
      })
      .select([
        `SUM(CASE WHEN UPPER(t.statusKey) = 'OPEN' THEN 1 ELSE 0 END) AS open`,
        `SUM(CASE WHEN UPPER(t.statusKey) = 'INPROGRESS' THEN 1 ELSE 0 END) AS inprogress`,
        `SUM(CASE WHEN UPPER(t.statusKey) = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved`,
        `SUM(CASE WHEN UPPER(t.priorityKey) = 'CRITICAL' THEN 1 ELSE 0 END) AS critical`,
      ])
      .getRawOne();

    return {
      open: Number(result.open),
      inProgress: Number(result.inprogress),
      resolved: Number(result.resolved),
      critical: Number(result.critical),
    };
  }

  // ---------------- UPCOMING TICKETS -------------
  // Those tickets who have no assignee or
  async getUpcomingTickets(user) {
    return this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.project', 'p')
      .innerJoin('p.members', 'u', 'u.id = :userId', {
        userId: user.id,
      })
      .leftJoin('t.status', 's')
      .leftJoin('t.priority', 'pr')
      .where('t.assigneeId IS NULL')
      .select([
        't.id',
        't.title',
        't.createdAt',
        't.ticketRefNo',

        'p.id',
        'p.name',

        's.key',
        's.label',
        's.color',

        'pr.key',
        'pr.label',
        'pr.color',
      ])
      .orderBy('t.createdAt', 'DESC')
      .getMany();
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
        status: FileStatus.ACTIVE,
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
