import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Contact } from './entities/contact.entity';
import { Territory } from '../territories/entities/territory.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { GetContactsQueryDto } from './dto/get-contacts-query.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,

    @InjectRepository(Territory)
    private readonly territoryRepo: Repository<Territory>,
  ) {}

  private async ensureTerritoryExists(territoryId: string): Promise<void> {
    const exists = await this.territoryRepo.exists({
      where: { id: territoryId, isActive: true },
    });

    if (!exists) {
      throw new NotFoundException('Territory not found');
    }
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\-()]/g, '').trim();
  }

  private async ensureUniquePhone(phone: string, excludeId?: string): Promise<void> {
    const qb = this.contactRepo
      .createQueryBuilder('c')
      .where('c.phone = :phone', { phone });

    if (excludeId) {
      qb.andWhere('c.id != :excludeId', { excludeId });
    }

    const existing = await qb.getOne();

    if (existing) {
      throw new ConflictException('A contact with this phone number already exists');
    }
  }

  async create(dto: CreateContactDto, user: { id: string }): Promise<Contact> {
    const phone = this.normalizePhone(dto.phone);
    await this.ensureUniquePhone(phone);

    if (dto.territoryId) {
      await this.ensureTerritoryExists(dto.territoryId);
    }

    const contact = this.contactRepo.create({
      fullName: dto.fullName?.trim(),
      phone,
      email: dto.email?.trim(),
      city: dto.city?.trim(),
      territoryId: dto.territoryId,
      source: dto.source?.trim(),
      notes: dto.notes,
      createdBy: user.id,
    });

    const saved = await this.contactRepo.save(contact);

    return this.findOne(saved.id);
  }

  async findAll(query: GetContactsQueryDto) {
    const { page = 1, limit = 10, search, territoryId, provinceId } = query;

    const qb = this.contactRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.territory', 'territory')
      .leftJoinAndSelect('territory.parent', 'territoryParent')
      .where('c.isActive = true');

    const searchTerm = search?.trim();

    if (searchTerm) {
      qb.andWhere(
        `(c.fullName ILIKE :search OR c.phone ILIKE :search OR c.email ILIKE :search)`,
        { search: `%${searchTerm}%` },
      );
    }

    if (territoryId) {
      qb.andWhere('c.territoryId = :territoryId', { territoryId });
    } else if (provinceId) {
      qb.andWhere('territory.parentId = :provinceId', { provinceId });
    }

    qb.orderBy('c.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const [items, total] = await Promise.all([
      qb.getMany(),
      qb.clone().offset(undefined).limit(undefined).getCount(),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  async findOne(id: string): Promise<Contact> {
    const contact = await this.contactRepo.findOne({
      where: { id, isActive: true },
      relations: { territory: { parent: true } },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async update(id: string, dto: UpdateContactDto, user: { id: string }): Promise<Contact> {
    const contact = await this.findOne(id);

    if (dto.phone !== undefined) {
      const phone = this.normalizePhone(dto.phone);
      if (phone !== contact.phone) {
        await this.ensureUniquePhone(phone, id);
      }
      contact.phone = phone;
    }

    if (dto.fullName !== undefined) contact.fullName = dto.fullName?.trim();
    if (dto.email !== undefined) contact.email = dto.email?.trim();
    if (dto.city !== undefined) contact.city = dto.city?.trim();
    if (dto.source !== undefined) contact.source = dto.source?.trim();
    if (dto.notes !== undefined) contact.notes = dto.notes;

    if (dto.territoryId !== undefined) {
      if (dto.territoryId) {
        await this.ensureTerritoryExists(dto.territoryId);
      }
      contact.territoryId = dto.territoryId || null;
    }

    contact.updatedBy = user.id;
    contact.updatedAt = new Date();

    await this.contactRepo.save(contact);

    return this.findOne(id);
  }

  async softRemove(id: string, user: { id: string }): Promise<{ success: boolean }> {
    await this.findOne(id);

    await this.contactRepo.softDelete(id);
    await this.contactRepo.update(id, {
      isActive: false,
      updatedBy: user.id,
    });

    return { success: true };
  }
}
