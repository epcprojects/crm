import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleClaim } from './entities/role.claim.entity';
import { UserRole } from '../users/entities/user.roles.entity';
import { GetRoleQueryDTO } from './dto/get-role-query.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(RoleClaim)
    private readonly roleClaimRepository: Repository<RoleClaim>,
  ) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    const exists = await this.roleRepository.findOne({
      where: { normalizedName: dto.name.toUpperCase() },
    });

    if (exists) {
      throw new ConflictException('Role already exists');
    }

    const role = await this.roleRepository.save(
      this.roleRepository.create({
        name: dto.name,
        description: dto.description,
      }),
    );

    const claims = dto.permissions.map((permission) =>
      this.roleClaimRepository.create({
        roleId: role.id,
        claimType: permission,
        claimValue: 'true',
      }),
    );

    await this.roleClaimRepository.save(claims);

    return this.findOne(role.id);
  }

async findAll(query: GetRoleQueryDTO): Promise<Role[]> {
  const qb = this.roleRepository
    .createQueryBuilder('role')
    .leftJoinAndSelect('role.roleClaims', 'roleClaim')
    .orderBy('role.createdAt', 'DESC');

  if (query.search?.trim()) {
    qb.andWhere(
      `
      (
        role.name ILIKE :search
        OR role.description ILIKE :search
      )
      `,
      {
        search: `%${query.search.trim()}%`,
      },
    );
  }

  return qb.getMany();
}

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: {
        roleClaims: true,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const claims = await this.roleClaimRepository
      .createQueryBuilder('rc')
      .innerJoin(UserRole, 'ur', 'ur.roleId = rc.roleId')
      .where('ur.userId = :userId', { userId })
      .andWhere('rc.claimValue = :value', {
        value: 'true',
      })
      .select('DISTINCT rc.claimType', 'permission')
      .getRawMany();

    return claims.map((c) => c.permission);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    if (dto.name) {
      role.name = dto.name;
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    await this.roleRepository.save(role);

    if (dto.permissions) {
      await this.roleClaimRepository.delete({
        roleId: role.id,
      });

      const claims = dto.permissions.map((permission) =>
        this.roleClaimRepository.create({
          roleId: role.id,
          claimType: permission,
          claimValue: 'true',
        }),
      );

      await this.roleClaimRepository.save(claims);
    }

    return this.findOne(id);
  }

  // async remove(id: string): Promise<void> {
  //   const role = await this.findOne(id);

  //   await this.roleRepository.remove(role);
  // }

  async softRemove(id: string) {
    await this.findOne(id);

    await this.roleRepository.softDelete(id);

    return { success: true };


}
}