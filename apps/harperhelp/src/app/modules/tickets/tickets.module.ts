import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ticket,
      TicketStatus,
      TicketPriority,
      FileRecord,
      TicketReply,
    ]),
  ],
  controllers: [
    TicketsController,
    TicketRepliesController,
    TicketStatusesController,
  ],
  providers: [
    TicketsService,
    FilesService,
    UtilityService,
    TicketRepliesService,
    TicketStatusesService,
  ],
})
export class TicketsModule {}
