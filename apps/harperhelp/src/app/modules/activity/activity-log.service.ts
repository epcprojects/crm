import { InjectRepository } from '@nestjs/typeorm';
import { ActivityLog } from './entity/activity-log.entity';
import { Repository } from 'typeorm';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { GetActivityLogsDto } from './dto/get-activity-logs.dto';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityRepo: Repository<ActivityLog>,
  ) {}

  async createActivity(dto: CreateActivityLogDto): Promise<ActivityLog> {
    const activity = this.activityRepo.create({
      actorId: dto.actorId,
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




  async findAllActivities(query: GetActivityLogsDto) {
    const { page = 1, limit = 20, search } = query;

    const qb = this.activityRepo
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.actor', 'actor')
      .leftJoinAndSelect('activity.project', 'project')
      .leftJoinAndSelect('activity.ticket', 'ticket')
    //   .where('activity.isActive = :isActive', { isActive: true });

    if (search?.trim()) {
      qb.andWhere(
        `
        (
          LOWER(actor."fullName") LIKE LOWER(:search)
          OR LOWER(project.name) LIKE LOWER(:search)
          OR LOWER(ticket.title) LIKE LOWER(:search)
          OR LOWER(activity.type) LIKE LOWER(:search)
          OR LOWER(activity."entityType") LIKE LOWER(:search)
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
}
