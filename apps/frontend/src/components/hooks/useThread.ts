'use client';

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../../lib/socket';

type SocketToken = {
  socketUrl: string;
  accessToken: string;
};

type UseThreadSocketProps = {
  projectId: string;
  token: SocketToken | null;
  enabled?: boolean;
  onCreated?: (message: any) => void;
  onReplyCreated?: (reply: any) => void;
  onUpdated?: (message: any) => void;
  onDeleted?: (payload: { id: string }) => void;
  onTyping?: (payload: any) => void;
};

export function useThread({
  projectId,
  token,
  enabled = true,
  onCreated,
  onReplyCreated,
  onUpdated,
  onDeleted,
  onTyping,
}: UseThreadSocketProps) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !projectId || !token) {
      return;
    }

    const socket = getSocket('thread', token);

    socketRef.current = socket;

    const join = () => {
      socket.emit('join', { projectId });
    };

    socket.on('connect', join);

    socket.on('thread_created', (payload) => {
      console.log(payload);
      if (onCreated) {
        onCreated(payload);
      }
    });
    socket.on('thread_created', (payload) => {
      console.log(payload);
      if (onReplyCreated) {
        onReplyCreated(payload);
      }
    });
    socket.on('thread_updated', onUpdated ?? (() => {}));
    socket.on('thread_deleted', onDeleted ?? (() => {}));
    socket.on('typing', onTyping ?? (() => {}));

    if (socket.connected) {
      join();
    }

    return () => {
      socket.emit('leave', { projectId });

      socket.off('connect', join);
      socket.off('thread_created', onCreated);
      socket.off('thread_reply_created', onReplyCreated);
      socket.off('thread_updated', onUpdated);
      socket.off('thread_deleted', onDeleted);
      socket.off('typing', onTyping);
    };
  }, [
    enabled,
    onCreated,
    onDeleted,
    onReplyCreated,
    onTyping,
    onUpdated,
    projectId,
    token,
  ]);

  return {
    setTyping(parentId: string | undefined, isTyping: boolean) {
      socketRef.current?.emit('typing', {
        projectId,
        parentId,
        isTyping,
      });
    },
  };
}
