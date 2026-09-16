import { InjectRepository } from '@nestjs/typeorm';
import { ActivityLog } from './entity/activity-log.entity';
import { Repository } from 'typeorm';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { GetActivityLogsDto } from './dto/get-activity-logs.dto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationEntityType, NotificationType } from '@epc-crm/types';
import { Project } from '../projects/entities/project.entity';

const ticketActivityTypes = [
  NotificationType.TICKET_STATUS_CHANGED,
  NotificationType.TICKET_PRIORITY_CHANGED,
  NotificationType.TICKET_ASSIGNEE_CHANGED,
  NotificationType.TICKET_DUE_DATE_CHANGED,
  NotificationType.TICKET_CREATED,
];

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepo: Repository<ActivityLog>,
  ) {}

  async createActivity(dto: CreateActivityLogDto): Promise<ActivityLog> {
    const activity = this.activityRepo.create({
      actorId: dto.actorId,
      recipientId: dto.recipientId,
      projectId: dto.projectId,
      ticketId: dto.ticketId,
      type: dto.type,
      title: dto.title,
      entityType: dto.entityType,
      entityId: dto.entityId,
      metadata: dto.metadata ?? {},
    });

    return await this.activityRepo.save(activity);
  }

  async findAllActivities(query: GetActivityLogsDto, user) {
    const { page = 1, limit = 20, search } = query;

    const qb = this.activityRepo
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.actor', 'actor')
      .leftJoinAndSelect('activity.project', 'project')
      .leftJoinAndSelect('activity.ticket', 'ticket');

    qb.where(
      `
    (
      EXISTS (
        SELECT 1
        FROM user_projects_join upj
        WHERE upj."usersId" = :userId
          AND upj."projectsId" = activity."projectId"
      )

      OR

      (
        activity."entityType" = :projectEntityType
        AND activity."type" IN (:...projectAccessTypes)
        AND activity."recipientId" = :userId
      )
    )
    `,
      {
        userId: user.id,
        projectEntityType: NotificationEntityType.PROJECT,
        projectAccessTypes: [
          NotificationType.PROJECT_ASSIGNED,
          NotificationType.PROJECT_UNASSIGNED,
        ],
      },
    );
    // console.debug('activity.actor.id ' , activity.actor.id);
    // Don't show activities performed by the current user
    // qb.andWhere('(activity.actorId IS NULL OR activity.actorId != :userId)', {
    //   userId: user.id,
    // });

    if (search?.trim()) {
      qb.andWhere(
        `
      (
        LOWER(actor."fullName") LIKE LOWER(:search)
        OR LOWER(project.name) LIKE LOWER(:search)
        OR LOWER(ticket.title) LIKE LOWER(:search)
        OR LOWER(activity.type) LIKE LOWER(:search)
        OR LOWER(activity."entityType") LIKE LOWER(:search)
        OR LOWER(activity.title) LIKE LOWER(:search)
      )
      `,
        {
          search: `%${search.trim()}%`,
        },
      );
    }

    qb.orderBy('activity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [activities, total] = await qb.getManyAndCount();

    for (const activity of activities) {
      if (activity.actor) {
        delete activity.actor.passwordHash;
      }

      if (activity.recipient) {
        delete activity.recipient.passwordHash;
      }
    }

    return {
      items: activities,
      total,
      page,
      limit,
    };
  }

  // async findOne(id: string): Promise<ActivityLog> {}
  async findActivityById(id: string): Promise<ActivityLog> {
    const activity = await this.activityRepo
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.actor', 'actor')
      .leftJoinAndSelect('activity.project', 'project')
      .leftJoinAndSelect('activity.ticket', 'ticket')
      .where('activity.id = :id', { id })
      .andWhere('activity.isActive = :isActive', { isActive: true })
      .getOne();

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    if (activity.actor) {
      delete activity.actor.passwordHash;
    }

    return activity;
  }

    async findActivityByTicketId(projectId: string, ticketId: string, user) {
    await this.ensureProjectUserAccess(projectId, user.id);

    const activities = await this.activityRepo
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.actor', 'actor')
      .leftJoinAndSelect('activity.project', 'project')
      .leftJoinAndSelect('activity.ticket', 'ticket')
      .where('activity.projectId = :projectId', { projectId })
      .andWhere('activity.ticketId = :ticketId', { ticketId })
      .andWhere('activity.type IN (:...ticketActivityTypes)', {
        ticketActivityTypes,
      })
      .orderBy('activity.createdAt', 'DESC')
      .getMany();

    for (const activity of activities) {
      if (activity.actor) {
        delete activity.actor.passwordHash;
      }

      if (activity.recipient) {
        delete activity.recipient.passwordHash;
      }
    }
    return activities;
  }

  private async ensureProjectUserAccess(projectId: string, userId: string) {
    const hasAccess = await this.activityRepo.manager
      .getRepository(Project)
      .createQueryBuilder('p')
      .innerJoin('p.members', 'm', 'm.id = :userId', { userId })
      .where('p.id = :projectId', { projectId })
      .getExists();

    if (!hasAccess) {
      throw new ForbiddenException('Project Not Found or Access Denied');
    }
  }
}
