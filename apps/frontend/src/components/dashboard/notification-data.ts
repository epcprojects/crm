'use client';

export type NotificationCategory =
  | 'tickets'
  | 'projects'
  | 'messages'
  | 'threads'
  | 'files';

export type NotificationItem = {
  id: string;
  actorName: string;
  actorInitials: string;
  actorTone: string;
  message: string;
  timeLabel: string;
  unread: boolean;
  kind: 'message' | 'update';
  categories: NotificationCategory[];
};

export const mockNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    actorName: 'Sarah Jenkins',
    actorInitials: 'SJ',
    actorTone: 'from-violet-100 to-fuchsia-50 text-violet-600',
    message: 'created a new project EPC CRM Mobile App Redesign.',
    timeLabel: '10m ago',
    unread: true,
    kind: 'message',
    categories: ['projects'],
  },
  {
    id: 'notif-2',
    actorName: 'David Chen',
    actorInitials: 'DC',
    actorTone: 'from-red-100 to-orange-50 text-red-500',
    message:
      'replied on lead #TK-88 (Login page broken): "I updated the auth headers..."',
    timeLabel: '2m ago',
    unread: true,
    kind: 'update',
    categories: ['tickets', 'messages'],
  },
  {
    id: 'notif-3',
    actorName: 'Emma Watson',
    actorInitials: 'EW',
    actorTone: 'from-indigo-100 to-sky-50 text-indigo-500',
    message: 'changed your assignment from Nexus Website to Nexus Mobile App.',
    timeLabel: '25m ago',
    unread: false,
    kind: 'message',
    categories: ['projects', 'messages'],
  },
  {
    id: 'notif-4',
    actorName: 'David Chen',
    actorInitials: 'DC',
    actorTone: 'from-orange-100 to-amber-50 text-orange-500',
    message:
      'created lead #TK-118 (Checkout page is not loading) in Acme Corp.',
    timeLabel: '45m ago',
    unread: false,
    kind: 'update',
    categories: ['tickets'],
  },
  {
    id: 'notif-5',
    actorName: 'Michael Scott',
    actorInitials: 'MS',
    actorTone: 'from-emerald-100 to-teal-50 text-emerald-600',
    message: 'changed lead #TK-104 status from Open to In Progress.',
    timeLabel: '1h ago',
    unread: false,
    kind: 'update',
    categories: ['tickets', 'threads'],
  },
  {
    id: 'notif-6',
    actorName: 'Olivia Martin',
    actorInitials: 'OM',
    actorTone: 'from-blue-100 to-cyan-50 text-blue-500',
    message: 'changed lead #TK-104 priority from Medium to High.',
    timeLabel: '1h ago',
    unread: false,
    kind: 'update',
    categories: ['tickets'],
  },
  {
    id: 'notif-7',
    actorName: 'John Smith',
    actorInitials: 'JS',
    actorTone: 'from-indigo-100 to-violet-50 text-indigo-500',
    message: 'replied on lead #TK-88 (Login page broken).',
    timeLabel: '2h ago',
    unread: true,
    kind: 'message',
    categories: ['tickets', 'messages'],
  },
  {
    id: 'notif-8',
    actorName: 'Maya Wilson',
    actorInitials: 'MW',
    actorTone: 'from-rose-100 to-pink-50 text-rose-500',
    message: 'assigned lead #TK-126 (Invoice export fails) to you.',
    timeLabel: '3h ago',
    unread: false,
    kind: 'update',
    categories: ['messages', 'files'],
  },
];
