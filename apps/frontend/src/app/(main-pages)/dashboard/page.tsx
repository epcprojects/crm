'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import StatusCard from '../../../components/dashboard/StatusCard';
import {
  AlertIcon,
  APIIcon,
  BetaPhone,
  CheckMarkCircleIcon,
  ClockIcon,
  FileSearchIcon,
  FolderIcon,
  PaintBoardIcon,
  ProfileIcon,
  ReloadIcon,
  SmartPhoneIcon,
} from '../../../../public/icons';
import { projects } from '../projects/page';
import TicketsTabs, {
  type TicketTab,
} from '../../../components/dashboard/TicketsTabs';
import { useDashboardHeaderAction } from '../../../components/dashboard/dashboard-shell';
import CreateTicketModal, {
  type CreateTicketFormValues,
} from '../../../components/modals/CreateTicketModal';
import {
  createTicketAssigneeOptions,
  createTicketPriorityOptions,
  createTicketProjectOptions,
} from '../../../components/modals/create-ticket-modal.data';
import ProjectCard from '../../../components/projects/ProjectCard';
import RecentTicketsTable, {
  type RecentTicket,
} from '../../../components/tables/RecentTicketsTable';
import { appToast } from '../../../components/toast/AppToast';
import { ticketsData } from '../tickets/tickets.data';

const recentTickets: RecentTicket[] = ticketsData.slice(0, 6);

const ticketTabs: TicketTab[] = [
  {
    key: 'upcoming',
    label: 'Upcoming',
    tickets: [
      {
        id: 'design-review',
        title: 'Design Review',
        date: '2026-05-22',
        owner: 'AR',
        ownerColor: 'text-warning-600 bg-warning-50 border-warning-200',
        tag: 'Meeting',
        tagClassName: 'text-sky-600 bg-sky-50 border-sky-200',
        icon: <FileSearchIcon />,
        iconClassName: 'bg-sky-50 text-sky-500 border-sky-200',
      },
      {
        id: 'mobile-app-crash',
        title: 'Mobile app crash on iOS 17',
        date: '2026-05-23',
        owner: 'GM',
        ownerColor: 'text-green-600 bg-green-50 border-green-200',
        tag: 'High ticket',
        tagClassName: 'text-red-500 bg-red-50 border-red-200',
        icon: <SmartPhoneIcon />,
        iconClassName: 'bg-red-50 text-red-400 border-red-200',
      },
      {
        id: 'color-palette',
        title: 'Color palette inconsistency on web',
        date: '2026-05-24',
        owner: 'AR',
        ownerColor: 'text-warning-600 bg-warning-50 border-warning-200',
        tag: 'Medium ticket',
        tagClassName: 'text-orange-500 bg-orange-50 border-orange-200',
        icon: <PaintBoardIcon />,
        iconClassName: 'bg-warning-50 text-warning-500 border-warning-200',
      },
      {
        id: 'beta-release',
        title: 'Beta Release',
        date: '2026-05-25',
        owner: 'SP',
        ownerColor: 'text-sky-600 bg-sky-50 border-sky-200',
        tag: 'Milestone',
        tagClassName: 'text-green-600 bg-green-50 border-green-200',
        icon: <BetaPhone />,
        iconClassName: 'bg-green-50 text-green-500 border-green-200',
      },
      {
        id: 'api-rate-limit',
        title: 'API rate limit too low',
        date: '2026-05-26',
        owner: 'SP',
        ownerColor: 'text-sky-600 bg-sky-50 border-sky-200',
        tag: 'High ticket',
        tagClassName: 'text-red-500 bg-red-50 border-red-200',
        icon: <APIIcon />,
        iconClassName: 'bg-red-50 text-red-400 border-red-200',
      },
      {
        id: 'brand-assets',
        title: 'Brand Assets Due',
        date: '2026-05-28',
        owner: 'AR',
        ownerColor: 'text-warning-600 bg-warning-50 border-warning-200',
        tag: 'Due Date',
        tagClassName: 'text-red-500 bg-red-50 border-red-200',
        icon: <ReloadIcon />,
        iconClassName: 'bg-red-50 text-red-400 border-red-200',
      },
    ],
  },
  {
    key: 'critical',
    label: 'Critical',
    tickets: [
      {
        id: 'login-outage',
        title: 'Login outage impacting all users',
        date: '2026-05-29',
        owner: 'JA',
        ownerColor: 'text-violet-600 bg-violet-50 border-violet-200',
        tag: 'P1 ticket',
        tagClassName: 'text-red-500 bg-red-50 border-red-200',
        icon: <APIIcon />,
        iconClassName: 'bg-red-50 text-red-500 border-red-200',
      },
      {
        id: 'payment-failure',
        title: 'Payment webhook retries failing',
        date: '2026-05-30',
        owner: 'BO',
        ownerColor: 'text-sky-600 bg-sky-50 border-sky-200',
        tag: 'Escalated',
        tagClassName: 'text-orange-500 bg-orange-50 border-orange-200',
        icon: <APIIcon />,
        iconClassName: 'bg-orange-50 text-orange-500 border-orange-200',
      },
      {
        id: 'data-sync',
        title: 'Sensor sync delay above SLA',
        date: '2026-06-01',
        owner: 'GC',
        ownerColor: 'text-green-600 bg-green-50 border-green-200',
        tag: 'Ops blocker',
        tagClassName: 'text-red-500 bg-red-50 border-red-200',
        icon: <APIIcon />,
        iconClassName: 'bg-violet-50 text-violet-500 border-violet-200',
      },
    ],
  },
];

export default function Page() {
  const router = useRouter();
  const { setHeaderActionOverride } = useDashboardHeaderAction();
  const [createTicketOpen, setCreateTicketOpen] = useState(false);

  const projectOptions = useMemo(
    () => createTicketProjectOptions(projects),
    [],
  );

  const handleViewAllTickets = () => {
    router.push('/tickets');
  };

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3 md:gap-5">
        <StatusCard
          icon={<FolderIcon fill="currentColor" />}
          title="Open"
          count={608}
        />
        <StatusCard
          icon={<ClockIcon fill="currentColor" />}
          title="In Progress"
          count={83}
        />
        <StatusCard
          icon={<CheckMarkCircleIcon fill="currentColor" />}
          title="Resolved"
          count={106}
        />
        <StatusCard
          icon={<AlertIcon fill="currentColor" />}
          title="Critical"
          count={28}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 md:gap-2.5">
          <ProfileIcon />
          <h2 className="text-base md:text-xl font-semibold text-black">
            Projects
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              initials={project.initials}
              name={project.name}
              category={project.category}
              totalCount={project.totalCount}
              openCount={project.openCount}
              criticalCount={project.criticalCount}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-14 gap-4 md:gap-6">
        <div className="col-span-10 space-y-4">
          <div className="flex items-center gap-2 md:gap-2.5">
            <ClockIcon opacity={0} />
            <h2 className="text-base md:text-xl font-semibold text-black">
              Recent Tickets
            </h2>
          </div>
          <RecentTicketsTable
            tickets={recentTickets}
            onViewAll={handleViewAllTickets}
            onRowClick={(ticket) => router.push(`/tickets/${ticket.id}`)}
          />
        </div>
        <div className="col-span-4">
          <TicketsTabs tabs={ticketTabs} />
        </div>
      </div>

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
