export const SYSTEM_TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in-progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export type SystemTicketStatus =
  (typeof SYSTEM_TICKET_STATUS)[keyof typeof SYSTEM_TICKET_STATUS];

  
