'use client';

import clsx from 'clsx';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { type ReactNode } from 'react';

export type TicketTabKey = 'upcoming' | 'critical';

export type TicketListItem = {
  id: string;
  title: string;
  date: string;
  owner: string;
  ownerColor: string;
  tag: string;
  tagClassName: string;
  icon: ReactNode;
  iconClassName: string;
};

export type TicketTab = {
  key: TicketTabKey;
  label: string;
  tickets: TicketListItem[];
};

type TicketsTabsProps = {
  tabs: TicketTab[];
};

export default function TicketsTabs({ tabs }: TicketsTabsProps) {
  return (
    <TabGroup className="rounded-xl w-[calc(100dvw-32px)] sm:w-full bg-white space-y-2">
      <TabList className="flex border-b  border-gray-200">
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            className={({ selected }) =>
              clsx(
                'w-1/2 border-b-2 px-3 pb-3 text-sm font-semibold outline-none transition',
                selected
                  ? 'border-primary-dark text-primary-dark'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )
            }
          >
            {tab.label}
          </Tab>
        ))}
      </TabList>

      <TabPanels className="px-4 pt-1 rounded-xl border mt-1.25 border-gray-200">
        {tabs.map((tab) => (
          <TabPanel key={tab.key} className="space-y-1 outline-none">
            {tab.tickets.map((ticket, index) => (
              <article
                key={ticket.id}
                className={clsx(
                  'flex items-start gap-3 py-3',
                  index !== tab.tickets.length - 1 &&
                    'border-b border-gray-100',
                )}
              >
                <span
                  className={clsx(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    ticket.iconClassName,
                  )}
                >
                  {ticket.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium leading-none text-gray-900">
                    {ticket.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-gray-600">{ticket.date}</span>
                    <span
                      className={clsx(
                        'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                        ticket.ownerColor,
                      )}
                    >
                      {ticket.owner}
                    </span>
                    <span
                      className={clsx(
                        'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                        ticket.tagClassName,
                      )}
                    >
                      {ticket.tag}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}
