import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatMessagesService, ChatChannel } from '../chat.service';
import { WsJwtGuard } from '../../../../common/guards/ws-jwt.guard';
import { UserType } from '@harperhelp/types';

interface JoinPayload {
  projectId: string;
  ticketId: string;
  channel: ChatChannel;
}

interface TypingPayload {
  ticketId: string;
  channel: ChatChannel;
  isTyping: boolean;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: [process.env.FRONTEND_APP_URL, 'http://localhost:3000'],
    credentials: true,
  },
})
export class ChatMessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatMessagesGateway.name);

  constructor(
    private readonly chatService: ChatMessagesService,
    private readonly wsJwtGuard: WsJwtGuard,
  ) {}

  handleConnection(client: Socket) {
    const valid = this.wsJwtGuard.validateClient(client);
    if (!valid) return;

    this.logger.log(
      `Connected: ${client.id} | user: ${client.data.user?.id} | role: ${client.data.user?.role}`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Disconnected: ${client.id}`);
  }

  // - Join room
  // Room name format: chat:{projectId}:{ticketId}:{channel}
  // This ensures strict isolation between internal and external channels

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    const user = client.data.user;
    const { projectId, ticketId, channel } = payload;

    // Role-based channel access check
    // if (!this.chatService.canAccessChannel(user.role, channel)) {
    //   client.emit('error', {
    //     event: 'join',
    //     message: 'Forbidden: cannot access this channel',
    //   });
    //   return;
    // }

    // External users: must own the ticket
    if (user.userType === UserType.EXTERNAL) {
      try {
        await this.chatService.assertExternalTicketAccess(user.id, ticketId);
      } catch {
        client.emit('error', {
          event: 'join',
          message: 'Forbidden: ticket access denied',
        });
        return;
      }
    }

    const room = this.roomKey(projectId, ticketId, channel);
    await client.join(room);

    client.emit('joined', { room, projectId, ticketId, channel });
    this.logger.log(`User ${user.id} (${user.role}) joined room ${room}`);
  }

  // - Leave room

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave')
  async handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    const room = this.roomKey(
      payload.projectId,
      payload.ticketId,
      payload.channel,
    );
    await client.leave(room);
    client.emit('left', { room });
  }

  // - Typing indicator

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingPayload & { projectId: string },
  ) {
    const user = client.data.user;
    const room = this.roomKey(
      payload.projectId,
      payload.ticketId,
      payload.channel,
    );

    // Broadcast to room except sender
    client.to(room).emit('typing', {
      userId: user.id,
      name: user.name,
      isTyping: payload.isTyping,
      channel: payload.channel,
    });
  }

  // Broadcast helpers (called by controller after DB save)

  broadcastMessage(
    projectId: string,
    ticketId: string,
    channel: ChatChannel,
    message: any,
  ) {
    const room = this.roomKey(projectId, ticketId, channel);
    this.server.to(room).emit('new_message', { channel, message });
  }

  broadcastReadReceipt(
    projectId: string,
    ticketId: string,
    channel: ChatChannel,
    messageIds: string[],
    readByUserId: string,
  ) {
    const room = this.roomKey(projectId, ticketId, channel);
    this.server
      .to(room)
      .emit('messages_read', { channel, messageIds, readByUserId });
  }

  broadcastMessageDeleted(
    projectId: string,
    ticketId: string,
    channel: ChatChannel,
    message: any,
  ) {
    const room = this.roomKey(projectId, ticketId, channel);
    this.server.to(room).emit('message_deleted', { channel, message });
  }

  broadcastMessageUpdated(
    projectId: string,
    ticketId: string,
    channel: ChatChannel,
    message: any,
  ) {
    const room = this.roomKey(projectId, ticketId, channel);
    this.server.to(room).emit('message_updated', { channel, message });
  }

  broadcastMessageReacted(
    projectId: string,
    ticketId: string,
    channel: ChatChannel,
    message: any,
  ) {
    const room = this.roomKey(projectId, ticketId, channel);
    this.server.to(room).emit('message_reacted', { channel, message });
  }


  // - Utilities

  private roomKey(
    projectId: string,
    ticketId: string,
    channel: ChatChannel,
  ): string {
    return `chat:${projectId}:${ticketId}:${channel}`;
  }
}
