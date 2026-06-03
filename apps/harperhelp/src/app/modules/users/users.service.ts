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

    const roles = await this.userRoleRepo.find({
      where: { userId: user.id },
      relations: { role: true },
    });

    return {
      ...user,
      roles: roles.map((r) => r.role),
    };
  }

  async findById(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = await this.userRoleRepo.find({
      where: { userId: id },
      relations: { role: true },
    });

    return {
      ...user,
      roles: roles.map((ur) => ur.role.name),
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
      normalizedName: dto.roleKey.toUpperCase(),
    });

    if (!role) {
      throw new BadRequestException('Invalid role specified');
    }

    // CHECK EXISTING USER
    const existing = await this.userRepo.findOne({
      where: {
        email: dto.email,
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

      await this.notificationService.sendAdminInviteEmail({
        to: existing.email,
        fullName: existing.fullName,
        role: role.name,
        organizationName: projectNames,
        inviteToken: existing.inviteToken,
      });

      return {
        message: `Invitation resent to ${dto.email}`,
      };
    }

    // CREATE NEW USER
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 48);

    const newUser = await this.userRepo.save(
      this.userRepo.create({
        email: dto.email,
        fullName: dto.fullName,
        projects: project,
        inviteToken: generateRandomToken(),
        inviteExpiresAt: expiry,
        isInvitationAccepted: false,
        isActive: false,
        createdBy: currentUser.id,
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
      organizationName: projectNames,
      inviteToken: newUser.inviteToken,
    });

    return {
      message: `Invitation sent to ${dto.email}`,
    };
  }

  async findByInviteToken(token: string) {
    const user = await this.userRepo.findOne({
      where: { inviteToken: token },
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
}
