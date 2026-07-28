import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  WsJwtGuard,
  AuthenticatedSocket,
} from '../../../../common/guards/ws-jwt.guard';
import { Notification } from '../entities/notification.entity';

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // userId -> number of active sockets (a user can have multiple tabs/devices)
  private readonly onlineCounts = new Map<string, number>();

  constructor(private readonly wsJwtGuard: WsJwtGuard) {}

  afterInit() {
    this.logger.log('Notifications gateway initialized');
  }

  async handleConnection(client: Socket) {
    const auth = await this.wsJwtGuard.authenticate(client);
    if (!auth) {
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
      return;
    }

    const authed = client as AuthenticatedSocket;
    authed.data.userId = auth.userId;
    authed.data.roles = auth.roles;

    const room = this.roomFor(auth.userId);
    await client.join(room);

    this.onlineCounts.set(
      auth.userId,
      (this.onlineCounts.get(auth.userId) ?? 0) + 1,
    );

    this.logger.debug(`Socket ${client.id} joined ${room}`);
  }

  handleDisconnect(client: Socket) {
    const authed = client as AuthenticatedSocket;
    const userId = authed.data?.userId;
    if (!userId) return;

    const remaining = (this.onlineCounts.get(userId) ?? 1) - 1;
    if (remaining <= 0) {
      this.onlineCounts.delete(userId);
    } else {
      this.onlineCounts.set(userId, remaining);
    }
  }

  private roomFor(userId: string): string {
    return `user:${userId}`;
  }

  /**
   * Called by NotificationsService right after it persists a notification.
   * Thin payload only -- see design note #3 above.
   */
  emitNewNotification(
    recipientId: string,
    notification: Notification,
    unreadCount: number,
  ) {
    this.server.to(this.roomFor(recipientId)).emit('notification:new', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      entityType: notification.entityType,
      entityId: notification.entityId,
      projectId: notification.projectId,
      createdAt: notification.createdAt,
      unreadCount,
    });
  }

  /** Used after mark-as-read / mark-all-as-read so every open tab syncs the badge. */
  emitUnreadCount(recipientId: string, unreadCount: number) {
    this.server
      .to(this.roomFor(recipientId))
      .emit('notification:count', { unreadCount });
  }
}
