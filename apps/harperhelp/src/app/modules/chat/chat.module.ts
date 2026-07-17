import { Module } from '@nestjs/common';
import { ChatMessagesService } from './chat.service';
import { ChatMessagesController } from './chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WsJwtGuard } from 'apps/harperhelp/src/common/guards/ws-jwt.guard';
import { ChatMessageExternal } from './entities/chat-message-external.entity';
import { ChatMessageInternal } from './entities/chat-message-internal.entity';
import { ChatMessagesGateway } from './gateway/chat-messages.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessageInternal, ChatMessageExternal]),
  ],
  controllers: [ChatMessagesController],
  providers: [ChatMessagesService, ChatMessagesGateway, WsJwtGuard],
  exports: [ChatMessagesService, ChatMessagesGateway],
})
export class ChatModule {}
