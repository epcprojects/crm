import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  create(createProjectDto: CreateProjectDto) {
    const project = this.projectRepo.create(createProjectDto);
    return this.projectRepo.save(project);
  }

  findAll() {
    return this.projectRepo.find();
  }

  findAllNames() {
    return this.projectRepo.find({
      select: {
        name: true,
        id: true,
      },
    });
  }

  findOne(id: string) {
    return this.projectRepo.findOne({ where: { id } });
  }

  update(id: string, updateProjectDto: UpdateProjectDto) {
    this.projectRepo.update(id, updateProjectDto);
    return this.projectRepo.findOne({ where: { id } });
  }

  remove(id: string) {
    return this.projectRepo.delete(id);
  }
}
