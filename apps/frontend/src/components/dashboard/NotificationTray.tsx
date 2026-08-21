'use client';

import * as Accordion from '@radix-ui/react-accordion';
import { Tab, TabGroup, TabList } from '@headlessui/react';
import Link from 'next/link';
import {
  ChatIcon,
  CloseIcon,
  CrossIcon,
  ProjectsIcon,
  SearchIcon,
  ThreadIcon,
  TicketIcon2,
} from '../../../public/icons';
import EmptyState from '../EmptyState';
import { NotificationItem } from '@harperhelp/interfaces';
import { getNotificationNavigationPath } from '../../lib/notification-navigation';

export type NotificationGroupCategory =
  | 'projects'
  | 'threads'
  | 'tickets'
  | 'ticket_replies'
  | 'internal_messages'
  | 'mentions'
  | 'members'
  | 'events';

export type NotificationGroup = {
  category: NotificationGroupCategory;
  label: string;
  count: number;
  items: NotificationItem[];
  nextCursor: string | null;
  hasMore: boolean;
  isLoadingMore?: boolean;
};

type NotificationTrayProps = {
  activeFilter: 'all' | 'unread';
  groupedItems: NotificationGroup[];
  isLoading: boolean;
  onChangeFilter: (filter: 'all' | 'unread') => void;
  onChangeSearch: (value: string) => void;
  onClose: () => void;
  onLoadMoreGroup: (
    category: NotificationGroupCategory,
    cursor: string | null,
  ) => void;
  onMarkAllAsRead: () => void;
  onViewAll: () => void;
  searchItems: NotificationItem[];
  searchValue: string;
  totalCount: number;
  unreadCount: number;
  onViewSingle: (value: string) => void;
};

export default function NotificationTray({
  activeFilter,
  groupedItems,
  isLoading,
  onChangeFilter,
  onChangeSearch,
  onClose,
  onLoadMoreGroup,
  onMarkAllAsRead,
  onViewAll,
  searchItems,
  searchValue,
  totalCount,
  unreadCount,
  onViewSingle,
}: NotificationTrayProps) {
  const selectedIndex = activeFilter === 'unread' ? 1 : 0;
  const hasSearch = searchValue.trim().length > 0;
  const hasGroupedNotifications = groupedItems.some(
    (group) => group.count > 0 || group.items.length > 0,
  );

  return (
    <section className="pointer-events-auto flex h-full w-full sm:w-95 flex-col overflow-hidden border border-white/70 bg-white shadow-xl">
      <div className="">
        <div className="flex items-center justify-between gap-3 p-2.5 sm:p-4">
          <div className="min-w-0 flex items-center gap-1.5">
            <h2 className="text-base md:text-xl  font-medium leading-none text-black">
              Notifications
            </h2>
            <span className="text-xs md:text-sm rounded-full border border-gray-200 font-medium px-2 py-0.5">
              {unreadCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="text-xs md:text-sm font-medium hover:underline underline-offset-2 text-primary transition "
            >
              Mark all as read
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
              aria-label="Close notifications"
            >
              <CrossIcon />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2  px-2.5 sm:px-4">
          <div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
            <span className="shrink-0">
              <SearchIcon fill="#98A2B3" />
            </span>

            <input
              type="text"
              value={searchValue}
              onChange={(event) => onChangeSearch(event.target.value)}
              placeholder="Search projects, messages, or tickets"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />

            <button
              type="button"
              onClick={() => onChangeSearch('')}
              disabled={!searchValue}
              tabIndex={searchValue ? 0 : -1}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                searchValue
                  ? 'visible hover:bg-gray-100'
                  : 'pointer-events-none invisible'
              }`}
              aria-label="Clear notification search"
            >
              <CloseIcon width="15" height="15" />
            </button>
          </div>
        </div>

        <TabGroup
          selectedIndex={selectedIndex}
          onChange={(index) => onChangeFilter(index === 1 ? 'unread' : 'all')}
        >
          <TabList className="mt-4 flex items-end gap-7 border-b px-2 sm:px-4 w-full border-gray-200">
            <NotificationTab
              count={totalCount}
              isActive={selectedIndex === 0}
              label="All"
            />
            <NotificationTab
              count={unreadCount}
              isActive={selectedIndex === 1}
              label="Unread"
            />
          </TabList>
        </TabGroup>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <NotificationTraySkeleton />
        ) : hasSearch ? (
          searchItems.length ? (
            <div className="tiny-scrollbar h-full overflow-y-auto">
              {searchItems.map((item) => (
                <NotificationRow
                  onViewSingle={() => onViewSingle(item.id)}
                  key={item.id}
                  item={item}
                  onClose={onClose}
                />
              ))}
            </div>
          ) : (
            <EmptyNotificationsState />
          )
        ) : hasGroupedNotifications ? (
          <Accordion.Root
            type="single"
            collapsible
            defaultValue={
              groupedItems.filter((group) => group.items.length > 0).at(0)
                ?.category
            }
            className="flex h-full min-h-0 flex-col divide-y divide-gray-200 overflow-hidden"
          >
            {groupedItems.map((group) => (
              <NotificationGroupSection
                key={group.category}
                group={group}
                onClose={onClose}
                onLoadMoreGroup={onLoadMoreGroup}
                onViewSingle={onViewSingle}
              />
            ))}
          </Accordion.Root>
        ) : (
          <EmptyNotificationsState />
        )}
      </div>

      <div className="border-t border-gray-200 p-4">
        <button
          type="button"
          onClick={onViewAll}
          className="w-full rounded-full bg-linear-to-r from-primary-light to-primary-dark px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_rgba(49,101,246,0.85)] transition hover:brightness-105"
        >
          View All Notifications
        </button>
      </div>
    </section>
  );
}

function EmptyNotificationsState() {
  return (
    <div className="flex h-full items-center justify-center px-6 py-10 text-center text-sm text-gray-500">
      <EmptyState
        title="No notifications found"
        description="You're all caught up!"
        imageAlt=""
        imageUrl="/images/NotificationEmptyState.svg"
      />
    </div>
  );
}

function NotificationTraySkeleton() {
  return (
    <div className="space-y-3 px-4 py-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`notification-group-skeleton-${index}`}
          className="rounded-xl border border-gray-100 bg-gray-50/70 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
              <span className="h-4 w-28 animate-pulse rounded-full bg-gray-200" />
            </div>
            <span className="h-4 w-4 animate-pulse rounded-full bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationBellIcon({
  width = '26',
  height = '26',
  isActive,
}: {
  isActive: boolean;
  width?: string;
  height?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.4"
        d="M2.74075 16.0004C2.51037 17.5106 3.54033 18.5589 4.80139 19.0813C9.63604 21.0841 16.364 21.0841 21.1986 19.0813C22.4597 18.5589 23.4896 17.5106 23.2592 16.0004C23.1177 15.0723 22.4176 14.2995 21.8989 13.5448C21.2196 12.5442 21.152 11.4528 21.1519 10.2917C21.1519 5.80437 17.5022 2.16669 13 2.16669C8.4978 2.16669 4.84805 5.80437 4.84805 10.2917C4.84795 11.4528 4.78045 12.5442 4.10107 13.5448C3.58241 14.2995 2.88233 15.0723 2.74075 16.0004Z"
        fill={isActive ? '#FFFFFF' : '#374151'}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.0009 1.35419C8.05251 1.35419 4.03646 5.35307 4.03643 10.2916C4.03632 11.4403 3.95927 12.3073 3.43102 13.0866C3.35756 13.1933 3.2601 13.3271 3.15361 13.4732C2.96865 13.7271 2.75644 14.0183 2.59547 14.2705C2.31138 14.7156 2.03383 15.2524 1.93841 15.8779C1.62711 17.9186 3.06215 19.2399 4.49131 19.8319C5.55526 20.2726 6.7049 20.6202 7.90399 20.8747C8.52591 23.0635 10.5838 24.6458 12.9998 24.6458C15.4157 24.6458 17.4735 23.0637 18.0955 20.8751C19.2954 20.6207 20.4458 20.2729 21.5104 19.8319C22.9396 19.2399 24.3746 17.9186 24.0633 15.8779C23.9679 15.2524 23.6904 14.7156 23.4063 14.2705C23.2453 14.0183 23.0331 13.7271 22.8481 13.4732C22.7417 13.3272 22.6442 13.1934 22.5708 13.0867C22.0425 12.3074 21.9654 11.4405 21.9653 10.2917C21.9653 5.35311 17.9493 1.35419 13.0009 1.35419ZM5.66143 10.2917C5.66143 6.25564 8.94487 2.97919 13.0009 2.97919C17.0569 2.97919 20.3403 6.25571 20.3403 10.2918C20.3404 11.4644 20.3983 12.7797 21.2276 14.0012L21.2302 14.005C21.3665 14.2034 21.4862 14.3661 21.5991 14.5194C21.7493 14.7235 21.8874 14.9112 22.0365 15.1447C22.2675 15.5067 22.4108 15.8203 22.4569 16.123C22.6064 17.1027 21.9815 17.8778 20.8885 18.3306C16.253 20.2509 9.74877 20.2509 5.11322 18.3306C4.02026 17.8778 3.39538 17.1027 3.54483 16.123C3.59099 15.8203 3.73427 15.5067 3.96528 15.1447C4.1143 14.9112 4.25238 14.7236 4.40266 14.5194C4.51532 14.3663 4.63543 14.2031 4.77156 14.0051L4.77415 14.0012C5.60349 12.7797 5.66132 11.4643 5.66143 10.2917ZM16.2107 21.1937C14.0998 21.4633 11.8996 21.4633 9.78879 21.1934C10.4079 22.2753 11.6061 23.0208 12.9998 23.0208C14.3934 23.0208 15.5915 22.2755 16.2107 21.1937Z"
        fill={isActive ? '#FFFFFF' : '#374151'}
      />
    </svg>
  );
}

function NotificationTab({
  count,
  isActive,
  label,
}: {
  count: number;
  isActive: boolean;
  label: string;
}) {
  return (
    <Tab
      className={`relative w-full justify-center -mb-px flex items-center gap-2 border-b-2 px-1 pb-2 text-sm md:text-base font-semibold transition ${
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-gray-900 hover:text-primary'
      } focus:outline-none`}
    >
      <span>{label}</span>
      {count && (
        <span className="rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-xs md:ext-sm leading-none text-gray-500">
          {count}
        </span>
      )}
    </Tab>
  );
}

function NotificationGroupSection({
  group,
  onClose,
  onLoadMoreGroup,
  onViewSingle,
}: {
  group: NotificationGroup;
  onClose: () => void;
  onLoadMoreGroup: (
    category: NotificationGroupCategory,
    cursor: string | null,
  ) => void;
  onViewSingle: (value: string) => void;
}) {
  return (
    <Accordion.Item
      value={group.category}
      className="flex shrink-0 flex-col bg-white data-[state=open]:min-h-[20rem] data-[state=open]:flex-1"
    >
      <Accordion.Header>
        <Accordion.Trigger className="group flex w-full items-center justify-between gap-3 border-b border-transparent px-4 py-3 text-left transition hover:bg-gray-50 data-[state=open]:border-gray-200 data-[state=open]:bg-gray-100">
          <div className="flex min-w-0 items-center gap-3">
            <NotificationGroupIcon category={group.category} />
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base font-medium text-gray-900">
                {group.label}
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-500">
                {group.count}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {group.count > 0 ? (
              <span className="h-1.75 w-1.75 rounded-full bg-[#3165F6]" />
            ) : null}
            <ChevronAccordionIcon />
          </div>
        </Accordion.Trigger>
      </Accordion.Header>

      <Accordion.Content className="min-h-0 overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:flex-1 data-[state=open]:animate-accordion-down">
        {group.items.length ? (
          <div
            className="tiny-scrollbar h-full min-h-[20rem] overflow-y-auto border-t border-gray-100"
            onScroll={(event) => {
              const element = event.currentTarget;
              const nearBottom =
                element.scrollTop + element.clientHeight >=
                element.scrollHeight - 48;

              if (nearBottom && group.hasMore && !group.isLoadingMore) {
                onLoadMoreGroup(group.category, group.nextCursor);
              }
            }}
          >
            {group.items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onClose={onClose}
                onViewSingle={() => onViewSingle(item.id)}
              />
            ))}
            {group.isLoadingMore ? (
              <div className="px-4 py-3 text-center text-xs font-medium text-gray-400">
                Loading more...
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-[20rem] border-t border-gray-100 px-4 py-5 text-sm text-gray-400">
            <EmptyState
              title={`No ${group.label} found`}
              imageAlt=""
              imageUrl="/images/NotificationEmptyState.svg"
            />
          </div>
        )}
      </Accordion.Content>
    </Accordion.Item>
  );
}

function NotificationRow({
  item,
  onViewSingle,
  onClose,
}: {
  item: NotificationItem;
  onViewSingle?: () => void;
  onClose: () => void;
}) {
  const href = getNotificationNavigationPath(item);
  const timestamp = formatNotificationTime(item.createdAt);

  const handlePlainClick = (
    event: React.MouseEvent<HTMLAnchorElement | HTMLElement>,
  ) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    onViewSingle?.();
    onClose();
  };

  if (href) {
    return (
      <Link
        href={href}
        onClick={(e) => {
          handlePlainClick(e);
          onViewSingle?.();
        }}
        className={`flex gap-4 border-b ${!item.isRead && 'bg-blue-50'} border-gray-200 px-3 sm:px-6 py-4.5 pb-2 transition hover:bg-gray-100 cursor-pointer`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm  text-gray-600">
            <span className="font-semibold text-gray-900">{item.title}</span>
          </p>
          {item.message ? (
            <p className="mt-1 line-clamp-2 text-sm  text-gray-500">
              {item.message}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-gray-500">{timestamp}</p>
        </div>

        <div className="flex shrink-0 items-start pt-0.5">
          {!item.isRead ? <MailUnreadIcon /> : <MailReadIcon />}
        </div>
      </Link>
    );
  }

  return (
    <article
      onClick={() => {
        onViewSingle?.();
        onClose();
      }}
      className={`flex gap-4 border-b ${!item.isRead && 'bg-blue-50'} border-gray-200 px-3 sm:px-6 py-4.5 pb-2 transition hover:bg-gray-100 cursor-pointer`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm  text-gray-600">
          <span className="font-semibold text-gray-900">{item.title}</span>
        </p>
        {item.message ? (
          <p className="mt-1 line-clamp-2 text-sm  text-gray-500">
            {item.message}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-gray-500">{timestamp}</p>
      </div>

      <div className="flex shrink-0 items-start pt-0.5">
        {!item.isRead ? <MailUnreadIcon /> : <MailReadIcon />}
      </div>
    </article>
  );
}

function NotificationGroupIcon({
  category,
}: {
  category: NotificationGroupCategory;
}) {
  const tones: Record<
    NotificationGroupCategory,
    { bg: string; stroke: string; icon: React.ReactNode }
  > = {
    projects: {
      bg: 'bg-[#DDFCEA]',
      stroke: '#6DDC9A',
      icon: <ProjectsIcon opacity="0" fill="#079455" width="18" height="18" />,
    },
    threads: {
      bg: 'bg-[#DDEEFF]',
      stroke: '#8BC3FF',
      icon: <ThreadIcon fill="#1570EF" />,
    },
    tickets: {
      bg: 'bg-[#FFE6E4]',
      stroke: '#FFAEA8',
      icon: <TicketIcon2 fill="#D92D20" />,
    },
    ticket_replies: {
      bg: 'bg-[#FFF0CC]',
      stroke: '#F7D37A',
      icon: <TicketRepliesGroupGlyph />,
    },
    internal_messages: {
      bg: 'bg-[#FEE4E2]',
      stroke: '#FDA29B',
      icon: <ChatIcon fill="#D92D20" />,
    },
    mentions: {
      bg: 'bg-[#EEF4FF]',
      stroke: '#B2CCFF',
      icon: (
        <span className="text-base font-bold leading-none text-blue-500">
          @
        </span>
      ),
    },
    members: {
      bg: 'bg-[#ECFDF3]',
      stroke: '#ABEFC6',
      icon: <MembersGroupGlyph />,
    },
    events: {
      bg: 'bg-[#ECEBFF]',
      stroke: '#C7C2FF',
      icon: <EventsGroupGlyph />,
    },
  };

  const tone = tones[category];

  return (
    <span
      className={`flex h-9 w-9 shadow items-center justify-center rounded-full ${tone.bg}`}
    >
      {tone.icon}
    </span>
  );
}

function ChevronAccordionIcon() {
  return (
    <svg
      className="transition-transform duration-200 group-data-[state=open]:rotate-180"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.4969 12.8706C14.3953 12.7361 14.0921 12.3347 13.9115 12.1032C13.5497 11.6397 13.0555 11.0238 12.5223 10.4097C11.9864 9.79256 11.4235 9.19148 10.9234 8.74961C10.6727 8.52805 10.4524 8.35969 10.2706 8.25011C10.0996 8.14704 9.99866 8.12561 9.99866 8.12561C9.99866 8.12561 9.90064 8.14705 9.72969 8.2501C9.54792 8.35968 9.32763 8.52804 9.07687 8.74961C8.57678 9.19148 8.01386 9.79256 7.47799 10.4098C6.94482 11.0238 6.45056 11.6398 6.08883 12.1033C5.90822 12.3347 5.60539 12.7356 5.50382 12.8701C5.29912 13.148 4.90745 13.2079 4.62952 13.0032C4.35158 12.7986 4.29221 12.4073 4.4969 12.1294L4.49847 12.1273C4.60497 11.9863 4.9191 11.5704 5.10339 11.3342C5.47329 10.8602 5.98198 10.2262 6.53411 9.59024C7.08354 8.95743 7.68827 8.30851 8.2492 7.81288C8.52895 7.5657 8.81253 7.34344 9.08433 7.17958C9.33898 7.02607 9.66139 6.875 10.0002 6.875C10.3389 6.875 10.6613 7.02607 10.916 7.17959C11.1878 7.34344 11.4713 7.5657 11.7511 7.81288C12.312 8.30851 12.9167 8.95742 13.4662 9.59023C14.0183 10.2261 14.527 10.8602 14.8969 11.3342C15.0813 11.5705 15.3955 11.9865 15.5018 12.1272L15.5031 12.1289C15.7078 12.4069 15.6487 12.7985 15.3708 13.0032C15.0929 13.2079 14.7016 13.1485 14.4969 12.8706Z"
        fill="#374151"
      />
    </svg>
  );
}

function TicketRepliesGroupGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.86323 14.4368C6.25048 14.4368 5.79451 13.9523 5.24476 13.3688C5.08126 13.1948 4.89526 12.9976 4.68226 12.7838L3.20775 11.3048C2.22675 10.3201 1.6875 9.77858 1.6875 8.99183C1.6875 8.20508 2.22675 7.66432 3.20625 6.68107L3.20775 6.67957L4.68226 5.20059C4.84426 5.03784 4.99126 4.88632 5.12626 4.74832C5.92126 3.93082 6.49578 3.3406 7.32078 3.6316C8.22228 3.94885 8.24322 5.13306 8.20422 5.97831C8.27847 5.97681 8.35201 5.97535 8.42476 5.97385C9.29851 5.9551 10.203 5.93559 11.091 6.10209C12.9412 6.45009 14.3272 7.36957 15.2107 8.83582C15.942 10.0486 16.3125 11.6168 16.3125 13.4963C16.3125 13.7063 16.1955 13.8991 16.008 13.9958C15.8213 14.0926 15.5963 14.0768 15.4245 13.9553L15.1912 13.7896C14.2492 13.1191 13.3598 12.4853 12.315 12.2003C11.2283 11.9026 9.99526 11.9401 8.80276 11.9761C8.60476 11.9821 8.40376 11.9881 8.20276 11.9926C8.24251 12.8386 8.22597 14.0348 7.31997 14.3536C7.15722 14.4113 7.00573 14.4376 6.86323 14.4376V14.4368ZM4.00426 7.47385L4.00276 7.47535C3.26026 8.22085 2.81177 8.67083 2.81177 8.99183C2.81177 9.31283 3.25949 9.76358 4.00199 10.5091L5.478 11.9896C5.703 12.2153 5.89424 12.4186 6.06299 12.5978C6.65549 13.2271 6.79874 13.3411 6.94124 13.2938C7.01624 13.2278 7.12948 12.9466 7.06648 11.8178C7.05823 11.6708 7.05147 11.5433 7.05147 11.4368C7.05147 11.1263 7.30346 10.8743 7.61397 10.8743C7.98972 10.8743 8.36849 10.8631 8.76899 10.8511C10.044 10.8128 11.3625 10.7731 12.6113 11.1151C13.5548 11.3723 14.3685 11.8538 15.1365 12.3773C14.859 9.42384 13.4317 7.68682 10.8825 7.20757C10.1092 7.06207 9.26472 7.08083 8.44797 7.09808C8.17422 7.10408 7.89147 7.11009 7.61397 7.11009C7.30346 7.11009 7.05147 6.85809 7.05147 6.54759C7.05147 6.44184 7.05823 6.31433 7.06648 6.16658C7.12873 5.03858 7.01624 4.75732 6.94124 4.69057C6.79199 4.64782 6.39224 5.05809 5.93174 5.53209C5.79374 5.67384 5.64375 5.82833 5.478 5.99483L4.00349 7.47385H4.00426Z"
        fill="#DC6803"
      />
    </svg>
  );
}

function InternalMessagesGroupGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 4.5H13.5C14.3284 4.5 15 5.17157 15 6V12C15 12.8284 14.3284 13.5 13.5 13.5H7.06066C6.66283 13.5 6.28131 13.658 6 13.9393L4.5 15.4393V4.5ZM6.75 7.5C6.33579 7.5 6 7.83579 6 8.25C6 8.66421 6.33579 9 6.75 9H11.25C11.6642 9 12 8.66421 12 8.25C12 7.83579 11.6642 7.5 11.25 7.5H6.75ZM6.75 10.5C6.33579 10.5 6 10.8358 6 11.25C6 11.6642 6.33579 12 6.75 12H9.75C10.1642 12 10.5 11.6642 10.5 11.25C10.5 10.8358 10.1642 10.5 9.75 10.5H6.75Z"
        fill="#D92D20"
      />
    </svg>
  );
}

function MentionsGroupGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.875 5.625C11.875 6.79961 10.9246 7.75 9.75 7.75C8.57539 7.75 7.625 6.79961 7.625 5.625C7.625 4.45039 8.57539 3.5 9.75 3.5C10.9246 3.5 11.875 4.45039 11.875 5.625Z"
        fill="#3165F6"
      />
      <path
        d="M3.375 9C3.375 5.8934 5.8934 3.375 9 3.375C12.1066 3.375 14.625 5.8934 14.625 9V9.65625C14.625 10.0522 14.3034 10.375 13.9062 10.375C13.5091 10.375 13.1875 10.0522 13.1875 9.65625V9C13.1875 6.68782 11.3122 4.8125 9 4.8125C6.68782 4.8125 4.8125 6.68782 4.8125 9C4.8125 11.3122 6.68782 13.1875 9 13.1875C9.92608 13.1875 10.7822 12.8866 11.4752 12.3779C11.7947 12.1432 12.2441 12.2118 12.4788 12.5312C12.7134 12.8507 12.6449 13.3001 12.3254 13.5348C11.3944 14.2183 10.2411 14.625 9 14.625C5.8934 14.625 3.375 12.1066 3.375 9Z"
        fill="#3165F6"
      />
      <path
        d="M12.4062 9.65625C12.4062 8.66599 13.2097 7.8625 14.2 7.8625C15.1903 7.8625 15.9937 8.66599 15.9937 9.65625V12.0938C15.9937 12.4903 15.6722 12.8125 15.275 12.8125C14.8778 12.8125 14.5562 12.4903 14.5562 12.0938V9.65625C14.5562 9.45967 14.3966 9.3 14.2 9.3C14.0034 9.3 13.8437 9.45967 13.8437 9.65625V10.125C13.8437 10.5215 13.5222 10.8438 13.125 10.8438C12.7278 10.8438 12.4062 10.5215 12.4062 10.125V9.65625Z"
        fill="#3165F6"
      />
    </svg>
  );
}

function MembersGroupGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 9C10.2426 9 11.25 7.99264 11.25 6.75C11.25 5.50736 10.2426 4.5 9 4.5C7.75736 4.5 6.75 5.50736 6.75 6.75C6.75 7.99264 7.75736 9 9 9Z"
        fill="#12B76A"
      />
      <path
        d="M4.875 13.5C4.875 11.636 6.62104 10.125 9 10.125C11.379 10.125 13.125 11.636 13.125 13.5C13.125 13.9142 12.7892 14.25 12.375 14.25H5.625C5.21079 14.25 4.875 13.9142 4.875 13.5Z"
        fill="#12B76A"
      />
      <path
        d="M12.9375 5.25C12.9375 4.83579 13.2733 4.5 13.6875 4.5C14.9296 4.5 15.9375 5.50786 15.9375 6.75C15.9375 7.16421 15.6017 7.5 15.1875 7.5C14.7733 7.5 14.4375 7.16421 14.4375 6.75C14.4375 6.33655 14.101 6 13.6875 6C13.2733 6 12.9375 5.66421 12.9375 5.25Z"
        fill="#12B76A"
      />
    </svg>
  );
}

function EventsGroupGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.25 3.75C5.66421 3.75 6 4.08579 6 4.5V5.25H12V4.5C12 4.08579 12.3358 3.75 12.75 3.75C13.1642 3.75 13.5 4.08579 13.5 4.5V5.25H14.25C15.0784 5.25 15.75 5.92157 15.75 6.75V12.75C15.75 13.5784 15.0784 14.25 14.25 14.25H3.75C2.92157 14.25 2.25 13.5784 2.25 12.75V6.75C2.25 5.92157 2.92157 5.25 3.75 5.25H4.5V4.5C4.5 4.08579 4.83579 3.75 5.25 3.75ZM3.75 7.5V12.75H14.25V7.5H3.75ZM6 9.375C6 8.96079 6.33579 8.625 6.75 8.625H9C9.41421 8.625 9.75 8.96079 9.75 9.375C9.75 9.78921 9.41421 10.125 9 10.125H6.75C6.33579 10.125 6 9.78921 6 9.375Z"
        fill="#7A5AF8"
      />
    </svg>
  );
}

function formatNotificationTime(createdAt: string) {
  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) {
    return '';
  }

  const diffInMinutes = Math.max(
    0,
    Math.floor((Date.now() - createdTime) / (1000 * 60)),
  );

  if (diffInMinutes < 1) {
    return 'Just now';
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return new Date(createdAt).toLocaleDateString();
}

function MailUnreadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.4333 2.3223C10.8058 2.2814 9.19415 2.2814 7.56661 2.32229L7.51815 2.32351C6.24746 2.35541 5.22498 2.38109 4.40554 2.52379C3.54763 2.6732 2.85036 2.95977 2.26131 3.55106C1.67472 4.13988 1.38966 4.82712 1.24309 5.67113C1.10353 6.47477 1.08228 7.4723 1.05595 8.708L1.05491 8.75695C1.0372 9.58724 1.0372 10.4127 1.05491 11.243L1.05595 11.2919C1.08228 12.5276 1.10354 13.5251 1.2431 14.3288C1.38966 15.1728 1.67473 15.86 2.26131 16.4489C2.85036 17.0401 3.54763 17.3267 4.40554 17.4761C5.22497 17.6188 6.24743 17.6445 7.5181 17.6764L7.56662 17.6776C9.19415 17.7185 10.8058 17.7185 12.4333 17.6776L12.4818 17.6764C13.7525 17.6445 14.775 17.6188 15.5944 17.4761C16.4523 17.3267 17.1496 17.0401 17.7386 16.4489C18.3252 15.86 18.6103 15.1728 18.7568 14.3288C18.8964 13.5251 18.9176 12.5276 18.944 11.2919L18.945 11.243C18.9627 10.4127 18.9627 9.58725 18.945 8.75696L18.944 8.70802C18.9176 7.47231 18.8964 6.47479 18.7568 5.67114C18.6103 4.82714 18.3252 4.13989 17.7386 3.55108C17.1496 2.95978 16.4523 2.67322 15.5944 2.52381C14.7749 2.3811 13.7525 2.35542 12.4818 2.32351L12.4333 2.3223ZM7.59801 3.5719C9.20462 3.53153 10.7953 3.53154 12.4019 3.5719C13.7325 3.60533 14.6622 3.63028 15.3799 3.75527C16.0695 3.87537 16.4995 4.07838 16.8531 4.43328C16.998 4.57878 17.1171 4.73542 17.2152 4.9152L12.2644 7.72033C11.2183 8.31304 10.5835 8.54163 10 8.54163C9.41654 8.54163 8.78175 8.31304 7.73567 7.72033L2.7848 4.91513C2.88288 4.73537 3.00193 4.57875 3.14687 4.43327C3.50042 4.07837 3.9304 3.87536 4.62001 3.75526C5.3377 3.63027 6.26745 3.60533 7.59801 3.5719ZM2.43414 6.15315C2.34791 6.813 2.32886 7.64701 2.30462 8.7836C2.28729 9.59612 2.28729 10.4038 2.30462 11.2163C2.33227 12.5126 2.35317 13.4153 2.47466 14.1149C2.59099 14.7848 2.79085 15.2093 3.14687 15.5667C3.50042 15.9215 3.9304 16.1246 4.62001 16.2447C5.33771 16.3696 6.26746 16.3946 7.59801 16.428C9.20462 16.4684 10.7953 16.4684 12.4019 16.428C13.7325 16.3946 14.6622 16.3697 15.3799 16.2447C16.0695 16.1246 16.4995 15.9215 16.8531 15.5667C17.2091 15.2093 17.4089 14.7848 17.5253 14.1149C17.6468 13.4153 17.6677 12.5126 17.6953 11.2163C17.7126 10.4038 17.7126 9.59613 17.6953 8.78361C17.6711 7.64707 17.652 6.81307 17.5658 6.15324L12.8806 8.80788C11.8029 9.41853 10.9271 9.79163 10 9.79163C9.07297 9.79163 8.19719 9.41853 7.11945 8.80788L2.43414 6.15315Z"
        fill="#3165F6"
      />
    </svg>
  );
}

function MailReadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.33317 8.95832C7.98799 8.95832 7.70817 8.6785 7.70817 8.33332C7.70817 7.98815 7.98799 7.70832 8.33317 7.70832H11.6665C12.0117 7.70832 12.2915 7.98815 12.2915 8.33332C12.2915 8.6785 12.0117 8.95832 11.6665 8.95832H8.33317Z"
        fill="#6B7280"
      />
      <path
        d="M8.33317 5.62499C7.98799 5.62499 7.70817 5.34517 7.70817 4.99999C7.70817 4.65481 7.98799 4.37499 8.33317 4.37499H11.6665C12.0117 4.37499 12.2915 4.65481 12.2915 4.99999C12.2915 5.34517 12.0117 5.62499 11.6665 5.62499H8.33317Z"
        fill="#6B7280"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.45648 1.04166H12.5431C13.2919 1.04163 13.9162 1.04161 14.4119 1.10825C14.935 1.17859 15.4074 1.33331 15.7869 1.71287C16.1665 2.09243 16.3212 2.56476 16.3916 3.08793C16.4582 3.58357 16.4582 4.2079 16.4582 4.95661V5.49864L17.2186 6.00559C17.5632 6.23534 17.857 6.43118 18.0866 6.61735C18.3313 6.81585 18.5386 7.03056 18.6901 7.31469C18.8413 7.59843 18.9041 7.88932 18.9325 8.20232C18.9591 8.49557 18.958 8.84683 18.9566 9.25847L18.9565 9.2859C18.9529 10.3356 18.9432 11.4078 18.9161 12.494L18.9149 12.5428C18.8839 13.7824 18.859 14.7825 18.7171 15.5872C18.5681 16.4317 18.282 17.1189 17.6953 17.7056C17.1073 18.2936 16.4146 18.5792 15.5629 18.728C14.7501 18.87 13.7375 18.8953 12.4803 18.9267L12.4318 18.9279C10.8059 18.9685 9.19436 18.9685 7.56846 18.9279L7.51995 18.9267C6.26278 18.8953 5.25022 18.87 4.43741 18.728C3.58568 18.5792 2.89296 18.2936 2.30497 17.7056C1.71823 17.1189 1.43213 16.4317 1.28319 15.5872C1.14127 14.7825 1.11632 13.7824 1.0854 12.5428L1.08419 12.494C1.05707 11.4078 1.04731 10.3356 1.04378 9.2859L1.04369 9.25851C1.04229 8.84685 1.0411 8.49558 1.06771 8.20232C1.09611 7.88932 1.1589 7.59843 1.31014 7.31469C1.46159 7.03056 1.66891 6.81585 1.91368 6.61735C2.14325 6.43117 2.43701 6.23535 2.78166 6.00559L3.54148 5.49905V4.95666C3.54146 4.20793 3.54144 3.58358 3.60808 3.08793C3.67841 2.56476 3.83314 2.09243 4.2127 1.71287C4.59226 1.33331 5.06459 1.17859 5.58775 1.10825C6.0834 1.04161 6.70776 1.04163 7.45648 1.04166ZM16.4581 8.72951L16.4582 7.00096L16.5024 7.03048C16.876 7.27954 17.1205 7.44326 17.2992 7.58822C17.4678 7.72496 17.5412 7.81666 17.587 7.90266C17.6053 7.937 17.6219 7.97533 17.6364 8.02253L16.4581 8.72951ZM15.2081 4.99999V9.47951L12.2508 11.2539C11.6133 11.6364 11.1745 11.8988 10.8098 12.0703C10.458 12.2357 10.2219 12.2929 9.99983 12.2929C9.77776 12.2929 9.5417 12.2357 9.18984 12.0703C8.82515 11.8988 8.38634 11.6364 7.74891 11.2539L4.79148 9.47949V4.99999C4.79148 4.19665 4.79281 3.65702 4.84693 3.25449C4.89863 2.86993 4.98798 2.70535 5.09658 2.59676C5.20518 2.48816 5.36976 2.39881 5.75431 2.34711C6.15684 2.29299 6.69647 2.29166 7.49982 2.29166H12.4998C13.3032 2.29166 13.8428 2.29299 14.2453 2.34711C14.6299 2.39881 14.7945 2.48816 14.9031 2.59676C15.0117 2.70535 15.101 2.86993 15.1527 3.25449C15.2068 3.65702 15.2081 4.19665 15.2081 4.99999ZM3.54148 7.00136L3.54148 8.72949L2.3637 8.02282C2.37828 7.97549 2.39488 7.93707 2.41322 7.90266C2.45906 7.81666 2.53241 7.72496 2.70102 7.58822C2.87978 7.44326 3.12421 7.27954 3.49781 7.03048L3.54148 7.00136ZM2.29435 9.43895C2.2983 10.4334 2.30834 11.443 2.3338 12.4628C2.36624 13.7628 2.39049 14.6687 2.51419 15.3701C2.63272 16.0422 2.83362 16.4665 3.18887 16.8218C3.54289 17.1758 3.97035 17.3775 4.65251 17.4966C5.36315 17.6208 6.28258 17.6453 7.59968 17.6783C9.20477 17.7184 10.7955 17.7184 12.4006 17.6783C13.7177 17.6453 14.6371 17.6208 15.3478 17.4966C16.0299 17.3775 16.4574 17.1758 16.8114 16.8218C17.1667 16.4665 17.3676 16.0421 17.4861 15.3701C17.6098 14.6687 17.634 13.7628 17.6665 12.4628C17.6919 11.4429 17.7019 10.4332 17.7059 9.4386L12.8665 12.3422C12.2631 12.7043 11.7703 13 11.3417 13.2015C10.8937 13.4121 10.4702 13.5429 9.99983 13.5429C9.52945 13.5429 9.10594 13.4121 8.65802 13.2015C8.22937 13 7.73659 12.7043 7.13315 12.3422L2.29435 9.43895Z"
        fill="#6B7280"
      />
    </svg>
  );
}
