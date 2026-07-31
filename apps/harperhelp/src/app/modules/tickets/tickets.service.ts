import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { Between, DataSource, Repository } from 'typeorm';
import { FilesService } from '../files/files.service';
import { UtilityService } from '../utility/utility.service';
import { FileSource, FileStatus } from '@harperhelp/types';
import { GetTicketsQueryDto } from './dto/get-tickets-query.dto';
import { Project } from '../projects/entities/project.entity';

import { format } from 'date-fns';
import { CalendarQueryDto } from '../calendar/dto/calendar-query.dto';
import { getDateRange } from '@harperhelp/utils';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailEventType } from '../notifications/notifications.types';
import { User } from '../users/entities/user.entity';
import { NotificationEntityType, NotificationType } from '@harperhelp/types';
import { TicketStatus } from './entities/ticket.statuses.entity';
import { TicketPriority } from './entities/ticket.priority.entity';
import { UsersService } from '../users/users.service';
import { extname } from 'path';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(TicketStatus)
    private readonly statusRepo: Repository<TicketStatus>,
    @InjectRepository(TicketPriority)
    private readonly priorityRepo: Repository<TicketPriority>,

    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,

    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    private readonly filesService: FilesService,
    private readonly utilityService: UtilityService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
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

    const saved = await this.dataSource
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

    // After successful transaction, dispatch ticket created notification (non-blocking)
    try {
      const ticket = await this.ticketRepo.findOne({
        where: { id: saved.id },
        relations: {
          reporter: true,
          assignee: true,
          project: {
            members: true,
          },
        },
      });

      const members = (ticket.project?.members || []).map((m) => {
        if (m.id === userId) return;

        return {
          name: m.fullName,
          email: m.email,
        };
      });

      const participantsMap = new Map<
        string,
        { name: string; email: string }
      >();
      for (const m of members) participantsMap.set(m.email, m);
      if (ticket.reporter && ticket?.reporter?.id !== userId)
        participantsMap.set(ticket.reporter.email, {
          name: ticket.reporter.fullName,
          email: ticket.reporter.email,
        });
      if (ticket.assignee && ticket?.assignee?.id !== userId)
        participantsMap.set(ticket.assignee.email, {
          name: ticket.assignee.fullName,
          email: ticket.assignee.email,
        });

      const participants = Array.from(participantsMap.values());

      console.debug(
        `Dispatching ticket.created notification for ticket ${saved.id} to ${participants.length} participants`,
      );

      await this.notificationsService.dispatch({
        type: EmailEventType.TICKET_CREATED,
        payload: {
          ticketId: saved.id,
          ticketNumber: saved.ticketRefNo,
          title: saved.title,
          description: saved.description || '',
          priority: saved.priorityKey || '',
          status: saved.statusKey || '',
          projectId: ticket.project?.id || '',
          projectName: ticket.project?.name || '',
          createdBy: {
            name: ticket.reporter?.fullName || '',
            email: ticket.reporter?.email || '',
          },
          assignee: ticket.assignee
            ? { name: ticket.assignee.fullName, email: ticket.assignee.email }
            : undefined,
          participants,
        },
      });
      const fullname = await this.usersService.getFullName(
        ticket?.reporterId || ticket?.assigneeId || '',
      );

      // Send global notification
      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: ticket?.reporter?.id || ticket?.assignee?.id || '',
        type: NotificationType.TICKET_CREATED,
        entityType: NotificationEntityType.TICKET,
        entityId: ticket.id,
        ticketId: ticket.id,
        title: `New ticket: "${ticket.title}" created in project "${ticket.project.name}" by ${fullname}`,
        message: ticket.ticketRefNo ?? undefined,
      });
    } catch (err) {
      // ignore dispatch errors
      console.debug(
        `Failed to dispatch ticket.created notification for ticket ${saved.id}: ${err.message}`,
      );
    }

    return saved;
  }

  //
  // READ calendar view

  /**
   * Returns tickets whose dueDate falls within the range for the given view.
   * Only returns title and dueDate (as specified).
   *
   * GET /tickets?view=month&date=2026-06-01
   * GET /tickets?view=week&date=2026-06-16
   * GET /tickets?view=day&date=2026-06-23
   * GET /tickets?view=year&date=2026-01-01
   */
  async findByView(
    pid: string,
    query: CalendarQueryDto,
  ): Promise<
    Pick<
      Ticket,
      'id' | 'title' | 'dueDate' | 'priority' | 'status' | 'ticketRefNo'
    >[]
  > {
    const { start, end } = getDateRange(query.view, query.date);

    return this.ticketRepo.find({
      where: {
        dueDate: Between(start, end),
        projectId: pid,
      },
      relations: {
        status: true,
        priority: true,
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        ticketRefNo: true,
        status: {
          id: true,
          key: true,
          label: true,
          color: true,
        },
        priority: {
          id: true,
          key: true,
          label: true,
          color: true,
        },
      },
      order: {
        dueDate: 'ASC',
      },
    });
  }

  // ---------------- FIND ALL ----------------
  async findAll(projectId: string, query: GetTicketsQueryDto) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.project', 'p')
      .leftJoin('t.status', 's')
      .leftJoin('t.priority', 'pr')
      .leftJoin('t.assignee', 'a')
      .leftJoin('t.reporter', 'r')
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
      't.ticketRefNo',
      't.dueDate',

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

      'r.id',
      'r.fullName',
      'r.email',
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
      .leftJoin('t.assignee', 'a')
      .leftJoin('t.reporter', 'r');

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

    if (query.projectId) {
      qb.andWhere('t.projectId = :projectId', {
        projectId: query.projectId,
      });
    }

    if (query.search?.trim()) {
      qb.andWhere(
        `
      (
        t.title ILIKE :search
        OR t.description ILIKE :search
        OR t.ticketRefNo ILIKE :search
      )
      `,
        {
          search: `%${query.search.trim()}%`,
        },
      );
    }

    /*
     * Clone the filtered query before adding pagination and item selection.
     * The summary will represent all matching tickets, not only the current page.
     */
    const summaryQuery = qb.clone();

    const summaryResult = await summaryQuery
      .select([
        `
      COALESCE(
        SUM(
          CASE
            WHEN UPPER(t.statusKey) = 'OPEN'
            THEN 1
            ELSE 0
          END
        ),
        0
      ) AS open
      `,
        `
      COALESCE(
        SUM(
          CASE
            WHEN UPPER(t.statusKey) = 'INPROGRESS'
            THEN 1
            ELSE 0
          END
        ),
        0
      ) AS inprogress
      `,
        `
      COALESCE(
        SUM(
          CASE
            WHEN UPPER(t.statusKey) = 'RESOLVED'
            THEN 1
            ELSE 0
          END
        ),
        0
      ) AS resolved
      `,
        `
      COALESCE(
        SUM(
          CASE
            WHEN UPPER(t.priorityKey) = 'CRITICAL'
            THEN 1
            ELSE 0
          END
        ),
        0
      ) AS critical
      `,
      ])
      .getRawOne();

    qb.select([
      't.id',
      't.title',
      't.createdAt',
      't.ticketRefNo',
      't.dueDate',

      'p.id',
      'p.name',
      'p.brandColor',

      's.key',
      's.label',
      's.color',

      'pr.key',
      'pr.label',
      'pr.color',

      'a.id',
      'a.fullName',
      'a.email',

      'r.id',
      'r.fullName',
      'r.email',
    ]);

    qb.orderBy('t.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,

      summary: {
        open: Number(summaryResult?.open ?? 0),
        inProgress: Number(summaryResult?.inprogress ?? 0),
        resolved: Number(summaryResult?.resolved ?? 0),
        critical: Number(summaryResult?.critical ?? 0),
      },

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
  // async findOne(projectId: string, ticketId: string) {
  //   const ticket = await this.ticketRepo
  //     .createQueryBuilder('t')
  //     .leftJoinAndSelect('t.project', 'p')
  //     .leftJoinAndSelect('t.assignee', 'a')
  //     .leftJoinAndSelect('t.reporter', 'r')
  //     .where('t.id = :ticketId', { ticketId })
  //     .andWhere('t.projectId = :projectId', { projectId })
  //     .select([
  //       't',

  //       'p.id',
  //       'p.name',
  //       'p.brandColor',

  //       'a.id',
  //       'a.fullName',

  //       'r.id',
  //       'r.fullName',
  //     ])
  //     .getOne();

  //   if (!ticket) {
  //     throw new NotFoundException('Ticket not found');
  //   }

  //   const attachments = await this.filesService.findBySource(
  //     FileSource.TICKET,
  //     ticketId,
  //   );

  //   return {
  //     ...ticket,
  //     attachments,
  //   };
  // }

  // ---------------- FIND ONE ----------------
  async findOne(projectId: string, ticketId: string, user) {
    const isMember = await this.projectRepo
      .createQueryBuilder('p')
      .innerJoin('p.members', 'm', 'm.id = :userId', { userId: user.id })
      .where('p.id = :projectId', { projectId })
      .getExists();

    if (!isMember) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

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

    const [attachments, createdByUser] = await Promise.all([
      this.filesService.findBySource(FileSource.TICKET, ticketId),
      ticket.createdBy
        ? this.userRepo.findOne({
            where: { id: ticket.createdBy },
            select: { id: true, fullName: true },
          })
        : Promise.resolve(null),
    ]);

    return {
      ...ticket,
      createdBy: createdByUser,
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
    // const project = await this.projectRepo.findOne({
    //   where: { id: projectId },
    // });
    // if (!project) throw new NotFoundException('Project not found');
    const ticket = await this.findEntity(projectId, ticketId);
    const oldTicket = { ...ticket };
    const oldStatus = ticket.status;
    const oldPriority = ticket.priority;
    const { statusKey, priorityKey, ...rest } = dto;

    Object.assign(ticket, {
      ...rest,
      updatedBy: userId,
    });

    if (statusKey && statusKey !== oldStatus?.key) {
      const newStatus = await this.statusRepo.findOne({
        where: { key: statusKey }, // adjust to however TicketStatus is scoped
      });
      if (!newStatus) throw new NotFoundException('Status not found');
      ticket.status = newStatus; // let TypeORM derive statusKey from this
      ticket.statusKey = statusKey;
    }

    if (priorityKey && priorityKey !== oldPriority?.key) {
      const newPriority = await this.priorityRepo.findOne({
        where: { key: priorityKey },
      });
      if (!newPriority) throw new NotFoundException('Priority not found');
      ticket.priority = newPriority;
      ticket.priorityKey = priorityKey;
    }
    const recipients = [ticket.reporterId, ticket.assigneeId].filter(
      (id): id is string => !!id && id !== userId,
    );
    const fullname = await this.usersService.getFullName(
      ticket?.reporterId || ticket?.assigneeId || '',
    );
    // STATUS CHANGED
    if (dto.statusKey && oldStatus && dto.statusKey !== oldStatus.key) {
      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: userId,
        type: NotificationType.TICKET_STATUS_CHANGED,
        entityType: NotificationEntityType.TICKET,
        entityId: ticket.id,
        ticketId: ticket.id,
        title: `"Ticket: "${ticket.ticketRefNo}" status changed to ${ticket.status.label} by ${fullname}`,
        message: `${oldStatus.label} to ${dto.statusKey}`,
        explicitRecipientIds: [...new Set(recipients)],
      });
    }

    // PRIORITY CHANGED
    if (dto.priorityKey && oldPriority && dto.priorityKey !== oldPriority.key) {
      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: userId,
        type: NotificationType.TICKET_PRIORITY_CHANGED,
        entityType: NotificationEntityType.TICKET,
        entityId: ticket.id,
        ticketId: ticket.id,
        title: `Ticket: "${ticket.ticketRefNo}" priority changed to ${ticket.priority.label} by ${fullname}`,
        message: `${oldPriority.label} to ${dto.priorityKey}`,
        explicitRecipientIds: [...new Set(recipients)],
      });
    }

    // PERSON ASSIGNED
    if (
      dto.assigneeId !== undefined &&
      dto.assigneeId !== oldTicket.assigneeId
    ) {
      const user = await this.userRepo.findOne({
        where: { id: dto.assigneeId },
        select: { id: true, fullName: true },
      });
      const fullname = await this.usersService.getFullName(userId);

      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: userId,
        type: NotificationType.TICKET_ASSIGNEE_CHANGED,
        entityType: NotificationEntityType.TICKET,
        entityId: ticket.id,
        ticketId: ticket.id,
        title: dto.assigneeId
          ? // ? `"${user.fullName || 'Someone'}" was assigned to ticket: "${ticket.ticketRefNo}"`
            `"${ticket.ticketRefNo} is assigned to ${user.fullName} by ${fullname}"`
          : `Ticket: "${ticket.ticketRefNo}" is now unassigned`,
        explicitRecipientIds: [...new Set(recipients)],
      });
    }

    if (
      oldTicket.title !== dto.title &&
      oldTicket.description === dto.description
    ) {
      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: userId,
        type: NotificationType.TICKET_TITLE_CHANGED,
        entityType: NotificationEntityType.TICKET,
        entityId: ticket.id,
        ticketId: ticket.id,
        title: `Ticket: "${ticket.ticketRefNo}" renamed to "${dto.title}" by ${fullname}`,
        message: `Previously: "${oldTicket.title}"`,
        explicitRecipientIds: [...new Set(recipients)],
      });
    }

    if (oldTicket.description !== dto.description) {
      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: userId,
        type: NotificationType.TICKET_DESCRIPTION_CHANGED,
        entityType: NotificationEntityType.TICKET,
        entityId: ticket.id,
        ticketId: ticket.id,
        title: `Ticket: "${ticket.ticketRefNo}" description was updated by ${fullname}`,
        explicitRecipientIds: [...new Set(recipients)],
      });
    }

    return this.ticketRepo.save(ticket);
  }

  // ---------------- DELETE (SOFT) ----------------
  async remove(projectId: string, ticketId: string, userId: string) {
    const ticket = await this.findEntity(projectId, ticketId);

    ticket.updatedBy = userId;

    await this.ticketRepo.softRemove(ticket);
    const fullname = await this.usersService.getFullName(userId);
    await this.notificationsService.notifyProjectMembers({
      projectId: ticket.projectId,
      actorId: userId,
      type: NotificationType.TICKET_DELETED,
      entityType: NotificationEntityType.TICKET,
      entityId: ticket.id,
      ticketId: ticket.id,
      title: `Ticket # "${ticket.ticketRefNo}" deleted by ${fullname}`,
    });

    return { success: true };
  }

  // ---------------- TICKET'S SUMMARY -------------------
  // TODO: needs to re-think on how we manage these? as statuses and priorities are dynamic

  async getTicketSummary(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
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
        't.dueDate',

        'p.id',
        'p.name',
        'p.brandColor',

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
        source: FileSource.TICKET,
        sourceId: ticketId,
        status: FileStatus.ACTIVE,
      });
    }
  }

  private async findEntity(projectId: string, ticketId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, projectId },
      relations: {
        status: true,
        priority: true,
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    return ticket;
  }
}
