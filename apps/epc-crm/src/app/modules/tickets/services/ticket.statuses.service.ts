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
          `Lead status '${dto.key}' already exists`,
        );
      }

      throw error;
    }
  }

  async reorder(dto: ReorderTicketStatusDto, user: { id: string }) {
    return this.statusRepo.manager.transaction(async (manager) => {
      const kanbanRepo = manager.getRepository(TicketsKanbanView);
      const statusRepo = manager.getRepository(TicketStatus);

      const [userSorting, allStatuses] = await Promise.all([
        kanbanRepo.find({
          where: { userId: user.id },
          order: { sortOrder: 'ASC' },
        }),
        statusRepo.find({
          order: { sortOrder: 'ASC', createdAt: 'ASC' },
        }),
      ]);

      const existingStatusIds = new Set(
        userSorting.map((item) => item.statusId),
      );
      const missingStatuses = allStatuses.filter(
        (status) => !existingStatusIds.has(status.id),
      );

      // Same fix as findAll, but here we actually need real rows to
      // reorder against — so create (not yet saved) entities for
      // whatever's missing and fold them into the working array. This
      // covers both a brand-new user (userSorting empty) and an
      // existing user missing a status created since their last save.
      if (missingStatuses.length > 0) {
        let nextSortOrder =
          userSorting.length > 0
            ? Math.max(...userSorting.map((item) => item.sortOrder)) + 1
            : 0;

        for (const status of missingStatuses) {
          userSorting.push(
            kanbanRepo.create({
              userId: user.id,
              statusId: status.id,
              sortOrder: nextSortOrder++,
            }),
          );
        }
      }

      const currentIndex = userSorting.findIndex(
        (item) => item.statusId === dto.statusId,
      );

      if (currentIndex === -1) {
        throw new NotFoundException('Lead status not found.');
      }

      const [movedStatus] = userSorting.splice(currentIndex, 1);
      userSorting.splice(dto.newIndex, 0, movedStatus);

      userSorting.forEach((item, index) => {
        item.sortOrder = index;
      });

      await kanbanRepo.save(userSorting);

      return { success: true };
    });
  }

  async findAll(user: { id: string }) {
    const [userSorting, allStatuses] = await Promise.all([
      this.kanbanViewRepo.find({
        where: { userId: user.id },
        relations: { status: true },
        order: { sortOrder: 'ASC' },
      }),
      this.statusRepo.find({
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      }),
    ]);

    const existingStatusIds = new Set(
      userSorting.map((item) => item.statusId),
    );
    const missingStatuses = allStatuses.filter(
      (status) => !existingStatusIds.has(status.id),
    );

    const orderedExisting = userSorting.map(({ status, sortOrder }) => ({
      id: status.id,
      key: status.key,
      label: status.label,
      color: status.color,
      isClosed: status.isClosed,
      sortOrder,
    }));

    // Statuses created after the user last saved an order have no row
    // in tickets_kanban_view yet — computed here, not persisted, and
    // appended after the user's saved ones in global sortOrder.
    let nextSortOrder =
      userSorting.length > 0
        ? Math.max(...userSorting.map((item) => item.sortOrder)) + 1
        : 0;

    const orderedMissing = missingStatuses.map((status) => ({
      id: status.id,
      key: status.key,
      label: status.label,
      color: status.color,
      isClosed: status.isClosed,
      sortOrder: nextSortOrder++,
    }));

    return [...orderedExisting, ...orderedMissing];
  }

  async findOne(id: string) {
    const status = await this.statusRepo.findOne({
      where: { id },
    });

    if (!status) {
      throw new NotFoundException('Lead status not found');
    }

    return status;
  }

  async update(id: string, dto: UpdateTicketStatusDto) {
    const status = await this.findOne(id);

    Object.assign(status, dto);

    return this.statusRepo.save(status);
  }

  // async remove(id: string) {
  //   const status = await this.findOne(id);

  //   const ticketsUsingStatus = await this.ticketRepo
  //   .createQueryBuilder('t')
  //   .innerJoin('t.project', 'p')
  //   .where('t.statusKey = :statusKey', { statusKey: status.key })
  //   .andWhere('p.deletedAt IS NULL') // Exclude tickets from deleted projects
  //   .getCount();

  //   if (ticketsUsingStatus > 0) {
  //     throw new BadRequestException(
  //       `Status '${status.key}' is already being used by ${ticketsUsingStatus} lead(s) and cannot be deleted.`,
  //     );
  //   }

  //   try {
  //     await this.statusRepo.delete(id);
  //     return { success: true };
  //   } catch (err) {
  //     console.error(err);
  //     throw new BadRequestException('Unable to delete the status.');
  //   }
  // }

  async softRemove(id: string) {
    const status = await this.findOne(id);

    const ticketsUsingStatus = await this.ticketRepo
    .createQueryBuilder('t')
    .innerJoin('t.project', 'p')
    .where('t.statusKey = :statusKey', { statusKey: status.key })
    .andWhere('p.deletedAt IS NULL') // Exclude tickets from deleted projects
    .getCount();

    if (ticketsUsingStatus > 0) {
      throw new BadRequestException(
        `Status '${status.key}' is already being used by ${ticketsUsingStatus} lead(s) and cannot be deleted.`,
      );
    }

    try {
      await this.statusRepo.softDelete(id);

      return { success: true };
    } catch (err) {
      console.error(err);
      throw new BadRequestException('Unable to delete the status.');
    }
  }
}
