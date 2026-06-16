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
      where: { source, sourceId },
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
