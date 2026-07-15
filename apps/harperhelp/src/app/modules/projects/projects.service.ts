import { Injectable } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.roles.entity';
import { SystemRoles, UserType } from '@harperhelp/types';
import { Ticket } from '../tickets/entities/ticket.entity';
import { GetProjectsQueryDto } from './dto/get-projects-query.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}

  async createProject(dto: CreateProjectDto, currentUser: User) {
    // 1. Create project
    const [{ nextval }] = await this.dataSource.query(
      `SELECT nextval('project_code_seq')`,
    );

    const projectCode = `HH${nextval}`;

    const project = this.projectRepo.create({
      name: dto.name,
      category: dto.category,
      brandColor: dto.brandColor ?? '#5B4FCF',
      logoLetter: dto.logoLetter ?? 'HH',
      projectCode,
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


  async findAll(query: GetProjectsQueryDto, user: { id: string }) {
  const { page =1, limit=10, search } = query;

  const qb = this.projectRepo
    .createQueryBuilder('p')
    .innerJoin('p.members', 'u', 'u.id = :userId', {
      userId: user.id,
    })
    .leftJoin(Ticket, 't', 't.projectId = p.id');

  if (search?.trim()) {
    qb.andWhere(
      `
      (
        p.name ILIKE :search
        OR p.category ILIKE :search
      )
      `,
      {
        search: `%${search.trim()}%`,
      },
    );
  }

  const projects = await qb
    .select([
      'p.id AS id',
      'p.name AS name',
      'p.category AS category',
      'p.projectCode AS "projectCode"',
      'p.brandColor AS "brandColor"',
      'p.logoLetter AS "logoLetter"',
    ])
    .addSelect('COUNT(t.id)', '"ticketCount"')
    .addSelect(
      `
      COUNT(
        CASE
          WHEN UPPER(t.statusKey) = 'OPEN'
          THEN 1
        END
      )
      `,
      '"openTicketCount"',
    )
    .addSelect(
      `
      COUNT(
        CASE
          WHEN UPPER(t.priorityKey) = 'CRITICAL'
          THEN 1
        END
      )
      `,
      '"criticalTicketCount"',
    )
    .groupBy('p.id')
    .addGroupBy('p.name')
    .addGroupBy('p.category')
    .addGroupBy('p.projectCode')
    .addGroupBy('p.brandColor')
    .addGroupBy('p.logoLetter')
    .orderBy('p.createdAt', 'DESC')
    .offset((page-1)* limit)
    .limit(limit)
    .getRawMany();

  const total = projects.length
    ? Number(projects[0].totalCount)
    : 0;

  return {
    items: projects.map((project) => ({
      id: project.id,
      name: project.name,
      category: project.category,
      projectCode: project.projectCode,
      brandColor: project.brandColor,
      logoLetter: project.logoLetter,
      stats: {
        tickets: Number(project.ticketCount ?? 0),
        openTickets: Number(project.openTicketCount ?? 0),
        criticalTickets: Number(project.criticalTicketCount ?? 0),
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

  // function for having summary of project section, return total project, active proejcts, open tickets and critical issues:

async getGlobalProjectSummary(user) {
  const result = await this.projectRepo
    .createQueryBuilder('p')
    .innerJoin('p.members', 'u', 'u.id = :userId', {
      userId: user.id,
    })
    .leftJoin(
      'tickets',
      't',
      't."projectId" = p.id',
    )
    .select([
      `COUNT(DISTINCT p.id) AS total`,
      `COUNT(DISTINCT CASE WHEN p.isActive = true THEN p.id END) AS active`,
      `COUNT(CASE WHEN UPPER(t."statusKey") = 'OPEN' THEN 1 END) AS open`,
      `COUNT(CASE WHEN UPPER(t."priorityKey") = 'CRITICAL' THEN 1 END) AS critical`,
    ])
    .getRawOne();

  return {
    totalProjects: Number(result.total ?? 0),
    activeProjects: Number(result.active ?? 0),
    openTickets: Number(result.open ?? 0),
    criticalIssues: Number(result.critical ?? 0),
  };
}

  async findProjectMembers(projectId: string, user) {
    return this.projectRepo
      .createQueryBuilder('project')
      .innerJoin('project.members', 'member')
      .where('project.id = :projectId', { projectId })
      .andWhere('member.isInvitationAccepted = true')
      .andWhere('member.userType = :userType', { userType: UserType.INTERNAL })
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

  // Utility
  private generateProjectCode(name: string): string {
    const prefix = name
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .slice(0, 3)
      .padEnd(3, 'X');

    const suffix = Math.random().toString(36).substring(2, 4).toUpperCase();

    return `${prefix}${suffix}`;
  }
}
