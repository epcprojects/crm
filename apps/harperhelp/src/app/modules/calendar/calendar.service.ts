import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { getDateRange } from '@harperhelp/utils';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEntityType, NotificationType } from '@harperhelp/types';
import { UsersService } from '../users/users.service';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,

    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  // CREATE

  async create(pid: string, dto: CreateEventDto, user): Promise<Event> {
    const project = await this.eventRepo.manager
      .getRepository('projects')
      .findOne({ where: { id: pid } });
    if (!project) throw new NotFoundException('Project not found');
    const event = this.eventRepo.create({ ...dto, projectId: pid });

     const username = await this.usersService.getFullName(user.id); // Fetch full name after activation

    // Send in App notification.
    await this.notificationsService.notifyProjectMembers({
      projectId: pid,
      actorId: user.id,
      type: NotificationType.EVENT_CREATED,
      entityType: NotificationEntityType.EVENT,
      entityId: event.id,
      title: `New event in ${project.name}: ${dto.title} by ${username}`,
      message: undefined,
    });

    return this.eventRepo.save(event);
  }

  // READ calendar view

  /**
   * Returns all events within the date range implied by the view parameter.
   *
   * GET /calendar/events?view=month&date=2026-06-01
   * GET /calendar/events?view=week&date=2026-06-16
   * GET /calendar/events?view=day&date=2026-06-23
   * GET /calendar/events?view=year&date=2026-01-01
   */
  async findByView(pid: string, query: CalendarQueryDto): Promise<Event[]> {
    const project = await this.eventRepo.manager
      .getRepository('projects')
      .findOne({ where: { id: pid } });
    if (!project) throw new NotFoundException('Project not found');
    const { start, end } = getDateRange(query.view, query.date);

    return this.eventRepo.find({
      where: {
        date: Between(start, end),
        projectId: pid,
        ...(query.eventType && { type: query.eventType }),
      },
      order: { date: 'ASC' },
      select: {
        id: true,
        title: true,
        type: true,
        date: true,
        description: true,
        color: true,
      },
    });
  }

  // READ single

  async findOne(pid: string, id: string): Promise<Event> {
    const project = await this.eventRepo.manager
      .getRepository('projects')
      .findOne({ where: { id: pid } });
    if (!project) throw new NotFoundException('Project not found');
    const event = await this.eventRepo.findOne({
      where: { id, projectId: pid },
    });
    if (!event) throw new NotFoundException(`Event ${id} not found`);
    return event;
  }

  // READ all (no filter)

  async findAll(pid: string): Promise<Event[]> {
    const project = await this.eventRepo.manager
      .getRepository('projects')
      .findOne({ where: { id: pid } });
    if (!project) throw new NotFoundException('Project not found');
    return this.eventRepo.find({
      order: { date: 'ASC' },
      where: { projectId: pid },
    });
  }

  // UPDATE

  async update(pid: string, id: string, dto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(pid, id);
    Object.assign(event, dto);
    return this.eventRepo.save(event);
  }

  // DELETE

  async remove(pid: string, id: string): Promise<{ message: string }> {
    const event = await this.findOne(pid, id);
    await this.eventRepo.remove(event);
    return { message: `Event ${id} deleted` };
  }
}
