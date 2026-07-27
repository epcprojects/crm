import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateTicketPriorityDto } from '../dto/create-ticket-priority.dto';
import { UpdateTicketPriorityDto } from '../dto/update-ticket-priority.dto';
import { TicketPriority } from '../entities/ticket.priority.entity';
import { Ticket } from '../entities/ticket.entity';

@Injectable()
export class TicketPrioritiesService {
  constructor(
    @InjectRepository(TicketPriority)
    private readonly priorityRepo: Repository<TicketPriority>,

    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}

  async create(dto: CreateTicketPriorityDto) {
    try {
      const priority = this.priorityRepo.create(dto);

      return await this.priorityRepo.save(priority);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).driverError?.code === '23505'
      ) {
        throw new BadRequestException(
          `Ticket priority '${dto.key}' already exists`,
        );
      }

      throw error;
    }
  }

  async findAll() {
    return this.priorityRepo.find({
      order: {
        sortOrder: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  async findOne(id: string) {
    const priority = await this.priorityRepo.findOne({
      where: { id },
    });

    if (!priority) {
      throw new NotFoundException('Ticket priority not found');
    }

    return priority;
  }

  async update(id: string, dto: UpdateTicketPriorityDto) {
    const priority = await this.findOne(id);

    Object.assign(priority, dto);

    return this.priorityRepo.save(priority);
  }

  async remove(id: string) {
    const priority = await this.findOne(id);

    // const ticketsUsingPriority = await this.ticketRepo.count({
    //   where: {
    //     priorityKey: priority.key,
    //   },
    // });
    const ticketsUsingPriority = await this.ticketRepo
      .createQueryBuilder('t')
      .innerJoin('t.project', 'p')
      .where('t.priorityKey = :priorityKey', { priorityKey: priority.key })
      .andWhere('p.deletedAt IS NULL') // Exclude tickets from deleted projects
      .getCount();

    if (ticketsUsingPriority > 0) {
      throw new BadRequestException(
        `Priority '${priority.key}' is already being used by ${ticketsUsingPriority} ticket(s) and cannot be deleted.`,
      );
    }

    await this.priorityRepo.delete(id);

    return {
      success: true,
    };
  }
}
