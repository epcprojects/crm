import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    roles?: string[];
  };
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    return this.validateClient(client);
  }

  validateClient(client: Socket): boolean {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Socket ${client.id} — no token, disconnecting`);
        client.disconnect();
        return false;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.data.user = payload;
      return true;
    } catch (err) {
      this.logger.warn(`Socket ${client.id} — invalid token: ${err.message}`);
      client.disconnect();
      return false;
    }
  }

  private extractToken(client: Socket): string | null {
    return (
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '') ||
      null
    );
  }

  async authenticate(
    client: Socket,
  ): Promise<{ userId: string; roles: string[] } | null> {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers.authorization?.replace('Bearer ', '') ?? '');

      if (!token) return null;

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return { userId: payload.sub, roles: payload.roles ?? [] };
    } catch (err) {
      this.logger.warn(`WS auth failed: ${err.message}`);
      return null;
    }
  }
}
