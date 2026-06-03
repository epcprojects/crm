import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';

import { UsersController } from './users.controller';

import { User } from './entities/user.entity';

import { UserRole } from './entities/user.roles.entity';
import { Role } from '../roles/entities/role.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, UserRole, Project])],

  controllers: [UsersController],

  providers: [UsersService, NotificationsService],

  exports: [UsersService, NotificationsService],
})
export class UsersModule {}
