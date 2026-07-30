import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { DashboardController, TicketsController } from './tickets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileRecord } from '../files/entities/file.entity';
import { FilesService } from '../files/files.service';
import { UtilityService } from '../utility/utility.service';
import { Ticket } from './entities/ticket.entity';
import { TicketRepliesController } from './tickets.reply.controller';
import { TicketRepliesService } from './services/tickets.reply.service';
import { TicketReply } from './entities/ticket.reply.entity';
import { TicketPriority } from './entities/ticket.priority.entity';
import { TicketStatus } from './entities/ticket.statuses.entity';
import { TicketStatusesController } from './ticket.statuses.controller';
import { TicketStatusesService } from './services/ticket.statuses.service';
import { TicketPrioritiesController } from './ticket.priorities.controller';
import { TicketPrioritiesService } from './services/ticket.priorities.service';
import { TicketSequence } from './entities/ticket.sequence.entity';
import { Project } from '../projects/entities/project.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { TicketsKanbanView } from './entities/tickets-kanban-view.entity';
import { User } from '../users/entities/user.entity';
import { WsJwtGuard } from '../../../common/guards/ws-jwt.guard';
import { TicketRepliesGateway } from './gateway/ticket-reply.gateway';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketStatus,
      TicketsKanbanView,
      TicketPriority,
      FileRecord,
      TicketReply,
      TicketSequence,
      Project,
      User,
    ]),
    NotificationsModule,
    JwtModule,
    UsersModule,
  ],
  controllers: [
    TicketsController,
    TicketRepliesController,
    TicketStatusesController,
    TicketPrioritiesController,
    DashboardController,
  ],
  providers: [
    TicketsService,
    FilesService,
    UtilityService,
    TicketRepliesService,
    TicketStatusesService,
    TicketPrioritiesService,
    WsJwtGuard,
    TicketRepliesGateway,
  ],
  exports: [TicketRepliesGateway],
})
export class TicketsModule {}
