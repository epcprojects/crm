'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';

import { NotificationItem } from '@harperhelp/interfaces';

type SocketTokenResponse = {
  accessToken: string;
  socketUrl: string;
};

interface NotificationsSocketContextValue {
  unreadCount: number;
  recentNotifications: NotificationItem[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  isConnected: boolean;
}

const NotificationsSocketContext =
  createContext<NotificationsSocketContextValue | null>(null);

/**
 * Mounted once near the app root (e.g. in the authenticated layout), not per
 * component. One socket for the whole app, one persistent connection per tab.
 *
 * Reconnection is handled by Socket.IO's built-in backoff -- we don't need
 * to hand-roll that. On reconnect it re-joins its room server-side
 * automatically (the gateway's handleConnection runs again).
 */
export function NotificationsSocketProvider({
  children,
}: {
  children: ReactNode;
}) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<
    NotificationItem[]
  >([]);

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

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      try {
        const { accessToken, socketUrl } = await fetchSocketToken();

        if (cancelled) return;

        const socket = io(`${socketUrl}/notifications`, {
          auth: {
            token: accessToken,
          },
          transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
          setIsConnected(true);
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
        });

        socket.on(
          'notification:new',
          (payload: NotificationItem & { unreadCount: number }) => {
            setUnreadCount(payload.unreadCount);
            setRecentNotifications((prev) => [payload, ...prev].slice(0, 5));
          },
        );

        socket.on('notification:count', (payload: { unreadCount: number }) => {
          setUnreadCount(payload.unreadCount);
        });

        // Refresh the auth token before every reconnect attempt
        socket.io.on('reconnect_attempt', async () => {
          try {
            const { accessToken } = await fetchSocketToken();
            socket.auth = { token: accessToken };
          } catch {
            // Ignore; Socket.IO will continue retrying.
          }
        });

        socketRef.current = socket;

        // Initial unread count
        fetch('/api/notifications/unread-count', {
          cache: 'no-store',
        })
          .then((r) => r.json())
          .then((d) => setUnreadCount(d.unreadCount))
          .catch(() => {});
      } catch (err) {
        console.error('Failed to connect notification socket', err);
      }
    }

    connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setRecentNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );

    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
    } catch {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    setUnreadCount(0);
    setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      });
    } catch {}
  }, []);

  return (
    <NotificationsSocketContext.Provider
      value={{
        unreadCount,
        recentNotifications,
        markAsRead,
        markAllAsRead,
        isConnected,
      }}
    >
      {children}
    </NotificationsSocketContext.Provider>
  );
}

export function useNotificationsSocket() {
  const ctx = useContext(NotificationsSocketContext);
  if (!ctx) {
    throw new Error(
      'useNotificationsSocket must be used within NotificationsSocketProvider',
    );
  }
  return ctx;
}
