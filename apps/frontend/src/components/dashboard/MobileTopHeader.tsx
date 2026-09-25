'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { BackIcon } from '../../../public/icons';
import { Images } from '../../app/ui/images';
import { NotificationBellIcon } from './NotificationTray';

type MobileTopHeaderProps = {
  profileMenu: ReactNode;
  onNotificaitonClick: () => void;
  unreadNotificationsCount: number;
  showNotifications?: boolean;
  ticketDetail?: {
    title: string;
    id: string;
    onBack?: () => void;
  };
};

export default function MobileTopHeader({
  profileMenu,
  onNotificaitonClick,
  unreadNotificationsCount,
  showNotifications = true,
  ticketDetail,
}: MobileTopHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex shrink-0 items-center justify-between bg-white px-3 py-3 drop-shadow-2xl xl:hidden">
      {ticketDetail ? (
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <button
            aria-label="Go back"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-100"
            onClick={() => {
              if (ticketDetail.onBack) {
                ticketDetail.onBack();
              } else {
                router.back();
              }
            }}
            type="button"
          >
            <BackIcon />
          </button>
          <div className="flex min-w-0 flex-col gap-0.75">
            <p className="max-w-34 truncate text-base font-semibold text-gray-900">
              {ticketDetail.title}
            </p>
            <p className="truncate text-xs text-gray-700">{ticketDetail.id}</p>
          </div>
        </div>
      ) : (
        <Link
          href="/dashboard"
          className="inline-flex items-center"
          aria-label="Go to dashboard"
        >
          <Image
            src={Images.auth.NewLogo}
            alt="Zarrar.pk"
            priority
            className="h-8 w-auto"
          />
        </Link>
      )}

      <div className="flex items-center gap-2">
        {showNotifications ? (
          <button
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100"
            onClick={onNotificaitonClick}
            type="button"
          >
            <NotificationBellIcon width="20" height="20" isActive={false} />
            {unreadNotificationsCount > 0 && (
              <span className="min-w-5 inline-block px-1 py-0.5 text-[10px] text-white -top-2 -inset-e-1.5 bg-red-500 rounded-full absolute">
                {unreadNotificationsCount > 99
                  ? '99+'
                  : unreadNotificationsCount}
              </span>
            )}
          </button>
        ) : null}
        {profileMenu}
      </div>
    </header>
  );
}
