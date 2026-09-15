'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import AppModal from './AppModal';
import { SearchIcon } from '../../../public/icons';
import EmptyState from '../EmptyState';
import type { RecentTicket } from '../tables/RecentTicketsTable';

type ContactLeadsModalProps = {
  isOpen: boolean;
  contactName: string;
  contactSubtitle?: string;
  leads: RecentTicket[];
  isLoading?: boolean;
  canViewLeadDetail?: boolean;
  onClose: () => void;
};

const statusStyles: Record<string, string> = {
  Open: 'border-red-200 bg-red-50 text-red-500',
  'In Progress': 'border-warning-200 bg-warning-50 text-warning-500',
  Resolved: 'border-green-200 bg-green-50 text-green-600',
  Closed: 'border-sky-200 bg-sky-50 text-sky-600',
};

function withAlpha(color: string, alpha: number) {
  const normalizedColor = color.trim();

  if (/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(normalizedColor)) {
    const hex = normalizedColor.slice(1);
    const expandedHex =
      hex.length === 3
        ? hex
            .split('')
            .map((part) => part + part)
            .join('')
        : hex;
    const red = Number.parseInt(expandedHex.slice(0, 2), 16);
    const green = Number.parseInt(expandedHex.slice(2, 4), 16);
    const blue = Number.parseInt(expandedHex.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return normalizedColor;
}

function getStatusBadgeStyle(color: string) {
  const normalizedColor = color.trim();

  return {
    color: normalizedColor,
    borderColor: withAlpha(normalizedColor, 0.28),
    backgroundColor: withAlpha(normalizedColor, 0.12),
  };
}

function LeadStatusBadge({ lead }: { lead: RecentTicket }) {
  const style = lead.statusColor ? getStatusBadgeStyle(lead.statusColor) : undefined;

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap ${
        lead.statusColor
          ? ''
          : (statusStyles[lead.status] ?? 'border-gray-200 bg-gray-50 text-gray-600')
      }`}
      style={style}
    >
      {lead.status}
    </span>
  );
}

function getContactInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function ContactLeadsModal({
  isOpen,
  contactName,
  contactSubtitle,
  leads,
  isLoading = false,
  canViewLeadDetail = false,
  onClose,
}: ContactLeadsModalProps) {
  const [searchValue, setSearchValue] = useState('');

  const filteredLeads = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return leads;
    }

    return leads.filter(
      (lead) =>
        lead.title.toLowerCase().includes(query) ||
        lead.ticketRefNo?.toLowerCase().includes(query) ||
        lead.project.name.toLowerCase().includes(query),
    );
  }, [leads, searchValue]);

  const hasSearch = Boolean(searchValue.trim());

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={contactName}
      subtitle={contactSubtitle || 'View all leads for this contact.'}
      size="medium"
      showFooter={false}
      bodyPaddingClasses="p-0"
      icon={
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6941C6] text-sm font-semibold text-white">
          {getContactInitials(contactName)}
        </span>
      }
    >
      <div className="flex h-120 flex-col">
        <div className="border-b border-gray-100 px-3 py-3 md:px-4">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <SearchIcon fill="#667085" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search leads..."
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 px-3 py-2 md:px-4" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex animate-pulse items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 rounded bg-gray-200" />
                    <div className="h-3 w-40 rounded bg-gray-100" />
                  </div>
                  <div className="h-5 w-16 rounded-full bg-gray-100" />
                </div>
              ))}
            </div>
          ) : filteredLeads.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => {
                const rowContent = (
                  <>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: lead.statusColor || '#98A2B3' }}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {lead.title}
                      </p>
                      <p className="truncate text-xs text-gray-600">
                        {lead.project.name}
                        {lead.ticketRefNo ? ` • ${lead.ticketRefNo}` : ''}
                      </p>
                    </div>

                    <LeadStatusBadge lead={lead} />
                  </>
                );

                return canViewLeadDetail ? (
                  <Link
                    key={lead.id}
                    href={`/tickets/${lead.id}?projectId=${lead.project.id ?? ''}`}
                    className="flex items-center gap-3 px-3 py-3 transition hover:bg-gray-100 md:px-4"
                  >
                    {rowContent}
                  </Link>
                ) : (
                  <div
                    key={lead.id}
                    className="flex items-center gap-3 px-3 py-3 md:px-4"
                  >
                    {rowContent}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              imageUrl={hasSearch ? '/images/UsersSearchIcon.svg' : '/images/RecentTicketEmpty.svg'}
              imageAlt={hasSearch ? 'No leads found' : 'No leads yet'}
              title={hasSearch ? 'No Leads Found' : 'No Leads Yet'}
              description={
                hasSearch
                  ? 'No leads match your search. Try a different keyword.'
                  : 'This contact has no leads yet.'
              }
            />
          )}
        </div>
      </div>
    </AppModal>
  );
}
