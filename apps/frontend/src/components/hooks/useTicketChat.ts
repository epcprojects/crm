'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../../lib/socket';

export type ChatChannel = 'internal' | 'external';

export type ChatMessage = {
  id: string;
  projectId: string;
  ticketId: string;
  senderId: string;
  messageType: 'text' | 'attachment';
  message: string;
  attachmentUrl?: string | null;
  attachmentUrls?: string[] | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  isRead?: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  sender?: {
    id: string;
    name?: string;
    fullName?: string;
    avatarUrl?: string;
  } | null;
  receiver?: {
    id: string;
    name?: string;
    fullName?: string;
    avatarUrl?: string;
  } | null;
};

function isChatMessage(value: unknown): value is ChatMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      'projectId' in value &&
      'ticketId' in value &&
      'senderId' in value &&
      'message' in value,
  );
}

type UseTicketChatOptions = {
  projectId: string;
  ticketId: string;
  channel: ChatChannel;
  enabled?: boolean;
};

type TypingUser = {
  userId: string;
  name: string;
};

type SocketTokenResponse = {
  accessToken: string;
  socketUrl: string;
};

async function fetchSocketToken(): Promise<SocketTokenResponse> {
  const response = await fetch('/api/auth/socket-token', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
    credentials: 'include',
  });

  const payload = (await response.json().catch(() => null)) as
    | SocketTokenResponse
    | { message?: string }
    | null;

  if (!response.ok || !payload || !('accessToken' in payload)) {
    throw new Error(
      payload && 'message' in payload
        ? payload.message || 'Failed to authorize socket connection.'
        : 'Failed to authorize socket connection.',
    );
  }

  return payload;
}

async function fetchMessages(
  projectId: string,
  ticketId: string,
  channel: ChatChannel,
): Promise<ChatMessage[]> {
  const response = await fetch(
    `/api/projects/${projectId}/tickets/${ticketId}/chat/${channel}/messages`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | ChatMessage[]
    | { message?: string }
    | null;

  if (!response.ok || !Array.isArray(payload)) {
    throw new Error(
      !Array.isArray(payload)
        ? payload?.message || 'Failed to fetch chat messages.'
        : 'Failed to fetch chat messages.',
    );
  }

  return payload;
}

export function useTicketChat({
  projectId,
  ticketId,
  channel,
  enabled = true,
}: UseTicketChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !projectId || !ticketId) {
      setMessages([]);
      setTypingUsers([]);
      setConnected(false);
      setLoading(false);
      return;
    }

    let isDisposed = false;

    const load = async (): Promise<(() => void) | undefined> => {
      setLoading(true);

      try {
        const [initialMessages, socketToken] = await Promise.all([
          fetchMessages(projectId, ticketId, channel),
          fetchSocketToken(),
        ]);

        if (isDisposed) {
          return;
        }

        setMessages(initialMessages);
        const socket = getSocket('chat', socketToken);
        socketRef.current = socket;

        const joinRoom = () => {
          setConnected(true);
          socket.emit('join', { projectId, ticketId, channel });
        };

        const handleDisconnect = () => {
          setConnected(false);
        };

        const handleNewMessage = (payload: {
          channel: ChatChannel;
          message: ChatMessage;
        }) => {
          if (payload.channel !== channel) {
            return;
          }

          setMessages((current) => {
            const exists = current.some(
              (message) => message.id === payload.message.id,
            );

            if (exists) {
              return current.map((message) =>
                message.id === payload.message.id ? payload.message : message,
              );
            }

            return [...current, payload.message];
          });
        };

        const handleMessagesRead = (payload: {
          channel: ChatChannel;
          messageIds: string[];
          readByUserId: string;
        }) => {
          if (payload.channel !== channel) {
            return;
          }

          setMessages((current) =>
            current.map((message) =>
              payload.messageIds.includes(message.id)
                ? {
                    ...message,
                    isRead: true,
                    readAt: message.readAt ?? new Date().toISOString(),
                  }
                : message,
            ),
          );
        };

        const handleTyping = (payload: {
          channel: ChatChannel;
          userId: string;
          name?: string;
          isTyping: boolean;
        }) => {
          if (payload.channel !== channel) {
            return;
          }

          setTypingUsers((current) => {
            const filtered = current.filter(
              (user) => user.userId !== payload.userId,
            );

            if (!payload.isTyping) {
              return filtered;
            }

            return [
              ...filtered,
              {
                userId: payload.userId,
                name: payload.name?.trim() || 'Someone',
              },
            ];
          });
        };

        socket.on('connect', joinRoom);
        socket.on('disconnect', handleDisconnect);
        socket.on('new_message', handleNewMessage);
        socket.on('messages_read', handleMessagesRead);
        socket.on('typing', handleTyping);

        if (socket.connected) {
          joinRoom();
        }

        setLoading(false);

        return () => {
          socket.emit('leave', { projectId, ticketId, channel });
          socket.off('connect', joinRoom);
          socket.off('disconnect', handleDisconnect);
          socket.off('new_message', handleNewMessage);
          socket.off('messages_read', handleMessagesRead);
          socket.off('typing', handleTyping);
        };
      } catch {
        if (!isDisposed) {
          setLoading(false);
        }

        return undefined;
      }
    };

    let cleanup: (() => void) | void;

    void load().then((result) => {
      cleanup = result;
    });

    return () => {
      isDisposed = true;
      setConnected(false);
      setTypingUsers([]);

      if (cleanup) {
        cleanup();
      }
    };
  }, [channel, enabled, projectId, ticketId]);

  const sendMessage = useCallback(
    async ({
      message,
      messageType = 'text',
      attachmentUrl,
      attachmentUrls,
      attachmentName,
      attachmentSize,
    }: {
      message: string;
      messageType?: 'text' | 'attachment';
      attachmentUrl?: string;
      attachmentUrls?: string[];
      attachmentName?: string;
      attachmentSize?: number;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/tickets/${ticketId}/chat/${channel}/messages`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            messageType,
            attachmentUrl,
            attachmentUrls,
            attachmentName,
            attachmentSize,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | ChatMessage
        | { message?: string }
        | null;

      if (!response.ok || !isChatMessage(payload)) {
        throw new Error(
          payload && !Array.isArray(payload) && 'message' in payload
            ? payload.message || 'Failed to send chat message.'
            : 'Failed to send chat message.',
        );
      }

      setMessages((current) => {
        const exists = current.some(
          (currentMessage) => currentMessage.id === payload.id,
        );
        return exists ? current : [...current, payload];
      });

      return payload;
    },
    [channel, projectId, ticketId],
  );

  const markRead = useCallback(
    async (messageIds: string[]) => {
      if (!messageIds.length) {
        return;
      }

      const response = await fetch(
        `/api/projects/${projectId}/tickets/${ticketId}/chat/${channel}/messages/read`,
        {
          method: 'PATCH',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messageIds }),
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to mark messages as read.');
      }

      setMessages((current) =>
        current.map((message) =>
          messageIds.includes(message.id)
            ? {
                ...message,
                isRead: true,
                readAt: message.readAt ?? new Date().toISOString(),
              }
            : message,
        ),
      );
    },
    [channel, projectId, ticketId],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const response = await fetch(
        `/api/projects/${projectId}/tickets/${ticketId}/chat/${channel}/messages/${messageId}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
          },
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to delete message.');
      }

      setMessages((current) =>
        current.filter((message) => message.id !== messageId),
      );
    },
    [channel, projectId, ticketId],
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      socketRef.current?.emit('typing', {
        projectId,
        ticketId,
        channel,
        isTyping,
      });
    },
    [channel, projectId, ticketId],
  );

  return {
    messages,
    connected,
    loading,
    typingUsers,
    sendMessage,
    markRead,
    deleteMessage,
    setTyping,
  };
}
