/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../../lib/socket';

type SocketToken = {
  socketUrl: string;
  accessToken: string;
};

type Props = {
  projectId: string;
  ticketId: string;
  token: SocketToken | null;
  enabled?: boolean;

  onCreated?: (reply: any) => void;
  onUpdated?: (reply: any) => void;
  onDeleted?: (payload: { id: string }) => void;
  onTyping?: (payload: any) => void;
};

export function useTicketReplies({
  projectId,
  ticketId,
  token,
  enabled = true,
  onCreated,
  onUpdated,
  onDeleted,
  onTyping,
}: Props) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !projectId || !ticketId || !token) {
      return;
    }

    const socket = getSocket('ticket-replies', token);

    socketRef.current = socket;

    const join = () => {
      socket.emit('join', {
        projectId,
        ticketId,
      });
    };

    socket.on('connect', join);

    socket.on(
      'reply_created',
      onCreated ??
        (() => {
          '';
        }),
    );
    socket.on(
      'reply_updated',
      onUpdated ??
        (() => {
          '';
        }),
    );
    socket.on(
      'reply_deleted',
      onDeleted ??
        (() => {
          '';
        }),
    );
    socket.on(
      'typing',
      onTyping ??
        (() => {
          '';
        }),
    );

    if (socket.connected) {
      join();
    }

    return () => {
      socket.emit('leave', {
        projectId,
        ticketId,
      });

      socket.off('connect', join);
      socket.off('reply_created', onCreated);
      socket.off('reply_updated', onUpdated);
      socket.off('reply_deleted', onDeleted);
      socket.off('typing', onTyping);
    };
  }, [
    enabled,
    onCreated,
    onDeleted,
    onTyping,
    onUpdated,
    projectId,
    ticketId,
    token,
  ]);

  return {
    setTyping(isTyping: boolean) {
      socketRef.current?.emit('typing', {
        projectId,
        ticketId,
        isTyping,
      });
    },
  };
}
