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

interface JoinThreadPayload {
  projectId: string;
}

interface TypingPayload {
  projectId: string;
  parentId?: string;
  isTyping: boolean;
}

@WebSocketGateway({
  namespace: '/thread',
  cors: {
    origin: [process.env.FRONTEND_APP_URL, 'http://localhost:3000'],
    credentials: true,
  },
})
export class ThreadGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ThreadGateway.name);

  constructor(private readonly wsJwtGuard: WsJwtGuard) {}

  handleConnection(client: Socket) {
    const valid = this.wsJwtGuard.validateClient(client);
    if (!valid) return;

    this.logger.log(`Connected ${client.id} (${client.data.user?.id})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Disconnected ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinThreadPayload,
  ) {
    const room = this.room(payload.projectId);

    await client.join(room);

    client.emit('joined', {
      room,
      projectId: payload.projectId,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave')
  async leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinThreadPayload,
  ) {
    const room = this.room(payload.projectId);

    await client.leave(room);

    client.emit('left', {
      room,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingPayload,
  ) {
    const room = this.room(payload.projectId);

    client.to(room).emit('typing', {
      userId: client.data.user.id,
      name: client.data.user.fullName,
      parentId: payload.parentId,
      isTyping: payload.isTyping,
    });
  }

  broadcastMessage(projectId: string, message: any) {
    this.server.to(this.room(projectId)).emit('thread_created', message);
  }

  broadcastReply(projectId: string, reply: any) {
    this.server.to(this.room(projectId)).emit('thread_reply_created', reply);
  }

  broadcastUpdated(projectId: string, message: any) {
    this.server.to(this.room(projectId)).emit('thread_updated', message);
  }

  broadcastDeleted(projectId: string, id: string) {
    this.server.to(this.room(projectId)).emit('thread_deleted', {
      id,
    });
  }

  private room(projectId: string) {
    return `thread:${projectId}`;
  }
}
