import { Module } from '@nestjs/common';
import { ChatMessagesService } from './chat.service';
import { ChatMessagesController } from './chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { WsJwtGuard } from 'apps/harperhelp/src/common/guards/ws-jwt.guard';
import {WsJwtGuard} from '../../../common/guards/ws-jwt.guard';
import { ChatMessageExternal } from './entities/chat-message-external.entity';
import { ChatMessageInternal } from './entities/chat-message-internal.entity';
import { ChatMessagesGateway } from './gateway/chat-messages.gateway';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ReactionsModule } from '../reactions/reactions.module';
import { ProjectsModule } from '../projects/projects.module';
import { UtilityModule } from '../utility/utility.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessageInternal, ChatMessageExternal]),
    UsersModule,
    NotificationsModule,
    JwtModule,
    TicketsModule,
    ReactionsModule,
    ProjectsModule,
    UtilityModule,
  ],
  controllers: [ChatMessagesController],
  providers: [ChatMessagesService, ChatMessagesGateway, WsJwtGuard],
  exports: [ChatMessagesService, ChatMessagesGateway],
})
export class ChatModule {}
