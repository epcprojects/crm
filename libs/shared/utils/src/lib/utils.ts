import { randomBytes } from 'crypto';

// This will generate highly secure random string
export function generateRandomToken() {
  return randomBytes(32).toString('hex');
}

//
export const MODULE_DEFINITIONS: {
  key: string;
  label: string;
  actions: string[];
}[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    actions: [
      'view_stats',
      'view_project_cards',
      'view_recent_tickets',
      'view_upcoming',
    ],
  },
  {
    key: 'projects',
    label: 'Projects',
    actions: ['view_list', 'view_detail', 'create', 'edit', 'delete'],
  },
  {
    key: 'tickets',
    label: 'Tickets',
    actions: [
      'view_list',
      'view_detail',
      'create',
      'edit_status',
      'edit_priority',
      'edit_assignee',
      'edit_due_date',
      'internal_chat',
      'filter',
    ],
  },
  {
    key: 'ticket_replies',
    label: 'Ticket Replies',
    actions: ['view', 'post', 'attach_file'],
  },
  {
    key: 'thread',
    label: 'Thread',
    actions: [
      'view',
      'view_replies',
      'post_message',
      'post_reply',
      'attach_file',
    ],
  },
  { key: 'files', label: 'Files', actions: ['view', 'upload', 'download'] },
  {
    key: 'calendar',
    label: 'Calendar',
    actions: ['view_grid', 'view_upcoming', 'add_event', 'navigate'],
  },
  {
    key: 'users',
    label: 'Users',
    actions: ['view_list', 'create', 'edit', 'delete'],
  },
  {
    key: 'roles',
    label: 'Roles',
    actions: ['view_list', 'create', 'edit_permissions', 'delete'],
  },
  {
    key: 'settings',
    label: 'Settings',
    actions: [
      'view_statuses',
      'create_status',
      'edit_status',
      'delete_status',
      'view_priorities',
      'create_priority',
      'edit_priority',
      'delete_priority',
    ],
  },
];
