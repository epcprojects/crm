import { FileSource, FileStatus } from '@harperhelp/types';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilesService } from '../../files/files.service';
import { Project } from '../entities/project.entity';
import { extname } from 'path';
import { UploadedFileDto } from '../../files/dto/uploaded-file.dto';

@Injectable()
export class ProjectsFilesService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    private readonly filesService: FilesService,
  ) {}

  async uploadProjectFiles(
    projectId: string,
    files: UploadedFileDto[],
    userId: string,
  ) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    for (const file of files) {
      const rawExt = extname(file.originalName); // e.g. '.DOCX' or ''
      const extension = rawExt ? rawExt.slice(1).toLowerCase() : 'unknown';

      await this.filesService.create({
        projectId,
        uploadedBy: userId,
        originalName: file.originalName,
        storageKey: file.storageKey,
        sizeBytes: file.sizeBytes,
        // extension: file.mimetype.split('/')[1],
        extension: extension,
        mimeType: file.mimeType,

        source: FileSource.PROJECT,
        sourceId: projectId,

        status: FileStatus.ACTIVE,
      });
    }

    return this.filesService.findBySource(FileSource.PROJECT, projectId);
  }

  async getProjectFiles(projectId: string, user) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const files = await this.filesService.findByProject(projectId, user);

    return files;
  }

  async deleteFile(fileId: string, projectId: string) {
    const file = await this.filesService.findOne(fileId);

    if (!file) {
      throw new NotFoundException('File not found');
    }

    await this.filesService.delete(fileId);

    return { success: true };
  }
}
