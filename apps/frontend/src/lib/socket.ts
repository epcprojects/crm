'use client';

import { io, Socket } from 'socket.io-client';

export type SocketConfig = {
  socketUrl: string;
  accessToken: string;
};

type CachedSocket = {
  socket: Socket;
  accessToken: string;
};

const sockets = new Map<string, CachedSocket>();

export function getSocket(
  namespace: string,
  config: SocketConfig,
): Socket {
  const key = `${namespace}:${config.socketUrl}`;

  const existing = sockets.get(key);

  if (existing) {
    if (existing.accessToken !== config.accessToken) {
      existing.accessToken = config.accessToken;
      existing.socket.auth = {
        ...existing.socket.auth,
        token: config.accessToken,
      };
    }

    if (!existing.socket.connected) {
      existing.socket.connect();
    }

    return existing.socket;
  }

  const socket = io(`${config.socketUrl}/${namespace}`, {
    transports: ['websocket'],
    autoConnect: true,
    auth: {
      token: config.accessToken,
    },
  });

  sockets.set(key, {
    socket,
    accessToken: config.accessToken,
  });

  return socket;
}

export function disconnectSocket(namespace: string) {
  for (const [key, entry] of sockets.entries()) {
    if (key.startsWith(`${namespace}:`)) {
      entry.socket.disconnect();
      sockets.delete(key);
    }
  }
}
