import { FileSource, FileStatus } from '@harperhelp/types';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilesService } from '../../files/files.service';
import { UtilityService } from '../../utility/utility.service';
import { Project } from '../entities/project.entity';
import { extname } from 'path';

@Injectable()
export class ProjectsFilesService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    private readonly filesService: FilesService,
    private readonly utilityService: UtilityService,
  ) {}

  async uploadProjectFiles(
    projectId: string,
    files: Express.Multer.File[],
    userId: string,
  ) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    for (const file of files) {
      const key = `projects/${projectId}/files/${Date.now()}-${file.originalname}`;

      await this.utilityService.uploadFile(file, key);
      
      const rawExt = extname(file.originalname); // e.g. '.DOCX' or ''
      const extension = rawExt ? rawExt.slice(1).toLowerCase() : 'unknown';


      await this.filesService.create({
        projectId,
        uploadedBy: userId,
        originalName: file.originalname,
        storageKey: key,
        sizeBytes: file.size,
        // extension: file.mimetype.split('/')[1],
        extension: extension,
        mimeType: file.mimetype,

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
