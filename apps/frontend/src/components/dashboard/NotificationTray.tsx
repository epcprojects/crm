'use client';

import { Tab, TabGroup, TabList } from '@headlessui/react';
import { CrossIcon, SearchIcon } from '../../../public/icons';
import EmptyState from '../EmptyState';
import { NotificationItem } from '@harperhelp/interfaces';
import { useRouter } from 'next/navigation';

type NotificationTrayProps = {
  activeFilter: 'all' | 'unread';
  items: NotificationItem[];
  onChangeFilter: (filter: 'all' | 'unread') => void;
  onChangeSearch: (value: string) => void;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onViewAll: () => void;
  searchValue: string;
  totalCount: number;
  unreadCount: number;
  onViewSingle: (value: string) => void;
};

export default function NotificationTray({
  activeFilter,
  items,
  onChangeFilter,
  onChangeSearch,
  onClose,
  onMarkAllAsRead,
  onViewAll,
  searchValue,
  totalCount,
  unreadCount,
  onViewSingle,
}: NotificationTrayProps) {
  const selectedIndex = activeFilter === 'unread' ? 1 : 0;

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
            <SearchIcon fill="#98A2B3" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => onChangeSearch(event.target.value)}
              placeholder="Search..."
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
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

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {items.length ? (
          items.map((item) => (
            <NotificationRow
              onViewSingle={() => onViewSingle(item.id)}
              key={item.id}
              item={item}
            />
          ))
        ) : (
          <div className="flex h-full items-center justify-center px-6 py-10 text-center text-sm text-gray-500">
            <EmptyState
              title="No notifications found"
              description="You're all caught up!"
              imageAlt=""
              imageUrl="/images/NotificationEmptyState.svg"
            />
          </div>
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

export function NotificationBellIcon({ isActive }: { isActive: boolean }) {
  return (
    <svg
      width="26"
      height="26"
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
      <span className="rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-xs md:ext-sm leading-none text-gray-500">
        {count}
      </span>
    </Tab>
  );
}

function NotificationRow({
  item,
  onViewSingle,
}: {
  item: NotificationItem;
  onViewSingle?: () => void;
}) {
  const router = useRouter();
  return (
    <article
      onClick={() => {
        if (onViewSingle) {
          onViewSingle();
        }
        if (
          item.entityType === 'ticket_reply' ||
          item.entityType === 'ticket'
        ) {
          router.push(`/tickets/${item.entityId}?projectId=${item.projectId}`);
        } else if (item.entityType === 'project' && item.projectId) {
          router.push(`/projects/${item.projectId}`);
        }
      }}
      className="flex gap-4 border-b border-gray-100 px-3 sm:px-6 py-4.5 pb-2 transition hover:bg-gray-100 cursor-pointer"
    >
      {/* <div
        className={`flex h-9 w-9 drop-shadow shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold ${item.actorTone}`}
      >
        {item.actorInitials}
      </div> */}

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-5 text-gray-600">
          <span className="font-semibold text-gray-900">{item.title} </span>{' '}
          {item.message}
        </p>
        <p className="mt-1 text-xs  text-gray-500">
          {' '}
          {new Date(item.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="flex shrink-0 items-start pt-0.5">
        {/* {item.kind === 'message' ? (
          <NotificationMailIcon highlighted={item.unread} />
        ) : (
          <NotificationUpdateIcon highlighted={item.unread} />
        )} */}
        {!item.isRead ? <MailUnreadIcon /> : <MailReadIcon />}
      </div>
    </article>
  );
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
