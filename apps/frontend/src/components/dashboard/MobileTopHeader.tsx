'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Images } from '../../app/ui/images';

type MobileTopHeaderProps = {
  profileMenu: ReactNode;
};

export default function MobileTopHeader({
  profileMenu,
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
          className='h-8 w-auto'
        />
      </Link>

      {profileMenu}
    </header>
  );
}