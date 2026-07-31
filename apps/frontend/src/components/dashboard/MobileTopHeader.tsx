'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Images } from '../../app/ui/images';
import { NotificationBellIcon } from './NotificationTray';

type MobileTopHeaderProps = {
  profileMenu: ReactNode;
  onNotificaitonClick: () => void;
  unreadNotificationsCount: number;
};

export default function MobileTopHeader({
  profileMenu,
  onNotificaitonClick,
  unreadNotificationsCount,
}: MobileTopHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between bg-gray-200 px-4 pt-4  xl:hidden">
      <Link
        href="/dashboard"
        className="inline-flex items-center"
        aria-label="Go to dashboard"
      >
        <Image
          src={Images.auth.NewLogo}
          alt="Harper Helpdesk"
          priority
          className="h-8 w-auto"
        />
      </Link>

      <div className="flex items-center gap-2">
        <button
          className="h-11 w-11 bg-white relative rounded-full flex items-center justify-center"
          onClick={onNotificaitonClick}
        >
          <NotificationBellIcon isActive={false} />
          {unreadNotificationsCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs text-white -top-1 -inset-e-0.5 bg-red-500 rounded-full absolute">
              {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
            </span>
          )}
        </button>
        {profileMenu}
      </div>
    </header>
  );
}
