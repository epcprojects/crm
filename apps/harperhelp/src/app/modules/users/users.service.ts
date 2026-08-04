import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { UserRole } from './entities/user.roles.entity';
import { InviteUserDto } from './dto/invite-user.dto';
import { generateRandomToken } from '@harperhelp/utils';
import { NotificationsService } from '../notifications/notifications.service';
import { Project } from '../projects/entities/project.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotificationEntityType, NotificationType } from '@harperhelp/types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,

    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,

    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    private readonly notificationService: NotificationsService,
  ) {}

  async getMyself(currentUser: any) {
    return currentUser;
  }

  async findByEmail(email: string) {
    const user = await this.userRepo.findOne({
      where: { email },
    });

    if (!user) return null;

    const userRoles = await this.userRoleRepo.find({
      where: { userId: user.id },
      relations: {
        role: {
          roleClaims: true,
        },
      },
    });

    const roles = userRoles.map((ur) => ur.role.name);

    const permissions = [
      ...new Set(
        userRoles.flatMap((ur) =>
          ur.role.roleClaims
            .filter((c) => c.claimValue === 'true')
            .map((c) => c.claimType),
        ),
      ),
    ];

    return {
      ...user,
      roles,
      permissions,
    };
  }

  async findById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        isInvitationAccepted: true,
        normalizedFullName: true,
        normalizedEmail: true,
        updatedAt: true,
        updatedBy: true,
        createdAt: true,
        createdBy: true,
        userType: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userRoles = await this.userRoleRepo.find({
      where: { userId: id },
      relations: {
        role: {
          roleClaims: true,
        },
      },
    });

    const roles = userRoles.map((ur) => ur.role.name);

    const permissions = [
      ...new Set(
        userRoles.flatMap((ur) =>
          ur.role.roleClaims
            .filter((c) => c.claimValue === 'true')
            .map((c) => c.claimType),
        ),
      ),
    ];

    return {
      ...user,
      roles,
      permissions,
    };
  }

  async inviteToProject(dto: InviteUserDto, currentUser: any) {
    const project = await this.projectRepo.find({
      where: {
        id: In(dto.projectIds),
      },
    });

    if (!project || project.length === 0) {
      throw new NotFoundException('One or more projects not found');
    }

    const role = await this.roleRepo.findOneBy({
      id: dto.roleKey,
    });

    if (!role) {
      throw new BadRequestException('Invalid role specified');
    }

    // CHECK EXISTING USER
    const existing = await this.userRepo.findOne({
      where: {
        email: dto.email.toLocaleLowerCase(),
      },
    });

    const projectNames = project.map((p) => p.name).join(', ');

    // USER ALREADY EXISTS
    // - RE SEND INVITE AND SET NEW EXPIRY WITH NEW TOKEN.
    if (existing) {
      // USER ALREADY ACTIVE or ACCEPTED
      if (existing.isInvitationAccepted || existing.isActive) {
        throw new BadRequestException('User already exists');
      }

      // INVITE STILL ACTIVE
      // if (existing.inviteExpiresAt && existing.inviteExpiresAt > new Date()) {
      //   throw new BadRequestException('User has already been invited');
      // }

      // RE-INVITE EXPIRED USER
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 48);

      existing.fullName = dto.fullName;
      existing.projects = project;
      existing.inviteToken = generateRandomToken();
      existing.inviteExpiresAt = expiry;
      existing.isInvitationAccepted = false;
      existing.isActive = false;
      existing.userType = dto.userType;

      await this.userRepo.save(existing);

      // ENSURE ROLE EXISTS
      const existingRole = await this.userRoleRepo.findOne({
        where: {
          userId: existing.id,
          roleId: role.id,
        },
      });

      if (!existingRole) {
        await this.userRoleRepo.save({
          userId: existing.id,
          roleId: role.id,
        });
      }

      // Dispatch a project created notification (non-blocking)
      // try {
      //   await this.notificationService.dispatch({
      //     type: EmailEventType.PROJECT_ASSIGNED,
      //     payload: {
      //       projectName: projectNames,
      //       createdBy: { name: currentUser.fullName, email: currentUser.email },
      //       members: [{ email: existing.email, name: existing.fullName }],
      //     },
      //   });
      // } catch (err) {
      //   // do not fail project creation if notification dispatch fails
      //   // log later if needed
      // }

      await this.notificationService.sendAdminInviteEmail({
        to: existing.email.toLocaleLowerCase(),
        fullName: existing.fullName,
        role: role.name,
        projectName: projectNames,
        inviteToken: existing.inviteToken,
      });

      return {
        message: `Invitation resent to ${dto.email.toLocaleLowerCase()}`,
      };
    }

    // CREATE NEW USER
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 48);

    const newUser = await this.userRepo.save(
      this.userRepo.create({
        email: dto.email.toLocaleLowerCase(),
        fullName: dto.fullName,
        projects: project,
        inviteToken: generateRandomToken(),
        inviteExpiresAt: expiry,
        isInvitationAccepted: false,
        isActive: false,
        createdBy: currentUser.id,
        userType: dto.userType,
      }),
    );

    await this.userRoleRepo.save({
      userId: newUser.id,
      roleId: role.id,
    });

    await this.notificationService.sendAdminInviteEmail({
      to: newUser.email,
      fullName: newUser.fullName,
      role: role.name,
      projectName: projectNames,
      inviteToken: newUser.inviteToken,
    });

    return {
      message: `Invitation sent to ${dto.email}`,
    };
  }

  async findByInviteToken(token: string) {
    const user = await this.userRepo.findOne({
      where: { inviteToken: token },
      relations: {
        projects: true,
      },
    });

    if (!user) return null;

    const roles = await this.userRoleRepo.find({
      where: { userId: user.id },
      relations: { role: true },
    });

    return {
      ...user,
      roles: roles.map((r) => r.role),
    };
  }

  async activateInvitedUser(userId: string, passwordHash: string) {
    await this.userRepo.update(userId, {
      passwordHash,
      isActive: true,
      isInvitationAccepted: true,
      inviteToken: null,
      inviteExpiresAt: null,
    });
  }

  async updateLastLogin(userId: string) {
    await this.userRepo.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  async findByPasswordResetToken(token: string) {
    return this.userRepo.findOne({
      where: { resetPasswordToken: token },
    });
  }

  async updatePassword(userId: string, passwordHash: string) {
    await this.userRepo.update(userId, {
      passwordHash,
      updatedAt: new Date(),
    });
  }

  async getFullName(userId: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return user?.fullName || '';
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    await this.userRepo.update(userId, {
      resetPasswordToken: token,
      resetPasswordExpiresAt: expiresAt,
    });
  }

  async clearPasswordResetToken(userId: string) {
    await this.userRepo.update(userId, {
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
    });
  }

  async updateUser(userId: string, dto: UpdateUserDto, loggedInUser) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: {
        projects: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName;
    }

    // Snapshot the user's CURRENT projects before we overwrite them below.
    // This is our only chance to know what the "old" state was —
    // once we do `user.projects = projects`, the old list is gone.
    const oldProjectIds = new Set(user.projects.map((p) => p.id));

    // Will hold the actual diff (which projects were added/removed),
    // used later to decide which notifications to send.
    let addedProjects: { id: string; name: string }[] = [];
    let removedProjects: { id: string; name: string }[] = [];

    if (dto.projectIds !== undefined) {
      // Fetch the NEW set of projects the user should belong to.
      const projects = await this.projectRepo.find({
        where: {
          id: In(dto.projectIds),
        },
      });

      const newProjectIds = new Set(projects.map((p) => p.id));

      // ADDED = present in new list, but wasn't in the old list.
      addedProjects = projects.filter((p) => !oldProjectIds.has(p.id));

      // REMOVED = was in the old list, but isn't in the new list.
      removedProjects = user.projects.filter((p) => !newProjectIds.has(p.id));

      // Now actually replace the user's projects (this is the mutation
      // that made the "old" snapshot above necessary).
      user.projects = projects;
    }

    if (dto.roleKey !== undefined) {
      const role = await this.roleRepo.findOneBy({
        normalizedName: dto.roleKey.toUpperCase(),
      });

      if (!role) {
        throw new BadRequestException('Invalid role');
      }

      await this.userRoleRepo.delete({ userId });

      await this.userRoleRepo.save({
        userId,
        roleId: role.id,
      });
    }

    // Send notifications based on the actual diff — not just "projectIds
    // was passed in the request". Skip entirely if the admin is editing
    // their own account (no self-notifications).
    // Send notifications based on the actual diff — not just "projectIds
    // was passed in the request". Skip entirely if the admin is editing
    // their own account (no self-notifications).
    if (userId !== loggedInUser.id && dto.projectIds !== undefined) {
      // Notify about newly added projects, if any.
      if (addedProjects.length > 0) {
        const addedNames = addedProjects.map((p) => p.name).join(', ');

        await this.notificationService.notifyProjectMembers({
          actorId: loggedInUser.id,
          type: NotificationType.PROJECT_ASSIGNED,
          entityType: NotificationEntityType.PROJECT,
          title: `You have been granted access to "${addedNames}" by ${loggedInUser.fullName}`,
          message: `New project${addedProjects.length === 1 ? '' : 's'}: ${addedNames}`,
          explicitRecipientIds: [userId],
        });
      }

      // Notify about removed projects, if any.
      if (removedProjects.length > 0) {
        const removedNames = removedProjects.map((p) => p.name).join(', ');

        await this.notificationService.notifyProjectMembers({
          actorId: loggedInUser.id,
          type: NotificationType.PROJECT_UNASSIGNED,
          entityType: NotificationEntityType.PROJECT,
          title: `You have been removed from "${removedNames}" by ${loggedInUser.fullName}`,
          message: `Removed project${removedProjects.length === 1 ? '' : 's'}: ${removedNames}`,
          explicitRecipientIds: [userId],
        });
      }
    }

    user.updatedAt = new Date();

    await this.userRepo.save(user);

    return this.findById(userId);
  }

  async softDeleteUser(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    await this.userRepo.softDelete(userId);

    await this.userRepo.update(userId, {
      email: `deleted_${Date.now()}_${user.email}`,
      normalizedEmail: `DELETED_${Date.now()}_${user.email.toUpperCase()}`,
    });

    return { success: true };
  }
}
