export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  entityType: string;
  entityId: string;
  projectId: string | null;
  isRead: boolean;
  createdAt: string;
  ticketId: string;
  skip?: boolean;
}
