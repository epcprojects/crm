// tickets/enums/ticket-type.enum.ts
export enum TicketType {
  BUG = 'bug',
  FEATURE_REQUEST = 'feature_request',
}

// enum/ticket-type.enum.ts
export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  [TicketType.BUG]: 'Bug',
  [TicketType.FEATURE_REQUEST]: 'Feature',
};

export function getTicketTypeLabel(type: TicketType | null): string {
  return type ? TICKET_TYPE_LABELS[type] : 'Not specified';
}
