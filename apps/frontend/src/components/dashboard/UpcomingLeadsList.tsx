/* eslint-disable @nx/enforce-module-boundaries */
'use client';

import clsx from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';
import EmptyState from '../EmptyState';

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
  icon: ReactNode;
  ticketType?: string;
  iconClassName: string;
};

type UpcomingLeadsListProps = {
  tickets: TicketListItem[];
  onTicketClick?: (ticket: TicketListItem) => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
};

export default function UpcomingLeadsList({
  tickets,
  onTicketClick,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: UpcomingLeadsListProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;

    if (!loadMoreElement || !hasNextPage || !onLoadMore || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { rootMargin: '240px' },
    );

    observer.observe(loadMoreElement);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  return (
    <div className="flex flex-col">
      {tickets.length ? (
        <>
          {tickets.map((ticket, index) => {
            const isLast = index === tickets.length - 1;

            return (
              <article
                key={ticket.id}
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
                  'flex flex-row items-start gap-3 outline-none transition py-4 px-4.5',
                  !isLast && 'border-b border-gray-200',
                  onTicketClick &&
                    'cursor-pointer hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary/30',
                )}
              >
                <div
                  className={clsx(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-sm font-semibold shadow-[0_0_35px_0_rgb(0_0_0/0.12)]',
                    getTicketIconTextColor(ticket.id),
                  )}
                >
                  {ticket.icon}
                </div>

                <div className="min-w-0 flex flex-col gap-1">
                  <p className="truncate flex items-center gap-1 text-gray-900 font-medium text-sm">
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
                                backgroundColor: `${ticket.ownerColor}20`,
                                color: ticket.ownerColor,
                              }
                            : undefined
                        }
                      >
                        {ticket.owner}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
          {(hasNextPage || isFetchingNextPage) && (
            <div
              ref={loadMoreRef}
              className="px-4.5 py-4 text-center text-xs text-gray-500"
            >
              {isFetchingNextPage ? 'Loading more leads...' : 'Scroll to load more'}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          imageUrl="/images/EmptyCalendar.svg"
          imageAlt="Empty calendar"
          title="No Upcoming Items"
          description="There’s nothing scheduled for the upcoming days."
        />
      )}
    </div>
  );
}
