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
  onReacted?: (reply: any) => void;
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
  onReacted,
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

    const handleCreated =
      onCreated ??
      (() => {
        return;
      });
    const handleUpdated =
      onUpdated ??
      (() => {
        return;
      });
    const handleReacted =
      onReacted ??
      (() => {
        return;
      });
    const handleDeleted =
      onDeleted ??
      (() => {
        return;
      });
    const handleTyping =
      onTyping ??
      (() => {
        return;
      });

    socket.on('connect', join);
    socket.on('reply_created', handleCreated);
    socket.on('reply_updated', handleUpdated);
    socket.on('reply_reacted', handleReacted);
    socket.on('reply_deleted', handleDeleted);
    socket.on('typing', handleTyping);

    if (socket.connected) {
      join();
    }

    return () => {
      socket.emit('leave', {
        projectId,
        ticketId,
      });

      socket.off('connect', join);
      socket.off('reply_created', handleCreated);
      socket.off('reply_updated', handleUpdated);
      socket.off('reply_reacted', handleReacted);
      socket.off('reply_deleted', handleDeleted);
      socket.off('typing', handleTyping);
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
