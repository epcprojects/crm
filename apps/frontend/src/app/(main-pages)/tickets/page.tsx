'use client';

import { useEffect, useMemo, useState } from 'react';
import { projects } from '../projects/page';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../components/modals/CreateTicketModal';
import {
  createTicketAssigneeOptions,
  createTicketPriorityOptions,
  createTicketProjectOptions,
} from '../../../components/modals/create-ticket-modal.data';
import RecentTicketsTable, {
  type RecentTicket,
  type TicketPriority,
  type TicketStatus,
} from '../../../components/tables/RecentTicketsTable';
import { appToast } from '../../../components/toast/AppToast';
import Dropdown from '../../../components/ui/ThemeDropDown';
import { SearchIcon } from '../../../../public/icons';

const allTickets: RecentTicket[] = [
  {
    id: 't1',
    title: 'Login page broken',
    project: { initials: 'AC', name: 'Acme Corp' },
    status: 'Open',
    priority: 'High',
    assignee: { name: 'Jane', initials: 'JA' },
    date: '2026-02-28',
  },
  {
    id: 't2',
    title: 'Invoice PDF export fails',
    project: { initials: 'AC', name: 'Acme Corp' },
    status: 'In Progress',
    priority: 'Medium',
    assignee: { name: 'Jane', initials: 'JA' },
    date: '2026-03-01',
  },
  {
    id: 't3',
    title: 'API rate limit too low',
    project: { initials: 'ST', name: 'Stellar Tech' },
    status: 'Open',
    priority: 'High',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-02-27',
  },
  {
    id: 't4',
    title: 'Dashboard charts not loading',
    project: { initials: 'ST', name: 'Stellar Tech' },
    status: 'Resolved',
    priority: 'Low',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-02-20',
  },
  {
    id: 't5',
    title: 'Sensor data sync delay',
    project: { initials: 'GC', name: 'GreenLeaf Co' },
    status: 'Open',
    priority: 'Critical',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-03-02',
  },
  {
    id: 't7',
    title: 'Mobile app crash on iOS 17',
    project: { initials: 'GC', name: 'GreenLeaf Co' },
    status: 'In Progress',
    priority: 'High',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-03-01',
  },
  {
    id: 't8',
    title: 'User registration email not received',
    project: { initials: 'AC', name: 'Acme Corp' },
    status: 'Open',
    priority: 'Medium',
    assignee: { name: 'Jane', initials: 'JA' },
    date: '2026-03-01',
  },
  {
    id: 't6',
    title: 'Payment gateway timeout',
    project: { initials: 'AC', name: 'Acme Corp' },
    status: 'In Progress',
    priority: 'High',
    assignee: { name: 'Jane', initials: 'JA' },
    date: '2026-03-02',
  },
  {
    id: 't9',
    title: 'Search results not relevant',
    project: { initials: 'ST', name: 'Stellar Tech' },
    status: 'Open',
    priority: 'Low',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-03-02',
  },
  {
    id: 't10',
    title: 'Notifications delayed',
    project: { initials: 'ST', name: 'Stellar Tech' },
    status: 'In Progress',
    priority: 'Medium',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-02-27',
  },
  {
    id: 't11',
    title: 'Profile image upload fails',
    project: { initials: 'GC', name: 'GreenLeaf Co' },
    status: 'Resolved',
    priority: 'Medium',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-02-28',
  },
  {
    id: 't12',
    title: 'Data export CSV corrupted',
    project: { initials: 'GC', name: 'GreenLeaf Co' },
    status: 'Open',
    priority: 'High',
    assignee: { name: 'Bob', initials: 'BO' },
    date: '2026-03-02',
  },
];

const statusFilterOptions = [
  { label: 'All Status', value: 'all' },
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
  {
    label: 'Closed',
    value: 'Closed',
    icon: (
      <span className="inline-block h-2.25 w-2.5 rounded-full bg-sky-500" />
    ),
  },
];

const priorityFilterOptions = [
  { label: 'All Priority', value: 'all' },
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

const Page = () => {
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const projectOptions = useMemo(
    () => createTicketProjectOptions(projects),
    [],
  );

  const handleCreateTicket = async (values: CreateTicketFormValues) => {
    console.log('Create ticket payload', values);
    appToast.success('Ticket created successfully.');
  };

  useEffect(() => {
    setHeaderActionOverride(() => setCreateTicketOpen(true));

    return () => {
      setHeaderActionOverride(null);
    };
  }, [setHeaderActionOverride]);

  const filteredTickets = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return allTickets.filter((ticket) => {
      const matchesSearch =
        !normalizedSearch ||
        ticket.id.toLowerCase().includes(normalizedSearch) ||
        ticket.title.toLowerCase().includes(normalizedSearch) ||
        ticket.project.name.toLowerCase().includes(normalizedSearch) ||
        ticket.assignee.name.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        selectedStatus === 'all' ||
        ticket.status === (selectedStatus as TicketStatus);

      const matchesPriority =
        selectedPriority === 'all' ||
        ticket.priority === (selectedPriority as TicketPriority);

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [searchValue, selectedPriority, selectedStatus]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-xs relative flex items-center">
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search..."
            className="h-10.5 w-full rounded-lg border border-gray-200 bg-white ps-7 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          <span className="absolute start-2">
            <SearchIcon />
          </span>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="w-full md:w-38">
            <Dropdown
              options={statusFilterOptions}
              value={selectedStatus}
              onChange={setSelectedStatus}
              placeholder="All Status"
            />
          </div>
          <div className="w-full md:w-38">
            <Dropdown
              options={priorityFilterOptions}
              value={selectedPriority}
              onChange={setSelectedPriority}
              placeholder="All Priority"
            />
          </div>
        </div>
      </div>

      <RecentTicketsTable
        tickets={filteredTickets}
        enablePagination
        initialPageSize={12}
        pageSizeOptions={[12, 24, 48]}
      />

      <CreateTicketModal
        isOpen={createTicketOpen}
        onClose={() => setCreateTicketOpen(false)}
        onConfirm={handleCreateTicket}
        projectOptions={projectOptions}
        assigneeOptions={createTicketAssigneeOptions}
        priorityOptions={createTicketPriorityOptions}
      />
    </div>
  );
};

export default Page;
