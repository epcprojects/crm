import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.roles.entity';
import {
  NotificationEntityType,
  NotificationType,
  SystemRoles,
  UserType,
} from '@harperhelp/types';
import { Ticket } from '../tickets/entities/ticket.entity';
import { GetProjectsQueryDto } from './dto/get-projects-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { GetMembersQueryDto } from './dto/get-members-query.dto';

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
    private readonly notificationsService: NotificationsService,
  ) {}

  async createProject(dto: CreateProjectDto, currentUser: User) {
    const trimmedName = dto.name.trim();
    const existing = await this.projectRepo
      .createQueryBuilder('p')
      .where('LOWER(p.name) = LOWER(:name)', { name: trimmedName })
      .getOne();

    if (existing) {
      throw new ConflictException('A project with this name already exists');
    }

    // 1. Create project
    const [{ nextval }] = await this.dataSource.query(
      `SELECT nextval('project_code_seq')`,
    );

    const projectCode = `HH${nextval}`;

    const project = this.projectRepo.create({
      name: trimmedName,
      category: dto.category,
      brandColor: dto.brandColor ?? '#5B4FCF',
      logoLetter: dto.logoLetter ?? 'HH',
      projectCode,
      createdBy: currentUser.id,
    });

    const savedProject = await this.projectRepo.save(project);

    // get all super admins
    const superAdmins = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin('ur.role', 'r')
      .where('r.id = :roleId', {
        roleId: '00000000-0000-0000-0000-000000000001',
      })
      .select('ur.userId', 'userId')
      .getRawMany();

    const memberIds = new Set<string>([
      currentUser.id,
      ...superAdmins.map(({ userId }) => userId),
    ]);

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
    const { page = 1, limit = 10, search } = query;
    const searchTerm = search?.trim();

    const baseQuery = this.projectRepo
      .createQueryBuilder('p')
      .innerJoin('p.members', 'u', 'u.id = :userId', {
        userId: user.id,
      })
      .leftJoin(Ticket, 't', 't.projectId = p.id');

    if (searchTerm) {
      baseQuery.andWhere(
        `
      (
        p.name ILIKE :search
        OR p.category ILIKE :search
      )
      `,
        {
          search: `%${searchTerm}%`,
        },
      );
    }

    /*
     * Summary is calculated from all matching projects and tickets
     * before pagination is applied.
     */
    const summaryResult = await baseQuery
      .clone()
      .select([
        `COUNT(DISTINCT p.id) AS total`,
        `
      COUNT(
        DISTINCT CASE
          WHEN p.isActive = true THEN p.id
        END
      ) AS active
      `,
        `
      COUNT(
        CASE
          WHEN UPPER(t.statusKey) = 'OPEN' THEN 1
        END
      ) AS open
      `,
        `
      COUNT(
        CASE
          WHEN UPPER(t.priorityKey) = 'CRITICAL' THEN 1
        END
      ) AS critical
      `,
      ])
      .getRawOne<{
        total: string;
        active: string;
        open: string;
        critical: string;
      }>();

    /*
     * Fetch paginated project cards with their individual ticket stats.
     */
    const projects = await baseQuery
      .clone()
      .select([
        'p.id AS id',
        'p.name AS name',
        'p.category AS category',
        'p.projectCode AS "projectCode"',
        'p.brandColor AS "brandColor"',
        'p.logoLetter AS "logoLetter"',
      ])
      .addSelect('COUNT(t.id)', 'ticketCount')
      .addSelect(
        `
      COUNT(
        CASE
          WHEN UPPER(t.statusKey) = 'OPEN' THEN 1
        END
      )
      `,
        'openTicketCount',
      )
      .addSelect(
        `
      COUNT(
        CASE
          WHEN UPPER(t.priorityKey) = 'CRITICAL' THEN 1
        END
      )
      `,
        'criticalTicketCount',
      )
      .groupBy('p.id')
      .addGroupBy('p.name')
      .addGroupBy('p.category')
      .addGroupBy('p.projectCode')
      .addGroupBy('p.brandColor')
      .addGroupBy('p.logoLetter')
      .orderBy('p.name', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    const total = Number(summaryResult?.total ?? 0);

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

      summary: {
        totalProjects: total,
        activeProjects: Number(summaryResult?.active ?? 0),
        openTickets: Number(summaryResult?.open ?? 0),
        criticalIssues: Number(summaryResult?.critical ?? 0),
      },

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
  y;

  findAllNames(user: { id: string }) {
    return this.projectRepo.find({
      select: {
        name: true,
        id: true,
      },
      where: {
        members: {
          id: user.id,
        },
      },
    });
  }

  async findOne(id: string, members = false, user?: any) {
    const query = this.projectRepo
      .createQueryBuilder('p')
      .innerJoin('p.members', 'u', 'u.id = :userId', {
        userId: user?.id,
      })
      .where('p.id = :id', { id });

    if (members) {
      query.leftJoinAndSelect('p.members', 'members');
    }

    const project = await query.getOne();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
  // function for having summary of project section, return total project, active proejcts, open tickets and critical issues:

  async getGlobalProjectSummary(user) {
    const result = await this.projectRepo
      .createQueryBuilder('p')
      .innerJoin('p.members', 'u', 'u.id = :userId', {
        userId: user.id,
      })
      .leftJoin('tickets', 't', 't."projectId" = p.id')
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
    return (
      this.projectRepo
        .createQueryBuilder('project')
        .innerJoin('project.members', 'member')
        .where('project.id = :projectId', { projectId })
        .andWhere('member.isInvitationAccepted = true')
        .andWhere('member.deletedAt IS NULL')
        .andWhere('member.id != :excludedUserId', {
          excludedUserId: '00000000-0000-0000-0000-000000000002',
        })

        .select([
          'member.id AS id',
          'member.fullName AS "fullName"',
          'member.isInvitationAccepted AS "isInvitationAccepted"',
        ])
        .getRawMany()
    );
  }

  async findMembersWithProjects(query: GetMembersQueryDto) {
    const { search, isInvitationAccepted, projectIds, roleId, sortBy } = query;

    const sortConfig = {
      fullName: {
        column: 'u.fullName',
        order: 'ASC' as const,
      },
      createdAt: {
        column: 'u.createdAt',
        order: 'DESC' as const,
      },
      updatedAt: {
        column: 'u.updatedAt',
        order: 'DESC' as const,
      },
    };

    const { column, order } = sortConfig[sortBy] ?? sortConfig.updatedAt;

    const userRepository = this.projectRepo.manager.getRepository(User);

    const baseQuery = userRepository.createQueryBuilder('u').where(
      `
  NOT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur."userId" = u.id
      AND ur."roleId" = :excludedRoleId
  )
`,
      {
        excludedRoleId: '00000000-0000-0000-0000-000000000001',
      },
    );

    if (search?.trim()) {
      baseQuery.andWhere(
        `
      (
        u.fullName ILIKE :search
        OR u.email ILIKE :search
      )
      `,
        {
          search: `%${search.trim()}%`,
        },
      );
    }

    if (isInvitationAccepted !== undefined) {
      baseQuery.andWhere('u.isInvitationAccepted = :isInvitationAccepted', {
        isInvitationAccepted,
      });
    }
    if (projectIds?.length) {
      baseQuery.andWhere(
        `
      EXISTS (
        SELECT 1
        FROM user_projects_join upj
        WHERE upj."usersId" = u.id
          AND upj."projectsId" IN (:...projectIds)
      )
      `,
        {
          projectIds,
        },
      );
    }
    if (roleId) {
      baseQuery.andWhere(
        `
      EXISTS (
        SELECT 1
        FROM user_roles filter_ur
        WHERE filter_ur."userId" = u.id
          AND filter_ur."roleId" = :roleId
      )
      `,
        {
          roleId,
        },
      );
    }

    const summaryResult = await baseQuery
      .clone()
      .select([
        `COUNT(DISTINCT u.id) AS total`,
        `
      COUNT(
        DISTINCT CASE
          WHEN u.isActive = true THEN u.id
        END
      ) AS active
      `,
        `
      COUNT(
        DISTINCT CASE
          WHEN u.isInvitationAccepted = false THEN u.id
        END
      ) AS pending
      `,
        `
      COUNT(
        DISTINCT CASE
          WHEN UPPER(u.userType) = 'EXTERNAL' THEN u.id
        END
      ) AS external
      `,
      ])
      .getRawOne<{
        total: string;
        active: string;
        pending: string;
        external: string;
      }>();

    const users = await baseQuery
      .clone()
      .leftJoinAndSelect('u.projects', 'p')
      .leftJoinAndMapMany('u.userRoles', UserRole, 'ur', 'ur.userId = u.id')
      .leftJoinAndSelect('ur.role', 'r')
      .select([
        'u.id',
        'u.fullName',
        'u.email',
        'u.isActive',
        'u.isInvitationAccepted',
        'u.userType',

        'p.id',
        'p.name',
        'p.brandColor',

        'ur.id',

        'r.id',
        'r.name',
      ])
      .orderBy(column, order)
      .getMany();

    return {
      items: users,

      summary: {
        totalUsers: Number(summaryResult?.total ?? 0),
        activeUsers: Number(summaryResult?.active ?? 0),
        pendingInvites: Number(summaryResult?.pending ?? 0),
        externalUsers: Number(summaryResult?.external ?? 0),
      },
    };
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, user) {
    const proj = await this.findOne(id, true, user);

    if (updateProjectDto.name) {
      const trimmedName = updateProjectDto.name.trim();
      const nameChanged = trimmedName.toLowerCase() !== proj.name.toLowerCase();

      if (nameChanged) {
        const existing = await this.projectRepo
          .createQueryBuilder('p')
          .where('LOWER(p.name) = LOWER(:name)', { name: trimmedName })
          .andWhere('p.id != :id', { id })
          .getOne();

        if (existing) {
          throw new ConflictException(
            'A project with this name already exists',
          );
        }
      }
    }
    await this.projectRepo.update(id, {
      ...updateProjectDto,
      updatedBy: user.id,
      updatedAt: new Date(),
    });

    const recipients = proj.members
      .map((m) => m.id)
      .filter((id): id is string => !!id && id !== user.id);

    // Send in App notification.
    await this.notificationsService.notifyProjectMembers({
      projectId: id,
      actorId: user.id,
      type: NotificationType.PROJECT_UPDATED,
      entityType: NotificationEntityType.PROJECT,
      entityId: id,
      title: `Project "${proj.name}" was updated by ${user.fullName}`,
      message: undefined,
      explicitRecipientIds: [...new Set(recipients)],
    });

    return this.findOne(id, false, user);
  }

  // async remove(id: string) {
  //   await this.findOne(id);
  //   await this.projectRepo.update(id, {
  //     isActive: false,
  //     deletedAt: new Date(),
  //   });

  //   return {
  //     success: true,
  //   };
  // }

  async softRemove(id: string, user) {
    const proj = await this.findOne(id);

    await this.projectRepo.softDelete(id);

    await this.projectRepo.update(id, {
      isActive: false,
    });

    const recipients = proj.members
      .map((m) => m.id)
      .filter((id): id is string => !!id && id !== user.id);

    // Send in App notification.
    await this.notificationsService.notifyProjectMembers({
      projectId: id,
      actorId: user.id,
      type: NotificationType.PROJECT_DELETED,
      entityType: NotificationEntityType.PROJECT,
      entityId: id,
      title: `Project "${proj.name}" deleted by ${user.fullName}`,
      message: undefined,
      explicitRecipientIds: [...new Set(recipients)],
    });

    return {
      success: true,
    };
  }

  async filterValidMentionedUserIds(
    projectId: string,
    mentionedUserIds: string[],
  ): Promise<string[]> {
    if (!mentionedUserIds?.length) {
      return [];
    }
    const uniqueIds = [...new Set(mentionedUserIds)];
    const users = await this.projectRepo
      .createQueryBuilder('project')
      .innerJoin('project.members', 'member')
      .where('project.id = :projectId', { projectId })
      .andWhere('member.id IN (:...userIds)', {
        userIds: uniqueIds,
      })
      .andWhere('member.isInvitationAccepted = true')
      .select('member.id', 'id')
      .getRawMany();

    return users.map(({ id }) => id);
  }

  async getMentionedUserChanges(
    projectId: string,
    oldMentionedUserIds: string[],
    newMentionedUserIds: string[],
  ): Promise<{
    validMentionedUserIds: string[];
    newlyMentionedUserIds: string[];
  }> {
    const validMentionedUserIds = await this.filterValidMentionedUserIds(
      projectId,
      newMentionedUserIds,
    );

    const oldMentionedUserIdSet = new Set(oldMentionedUserIds ?? []);

    const newlyMentionedUserIds = validMentionedUserIds.filter(
      (userId) => !oldMentionedUserIdSet.has(userId),
    );

    return {
      validMentionedUserIds,
      newlyMentionedUserIds,
    };
  }
}
