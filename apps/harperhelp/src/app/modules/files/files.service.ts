import { Injectable } from '@nestjs/common';
import { FileSource, FileStatus } from '@harperhelp/types';
import { FileRecord } from './entities/file.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileRecord)
    private readonly fileRepository: Repository<FileRecord>,
  ) {}

  async create(data: Partial<FileRecord>) {
    const file = this.fileRepository.create(data);
    return this.fileRepository.save(file);
  }

  async findBySource(source: FileSource, sourceId: string) {
    return this.fileRepository.find({
      where: { source, sourceId, status: FileStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });
  }

  async findBySourceBulk(source: FileSource, sourceIds: string[]) {
    if (!sourceIds.length) return [];

    return this.fileRepository
      .createQueryBuilder('file')
      .where('file.source = :source', { source })
      .andWhere('file.sourceId IN (:...sourceIds)', { sourceIds })
      .andWhere('file.status = :status', { status: FileStatus.ACTIVE })
      .orderBy('file.createdAt', 'ASC')
      .getMany();
  }

  async findByProject(projectId: string) {
    return this.fileRepository.find({
      where: { projectId, status: FileStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string) {
    return this.fileRepository.findOne({
      where: { id },
    });
  }

  async delete(fileId: string) {
    await this.fileRepository.update(fileId, {
      status: FileStatus.DELETED,
    });

    return { success: true };
  }
}
