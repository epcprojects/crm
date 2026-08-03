'use client';

import { io, Socket } from 'socket.io-client';

export type SocketConfig = {
  socketUrl: string;
  accessToken: string;
};

const sockets = new Map<string, Socket>();

export function getSocket(
  namespace: string,
  config: SocketConfig,
): Socket {
  const key = `${namespace}:${config.socketUrl}:${config.accessToken}`;

  const existing = sockets.get(key);

  if (existing) {
    if (!existing.connected) {
      existing.connect();
    }

    return existing;
  }

  const socket = io(`${config.socketUrl}/${namespace}`, {
    transports: ['websocket'],
    autoConnect: true,
    auth: {
      token: config.accessToken,
    },
  });

  sockets.set(key, socket);

  return socket;
}

export function disconnectSocket(namespace: string) {
  for (const [key, socket] of sockets.entries()) {
    if (key.startsWith(`${namespace}:`)) {
      socket.disconnect();
      sockets.delete(key);
    }
  }
}