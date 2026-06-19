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
            {tab.tickets.length ? (
              tab.tickets.map((ticket, index) => (
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
              ))
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center gap-2 py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400">
                  <EmptyTicketIcon />
                </div>
                <p className="text-base font-medium text-gray-900">
                  No items yet.
                </p>
              </div>
            )}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}

function EmptyTicketIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.33333 8.25H14.6667M7.33333 11.9167H11M7.7 18.3333H14.3C15.8401 18.3333 16.6102 18.3333 17.1985 18.0336C17.716 17.7699 18.1366 17.3493 18.4003 16.8318C18.7 16.2435 18.7 15.4735 18.7 13.9333V8.06667C18.7 6.52652 18.7 5.75645 18.4003 5.16819C18.1366 4.6507 17.716 4.23007 17.1985 3.96639C16.6102 3.66667 15.8401 3.66667 14.3 3.66667H7.7C6.15986 3.66667 5.38978 3.66667 4.80153 3.96639C4.28404 4.23007 3.8634 4.6507 3.59973 5.16819C3.3 5.75645 3.3 6.52652 3.3 8.06667V13.9333C3.3 15.4735 3.3 16.2435 3.59973 16.8318C3.8634 17.3493 4.28404 17.7699 4.80153 18.0336C5.38978 18.3333 6.15986 18.3333 7.7 18.3333Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
