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
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UploadedFileDto } from '../files/dto/uploaded-file.dto';

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

      const members = (ticket.project?.members || [])
        .filter((m) => m.id !== userId)
        .map((m) => ({
          name: m.fullName,
          email: m.email,
          isInvitationAccepted: m.isInvitationAccepted,
        }));

      console.debug('Ticket saved', saved.id, 'members', members.length);
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
          projectId: ticket.project?.id || '',
          projectName: ticket.project?.name || '',
          createdBy: {
            name: ticket.reporter?.fullName || '',
            email: ticket.reporter?.email || '',
            isInvitationAccepted:
              ticket.reporter?.isInvitationAccepted ?? false,
          },
          assignee: ticket.assignee
            ? {
                name: ticket.assignee.fullName,
                email: ticket.assignee.email,
                isInvitationAccepted: ticket.assignee.isInvitationAccepted,
              }
            : undefined,
          participants,
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

    const ACTIVE_STATUS_SENTINEL = '00000000-0000-0000-0000-000000000100';

    if (query.statusKey) {
      if (
        query.statusKey.toLowerCase() === 'active' ||
        query.statusKey === ACTIVE_STATUS_SENTINEL
      ) {
        qb.andWhere('t.statusKey != :closedKey', { closedKey: 'Closed' });
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
    const ACTIVE_STATUS_SENTINEL = '00000000-0000-0000-0000-000000000100';

    if (query.statusKey) {
      if (
        query.statusKey.toLowerCase() === 'active' ||
        query.statusKey === ACTIVE_STATUS_SENTINEL
      ) {
        qb.andWhere('t.statusKey != :closedKey', { closedKey: 'Closed' });
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

    if (query.assigneeId) {
      qb.andWhere('t.assigneeId = :assigneeId', {
        assigneeId: query.assigneeId,
      });
    }

    if (query.projectIds?.length) {
      qb.andWhere('t.projectId IN (:...projectIds)', {
        projectIds: query.projectIds,
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
      't.description',
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
      throw new NotFoundException('Ticket not found');
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
          throw new NotFoundException('Assignee not found');
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
      throw new NotFoundException('Ticket not found');
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
        name: m.fullName,
        email: m.email,
        isInvitationAccepted: m.isInvitationAccepted,
      }));
    const participantsMap = new Map<
      string,
      { name: string; email: string; isInvitationAccepted?: boolean }
    >();
    for (const m of members) participantsMap.set(m.email, m);
    if (updatedTicket.reporter && updatedTicket?.reporter?.id !== userId)
      participantsMap.set(updatedTicket.reporter.email, {
        name: updatedTicket.reporter.fullName,
        email: updatedTicket.reporter.email,
        isInvitationAccepted: updatedTicket.reporter.isInvitationAccepted,
      });
    if (updatedTicket.assignee && updatedTicket?.assignee?.id !== userId)
      participantsMap.set(updatedTicket.assignee.email, {
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
      name: updatedBy.fullName,
      email: updatedBy.email,
      isInvitationAccepted: updatedBy.isInvitationAccepted,
    };
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
          participants,
        },
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
          participants,
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
          : `Ticket: "${ticket.ticketRefNo}" is now unassigned`,
        explicitRecipientIds: [...new Set(recipients)],
      });
      // Email only when assigning to someone.
      // No email is dispatched for unassignment because
      // TicketAssigneeUpdatedPayload.newAssignee is required.
      if (newAssignee) {
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
                  name: oldTicket.assignee.fullName,
                  email: oldTicket.assignee.email,
                  isInvitationAccepted: oldTicket.assignee.isInvitationAccepted,
                }
              : undefined,

            newAssignee: {
              name: newAssignee.fullName,
              email: newAssignee.email,
              isInvitationAccepted: newAssignee.isInvitationAccepted,
            },

            updatedBy: updatedByRecipient,
            participants,
          },
        });
      }
    }

    if (dto.title !== undefined && 
      oldTicket.title !== dto.title
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
      .where('t.statusKey != :statusKey', { statusKey: 'Closed' })
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
