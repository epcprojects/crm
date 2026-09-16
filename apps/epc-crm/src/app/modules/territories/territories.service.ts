import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Territory } from './entities/territory.entity';
import { GetTerritoriesQueryDto } from './dto/get-territories-query.dto';

@Injectable()
export class TerritoriesService {
  constructor(
    @InjectRepository(Territory)
    private readonly territoryRepo: Repository<Territory>,
  ) {}

  async findAll(query: GetTerritoriesQueryDto): Promise<Territory[]> {
    const qb = this.territoryRepo.createQueryBuilder('t').where('t.isActive = true');

    if (query.type) {
      qb.andWhere('t.type = :type', { type: query.type });
    }

    if (query.parentId) {
      qb.andWhere('t.parentId = :parentId', { parentId: query.parentId });
    }

    return qb.orderBy('t.name', 'ASC').getMany();
  }

  async findOne(id: string): Promise<Territory> {
    const territory = await this.territoryRepo.findOne({
      where: { id, isActive: true },
      relations: { parent: true },
    });

    if (!territory) {
      throw new NotFoundException('Territory not found');
    }

    return territory;
  }
}
