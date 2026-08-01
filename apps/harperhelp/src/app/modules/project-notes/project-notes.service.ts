import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProjectNote } from './entities/project-note.entity';
import { Project } from '../projects/entities/project.entity';
import { CreateProjectNoteDto } from './dto/create-project-note.dto';
import { UpdateProjectNoteDto } from './dto/update-project-note.dto';
import { GetProjectNotesQueryDto } from './dto/get-project-notes-query.dto';

@Injectable()
export class ProjectNotesService {
  constructor(
    @InjectRepository(ProjectNote)
    private readonly noteRepo: Repository<ProjectNote>,

    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  private async ensureProject(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async create(
    projectId: string,
    dto: CreateProjectNoteDto,
    user: { id: string },
  ): Promise<ProjectNote> {
    await this.ensureProject(projectId);

    const note = await this.noteRepo.save(
      this.noteRepo.create({
        projectId,
        title: dto.title,
        description: dto.description,
        createdBy: user.id,
      }),
    );

    return this.findOne(projectId, note.id);
  }

  async findAll(projectId: string, query: GetProjectNotesQueryDto) {
    await this.ensureProject(projectId);

    const { page = 1, limit = 10, search } = query;

    const qb = this.noteRepo
      .createQueryBuilder('n')
      .where('n.projectId = :projectId', { projectId })
      .andWhere('n.isActive = true');

    if (search?.trim()) {
      qb.andWhere('(n.title ILIKE :search OR n.description ILIKE :search)', {
        search: `%${search.trim()}%`,
      });
    }

    qb.orderBy('n.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

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

  async findOne(projectId: string, id: string): Promise<ProjectNote> {
    const note = await this.noteRepo.findOne({
      where: { id, projectId, isActive: true },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async update(
    projectId: string,
    id: string,
    dto: UpdateProjectNoteDto,
    user: { id: string },
  ): Promise<ProjectNote> {
    const note = await this.findOne(projectId, id);

    if (dto.title !== undefined) {
      note.title = dto.title;
    }

    if (dto.description !== undefined) {
      note.description = dto.description;
    }

    note.updatedBy = user.id;

    await this.noteRepo.save(note);

    return this.findOne(projectId, id);
  }

  async remove(
    projectId: string,
    id: string,
    user: { id: string },
  ): Promise<{ success: boolean }> {
    const note = await this.findOne(projectId, id);

    await this.noteRepo.update(note.id, {
      isActive: false,
      deletedAt: new Date(),
      deletedBy: user.id,
    });

    return { success: true };
  }
}
