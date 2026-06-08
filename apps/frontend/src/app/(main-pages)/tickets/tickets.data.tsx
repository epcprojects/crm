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
};

export type TicketPerson = {
  role: string;
  name: string;
  initials: string;
};

export type TicketDetailRecord = RecentTicket & {
  description: string;
  dueDate: string;
  attachments: TicketAttachment[];
  reporter: TicketPerson;
  assigneeDetail: TicketPerson;
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
    icon: <span className="inline-block h-2.25 w-2.5 rounded-full bg-red-500" />,
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
    project: { initials: 'AC', name: 'Acme Corp' },
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
    project: { initials: 'AC', name: 'Acme Corp' },
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
  {
    id: 't3',
    title: 'API rate limit too low',
    project: { initials: 'ST', name: 'Stellar Tech' },
    status: 'Open',
    priority: 'High',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-02-27',
    description:
      'Current API threshold is too restrictive for production traffic and is causing client retry storms during peak usage windows.',
    dueDate: '2026-05-24',
    attachments: [],
    reporter: { role: 'Reporter', name: 'Admin User', initials: 'AU' },
    assigneeDetail: { role: 'Assignee', name: 'Bob Lee', initials: 'BL' },
    replies: [],
  },
  {
    id: 't4',
    title: 'Dashboard charts not loading',
    project: { initials: 'ST', name: 'Stellar Tech' },
    status: 'Resolved',
    priority: 'Low',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-02-20',
    description:
      'Several overview charts render empty states intermittently because analytics requests time out after the dashboard mounts.',
    dueDate: '2026-05-18',
    attachments: [],
    reporter: { role: 'Reporter', name: 'Admin User', initials: 'AU' },
    assigneeDetail: { role: 'Assignee', name: 'Bob Lee', initials: 'BL' },
    replies: [],
  },
  {
    id: 't5',
    title: 'Sensor data sync delay',
    project: { initials: 'GC', name: 'GreenLeaf Co' },
    status: 'Open',
    priority: 'Critical',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-03-02',
    description:
      'IoT sensor readings are arriving several minutes late, causing stale values in dashboards and downstream alerts.',
    dueDate: '2026-05-19',
    attachments: [],
    reporter: { role: 'Reporter', name: 'Admin User', initials: 'AU' },
    assigneeDetail: { role: 'Assignee', name: 'Bob Lee', initials: 'BL' },
    replies: [],
  },
  {
    id: 't6',
    title: 'Payment gateway timeout',
    project: { initials: 'AC', name: 'Acme Corp' },
    status: 'In Progress',
    priority: 'High',
    assignee: { name: 'Jane', initials: 'JA' },
    date: '2026-03-02',
    description:
      'Intermittent timeouts occur during payment authorization, especially when retry traffic spikes after webhook delays.',
    dueDate: '2026-05-26',
    attachments: [],
    reporter: { role: 'Reporter', name: 'Admin User', initials: 'AU' },
    assigneeDetail: { role: 'Assignee', name: 'Jane Smith', initials: 'JS' },
    replies: [],
  },
  {
    id: 't7',
    title: 'Mobile app crash on iOS 17',
    project: { initials: 'GC', name: 'GreenLeaf Co' },
    status: 'In Progress',
    priority: 'High',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-03-01',
    description:
      'The latest iOS release triggers a crash when opening the activity feed after cold start on affected devices.',
    dueDate: '2026-05-23',
    attachments: [],
    reporter: { role: 'Reporter', name: 'Admin User', initials: 'AU' },
    assigneeDetail: { role: 'Assignee', name: 'Bob Lee', initials: 'BL' },
    replies: [],
  },
  {
    id: 't8',
    title: 'User registration email not received',
    project: { initials: 'AC', name: 'Acme Corp' },
    status: 'Open',
    priority: 'Medium',
    assignee: { name: 'Jane', initials: 'JA' },
    date: '2026-03-01',
    description:
      'New users are not consistently receiving the registration email, which blocks account activation and onboarding.',
    dueDate: '2026-05-27',
    attachments: [],
    reporter: { role: 'Reporter', name: 'Admin User', initials: 'AU' },
    assigneeDetail: { role: 'Assignee', name: 'Jane Smith', initials: 'JS' },
    replies: [],
  },
  {
    id: 't9',
    title: 'Search results not relevant',
    project: { initials: 'ST', name: 'Stellar Tech' },
    status: 'Open',
    priority: 'Low',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-03-02',
    description:
      'Result ranking appears skewed toward older records, making current matches harder to find.',
    dueDate: '2026-05-29',
    attachments: [],
    reporter: { role: 'Reporter', name: 'Admin User', initials: 'AU' },
    assigneeDetail: { role: 'Assignee', name: 'Bob Lee', initials: 'BL' },
    replies: [],
  },
  {
    id: 't10',
    title: 'Notifications delayed',
    project: { initials: 'ST', name: 'Stellar Tech' },
    status: 'In Progress',
    priority: 'Medium',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-02-27',
    description:
      'Queued notifications are being delivered later than expected due to worker throughput issues.',
    dueDate: '2026-05-30',
    attachments: [],
    reporter: { role: 'Reporter', name: 'Admin User', initials: 'AU' },
    assigneeDetail: { role: 'Assignee', name: 'Bob Lee', initials: 'BL' },
    replies: [],
  },
  {
    id: 't11',
    title: 'Profile image upload fails',
    project: { initials: 'GC', name: 'GreenLeaf Co' },
    status: 'Resolved',
    priority: 'Medium',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-02-28',
    description:
      'Image uploads fail validation for some valid files because MIME detection mismatches the extension.',
    dueDate: '2026-05-21',
    attachments: [],
    reporter: { role: 'Reporter', name: 'Admin User', initials: 'AU' },
    assigneeDetail: { role: 'Assignee', name: 'Bob Lee', initials: 'BL' },
    replies: [],
  },
  {
    id: 't12',
    title: 'Data export CSV corrupted',
    project: { initials: 'GC', name: 'GreenLeaf Co' },
    status: 'Open',
    priority: 'High',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-03-02',
    description:
      'Exported CSV files include malformed quoting for some rows, causing spreadsheet imports to fail.',
    dueDate: '2026-05-31',
    attachments: [],
    reporter: { role: 'Reporter', name: 'Admin User', initials: 'AU' },
    assigneeDetail: { role: 'Assignee', name: 'Bob Lee', initials: 'BL' },
    replies: [],
  },
];

export function getTicketById(ticketId: string) {
  return ticketsData.find((ticket) => ticket.id === ticketId);
}
