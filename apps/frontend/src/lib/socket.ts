'use client';

import { io, type Socket } from 'socket.io-client';

type SocketConfig = {
  socketUrl: string;
  accessToken: string;
};

let socket: Socket | null = null;
let socketCacheKey = '';

export function getChatSocket(config: SocketConfig) {
  const nextCacheKey = `${config.socketUrl}::${config.accessToken}`;

  if (socket && socketCacheKey === nextCacheKey) {
    if (!socket.connected) {
      socket.connect();
    }

    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(`${config.socketUrl}/chat`, {
    transports: ['websocket'],
    autoConnect: true,
    auth: {
      token: config.accessToken,
    },
  });
  socketCacheKey = nextCacheKey;

  return socket;
}

export function disconnectChatSocket() {
  socket?.disconnect();
  socket = null;
  socketCacheKey = '';
}
