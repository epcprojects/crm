import type {
  RecentTicket,
  TicketPriority,
  TicketStatus,
} from '../../../components/tables/RecentTicketsTable';

export type TicketReply = {
  id: string;
  author: {
    name: string;
    initials: string;
  };
  createdAt: string;
  message: string;
};

export type TicketAttachment = {
  id: string;
  name: string;
  sizeLabel: string;
  extension?: string;
  storageKey?: string;
};

export type TicketPerson = {
  role: string;
  name: string;
  initials: string;
};

export type TicketDetailRecord = RecentTicket & {
  description: string;
  dueDate: string;
  dueDateValue?: string;
  assigneeId?: string;
  priorityKey?: string | null;
  attachments: TicketAttachment[];
  reporter: TicketPerson;
  assigneeDetail: TicketPerson | null;
  createdByDetail: {
    name: string;
    initials: string;
  } | null;
  replies: TicketReply[];
};

export const ticketStatusOptions: TicketStatus[] = [
  'Open',
  'In Progress',
  'Resolved',
];

export const ticketPriorityOptions: TicketPriority[] = [
  'Critical',
  'High',
  'Medium',
  'Low',
];

export const ticketStatusDropdownOptions = [
  {
    label: 'Open',
    value: 'Open',
    icon: <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />,
  },
  {
    label: 'In Progress',
    value: 'In Progress',
    icon: (
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-warning-500" />
    ),
  },
  {
    label: 'Resolved',
    value: 'Resolved',
    icon: (
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
    ),
  },
];

export const ticketPriorityDropdownOptions = [
  {
    label: 'Critical',
    value: 'Critical',
    icon: (
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-500" />
    ),
  },
  {
    label: 'High',
    value: 'High',
    icon: <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />,
  },
  {
    label: 'Medium',
    value: 'Medium',
    icon: (
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-warning-500" />
    ),
  },
  {
    label: 'Low',
    value: 'Low',
    icon: (
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
    ),
  },
];

export const ticketsData: TicketDetailRecord[] = [];

export function getTicketById(ticketId: string) {
  return ticketsData.find((ticket) => ticket.id === ticketId);
}
