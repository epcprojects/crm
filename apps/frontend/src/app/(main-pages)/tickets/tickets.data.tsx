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
    icon: (
      <span className="inline-block h-2.25 w-2.5 rounded-full bg-red-500" />
    ),
  },
  {
    label: 'In Progress',
    value: 'In Progress',
    icon: (
      <span className="inline-block h-2.25 w-2.5 rounded-full bg-warning-500" />
    ),
  },
  {
    label: 'Resolved',
    value: 'Resolved',
    icon: (
      <span className="inline-block h-2.25 w-2.5 rounded-full bg-green-500" />
    ),
  },
];

export const ticketPriorityDropdownOptions = [
  {
    label: 'Critical',
    value: 'Critical',
    icon: (
      <span className="inline-block h-2.25 w-2.5 rounded-full bg-purple-500" />
    ),
  },
  {
    label: 'High',
    value: 'High',
    icon: (
      <span className="inline-block h-2.25 w-2.5 rounded-full bg-red-500" />
    ),
  },
  {
    label: 'Medium',
    value: 'Medium',
    icon: (
      <span className="inline-block h-2.25 w-2.5 rounded-full bg-warning-500" />
    ),
  },
  {
    label: 'Low',
    value: 'Low',
    icon: (
      <span className="inline-block h-2.25 w-2.5 rounded-full bg-green-500" />
    ),
  },
];

export const ticketsData: TicketDetailRecord[] = [
  {
    id: 't1',
    title: 'Login page broken',
    project: { initials: 'AC', name: 'Acme Corp', brandColor: '#000fff' },
    status: 'Open',
    priority: 'High',
    assignee: { name: 'Jane', initials: 'JA' },
    date: '2026-02-28',
    description:
      'Users are unable to sign in after entering valid credentials. The login button spins indefinitely and the request appears to fail before session creation completes.',
    dueDate: '2026-05-22',
    attachments: [
      { id: 'a1', name: 'Login bug reproduction.mp4', sizeLabel: '8.1 MB' },
    ],
    reporter: { role: 'Reporter', name: 'Admin User', initials: 'AU' },
    assigneeDetail: { role: 'Assignee', name: 'Jane Smith', initials: 'JS' },
    replies: [],
  },
  {
    id: 't2',
    title: 'Invoice PDF export fails',
    project: { initials: 'AC', name: 'Acme Corp', brandColor: '#000fff' },
    status: 'Open',
    priority: 'Medium',
    assignee: { name: 'Jane', initials: 'JA' },
    date: '2026-03-01',
    description:
      'The invoice PDF export feature is failing when users attempt to download generated invoices. Some exports return blank files or trigger server errors during processing. Investigation is needed to identify formatting or backend generation issues.',
    dueDate: '2026-05-20',
    attachments: [
      {
        id: 'a2',
        name: 'Tech design requirements.pdf',
        sizeLabel: '6.3 MB',
      },
    ],
    reporter: { role: 'Reporter', name: 'Admin User', initials: 'AU' },
    assigneeDetail: { role: 'Assignee', name: 'Jane Smith', initials: 'JS' },
    replies: [
      {
        id: 'r1',
        author: { name: 'Admin User', initials: 'AU' },
        createdAt: 'Feb 10, 2026 - 4:39 PM',
        message: 'Investigating now — looks like an env variable issue.',
      },
    ],
  },
];

export function getTicketById(ticketId: string) {
  return ticketsData.find((ticket) => ticket.id === ticketId);
}
