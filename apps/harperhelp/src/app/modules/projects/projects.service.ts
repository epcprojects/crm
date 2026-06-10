import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Not, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

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

  async findProjectMembers(projectId: string) {
    return this.projectRepo
      .createQueryBuilder('project')
      .innerJoin('project.members', 'member')
      .where('project.id = :projectId', { projectId })
      .select(['member.id AS id', 'member.fullName AS "fullName"'])
      .getRawMany();
  }

  async findMembersWithProjects() {
    const users = await this.projectRepo.manager.getRepository(User).find({
      relations: {
        projects: true,
      },
      select: {
        id: true,
        fullName: true,
        projects: {
          id: true,
          name: true,
        },
      },
      where: {
        fullName: Not('Super Admin'),
      },
    });

    return users;
  }

  update(id: string, updateProjectDto: UpdateProjectDto) {
    this.projectRepo.update(id, updateProjectDto);
    return this.projectRepo.findOne({ where: { id } });
  }

  remove(id: string) {
    return this.projectRepo.delete(id);
  }
}
