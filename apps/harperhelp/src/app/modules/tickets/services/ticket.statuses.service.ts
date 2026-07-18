import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { TicketStatus } from '../entities/ticket.statuses.entity';
import { CreateTicketStatusDto } from '../dto/create-ticket-status.dto';
import { UpdateTicketStatusDto } from '../dto/update-ticket-status.dto';
import { Ticket } from '../entities/ticket.entity';
import { TicketsKanbanView } from '../entities/tickets-kanban-view.entity';
import { ReorderTicketStatusDto } from '../dto/reorder-ticket-status.dto';

@Injectable()
export class TicketStatusesService {
  constructor(
    @InjectRepository(TicketsKanbanView)
    private readonly kanbanViewRepo: Repository<TicketsKanbanView>,

    @InjectRepository(TicketStatus)
    private readonly statusRepo: Repository<TicketStatus>,

    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) { }

  async create(dto: CreateTicketStatusDto) {
    try {
      const status = this.statusRepo.create(dto);

      return await this.statusRepo.save(status);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).driverError?.code === '23505'
      ) {
        throw new BadRequestException(
          `Ticket status '${dto.key}' already exists`,
        );
      }

      throw error;
    }
  }

  async reorder(
    dto: ReorderTicketStatusDto,
    user: { id: string },
  ) {
    return this.statusRepo.manager.transaction(async (manager) => {
      const kanbanRepo = manager.getRepository(TicketsKanbanView);
      const statusRepo = manager.getRepository(TicketStatus);

      let userSorting = await kanbanRepo.find({
        where: {
          userId: user.id,
        },
        order: {
          sortOrder: 'ASC',
        },
      });

      // First time user -> copy default ordering
      if (userSorting.length === 0) {
        const defaultStatuses = await statusRepo.find({
          order: {
            sortOrder: 'ASC',
            createdAt: 'ASC',
          },
        });

        userSorting = defaultStatuses.map((status) =>
          kanbanRepo.create({
            userId: user.id,
            statusId: status.id,
            sortOrder: status.sortOrder,
          }),
        );

        await kanbanRepo.save(userSorting);
      }

      const currentIndex = userSorting.findIndex(
        (item) => item.statusId === dto.statusId,
      );

      if (currentIndex === -1) {
        throw new NotFoundException('Ticket status not found.');
      }

      const [movedStatus] = userSorting.splice(currentIndex, 1);

      userSorting.splice(dto.newIndex, 0, movedStatus);

      userSorting.forEach((item, index) => {
        item.sortOrder = index;
      });

      await kanbanRepo.save(userSorting);

      return {
        success: true,
      };
    });
  }

  async findAll(user: { id: string }) {
    const userSorting = await this.kanbanViewRepo.find({
      where: {
        userId: user.id,
      },
      relations: {
        status: true,
      },
      order: {
        sortOrder: 'ASC',
      },
    });

    if (userSorting.length > 0) {
      return userSorting.map(({ status, sortOrder }) => ({
        id: status.id,
        key: status.key,
        label: status.label,
        color: status.color,
        sortOrder,
      }));
    }

    return this.statusRepo.find({
      order: {
        sortOrder: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  async findOne(id: string) {
    const status = await this.statusRepo.findOne({
      where: { id },
    });

    if (!status) {
      throw new NotFoundException('Ticket status not found');
    }

    return status;
  }

  async update(id: string, dto: UpdateTicketStatusDto) {
    const status = await this.findOne(id);

    Object.assign(status, dto);

    return this.statusRepo.save(status);
  }

  async remove(id: string) {
    const status = await this.findOne(id);

    const ticketsUsingPriority = await this.ticketRepo.count({
      where: {
        statusKey: status.key,
      },
    });

    if (ticketsUsingPriority > 0) {
      throw new BadRequestException(
        `Status '${status.key}' is already being used by ${ticketsUsingPriority} ticket(s) and cannot be deleted.`,
      );
    }

    try {
      await this.statusRepo.delete(id);
      return { success: true };
    } catch (err) {
      console.error(err);
      throw new BadRequestException('Unable to delete the status.');
    }
  }
}
