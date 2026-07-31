'use client';

import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import EmptyState from '../EmptyState';

export type TicketTabKey = 'upcoming' | 'critical';

const ticketIconTextColors = [
  'text-red-600',
  'text-orange-600',
  'text-amber-600',
  'text-yellow-600',
  'text-lime-600',
  'text-green-600',
  'text-emerald-600',
  'text-teal-600',
  'text-cyan-600',
  'text-sky-600',
  'text-blue-600',
  'text-indigo-600',
  'text-violet-600',
  'text-purple-600',
  'text-fuchsia-600',
  'text-pink-600',
  'text-rose-600',
] as const;

function getTicketIconTextColor(ticketId: string) {
  let hash = 0;

  for (let index = 0; index < ticketId.length; index += 1) {
    hash = (hash * 31 + ticketId.charCodeAt(index)) | 0;
  }

  return ticketIconTextColors[Math.abs(hash) % ticketIconTextColors.length];
}

export type TicketListItem = {
  id: string;
  projectId?: string;
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
  activeTabKey?: TicketTabKey;
  onActiveTabChange?: (tabKey: TicketTabKey) => void;
  onTicketClick?: (ticket: TicketListItem) => void;
};

export default function TicketsTabs({
  tabs,
  activeTabKey: controlledActiveTabKey,
  onActiveTabChange,
  onTicketClick,
}: TicketsTabsProps) {
  const [uncontrolledActiveTabKey, setUncontrolledActiveTabKey] =
    useState<TicketTabKey>(tabs[0]?.key ?? 'upcoming');
  const activeTabKey = controlledActiveTabKey ?? uncontrolledActiveTabKey;
  const activeTab = useMemo(
    () => tabs.find((tab) => tab.key === activeTabKey) ?? tabs[0],
    [activeTabKey, tabs],
  );

  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = tabs.findIndex((tab) => tab.key === activeTabKey);

  const [indicatorStyle, setIndicatorStyle] = useState({
    width: 0,
    transform: 'translateX(0px)',
    opacity: 0,
  });

  useEffect(() => {
    const activeButton = buttonRefs.current[activeIndex];

    if (!activeButton) return;

    setIndicatorStyle({
      width: activeButton.offsetWidth,
      transform: `translateX(${activeButton.offsetLeft}px)`,
      opacity: 1,
    });
  }, [activeIndex]);
  return (
    <div className="rounded-[10px] xl:rounded-xl shadow-[0_0_35px_0_rgb(0_0_0/0.04)] min-w-78 max-w-none xl:min-w-81 xl:max-w-81  2xl:min-w-82.5 w-full 2xl:max-w-82.5  h-full bg-white space-y-2 py-4  flex flex-col gap-3 ">
      <div className="px-4.5">
        <div className="relative grid w-full grid-cols-2 gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
          <div
            className="absolute top-1 bottom-1 left-0 rounded-full bg-white shadow-[0_0_25px_0_rgb(27_28_29/0.12)] transition-all duration-300 ease-out"
            style={{
              width: indicatorStyle.width,
              transform: indicatorStyle.transform,
              opacity: indicatorStyle.opacity,
            }}
          />

          {tabs.map((tab, index) => {
            const isActive = tab.key === activeTabKey;

            return (
              <button
                key={tab.key}
                ref={(el) => {
                  buttonRefs.current[index] = el;
                }}
                type="button"
                onClick={() => {
                  if (!controlledActiveTabKey) {
                    setUncontrolledActiveTabKey(tab.key);
                  }

                  onActiveTabChange?.(tab.key);
                }}
                className={clsx(
                  'relative z-10 rounded-full px-3 py-1.25 text-sm font-medium transition-colors duration-300',
                  isActive
                    ? 'text-black-olive'
                    : 'text-liver hover:text-black-olive',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col  overflow-y-auto scrollbar-hide  ">
        {activeTab?.tickets.length ? (
          activeTab.tickets.map((ticket, index) => {
            const isLast = index === activeTab.tickets.length - 1;

            return (
              <div key={ticket.id}>
                <article
                  role={onTicketClick ? 'button' : undefined}
                  tabIndex={onTicketClick ? 0 : undefined}
                  onClick={
                    onTicketClick ? () => onTicketClick(ticket) : undefined
                  }
                  onKeyDown={
                    onTicketClick
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onTicketClick(ticket);
                          }
                        }
                      : undefined
                  }
                  className={clsx(
                    'flex flex-row items-start gap-3  outline-none transition py-4 px-4.5',
                    !isLast && 'border-b border-gray-200',
                    onTicketClick &&
                      'cursor-pointer hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary/30',
                  )}
                >
                  <div
                    className={clsx(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-sm font-semibold shadow-[0_0_35px_0_rgb(0_0_0/0.12)]',
                      // ticket.iconClassName,
                      getTicketIconTextColor(ticket.id),
                    )}
                  >
                    {ticket.icon}
                  </div>

                  <div className="min-w-0 flex flex-col gap-1">
                    <p className="truncate text-gray-900  font-medium text-sm">
                      {ticket.title}
                    </p>

                    <div className="flex flex-row gap-3 items-end">
                      <p className="shrink-0 text-gray-600 text-xs">
                        {ticket.date}
                      </p>

                      <div className="flex flex-row overflow-hidden w-full gap-1.5">
                        <span
                          className="rounded-full border px-2 truncate py-0.5 text-[10px] font-medium"
                          style={
                            ticket.ownerColor
                              ? {
                                  borderColor: `${ticket.ownerColor}25`,
                                  backgroundColor: `${ticket.ownerColor}20`, // if 8-digit hex is supported
                                  color: ticket.ownerColor,
                                }
                              : undefined
                          }
                        >
                          {ticket.owner}
                        </span>

                        <span
                          className={clsx(
                            'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap',
                            ticket.tagClassName,
                          )}
                        >
                          {ticket.tag}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            );
          })
        ) : (
          <EmptyState
            imageUrl="/images/EmptyCalendar.svg"
            imageAlt="Empty calendar"
            title={`No ${activeTab?.label ?? 'Ticket'} Items`}
            description="There’s nothing scheduled for the upcoming days."
          />
        )}
      </div>
    </div>
  );
}
