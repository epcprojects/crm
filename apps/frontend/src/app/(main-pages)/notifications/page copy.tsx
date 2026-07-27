'use client';

import { useEffect, useState, useCallback } from 'react';
import { useNotificationsSocket } from '../../providers/NotificationsSocketProvider';
import { NotificationItem } from '../../../../../../libs/shared/interfaces/src/lib/notification.interfaces';

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { markAllAsRead: syncMarkAllAsRead, recentNotifications } =
    useNotificationsSocket();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number, unreadOnlyFlag: boolean) => {
    setLoading(true);
    const res = await fetch(
      `/api/notifications?page=${p}&limit=${PAGE_SIZE}&unreadOnly=${unreadOnlyFlag}`,
      {
        cache: 'no-store',
      },
    );
    const data = await res.json();
    setItems(data.items);
    setTotal(data.total);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(page, unreadOnly);
  }, [page, unreadOnly, load]);

  useEffect(() => {
    if (recentNotifications?.length > 0)
      setItems((prev) => [...prev, ...recentNotifications]);
  }, [recentNotifications]);

  async function handleMarkAsRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async function handleMarkAllAsRead() {
    setItems((prev) => prev?.map((n) => ({ ...n, isRead: true })));
    await syncMarkAllAsRead();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        <button
          onClick={handleMarkAllAsRead}
          className="text-sm text-blue-600 hover:underline"
        >
          Mark all as read
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <FilterTab
          active={!unreadOnly}
          onClick={() => {
            setUnreadOnly(false);
            setPage(1);
          }}
        >
          All
        </FilterTab>
        <FilterTab
          active={unreadOnly}
          onClick={() => {
            setUnreadOnly(true);
            setPage(1);
          }}
        >
          Unread
        </FilterTab>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Loading…
          </div>
        ) : items?.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No notifications
          </div>
        ) : (
          items?.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.isRead && handleMarkAsRead(n.id)}
              className={`w-full text-left px-4 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors ${
                n.isRead ? '' : 'bg-blue-50/40'
              }`}
            >
              <div className="flex items-start gap-2">
                {!n.isRead && (
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                )}
                <div className={n.isRead ? 'ml-4' : ''}>
                  <p className="text-sm text-gray-900">{n.title}</p>
                  {n.message && (
                    <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-sm px-3 py-1 rounded border border-gray-200 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="text-sm px-3 py-1 rounded border border-gray-200 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
        active
          ? 'bg-gray-900 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
