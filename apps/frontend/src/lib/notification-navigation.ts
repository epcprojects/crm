type NotificationNavigationTarget = {
  entityType?: string | null;
  projectId?: string | null;
  ticketId?: string | null;
};

export function getNotificationNavigationPath(
  notification: NotificationNavigationTarget,
) {
  if (notification.entityType === 'ticket_reply') {
    return `/tickets/${notification.ticketId}?projectId=${notification.projectId}&internal=false`;
  }

  if (notification.entityType === 'internal_message') {
    return `/tickets/${notification.ticketId}?projectId=${notification.projectId}&internal=true`;
  }

  if (notification.entityType === 'event' && notification.projectId) {
    return `/projects/${notification.projectId}?t=3`;
  }

  if (notification.entityType === 'ticket') {
    return `/tickets/${notification.ticketId}?projectId=${notification.projectId}`;
  }

  if (notification.entityType === 'project' && !notification.projectId) {
    return '/projects';
  }

  if (notification.entityType === 'project' && notification.projectId) {
    return `/projects/${notification.projectId}`;
  }

  if (
    notification.entityType === 'thread_message' &&
    notification.projectId
  ) {
    return `/projects/${notification.projectId}?t=1`;
  }

  return null;
}
