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

@Injectable()
export class TicketStatusesService {
  constructor(
    @InjectRepository(TicketStatus)
    private readonly statusRepo: Repository<TicketStatus>,
  ) {}

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

  async findAll() {
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

    await this.statusRepo.softRemove(status);

    return {
      success: true,
    };
  }
}
