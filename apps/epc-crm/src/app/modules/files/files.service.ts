import { Injectable } from '@nestjs/common';
import { FileSource, FileStatus, UserType } from '@epc-crm/types';
import { FileRecord } from './entities/file.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UtilityService } from '../utility/utility.service';
import { UploadedFileDto } from './dto/uploaded-file.dto';
import { extname } from 'path';

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
      order: { createdAt: 'DESC' },
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
        order: { createdAt: 'DESC' },
      });
    }

    return this.fileRepository.find({
      where: { projectId, status: FileStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    return this.fileRepository.findOne({
      where: { id },
    });
  }

  async replaceAttachments(
    source: FileSource,
    sourceId: string,
    files: UploadedFileDto[] | undefined,
    extra: Partial<FileRecord>,
  ): Promise<FileRecord[]> {
    const existing = await this.fileRepository.find({
      where: { source, sourceId, status: FileStatus.ACTIVE },
    });

    if (existing.length) {
      // reuse the single-file delete so storage cleanup stays consistent
      await Promise.all(existing.map((f) => this.delete(f.id)));
    }

    if (!files?.length) {
      return [];
    }

    const records = files.map((file) => {
      const rawExt = extname(file.originalName);
      const extension = rawExt ? rawExt.slice(1).toLowerCase() : 'unknown';

      return this.fileRepository.create({
        ...extra,
        originalName: file.originalName,
        storageKey: file.storageKey,
        sizeBytes: file.sizeBytes,
        extension,
        mimeType: file.mimeType,
        source,
        sourceId,
        status: FileStatus.ACTIVE,
      });
    });

    return this.fileRepository.save(records);
  }

  
  /**
 * Pure diff: given the current description attachments and the incoming
 * payload, decide what to delete and what to create. No side effects.
 */
private diffDescriptionAttachments(
  existing: FileRecord[],
  incoming: UploadedFileDto[],
): { toDelete: FileRecord[]; toCreate: UploadedFileDto[] } {
  const incomingKeys = new Set(incoming.map((f) => f.storageKey));
  const existingKeys = new Set(existing.map((f) => f.storageKey));

  const toDelete = existing.filter((f) => !incomingKeys.has(f.storageKey));
  const toCreate = incoming.filter((f) => !existingKeys.has(f.storageKey));

  return { toDelete, toCreate };
}

async syncTicketAttachments(
  source: FileSource,
  sourceId: string,
  files: UploadedFileDto[] | undefined,
  extra: Partial<FileRecord>,
): Promise<void> {
  if (files === undefined) return;

  const descriptionFiles = files.filter((f) => f.fromDescription);

  const existing = await this.fileRepository.find({
    where: {
      source,
      sourceId,
      status: FileStatus.ACTIVE,
      fromDescription: true,
    },
  });

  const { toDelete, toCreate } = this.diffDescriptionAttachments(
    existing,
    descriptionFiles,
  );

  await Promise.all(toDelete.map((f) => this.delete(f.id)));

  if (!toCreate.length) return;

  const records = toCreate.map((file) => {
    const rawExt = extname(file.originalName);
    const extension = rawExt ? rawExt.slice(1).toLowerCase() : 'unknown';

    return this.fileRepository.create({
      ...extra,
      originalName: file.originalName,
      storageKey: file.storageKey,
      sizeBytes: file.sizeBytes,
      extension,
      mimeType: file.mimeType,
      source,
      sourceId,
      status: FileStatus.ACTIVE,
      fromDescription: true,
    });
  });

  await this.fileRepository.save(records);
}

  async delete(fileId: string) {
    const file = await this.fileRepository.findOneByOrFail({ id: fileId });

    await this.fileRepository.delete(fileId);
    await this.utilityService.deleteFile(file.storageKey);

    return { success: true };
  }
}
