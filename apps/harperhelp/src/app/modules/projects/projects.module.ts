import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThreadController } from './thread.controller';
import { ThreadService } from './services/thread.service';
import { ThreadMessage } from './entities/thread-messages.entity';

import { UtilityModule } from '../utility/utility.module';
import { FilesModule } from '../files/files.module';
import { ProjectsFilesService } from './services/project-files.service';
import { UserRole } from '../users/entities/user.roles.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { WsJwtGuard } from '../../../common/guards/ws-jwt.guard';
import { ThreadGateway } from './gateway/thread.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ReactionsModule } from '../reactions/reactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Ticket, ThreadMessage, UserRole]),
    UtilityModule,
    FilesModule,
    NotificationsModule,
    JwtModule,
    ReactionsModule,
  ],
  controllers: [ProjectsController, ThreadController],
  providers: [
    ProjectsService,
    ThreadService,
    ProjectsFilesService,
    ThreadGateway,
    WsJwtGuard,
  ],
  exports: [ThreadGateway],
})
export class ProjectsModule {}
