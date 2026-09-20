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
import {
  DataSource,
  ILike,
  Raw,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { FilesService } from '../files/files.service';
import { UtilityService } from '../utility/utility.service';
import { FileSource, FileStatus } from '@epc-crm/types';
import { GetTicketsQueryDto } from './dto/get-tickets-query.dto';
import { Project } from '../projects/entities/project.entity';
import { Contact } from '../contacts/entities/contact.entity';

import { format } from 'date-fns';
import { CalendarQueryDto } from '../calendar/dto/calendar-query.dto';
import { getDateRange } from '@epc-crm/utils';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailEventType } from '../notifications/notifications.types';
import { User } from '../users/entities/user.entity';
import { NotificationEntityType, NotificationType } from '@epc-crm/types';
import { TicketStatus } from './entities/ticket.statuses.entity';
import { TicketPriority } from './entities/ticket.priority.entity';
import { UsersService } from '../users/users.service';
import { extname } from 'path';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UploadedFileDto } from '../files/dto/uploaded-file.dto';
import { KanbanQueryDto } from './dto/kanban-query.dto';
import { GetKanbanTicketCountsDto } from './dto/get-kanban-ticket-counts.dto';
import { KanbanBoardQueryDto } from './dto/kanban-board-query.dto';
import { getTicketTypeLabel } from './enum/ticket-type.enum';

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

    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    private readonly filesService: FilesService,
    private readonly utilityService: UtilityService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  private async ensureContactExists(contactId: string): Promise<void> {
    const exists = await this.contactRepo.exists({
      where: { id: contactId, isActive: true },
    });

    if (!exists) {
      throw new NotFoundException('Contact not found');
    }
  }

  // Lead count per configured status (zero-count statuses included), for the
  // stat cards. Driven by the statuses table so new/renamed statuses just work.
  private async buildStatusSummary(qb: SelectQueryBuilder<Ticket>) {
    const [rows, statuses] = await Promise.all([
      qb
        .clone()
        .select('t.statusKey', 'statusKey')
        .addSelect('COUNT(t.id)', 'count')
        .groupBy('t.statusKey')
        .getRawMany<{ statusKey?: string; statuskey?: string; count: string }>(),
      this.statusRepo.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } }),
    ]);

    const countByKey = new Map<string, number>();
    let total = 0;
    for (const row of rows) {
      const count = Number(row.count);
      countByKey.set(row.statusKey ?? row.statuskey ?? '', count);
      total += count;
    }

    return {
      total,
      statuses: statuses.map((status) => ({
        key: status.key,
        label: status.label,
        color: status.color,
        sortOrder: status.sortOrder,
        isClosed: status.isClosed,
        count: countByKey.get(status.key) ?? 0,
      })),
    };
  }

  // Every new lead is created as Critical unless a priority is passed in.
  private async getDefaultPriorityKey(): Promise<string | undefined> {
    const priority = await this.priorityRepo.findOne({
      where: [{ key: ILike('critical') }, { label: ILike('critical') }],
    });

    return priority?.key;
  }

  // ---------------- CREATE ----------------
  async createTicket(
    projectId: string,
    dto: CreateTicketDto,
    userId: string,
    files?: UploadedFileDto[],
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

    if (dto.contactId) {
      await this.ensureContactExists(dto.contactId);
    }

    if (dto.assigneeId) {
      const assigneeExists = await this.userRepo.exists({
        where: { id: dto.assigneeId },
      });

      if (!assigneeExists) {
        throw new NotFoundException('Agent not found');
      }
    }

    const priorityKey = dto.priorityKey ?? (await this.getDefaultPriorityKey());

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
          priorityKey,
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

      const members = (ticket.project?.members || [])
        .filter((m) => m.id !== userId)
        .map((m) => ({
          userId: m.id,
          name: m.fullName,
          email: m.email,
          isInvitationAccepted: m.isInvitationAccepted,
        }));

      console.debug('Ticket saved', saved.id, 'members', members.length);
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
          EmailEventType.TICKET_CREATED,
        );
      // const attachments = await this.utilityService.getEmailAttachmentLinks( files ?? [] );

      console.debug(
        `Dispatching ticket.created notification for ticket ${saved.id} to ${participants.length} participants`,
      );

      console.debug(JSON.stringify(participants, null, 2));

      await this.notificationsService.dispatch({
        type: EmailEventType.TICKET_CREATED,
        payload: {
          ticketId: saved.id,
          ticketNumber: saved.ticketRefNo,
          title: saved.title,
          description: saved.description || '',
          priority: saved.priorityKey || '',
          status: saved.statusKey || '',
          ticketType: getTicketTypeLabel(saved.ticketType),
          projectId: ticket.project?.id || '',
          projectName: ticket.project?.name || '',
          createdBy: {
            userId: ticket.reporter?.id || '',
            name: ticket.reporter?.fullName || '',
            email: ticket.reporter?.email || '',
            isInvitationAccepted:
              ticket.reporter?.isInvitationAccepted ?? false,
          },
          assignee: ticket.assignee
            ? {
                userId: ticket.assignee.id,
                name: ticket.assignee.fullName,
                email: ticket.assignee.email,
                isInvitationAccepted: ticket.assignee.isInvitationAccepted,
              }
            : undefined,
          participants: filteredParticipants,
          // attachments,
        },
      });
      const fullname = await this.usersService.getFullName(
        ticket?.reporterId || ticket?.assigneeId || '',
      );
      console.debug(`Retrieved full name: ${fullname}`);
      // Send global notification
      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: ticket?.reporter?.id || ticket?.assignee?.id || '',
        type: NotificationType.TICKET_CREATED,
        entityType: NotificationEntityType.TICKET,
        entityId: ticket.id,
        ticketId: ticket.id,
        title: `New lead: "${ticket.title}" created in project "${ticket.project.name}" by ${fullname}`,
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
   * Returns tickets created within the range for the given view, so leads
   * appear on the calendar on the day they were created.
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
      'id' | 'title' | 'createdAt' | 'priority' | 'status' | 'ticketRefNo'
    >[]
  > {
    const { start, end } = getDateRange(query.view, query.date);

    return this.ticketRepo.find({
      where: {
        createdAt: Raw(
          (alias) =>
            `${alias} >= CAST(:start AS date) AND ${alias} < (CAST(:end AS date) + 1)`,
          { start, end },
        ),
        projectId: pid,
      },
      relations: {
        status: true,
        priority: true,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
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
        createdAt: 'ASC',
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
      .leftJoin('t.contact', 'c')
      .where('t.projectId = :projectId', { projectId });

    const ACTIVE_STATUS_SENTINEL = '00000000-0000-0000-0000-000000000100';

    if (query.statusKey) {
      if (
        query.statusKey.toLowerCase() === 'active' ||
        query.statusKey === ACTIVE_STATUS_SENTINEL
      ) {
        qb.andWhere('COALESCE(s.isClosed, false) = false');
      } else {
        qb.andWhere('t.statusKey = :statusKey', {
          statusKey: query.statusKey,
        });
      }
    }

    if (query.priorityKey) {
      qb.andWhere('t.priorityKey = :priorityKey', {
        priorityKey: query.priorityKey,
      });
    }

    if (query.ticketType) {
      qb.andWhere('t.ticketType = :ticketType', {
        ticketType: query.ticketType,
      });
    }

    if (query.assigneeId) {
      if (query.assigneeId.toLowerCase() === 'unassigned') {
        qb.andWhere('t.assigneeId IS NULL');
      } else {
        qb.andWhere('t.assigneeId = :assigneeId', {
          assigneeId: query.assigneeId,
        });
      }
    }

    if (query.reporterId) {
      qb.andWhere('t.reporterId = :reporterId', {
        reporterId: query.reporterId,
      });
    }

    if (query.contactId) {
      qb.andWhere('t.contactId = :contactId', {
        contactId: query.contactId,
      });
    }

    if (query.dateFrom) {
      const fromDate = new Date(`${query.dateFrom}T00:00:00.000Z`);
      qb.andWhere('t.createdAt >= :dateFrom', { dateFrom: fromDate });
    }

    if (query.dateTo) {
      const toDate = new Date(`${query.dateTo}T00:00:00.000Z`);
      toDate.setUTCDate(toDate.getUTCDate() + 1);
      qb.andWhere('t.createdAt < :dateTo', { dateTo: toDate });
    }

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        `(
        t.title ILIKE :searchLike
        OR t.description ILIKE :searchLike
        OR t.ticketRefNo ILIKE :searchLike
        OR :search <% t.title
        OR :search <% t.description
      )`,
        { search, searchLike: `%${search}%` },
      );

      // qb.addSelect(
      //   `GREATEST(
      //   CASE WHEN t.title ILIKE :searchLike THEN 1.0 ELSE 0 END,
      //   CASE WHEN t.description ILIKE :searchLike THEN 1.0 ELSE 0 END,
      //   CASE WHEN t.ticketRefNo ILIKE :searchLike THEN 1.0 ELSE 0 END,
      //   word_similarity(:search, t.title),
      //   word_similarity(:search, t.description)
      // )`,
      //   'search_score',
      // );
    }

    qb.select([
      't.id',
      't.title',
      't.createdAt',
      't.ticketRefNo',
      't.dueDate',
      't.ticketType',

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

      'c.id',
      'c.fullName',
      'c.phone',
    ]);

    // getSql-order note: TypeORM appends addSelect columns onto whatever .select()
    // already set — but since addSelect for search_score happened before .select()
    // is called here, .select() would normally REPLACE the whole select list and
    // wipe out search_score. To avoid that footgun, re-add it after .select():
    if (search) {
      qb.addSelect(
        `GREATEST(
        CASE WHEN t.title ILIKE :searchLike THEN 1.0 ELSE 0 END,
        CASE WHEN t.description ILIKE :searchLike THEN 1.0 ELSE 0 END,
        CASE WHEN t.ticketRefNo ILIKE :searchLike THEN 1.0 ELSE 0 END,
        word_similarity(:search, t.title),
        word_similarity(:search, t.description)
      )`,
        'search_score',
      );
      qb.orderBy('search_score', 'DESC').addOrderBy('t.createdAt', 'DESC');
    } else {
      qb.orderBy('t.createdAt', 'DESC');
    }

    qb.skip((query.page - 1) * query.limit).take(query.limit);

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

  // Distinct users who have actually created (reported) a ticket in this project —
  // powers the Created By filter, as opposed to every project member.
  async getProjectReporters(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) throw new NotFoundException('Project not found');

    return this.ticketRepo
      .createQueryBuilder('t')
      .innerJoin('t.reporter', 'r')
      .where('t.projectId = :projectId', { projectId })
      .select('r.id', 'id')
      .addSelect('r.fullName', 'fullName')
      .groupBy('r.id')
      .addGroupBy('r.fullName')
      .orderBy('r.fullName', 'ASC')
      .getRawMany<{ id: string; fullName: string }>();
  }

  // Distinct users who actually have a ticket assigned to them in this project —
  // powers the Agent filter, as opposed to every project member.
  async getProjectAssignees(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) throw new NotFoundException('Project not found');

    return this.ticketRepo
      .createQueryBuilder('t')
      .innerJoin('t.assignee', 'a')
      .where('t.projectId = :projectId', { projectId })
      .select('a.id', 'id')
      .addSelect('a.fullName', 'fullName')
      .groupBy('a.id')
      .addGroupBy('a.fullName')
      .orderBy('a.fullName', 'ASC')
      .getRawMany<{ id: string; fullName: string }>();
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
      .leftJoin('t.reporter', 'r')
      .leftJoin('t.contact', 'c');
    const ACTIVE_STATUS_SENTINEL = '00000000-0000-0000-0000-000000000100';

    if (query.statusKey) {
      if (
        query.statusKey.toLowerCase() === 'active' ||
        query.statusKey === ACTIVE_STATUS_SENTINEL
      ) {
        qb.andWhere('COALESCE(s.isClosed, false) = false');
      } else {
        qb.andWhere('t.statusKey = :statusKey', {
          statusKey: query.statusKey,
        });
      }
    }

    if (query.ticketType) {
      qb.andWhere('t.ticketType = :ticketType', {
        ticketType: query.ticketType,
      });
    }

    if (query.priorityKey) {
      qb.andWhere('t.priorityKey = :priorityKey', {
        priorityKey: query.priorityKey,
      });
    }

    if (query.assigneeId) {
      if (query.assigneeId.toLowerCase() === 'unassigned') {
        qb.andWhere('t.assigneeId IS NULL');
      } else {
        qb.andWhere('t.assigneeId = :assigneeId', {
          assigneeId: query.assigneeId,
        });
      }
    }

    if (query.reporterId) {
      qb.andWhere('t.reporterId = :reporterId', {
        reporterId: query.reporterId,
      });
    }

    if (query.projectIds?.length) {
      qb.andWhere('t.projectId IN (:...projectIds)', {
        projectIds: query.projectIds,
      });
    }

    if (query.contactId) {
      qb.andWhere('t.contactId = :contactId', {
        contactId: query.contactId,
      });
    }

    if (query.dateFrom) {
      const fromDate = new Date(`${query.dateFrom}T00:00:00.000Z`);
      qb.andWhere('t.createdAt >= :dateFrom', { dateFrom: fromDate });
    }

    if (query.dateTo) {
      const toDate = new Date(`${query.dateTo}T00:00:00.000Z`);
      toDate.setUTCDate(toDate.getUTCDate() + 1);
      qb.andWhere('t.createdAt < :dateTo', { dateTo: toDate });
    }

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        `(
        t.title ILIKE :searchLike
        OR t.description ILIKE :searchLike
        OR t.ticketRefNo ILIKE :searchLike
        OR :search <% t.title
        OR :search <% t.description
      )`,
        { search, searchLike: `%${search}%` },
      );
    }

    /*
     * Clone the filtered query again (same base as summaryQuery) so this
     * reflects ALL matching tickets, not just the current page.
     */
    const countPerStatusQuery = qb.clone();

    const countPerStatusRaw = await countPerStatusQuery
      .select('t.statusKey', 'statusKey')
      .addSelect('COUNT(t.id)', 'count')
      .groupBy('t.statusKey')
      .getRawMany();

    const countsByStatusKey: Record<string, number> = {};
    for (const row of countPerStatusRaw) {
      const key = row.statusKey ?? row.statuskey;
      countsByStatusKey[key] = Number(row.count);
    }
    // Pull every possible status key so zero-count ones are included too
    const allStatuses = await this.statusRepo
      .createQueryBuilder('s')
      .select('s.key', 'key')
      .getRawMany();

    const countPerStatus: Record<string, number> = {};
    for (const row of allStatuses) {
      const key = row.key;
      countPerStatus[key] = countsByStatusKey[key] ?? 0;
    }

    // Summary covers all matching leads, not only the current page.
    const summary = await this.buildStatusSummary(qb);

    qb.select([
      't.id',
      't.title',
      't.description',
      't.createdAt',
      't.ticketRefNo',
      't.dueDate',
      't.ticketType',

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

      'c.id',
      'c.fullName',
      'c.phone',
    ]);

    if (search) {
      qb.addSelect(
        `GREATEST(
        CASE WHEN t.title ILIKE :searchLike THEN 1.0 ELSE 0 END,
        CASE WHEN t.description ILIKE :searchLike THEN 1.0 ELSE 0 END,
        CASE WHEN t.ticketRefNo ILIKE :searchLike THEN 1.0 ELSE 0 END,
        word_similarity(:search, t.title),
        word_similarity(:search, t.description)
      )`,
        'search_score',
      );
      qb.orderBy('search_score', 'DESC').addOrderBy('t.createdAt', 'DESC');
    } else {
      qb.orderBy('t.createdAt', 'DESC');
    }

    qb.skip((query.page - 1) * query.limit).take(query.limit);
    const total = await qb.getCount();
    const { entities, raw } = await qb.getRawAndEntities();

    console.debug('SQL QUERY NEED TO COPY AND PASTE TO PGADMIN OR DBeaver');
    console.log(qb.getSql());
    console.debug('PARAMETERS NEED TO COPY AND PASTE TO PGADMIN OR DBeaver');
    console.log(qb.getParameters());
    console.debug('ended ended ended..................');
    const items = entities.map((entity, i) => ({
      ...entity,
      searchScore: search ? Number(raw[i]?.search_score ?? 0) : undefined,
    }));

    return {
      items,

      summary,
      countPerStatus,
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

  // Distinct users who have actually created (reported) a ticket across the
  // caller's accessible projects — powers the Created By filter on the
  // multi-project ticket views, as opposed to every member of those projects.
  async getReporters(projectIds: string[] | undefined, user) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .innerJoin('t.project', 'p')
      .innerJoin('p.members', 'u', 'u.id = :userId', { userId: user.id })
      .innerJoin('t.reporter', 'r')
      .select('r.id', 'id')
      .addSelect('r.fullName', 'fullName')
      .groupBy('r.id')
      .addGroupBy('r.fullName')
      .orderBy('r.fullName', 'ASC');

    if (projectIds?.length) {
      qb.andWhere('t.projectId IN (:...projectIds)', { projectIds });
    }

    return qb.getRawMany<{ id: string; fullName: string }>();
  }

  // Distinct users who actually have a ticket assigned to them across the
  // caller's accessible projects — powers the Assigned To filter on the
  // multi-project ticket views, as opposed to every member of those projects.
  async getAssignees(projectIds: string[] | undefined, user) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .innerJoin('t.project', 'p')
      .innerJoin('p.members', 'u', 'u.id = :userId', { userId: user.id })
      .innerJoin('t.assignee', 'a')
      .select('a.id', 'id')
      .addSelect('a.fullName', 'fullName')
      .groupBy('a.id')
      .addGroupBy('a.fullName')
      .orderBy('a.fullName', 'ASC');

    if (projectIds?.length) {
      qb.andWhere('t.projectId IN (:...projectIds)', { projectIds });
    }

    return qb.getRawMany<{ id: string; fullName: string }>();
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
  //     throw new NotFoundException('Lead not found');
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
      throw new ForbiddenException('You do not have access to this lead');
    }

    const ticket = await this.ticketRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.project', 'p')
      .leftJoinAndSelect('t.assignee', 'a')
      .leftJoinAndSelect('t.reporter', 'r')
      .leftJoinAndSelect('t.contact', 'c')
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

        'c.id',
        'c.fullName',
        'c.phone',
      ])
      .getOne();

    if (!ticket) {
      throw new NotFoundException('Lead not found');
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
    const ticket = await this.ticketRepo.findOne({
      where: {
        id: ticketId,
        projectId,
      },
      relations: {
        project: {
          members: true,
        },
        reporter: true,
        assignee: true,
        status: true,
        priority: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Lead not found');
    }

    if (dto.contactId) {
      await this.ensureContactExists(dto.contactId);
    }

    const oldTicket = { ...ticket };
    const oldStatus = ticket.status;
    const oldPriority = ticket.priority;
    const { statusKey, priorityKey, ...rest } = dto;

    Object.assign(ticket, {
      ...rest,
      updatedBy: userId,
      updatedAt: new Date(),
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
    const fullname = await this.usersService.getFullName(userId);
    if (
      dto.assigneeId !== undefined &&
      dto.assigneeId !== oldTicket.assigneeId
    ) {
      if (dto.assigneeId) {
        const newAssigneeEntity = await this.userRepo.findOne({
          where: { id: dto.assigneeId },
        });
        if (!newAssigneeEntity)
          throw new NotFoundException('Agent not found');
        ticket.assignee = newAssigneeEntity;
        ticket.assigneeId = dto.assigneeId;
      } else {
        ticket.assignee = null;
        ticket.assigneeId = null;
      }
    }
    await this.ticketRepo.save(ticket);
    // Re-fetch updated ticket with all relations required by email notifications
    const updatedTicket = await this.ticketRepo.findOne({
      where: {
        id: ticket.id,
        projectId,
      },
      relations: {
        project: {
          members: true,
        },
        reporter: true,
        assignee: true,
        status: true,
        priority: true,
      },
    });

    if (!updatedTicket) {
      throw new NotFoundException('Lead not found');
    }
    const updatedBy = await this.userRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        isInvitationAccepted: true,
      },
    });

    if (!updatedBy) {
      throw new NotFoundException('Updated-by user not found');
    }
    const members = (updatedTicket.project?.members || [])
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
    if (updatedTicket.reporter && updatedTicket?.reporter?.id !== userId)
      participantsMap.set(updatedTicket.reporter.email, {
        userId: updatedTicket.reporter.id,
        name: updatedTicket.reporter.fullName,
        email: updatedTicket.reporter.email,
        isInvitationAccepted: updatedTicket.reporter.isInvitationAccepted,
      });
    if (updatedTicket.assignee && updatedTicket?.assignee?.id !== userId)
      participantsMap.set(updatedTicket.assignee.email, {
        userId: updatedTicket.assignee.id,
        name: updatedTicket.assignee.fullName,
        email: updatedTicket.assignee.email,
        isInvitationAccepted: updatedTicket.assignee.isInvitationAccepted, // Include the isInvitationAccepted property
      });

    const participants = Array.from(participantsMap.values());
    // const participantsMap = new Map<
    //   string,
    //   {
    //     name: string;
    //     email: string;
    //     isInvitationAccepted?: boolean;
    //   }
    // >();

    // for (const member of updatedTicket.project?.members ?? []) {
    //   if (member.id !== userId) {
    //     participantsMap.set(member.email, {
    //       name: member.fullName,
    //       email: member.email,
    //       isInvitationAccepted: member.isInvitationAccepted,
    //     });
    //   }
    // }

    // if (updatedTicket.reporter && updatedTicket.reporter.id !== userId) {
    //   participantsMap.set(updatedTicket.reporter.email, {
    //     name: updatedTicket.reporter.fullName,
    //     email: updatedTicket.reporter.email,
    //     isInvitationAccepted: updatedTicket.reporter.isInvitationAccepted,
    //   });
    // }

    // if (updatedTicket.assignee && updatedTicket.assignee.id !== userId) {
    //   participantsMap.set(updatedTicket.assignee.email, {
    //     name: updatedTicket.assignee.fullName,
    //     email: updatedTicket.assignee.email,
    //     isInvitationAccepted: updatedTicket.assignee.isInvitationAccepted,
    //   });
    // }

    // const participants = Array.from(participantsMap.values());

    const updatedByRecipient = {
      userId: updatedBy.id,
      name: updatedBy.fullName,
      email: updatedBy.email,
      isInvitationAccepted: updatedBy.isInvitationAccepted,
    };
    // STATUS CHANGED
    if (dto.statusKey && oldStatus && dto.statusKey !== oldStatus.key) {
      const filteredParticipants =
        await this.notificationsService.filterEmailRecipients(
          participants,
          EmailEventType.TICKET_STATUS_UPDATED,
        );
      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: userId,
        type: NotificationType.TICKET_STATUS_CHANGED,
        entityType: NotificationEntityType.TICKET,
        entityId: ticket.id,
        ticketId: ticket.id,
        title: `"Lead: "${ticket.ticketRefNo}" status changed to ${ticket.status.label} by ${fullname}`,
        message: `${oldStatus.label} to ${dto.statusKey}`,
        // explicitRecipientIds: [...new Set(recipients)],
      });
      await this.notificationsService.dispatch({
        type: EmailEventType.TICKET_STATUS_UPDATED,
        payload: {
          ticketId: updatedTicket.id,
          ticketNumber: updatedTicket.ticketRefNo,
          ticketTitle: updatedTicket.title,
          projectName: updatedTicket.project.name,
          projectId: updatedTicket.projectId,
          previousStatus: oldStatus.label,
          newStatus: updatedTicket.status.label,
          updatedBy: updatedByRecipient,
          participants: filteredParticipants,
        },
      });
    }

    const toDateStr = (d: Date | string | null | undefined) =>
      d ? new Date(d).toISOString().slice(0, 10) : null; // "2026-08-30"

    const oldDueDateStr = toDateStr(oldTicket.dueDate);
    const newDueDateStr = toDateStr(ticket.dueDate); // after Object.assign, or dto.dueDate

    // DUE DATE CHANGED
    if (dto.dueDate !== undefined && oldDueDateStr !== newDueDateStr) {
      const filteredParticipants =
        await this.notificationsService.filterEmailRecipients(
          participants,
          EmailEventType.TICKET_DUE_DATE_UPDATED,
        );
      const message = oldDueDateStr
        ? `${oldDueDateStr} to ${newDueDateStr}`
        : `Set to ${newDueDateStr}`;

      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: userId,
        type: NotificationType.TICKET_DUE_DATE_CHANGED,
        entityType: NotificationEntityType.TICKET,
        entityId: ticket.id,
        ticketId: ticket.id,
        title: `"Lead: "${ticket.ticketRefNo}" due date changed to ${newDueDateStr} by ${fullname}`,
        message: message,
        // explicitRecipientIds: [...new Set(recipients)],
      });
      await this.notificationsService.dispatch({
        type: EmailEventType.TICKET_DUE_DATE_UPDATED,
        payload: {
          ticketId: updatedTicket.id,
          ticketNumber: updatedTicket.ticketRefNo,
          ticketTitle: updatedTicket.title,
          projectName: updatedTicket.project.name,
          projectId: updatedTicket.projectId,
          previousDueDate: oldDueDateStr,
          newDueDate: newDueDateStr,
          updatedBy: updatedByRecipient,
          participants: filteredParticipants,
        },
      });
    }

    // PRIORITY CHANGED
    if (dto.priorityKey && oldPriority && dto.priorityKey !== oldPriority.key) {
      const filteredParticipants =
        await this.notificationsService.filterEmailRecipients(
          participants,
          EmailEventType.TICKET_PRIORITY_UPDATED,
        );
      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: userId,
        type: NotificationType.TICKET_PRIORITY_CHANGED,
        entityType: NotificationEntityType.TICKET,
        entityId: ticket.id,
        ticketId: ticket.id,
        title: `Lead: "${ticket.ticketRefNo}" priority changed to ${ticket.priority.label} by ${fullname}`,
        message: `${oldPriority.label} to ${dto.priorityKey}`,
        // explicitRecipientIds: [...new Set(recipients)],
      });
      await this.notificationsService.dispatch({
        type: EmailEventType.TICKET_PRIORITY_UPDATED,
        payload: {
          ticketId: updatedTicket.id,
          ticketNumber: updatedTicket.ticketRefNo,
          ticketTitle: updatedTicket.title,
          projectName: updatedTicket.project.name,
          projectId: updatedTicket.projectId,
          previousPriority: oldPriority.label,
          newPriority: updatedTicket.priority.label,
          updatedBy: updatedByRecipient,
          participants: filteredParticipants,
        },
      });
    }
    // TYPE CHANGED
    if (
      dto.ticketType !== undefined &&
      dto.ticketType !== oldTicket.ticketType
    ) {
      const filteredParticipants =
        await this.notificationsService.filterEmailRecipients(
          participants,
          EmailEventType.TICKET_TYPE_UPDATED,
        );
      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: userId,
        type: NotificationType.TICKET_TYPE_CHANGED,
        entityType: NotificationEntityType.TICKET,
        entityId: ticket.id,
        ticketId: ticket.id,
        title: `Lead: "${ticket.ticketRefNo}" type changed to ${getTicketTypeLabel(ticket.ticketType)} by ${fullname}`,
        message: `${getTicketTypeLabel(oldTicket.ticketType)} to ${getTicketTypeLabel(dto.ticketType)}`,
      });
      await this.notificationsService.dispatch({
        type: EmailEventType.TICKET_TYPE_UPDATED,
        payload: {
          ticketId: updatedTicket.id,
          ticketNumber: updatedTicket.ticketRefNo,
          ticketTitle: updatedTicket.title,
          projectName: updatedTicket.project.name,
          projectId: updatedTicket.projectId,
          previousTicketType: getTicketTypeLabel(oldTicket.ticketType),
          newTicketType: getTicketTypeLabel(updatedTicket.ticketType),
          updatedBy: updatedByRecipient,
          participants: filteredParticipants,
        },
      });
    }
    // PERSON ASSIGNED
    if (
      dto.assigneeId !== undefined &&
      dto.assigneeId !== oldTicket.assigneeId
    ) {
      const newAssignee = updatedTicket.assignee;
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
          : `Lead: "${ticket.ticketRefNo}" is now unassigned`,
        // explicitRecipientIds: [...new Set(recipients)],
      });
      // Email only when assigning to someone.
      // No email is dispatched for unassignment because
      // TicketAssigneeUpdatedPayload.newAssignee is required.
      if (newAssignee) {
        const filteredParticipants =
          await this.notificationsService.filterEmailRecipients(
            participants,
            EmailEventType.TICKET_ASSIGNEE_UPDATED,
          );
        await this.notificationsService.dispatch({
          type: EmailEventType.TICKET_ASSIGNEE_UPDATED,
          payload: {
            ticketId: updatedTicket.id,
            ticketNumber: updatedTicket.ticketRefNo,
            ticketTitle: updatedTicket.title,
            projectName: updatedTicket.project.name,
            projectId: updatedTicket.projectId,

            previousAssignee: oldTicket.assignee
              ? {
                  userId: oldTicket.assignee.id,
                  name: oldTicket.assignee.fullName,
                  email: oldTicket.assignee.email,
                  isInvitationAccepted: oldTicket.assignee.isInvitationAccepted,
                }
              : undefined,

            newAssignee: {
              userId: newAssignee.id,
              name: newAssignee.fullName,
              email: newAssignee.email,
              isInvitationAccepted: newAssignee.isInvitationAccepted,
            },

            updatedBy: updatedByRecipient,
            participants: filteredParticipants,
          },
        });
      }
    }

    if (dto.title !== undefined && oldTicket.title !== dto.title) {
      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: userId,
        type: NotificationType.TICKET_TITLE_CHANGED,
        entityType: NotificationEntityType.TICKET,
        entityId: ticket.id,
        ticketId: ticket.id,
        title: `Lead: "${ticket.ticketRefNo}" renamed to "${dto.title}" by ${fullname}`,
        message: `Previously: "${oldTicket.title}"`,
        // explicitRecipientIds: [...new Set(recipients)],
      });
    }

    if (dto.title !== undefined &&oldTicket.description !== dto.description) {
      await this.notificationsService.notifyProjectMembers({
        projectId: ticket.projectId,
        actorId: userId,
        type: NotificationType.TICKET_DESCRIPTION_CHANGED,
        entityType: NotificationEntityType.TICKET,
        entityId: ticket.id,
        ticketId: ticket.id,
        title: `Lead: "${ticket.ticketRefNo}" description was updated by ${fullname}`,
        // explicitRecipientIds: [...new Set(recipients)],
      });
    }

    return updatedTicket;
  }

  async findTicketRefNo(ticketId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      select: { ticketRefNo: true },
    });
    return ticket?.ticketRefNo;
  }

  // ---------------- DELETE (SOFT) ----------------
  async remove(projectId: string, ticketId: string, userId: string) {
    const ticket = await this.findEntity(projectId, ticketId, userId);

    await this.ticketRepo.softRemove(ticket);

    await this.ticketRepo.update(ticket.id, {
      isActive: false,
      updatedBy: userId,
    });

    const fullname = await this.usersService.getFullName(userId);

    await this.notificationsService.notifyProjectMembers({
      projectId: ticket.projectId,
      actorId: userId,
      type: NotificationType.TICKET_DELETED,
      entityType: NotificationEntityType.TICKET,
      entityId: ticket.id,
      ticketId: ticket.id,
      title: `Lead # "${ticket.ticketRefNo}" deleted by ${fullname}`,
    });

    return { success: true };
  }

  // ---------------- TICKET'S SUMMARY -------------------
  async getTicketSummary(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.buildStatusSummary(
      this.ticketRepo
        .createQueryBuilder('t')
        .where('t.projectId = :projectId', { projectId }),
    );
  }

  async getGlobalTicketSummary(user) {
    return this.buildStatusSummary(
      this.ticketRepo
        .createQueryBuilder('t')
        .leftJoin('t.project', 'p')
        .innerJoin('p.members', 'u', 'u.id = :userId', {
          userId: user.id,
        }),
    );
  }

  // ---------------- UPCOMING TICKETS -------------
  // Tickets that are not closed, and either have no due date
  // or have a due date within the next 3 days (no overdue tickets)
  async getUpcomingTickets(query: PaginationQueryDto, user) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upperBound = new Date(today);
    upperBound.setDate(upperBound.getDate() + 2);
    upperBound.setHours(23, 59, 59, 999);

    // return this.ticketRepo
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.project', 'p')
      .innerJoin('p.members', 'u', 'u.id = :userId', {
        userId: user.id,
      })
      .leftJoin('t.status', 's')
      .leftJoin('t.priority', 'pr')
      .where('COALESCE(s.isClosed, false) = false')
      .andWhere(
        '(t.dueDate IS NULL OR t.dueDate BETWEEN :today AND :upperBound)',
        {
          today: today.toISOString(),
          upperBound: upperBound.toISOString(),
        },
      );

    qb.select([
      't.id',
      't.title',
      't.createdAt',
      't.ticketRefNo',
      't.dueDate',
      't.ticketType',

      'p.id',
      'p.name',
      'p.brandColor',

      's.key',
      's.label',
      's.color',

      'pr.key',
      'pr.label',
      'pr.color',
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
  // .getMany();

  // ---------------- ATTACHMENTS ----------------
  async handleAttachments(
    ticketId: string,
    projectId: string,
    files: UploadedFileDto[],
    userId: string,
  ) {
    for (const file of files) {
      // const key = `projects/${projectId}/tickets/${ticketId}/${Date.now()}-${file.originalname}`;

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
        source: FileSource.TICKET,
        sourceId: ticketId,
        status: FileStatus.ACTIVE,
      });
    }
  }

  private async findEntity(
    projectId: string,
    ticketId: string,
    userId: string,
  ) {
    const isMember = await this.projectRepo
      .createQueryBuilder('p')
      .innerJoin('p.members', 'm', 'm.id = :userId', { userId })
      .where('p.id = :projectId', { projectId })
      .getExists();

    if (!isMember) {
      throw new ForbiddenException('You do not have access to this lead');
    }

    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, projectId },
      relations: {
        status: true,
        priority: true,
      },
    });

    if (!ticket) throw new NotFoundException('Lead not found');

    return ticket;
  }

  async getKanbanTicketCounts(query: GetKanbanTicketCountsDto, user) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.project', 'p')
      .innerJoin('p.members', 'u', 'u.id = :userId', {
        userId: user.id,
      })
      .leftJoin('t.status', 's')
      .leftJoin('t.priority', 'pr');

    if (query.priorityKey) {
      qb.andWhere('t.priorityKey = :priorityKey', {
        priorityKey: query.priorityKey,
      });
    }

    if (query.projectIds?.length) {
      qb.andWhere('t.projectId IN (:...projectIds)', {
        projectIds: query.projectIds,
      });
    }

    if (query.ticketType) {
      qb.andWhere('t.ticketType = :ticketType', {
        ticketType: query.ticketType,
      });
    }

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        `(
        t.title ILIKE :searchLike
        OR t.description ILIKE :searchLike
        OR t.ticketRefNo ILIKE :searchLike
        OR :search <% t.title
        OR :search <% t.description
      )`,
        { search, searchLike: `%${search}%` },
      );
    }

    const countsRaw = await qb
      .clone()
      .select('t.statusKey', 'statusKey')
      .addSelect('COUNT(t.id)', 'count')
      .groupBy('t.statusKey')
      .getRawMany();

    const countsByStatusKey: Record<string, number> = {};
    for (const row of countsRaw) {
      const key = row.statusKey ?? row.statuskey;
      countsByStatusKey[key] = Number(row.count);
    }

    const allStatuses = await this.statusRepo
      .createQueryBuilder('s')
      .select('s.key', 'key')
      .getRawMany();

    const countPerStatus: Record<string, number> = {};
    for (const row of allStatuses) {
      countPerStatus[row.key] = countsByStatusKey[row.key] ?? 0;
    }

    return { countPerStatus };
  }

  async getKanbanBoards(query: KanbanQueryDto, user) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoin('t.project', 'p')
      .innerJoin('p.members', 'u', 'u.id = :userId', { userId: user.id })
      .leftJoin('t.status', 's')
      .leftJoin('t.priority', 'pr')
      .leftJoin('t.assignee', 'a')
      .leftJoin('t.reporter', 'r')
      .leftJoin('t.contact', 'c');

    if (query.projectIds?.length) {
      qb.andWhere('t.projectId IN (:...projectIds)', {
        projectIds: query.projectIds,
      });
    }

    if (query.priorityKey) {
      qb.andWhere('t.priorityKey = :priorityKey', {
        priorityKey: query.priorityKey,
      });
    }

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        `(
        t.title ILIKE :searchLike
        OR t.description ILIKE :searchLike
        OR t.ticketRefNo ILIKE :searchLike
        OR :search <% t.title
        OR :search <% t.description
      )`,
        { search, searchLike: `%${search}%` },
      );
    }

    if (query.ticketType) {
      qb.andWhere('t.ticketType = :ticketType', {
        ticketType: query.ticketType,
      });
    }

    // Count per status — clone BEFORE select/order so it reflects all matching tickets,
    // same pattern as findAllProjects.
    const countPerStatusRaw = await qb
      .clone()
      .select('t.statusKey', 'statusKey')
      .addSelect('COUNT(t.id)', 'count')
      .groupBy('t.statusKey')
      .getRawMany();

    const countsByStatusKey: Record<string, number> = {};
    for (const row of countPerStatusRaw) {
      const key = row.statusKey ?? row.statuskey;
      countsByStatusKey[key] = Number(row.count);
    }

    // Pull every status (so empty columns still render on the board)
    const allStatuses = await this.statusRepo
      .createQueryBuilder('s')
      .select('s.key', 'key')
      .addSelect('s.label', 'label')
      .addSelect('s.color', 'color')
      .getRawMany();

    const countPerStatus: Record<string, number> = {};
    for (const row of allStatuses) {
      countPerStatus[row.key] = countsByStatusKey[row.key] ?? 0;
    }

    // Card data
    qb.select([
      't.id',
      't.title',
      't.ticketRefNo',
      't.dueDate',
      't.createdAt',
      't.statusKey',
      't.ticketType',

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

      'c.id',
      'c.fullName',
      'c.phone',
    ]);

    if (search) {
      qb.addSelect(
        `GREATEST(
        CASE WHEN t.title ILIKE :searchLike THEN 1.0 ELSE 0 END,
        CASE WHEN t.description ILIKE :searchLike THEN 1.0 ELSE 0 END,
        CASE WHEN t.ticketRefNo ILIKE :searchLike THEN 1.0 ELSE 0 END,
        word_similarity(:search, t.title),
        word_similarity(:search, t.description)
      )`,
        'search_score',
      );
      qb.orderBy('search_score', 'DESC').addOrderBy('t.createdAt', 'DESC');
    } else {
      qb.orderBy('t.createdAt', 'DESC');
    }

    const tickets = await qb.getMany();

    // Group into columns, seeded with every status (even zero-count ones)
    const items: Record<string, typeof tickets> = {};
    for (const row of allStatuses) {
      items[row.key] = [];
    }
    for (const ticket of tickets) {
      const key = ticket.statusKey ?? 'unassigned';
      (items[key] ??= []).push(ticket);
    }

    return {
      items,
      countPerStatus,
    };
  }

  // async getKanbanBoard(query: KanbanBoardQueryDto, user) {
  //   const limit = query.limit ?? 20;
  //   const page = query.page ?? 1;

  //   const baseQb = this.ticketRepo
  //     .createQueryBuilder('t')
  //     .leftJoin('t.project', 'p')
  //     .innerJoin('p.members', 'u', 'u.id = :userId', { userId: user.id })
  //     .leftJoin('t.status', 's')
  //     .leftJoin('t.priority', 'pr')
  //     .leftJoin('t.assignee', 'a')
  //     .leftJoin('t.reporter', 'r');

  //   if (query.projectIds?.length) {
  //     baseQb.andWhere('t.projectId IN (:...projectIds)', {
  //       projectIds: query.projectIds,
  //     });
  //   }

  //   if (query.priorityKey) {
  //     baseQb.andWhere('t.priorityKey = :priorityKey', {
  //       priorityKey: query.priorityKey,
  //     });
  //   }

  //   if (query.ticketType) {
  //     baseQb.andWhere('t.ticketType = :ticketType', { ticketType: query.ticketType });
  //   }

  //   const search = query.search?.trim();
  //   if (search) {
  //     baseQb.andWhere(
  //       `(
  //       t.title ILIKE :searchLike
  //       OR t.description ILIKE :searchLike
  //       OR t.ticketRefNo ILIKE :searchLike
  //       OR :search <% t.title
  //       OR :search <% t.description
  //     )`,
  //       { search, searchLike: `%${search}%` },
  //     );
  //   }

  //   const CARD_COLUMNS = [
  //     't.id',
  //     't.title',
  //     't.ticketRefNo',
  //     't.dueDate',
  //     't.createdAt',
  //     't.statusKey',
  //     't.ticketType',
  //     'p.id',
  //     'p.name',
  //     'p.brandColor',
  //     's.key',
  //     's.label',
  //     's.color',
  //     'pr.key',
  //     'pr.label',
  //     'pr.color',
  //     'a.id',
  //     'a.fullName',
  //     'a.email',
  //   ];

  //   // ---- Single column pagination (statusKey provided) ----
  //   if (query.statusKey) {
  //     const qb = baseQb
  //       .clone()
  //       .andWhere('t.statusKey = :statusKey', { statusKey: query.statusKey })
  //       .select(CARD_COLUMNS)
  //       .orderBy('t.createdAt', 'DESC')
  //       .addOrderBy('t.id', 'DESC')
  //       .skip((page - 1) * limit)
  //       .take(limit + 1);

  //     const rows = await qb.getMany();
  //     const hasMore = rows.length > limit;
  //     const items = rows.slice(0, limit);

  //     return { statusKey: query.statusKey, items, hasMore };
  //   }

  //   // ---- Initial load: all columns at once, via window function ----
  //   const allStatuses = await this.statusRepo
  //     .createQueryBuilder('s')
  //     .select('s.key', 'key')
  //     .addSelect('s.label', 'label')
  //     .addSelect('s.color', 'color')
  //     .getRawMany();

  //   // fetch up to (limit + 1) rows PER status in one indexed scan
  //   const rowsPerStatusCap = limit + 1;

  //   const rankedQb = baseQb
  //     .clone()
  //     .select(CARD_COLUMNS)
  //     .addSelect(
  //       `ROW_NUMBER() OVER (
  //       PARTITION BY "t"."statusKey"
  //       ORDER BY "t"."createdAt" DESC, "t"."id" DESC
  //     )`,
  //       'rn',
  //     );

  //   // Wrap in a subquery so we can filter on the window function result
  //   const wrapped = this.ticketRepo.manager
  //     .createQueryBuilder()
  //     .select('ranked.*')
  //     .from(`(${rankedQb.getQuery()})`, 'ranked')
  //     .setParameters(rankedQb.getParameters())
  //     .where('ranked.rn <= :cap', { cap: rowsPerStatusCap });

  //   const rankedRows = await wrapped.getRawMany();

  //   const items: Record<string, any[]> = {};
  //   const hasMore: Record<string, boolean> = {};
  //   for (const row of allStatuses) {
  //     items[row.key] = [];
  //     hasMore[row.key] = false;
  //   }

  //   for (const row of rankedRows) {
  //     const key = row.t_statusKey ?? row.statusKey; // depends on raw alias casing
  //     if (!items[key]) items[key] = [];
  //     if (Number(row.rn) <= limit) {
  //       items[key].push(row); // TODO: map raw row -> entity shape
  //     } else {
  //       hasMore[key] = true;
  //     }
  //   }

  //   return { items, hasMore };
  // }
  private mapToCard(t: Ticket) {
    return {
      id: t.id,
      title: t.title,
      ticketRefNo: t.ticketRefNo,
      dueDate: t.dueDate,
      createdAt: t.createdAt,
      statusKey: t.statusKey,
      ticketType: t.ticketType,
      project: t.project
        ? {
            id: t.project.id,
            name: t.project.name,
            brandColor: t.project.brandColor,
          }
        : null,
      status: t.status
        ? { key: t.status.key, label: t.status.label, color: t.status.color }
        : null,
      priority: t.priority
        ? {
            key: t.priority.key,
            label: t.priority.label,
            color: t.priority.color,
          }
        : null,
      assignee: t.assignee
        ? {
            id: t.assignee.id,
            fullName: t.assignee.fullName,
            email: t.assignee.email,
          }
        : null,
      reporter: t.reporter
        ? {
            id: t.reporter.id,
            fullName: t.reporter.fullName,
            email: t.reporter.email,
          }
        : null,
      contact: t.contact
        ? {
            id: t.contact.id,
            fullName: t.contact.fullName ?? null,
            phone: t.contact.phone,
          }
        : null,
    };
  }

  private async fetchStatusColumn(
    baseQb: SelectQueryBuilder<Ticket>,
    statusKey: string,
    limit: number,
    page: number,
  ): Promise<{ items: TicketCard[]; hasMore: boolean }> {
    const qb = baseQb
      .clone()
      .andWhere('t.statusKey = :statusKey', { statusKey })
      .orderBy('t.createdAt', 'DESC')
      .addOrderBy('t.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit + 1);

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;

    return {
      items: rows.slice(0, limit).map((t) => this.mapToCard(t)),
      hasMore,
    };
  }

  async getKanbanBoard(query: KanbanBoardQueryDto, user) {
    const limit = query.limit ?? 20;
    const page = query.page ?? 1;

    const baseQb = this.ticketRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.project', 'p')
      .innerJoin('p.members', 'u', 'u.id = :userId', { userId: user.id })
      .leftJoinAndSelect('t.status', 's')
      .leftJoinAndSelect('t.priority', 'pr')
      .leftJoinAndSelect('t.assignee', 'a')
      .leftJoinAndSelect('t.reporter', 'r')
      .leftJoinAndSelect('t.contact', 'c');

    if (query.projectIds?.length) {
      baseQb.andWhere('t.projectId IN (:...projectIds)', {
        projectIds: query.projectIds,
      });
    }

    if (query.priorityKey) {
      baseQb.andWhere('t.priorityKey = :priorityKey', {
        priorityKey: query.priorityKey,
      });
    }

    if (query.ticketType) {
      baseQb.andWhere('t.ticketType = :ticketType', {
        ticketType: query.ticketType,
      });
    }

    const search = query.search?.trim();
    if (search) {
      baseQb.andWhere(
        `(
      t.title ILIKE :searchLike
      OR t.description ILIKE :searchLike
      OR t.ticketRefNo ILIKE :searchLike
      OR :search <% t.title
      OR :search <% t.description
    )`,
        { search, searchLike: `%${search}%` },
      );
    }

    // baseQb never has statusKey applied (that only happens inside
    // fetchStatusColumn), so cloning it here gives "all filters, status ignored".
    const summary = await this.computeSummary(baseQb.clone());

    // ---- Single column pagination (statusKey provided) ----
    if (query.statusKey) {
      const { items, hasMore } = await this.fetchStatusColumn(
        baseQb,
        query.statusKey,
        limit,
        page,
      );
      return { statusKey: query.statusKey, items, hasMore, summary };
    }

    // ---- Initial load: every status column, in parallel ----
    const allStatuses = await this.statusRepo
      .createQueryBuilder('s')
      .select('s.key', 'key')
      .getRawMany();

    const entries = await Promise.all(
      allStatuses.map(
        async (s) =>
          [
            s.key,
            await this.fetchStatusColumn(baseQb, s.key, limit, 1),
          ] as const,
      ),
    );

    const items: Record<string, TicketCard[]> = {};
    const hasMore: Record<string, boolean> = {};
    for (const [key, result] of entries) {
      items[key] = result.items;
      hasMore[key] = result.hasMore;
    }

    return { items, hasMore, summary };
  }
  private computeSummary(qb: SelectQueryBuilder<Ticket>) {
    return this.buildStatusSummary(qb);
  }
}

type TicketCard = ReturnType<TicketsService['mapToCard']>;
