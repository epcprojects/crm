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

import { useAppSelector } from '../Redux/store';
import { eventEmitter } from '../../lib/event-emitter';
import { appToast } from '../../components/toast/AppToast';

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

export function NotificationsSocketProvider({
  children,
}: {
  children: ReactNode;
}) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const authStatus = useAppSelector((state) => state.auth.status);
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
    if (authStatus === 'loading') {
      return;
    }

    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setUnreadCount(0);
      setRecentNotifications([]);
      return;
    }

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
            if (payload.skip) {
              eventEmitter.emit('notification:new', payload);
              return;
            }
            setUnreadCount(payload.unreadCount);
            setRecentNotifications((prev) => [payload, ...prev].slice(0, 5));
            appToast.info(getNotificationToastMessage(payload), {
              position: 'bottom-right',
              toastId: `notification:${payload.id}`,
            });
            eventEmitter.emit('notification:new', payload); // Emit to all over
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
          credentials: 'include',
        })
          .then((r) => r.json())
          .then((d) => setUnreadCount(d.unreadCount))
          .catch(() => undefined);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.toLowerCase().includes('unauthorized')
        ) {
          setIsConnected(false);
          return;
        }

        console.error('Failed to connect notification socket', err);
      }
    }

    connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [authStatus, isAuthenticated]);

  const markAsRead = useCallback(async (id: string) => {
    setRecentNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );

    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
    } catch {
      // Ignore failures when marking a single notification as read.
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setUnreadCount(0);
    setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      });
    } catch {
      // Ignore failures when marking all notifications as read.
    }
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

function getNotificationToastMessage(notification: NotificationItem) {
  const title = notification.title?.trim();
  const message = notification.message?.trim();

  if (title && message) {
    return `${title}: ${message}`;
  }

  if (title) {
    return title;
  }

  if (message) {
    return message;
  }

  return 'You have a new notification.';
}
