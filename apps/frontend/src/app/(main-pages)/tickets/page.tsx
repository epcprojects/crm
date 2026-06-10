'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  type TicketPriority,
  type TicketStatus,
} from '../../../components/tables/RecentTicketsTable';
import { appToast } from '../../../components/toast/AppToast';
import Dropdown from '../../../components/ui/ThemeDropDown';
import { SearchIcon } from '../../../../public/icons';
import { baseProjects } from '../projects/projects.data';
import { ticketsData } from './tickets.data';

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

export default function Page() {
  const router = useRouter();
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  const projectOptions = useMemo(
    () => createTicketProjectOptions(baseProjects),
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

    return ticketsData.filter((ticket) => {
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
        <div className="relative flex w-full items-center md:max-w-xs">
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
        onRowClick={(ticket) => router.push(`/tickets/${ticket.id}`)}
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
}
