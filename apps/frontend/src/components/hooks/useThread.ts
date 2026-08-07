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

    const handleThreadCreated = (payload: unknown) => {
      if (onCreated) {
        onCreated(payload);
      }
    };
    const handleThreadReplyCreated = (payload: unknown) => {
      if (onReplyCreated) {
        onReplyCreated(payload);
      }
    };
    const handleThreadUpdated = onUpdated ?? (() => {});
    const handleThreadDeleted = onDeleted ?? (() => {});
    const handleTyping = onTyping ?? (() => {});

    socket.on('thread_created', handleThreadCreated);
    socket.on('thread_reply_created', handleThreadReplyCreated);
    socket.on('thread_updated', handleThreadUpdated);
    socket.on('thread_reacted', handleThreadUpdated);
    socket.on('thread_deleted', handleThreadDeleted);
    socket.on('typing', handleTyping);

    if (socket.connected) {
      join();
    }

    return () => {
      socket.emit('leave', { projectId });

      socket.off('connect', join);
      socket.off('thread_created', handleThreadCreated);
      socket.off('thread_reply_created', handleThreadReplyCreated);
      socket.off('thread_updated', handleThreadUpdated);
      socket.off('thread_reacted', handleThreadUpdated);
      socket.off('thread_deleted', handleThreadDeleted);
      socket.off('typing', handleTyping);
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
