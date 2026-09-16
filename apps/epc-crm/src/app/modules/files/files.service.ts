import { Injectable } from '@nestjs/common';
import { FileSource, FileStatus, UserType } from '@epc-crm/types';
import { FileRecord } from './entities/file.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UtilityService } from '../utility/utility.service';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileRecord)
    private readonly fileRepository: Repository<FileRecord>,

    private readonly utilityService: UtilityService,
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

  async findByProject(projectId: string, user?: any) {
    if (user && user?.userType === UserType.EXTERNAL) {
      return this.fileRepository.find({
        where: { projectId, status: FileStatus.ACTIVE, uploadedBy: user.id },
        order: { createdAt: 'ASC' },
      });
    }

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
    const file = await this.fileRepository.findOneByOrFail({ id: fileId });

    await this.fileRepository.delete(fileId);
    await this.utilityService.deleteFile(file.storageKey);

    return { success: true };
  }
}
