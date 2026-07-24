import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../../../../common/guards/ws-jwt.guard';

interface JoinPayload {
  projectId: string;
  ticketId: string;
}

interface TypingPayload {
  projectId: string;
  ticketId: string;
  isTyping: boolean;
}

@WebSocketGateway({
  namespace: '/ticket-replies',
  cors: {
    origin: [process.env.FRONTEND_APP_URL, 'http://localhost:3000'],
    credentials: true,
  },
})
export class TicketRepliesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TicketRepliesGateway.name);

  constructor(private readonly wsJwtGuard: WsJwtGuard) {}

  handleConnection(client: Socket) {
    const valid = this.wsJwtGuard.validateClient(client);
    if (!valid) return;

    this.logger.log(`Connected: ${client.id} | ${client.data.user?.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    const room = this.room(payload.projectId, payload.ticketId);

    await client.join(room);

    client.emit('joined', {
      room,
      projectId: payload.projectId,
      ticketId: payload.ticketId,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave')
  async leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ) {
    const room = this.room(payload.projectId, payload.ticketId);

    await client.leave(room);

    client.emit('left', { room });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingPayload,
  ) {
    client.to(this.room(payload.projectId, payload.ticketId)).emit('typing', {
      userId: client.data.user.id,
      name: client.data.user.fullName,
      isTyping: payload.isTyping,
    });
  }

  broadcastReply(projectId: string, ticketId: string, reply: any) {
    this.server.to(this.room(projectId, ticketId)).emit('reply_created', reply);
  }

  broadcastUpdated(projectId: string, ticketId: string, reply: any) {
    this.server.to(this.room(projectId, ticketId)).emit('reply_updated', reply);
  }

  broadcastDeleted(projectId: string, ticketId: string, replyId: string) {
    this.server.to(this.room(projectId, ticketId)).emit('reply_deleted', {
      id: replyId,
    });
  }

  private room(projectId: string, ticketId: string) {
    return `ticket-replies:${projectId}:${ticketId}`;
  }
}
