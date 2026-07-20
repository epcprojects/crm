import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';

import { UsersController } from './users.controller';

import { User } from './entities/user.entity';

import { UserRole } from './entities/user.roles.entity';
import { Role } from '../roles/entities/role.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserRole, Project]),
    NotificationsModule,
  ],

  controllers: [UsersController],

  providers: [UsersService],

  exports: [UsersService],
})
export class UsersModule {}
