import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.roles.entity';
import { SystemRoles } from '@harperhelp/types';
import { Ticket } from '../tickets/entities/ticket.entity';
import { GetProjectsQueryDto } from './dto/get-projects-query.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}

  async createProject(dto: CreateProjectDto, currentUser: User) {
    // 1. Create project
    const project = this.projectRepo.create({
      name: dto.name,
      category: dto.category,
      brandColor: dto.brandColor ?? '#5B4FCF',
      logoLetter: dto.logoLetter ?? 'HH',
    });

    const savedProject = await this.projectRepo.save(project);

    // 2. Always include creator
    const memberIds = new Set<string>();
    memberIds.add(currentUser.id);

    // 3. Check if user is NOT super admin
    const isSuperAdmin = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin('ur.role', 'r')
      .where('ur.userId = :userId', { userId: currentUser.id })
      .andWhere('r.name = :role', { role: SystemRoles.SUPER_ADMIN })
      .getExists();

    if (!isSuperAdmin) {
      // get all super admins
      const superAdmins = await this.userRoleRepo
        .createQueryBuilder('ur')
        .innerJoin('ur.role', 'r')
        .where('r.name = :role', { role: SystemRoles.SUPER_ADMIN })
        .select('ur.userId', 'userId')
        .getRawMany();

      superAdmins.forEach((u) => memberIds.add(u.userId));
    }

    // 4. Insert into user_projects join table
    await this.projectRepo
      .createQueryBuilder()
      .relation(Project, 'members')
      .of(savedProject.id)
      .add([...memberIds]);

    delete savedProject['members'];

    return {
      ...savedProject,
    };
  }

  async findAll(query: GetProjectsQueryDto, user) {
    const { page = 1, limit = 10, search } = query;

    const qb = this.projectRepo
      .createQueryBuilder('p')
      .innerJoin('p.members', 'u', 'u.id = :userId', {
        userId: user.id,
      })
      .leftJoin(Ticket, 't', 't.projectId = p.id');

    if (search) {
      qb.andWhere('(p.name ILIKE :search OR p.category ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const projects = await qb
      .select([
        'p.id as id',
        'p.name as name',
        'p.category as category',
        'p.brandColor as brandColor',
        'p.logoLetter as logoLetter',
      ])

      // ticket stats
      .addSelect('COUNT(t.id)', 'ticketCount')
      .addSelect(
        `
      COUNT(CASE WHEN UPPER(t.statusKey) = 'OPEN' THEN 1 END)
      `,
        'openTicketCount',
      )
      .addSelect(
        `
      COUNT(CASE WHEN UPPER(t.priorityKey) = 'CRITICAL' THEN 1 END)
      `,
        'criticalTicketCount',
      )

      // total rows after filtering
      .addSelect('COUNT(*) OVER()', 'totalCount')

      .groupBy('p.id')
      .addGroupBy('p.name')
      .addGroupBy('p.category')
      .addGroupBy('p.brandColor')
      .addGroupBy('p.logoLetter')

      .orderBy('p.createdAt', 'DESC')
      .limit(limit)
      .offset((page - 1) * limit)

      .getRawMany();

    const total = projects.length ? Number(projects[0].totalCount) : 0;

    return {
      items: projects.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        brandColor: p.brandColor,
        logoLetter: p.logoLetter,
        stats: {
          tickets: Number(p.ticketCount),
          openTickets: Number(p.openTicketCount),
          criticalTickets: Number(p.criticalTicketCount),
        },
      })),

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

  async findProjectMembers(projectId: string, user) {
    return this.projectRepo
      .createQueryBuilder('project')
      .innerJoin('project.members', 'member')
      .where('project.id = :projectId', { projectId })
      .andWhere('member.id != :userId', { userId: user.id })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(UserRole, 'ur')
          .innerJoin('ur.role', 'r')
          .where('ur.userId = member.id')
          .andWhere('r.name = :superAdmin')
          .getQuery();

        return `NOT EXISTS ${subQuery}`;
      })
      .setParameter('superAdmin', SystemRoles.SUPER_ADMIN)
      .select([
        'member.id AS id',
        'member.fullName AS "fullName"',
        'member.isInvitationAccepted AS "isInvitationAccepted"',
      ])
      .getRawMany();
  }

  async findMembersWithProjects() {
    const users = await this.projectRepo.manager
      .getRepository(User)
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.projects', 'p')
      .leftJoinAndMapMany('u.userRoles', UserRole, 'ur', 'ur.userId = u.id')
      .leftJoinAndSelect('ur.role', 'r')
      .where('u.fullName != :name', { name: 'Super Admin' })
      .select([
        'u.id',
        'u.fullName',
        'u.email',
        'u.isInvitationAccepted',

        'p.id',
        'p.name',

        'ur.id',

        'r.id',
        'r.name',
      ])
      .getMany();

    return users;
  }

  update(id: string, updateProjectDto: UpdateProjectDto) {
    this.projectRepo.update(id, updateProjectDto);
    return this.projectRepo.findOne({ where: { id } });
  }

  remove(id: string) {
    this.projectRepo.update(id, {
      isActive: false,
      deletedAt: new Date(),
    });

    return {
      success: true,
    };
  }
}
