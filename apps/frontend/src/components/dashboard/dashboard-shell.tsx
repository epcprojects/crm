'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { ToggleIcon } from '../../../public/icons/index';
import { Images } from '../../app/ui/images';

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const navigationItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <GridIcon />,
  },
  {
    href: '/dashboard',
    label: 'All Tickets',
    icon: <TicketIcon />,
  },
  {
    href: '/dashboard',
    label: 'Projects',
    icon: <FolderIcon />,
  },
  {
    href: '/dashboard',
    label: 'Users',
    icon: <UsersIcon />,
  },
  {
    href: '/dashboard',
    label: 'Settings',
    icon: <SettingsIcon />,
  },
];

const projects = [
  {
    name: 'Acme Corp',
    initials: 'AC',
    tone: 'text-orange-500',
  },
  {
    name: 'Stellar Tech',
    initials: 'ST',
    tone: 'text-sky-500',
  },
  {
    name: 'GreenLeaf Co',
    initials: 'GC',
    tone: 'text-emerald-500',
  },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentLabel = useMemo(() => {
    return (
      navigationItems.find((item) => pathname?.startsWith(item.href))?.label ??
      'Dashboard'
    );
  }, [pathname]);

  const sidebarWidth = collapsed ? 'lg:w-24' : 'lg:w-72';
  const contentOffset = collapsed ? 'lg:pl-24' : 'lg:pl-72';

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      {mobileOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-66 flex-col border-r border-gray-200 bg-gray-50 transition-all duration-300 ease-out ${sidebarWidth} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex  items-center justify-between  px-4 pt-4 pb-2">
          <button
            onClick={
              collapsed
                ? () => setCollapsed((value) => !value)
                : () => {
                    console.log('tests');
                  }
            }
            className="flex items-center  gap-3 overflow-hidden"
          >
            <Image alt="" src={Images.index.logo} className="w-12" />

            <div
              className={`min-w-0 transition-all duration-300 ${
                collapsed
                  ? 'pointer-events-none w-0 opacity-0'
                  : 'w-auto opacity-100'
              }`}
            >
              <p className="text-lg font-semibold text-start leading-none text-black">
                Harper
              </p>
              <p className="text-sm md:text-base font-extralight text-black">
                HelpDesk
              </p>
            </div>
          </button>

          <button
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`${collapsed ? 'absolute -right-2 rotate-180' : 'inline-block'} hover:scale-110`}
            onClick={() => setCollapsed((value) => !value)}
            type="button"
          >
            <ToggleIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className=" px-4 pb-4 pt-5">
            <p
              className={`mb-3 px-2 text-xs sm:text-sm font-medium captilize text-black transition-opacity duration-200 ${
                collapsed
                  ? 'opacity-0 lg:h-0 lg:overflow-hidden'
                  : 'opacity-100'
              }`}
            >
              Main Menu
            </p>
            <nav className="space-y-1.5">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm md:text-base  transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-black shadow ring-1 ring-gray-200 font-medium'
                        : 'text-gray-500 hover:bg-slate-50 hover:text-slate-900 font-normal'
                    } ${collapsed ? 'justify-center lg:px-0' : ''}`}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span
                      className={`flex items-center justify-center rounded-xl transition ${
                        isActive
                          ? 'bg-white text-violet-600 shadow-sm'
                          : 'bg-slate-100 text-gray-500 group-hover:bg-white group-hover:text-slate-700'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span
                      className={`whitespace-nowrap transition-all duration-300 ${
                        collapsed
                          ? 'w-0 overflow-hidden opacity-0'
                          : 'opacity-100'
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className=" border-t border-gray-200 pt-5 px-4 pb-4">
            <p
              className={`mb-3 px-2 text-xs sm:text-sm font-medium captilize text-black transition-opacity duration-200 ${
                collapsed
                  ? 'opacity-0 lg:h-0 lg:overflow-hidden'
                  : 'opacity-100'
              }`}
            >
              Projects
            </p>
            <div className="space-y-1.5">
              {projects.map((project) => (
                <button
                  key={project.name}
                  className={`flex w-full items-center gap-2 rounded-2xl py-1.25 px-3 text-left transition hover:bg-slate-50 ${
                    collapsed ? 'justify-center lg:px-0' : ''
                  }`}
                  type="button"
                  title={collapsed ? project.name : undefined}
                >
                  <span
                    className={`flex h-7.5 w-7.5 border border-gray-200 drop-shadow-xs bg-white shrink-0 items-center justify-center rounded-full bg-linear-to-br ${project.tone} text-xs font-normal`}
                  >
                    {project.initials}
                  </span>
                  <span
                    className={`truncate text-sm md:text-base font-normal text-gray-600 transition-all duration-300 ${
                      collapsed
                        ? 'w-0 overflow-hidden opacity-0'
                        : 'opacity-100'
                    }`}
                  >
                    {project.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`min-h-dvh transition-all duration-300 ease-out ${contentOffset}`}
      >
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white backdrop-blur">
          <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                aria-label="Open navigation"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-600 lg:hidden"
                onClick={() => setMobileOpen(true)}
                type="button"
              >
                <MenuIcon />
              </button>
              <div>
                <p className="text-sm font-medium text-slate-400">Workspace</p>
                <h1 className="text-xl font-semibold tracking-tight text-slate-950">
                  {currentLabel}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm md:flex">
                <SearchIcon />
                <span>Search tickets, projects...</span>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-300 transition hover:scale-[1.01] hover:shadow-xl"
                type="button"
              >
                <PlusIcon />
                <span className="hidden sm:inline">New Ticket</span>
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.4"
        d="M1.76354 9.91009C1.49878 8.18718 1.3664 7.32573 1.69212 6.56203C2.01785 5.79834 2.74052 5.27582 4.18585 4.2308L5.26574 3.45C7.06372 2.15 7.96271 1.5 9 1.5C10.0373 1.5 10.9363 2.15 12.7343 3.45L13.8141 4.2308C15.2595 5.27582 15.9821 5.79834 16.3079 6.56203C16.6336 7.32573 16.5012 8.18718 16.2365 9.91009L16.0107 11.3793C15.6353 13.8217 15.4477 15.0429 14.5717 15.7714C13.6958 16.5 12.4152 16.5 9.85411 16.5H8.14589C5.58475 16.5 4.30418 16.5 3.42825 15.7714C2.55232 15.0429 2.36465 13.8217 1.98932 11.3793L1.76354 9.91009Z"
        fill="#6719FC"
      />
      <path
        d="M7.09552 12.3061C6.85038 12.1153 6.49695 12.1593 6.30613 12.4045C6.11531 12.6496 6.15934 13.003 6.40448 13.1939C7.10468 13.7389 8.01443 14.0625 9 14.0625C9.98557 14.0625 10.8953 13.7389 11.5955 13.1939C11.8407 13.003 11.8847 12.6496 11.6939 12.4045C11.5031 12.1593 11.1496 12.1153 10.9045 12.3061C10.4054 12.6946 9.7398 12.9375 9 12.9375C8.26021 12.9375 7.59462 12.6946 7.09552 12.3061Z"
        fill="#6719FC"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 0.9375C8.35045 0.9375 7.76976 1.14516 7.14286 1.49696C6.53543 1.83782 5.8394 2.34109 4.96415 2.97393L3.83238 3.79224C3.12997 4.3001 2.56896 4.70572 2.14582 5.08115C1.70891 5.4688 1.38205 5.85525 1.17472 6.34135C0.96694 6.82851 0.916686 7.32784 0.94456 7.90356C0.971459 8.45916 1.07448 9.1295 1.20295 9.96542L1.43939 11.504C1.62192 12.6919 1.76726 13.6377 1.98079 14.3746C2.20158 15.1366 2.51262 15.7415 3.06855 16.2039C3.62218 16.6644 4.28168 16.8695 5.0873 16.9673C5.871 17.0625 6.85961 17.0625 8.10832 17.0625H9.89168C11.1404 17.0625 12.129 17.0625 12.9127 16.9673C13.7183 16.8695 14.3778 16.6644 14.9315 16.2039C15.4874 15.7415 15.7984 15.1366 16.0192 14.3746C16.2327 13.6377 16.3781 12.6919 16.5606 11.504L16.7971 9.96533C16.9255 9.12946 17.0285 8.45914 17.0554 7.90356C17.0833 7.32784 17.0331 6.82851 16.8253 6.34135C16.618 5.85525 16.2911 5.4688 15.8542 5.08115C15.431 4.70572 14.87 4.3001 14.1676 3.79225L13.0359 2.97394C12.1606 2.34109 11.4646 1.83782 10.8571 1.49696C10.2302 1.14516 9.64955 0.9375 9 0.9375ZM5.59533 3.90583C6.50488 3.24819 7.14898 2.78355 7.6934 2.47804C8.22481 2.17984 8.61226 2.0625 9 2.0625C9.38775 2.0625 9.7752 2.17984 10.3066 2.47804C10.851 2.78355 11.4951 3.24819 12.4047 3.90583L13.4846 4.68663C14.2163 5.21571 14.7314 5.58892 15.1075 5.92267C15.4747 6.24847 15.6721 6.50512 15.7905 6.78271C15.9084 7.05924 15.9548 7.3725 15.9318 7.84915C15.908 8.33927 15.8146 8.95169 15.6805 9.82465L15.4547 11.2939C15.2648 12.5299 15.1294 13.4032 14.9387 14.0615C14.7528 14.7029 14.532 15.0728 14.2121 15.339C13.8898 15.6071 13.471 15.7662 12.7771 15.8505C12.0691 15.9365 11.1488 15.9375 9.85411 15.9375H8.14589C6.85123 15.9375 5.93095 15.9365 5.22294 15.8505C4.52901 15.7662 4.11025 15.6071 3.78795 15.339C3.46796 15.0728 3.24719 14.7029 3.06134 14.0615C2.87056 13.4032 2.73525 12.5299 2.5453 11.2939L2.31952 9.82465C2.18537 8.95169 2.09197 8.33927 2.06824 7.84915C2.04517 7.3725 2.09158 7.05924 2.20953 6.78271C2.32793 6.50512 2.52527 6.24847 2.89246 5.92267C3.26863 5.58892 3.78369 5.21571 4.51544 4.68663L5.59533 3.90583Z"
        fill="#6719FC"
      />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 5h8a2 2 0 0 1 2 2v2a2 2 0 1 0 0 4v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2a2 2 0 1 0 0-4V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M10 9h4M10 15h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 8a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M16 19a4 4 0 0 0-8 0m11 0a3 3 0 0 0-5.26-1.92M19 19h1m-15 0H4m8-7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm5 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM7 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="m10.33 4.32 1.18-.99a.8.8 0 0 1 .98 0l1.18.99a.8.8 0 0 0 .82.14l1.46-.58a.8.8 0 0 1 .94.38l.76 1.38a.8.8 0 0 0 .68.42l1.58.09a.8.8 0 0 1 .69.69l.09 1.58a.8.8 0 0 0 .42.68l1.38.76a.8.8 0 0 1 .38.94l-.58 1.46a.8.8 0 0 0 .14.82l.99 1.18a.8.8 0 0 1 0 .98l-.99 1.18a.8.8 0 0 0-.14.82l.58 1.46a.8.8 0 0 1-.38.94l-1.38.76a.8.8 0 0 0-.42.68l-.09 1.58a.8.8 0 0 1-.69.69l-1.58.09a.8.8 0 0 0-.68.42l-.76 1.38a.8.8 0 0 1-.94.38l-1.46-.58a.8.8 0 0 0-.82.14l-1.18.99a.8.8 0 0 1-.98 0l-1.18-.99a.8.8 0 0 0-.82-.14l-1.46.58a.8.8 0 0 1-.94-.38l-.76-1.38a.8.8 0 0 0-.68-.42l-1.58-.09a.8.8 0 0 1-.69-.69l-.09-1.58a.8.8 0 0 0-.42-.68l-1.38-.76a.8.8 0 0 1-.38-.94l.58-1.46a.8.8 0 0 0-.14-.82l-.99-1.18a.8.8 0 0 1 0-.98l.99-1.18a.8.8 0 0 0 .14-.82L2.2 11.5a.8.8 0 0 1 .38-.94l1.38-.76a.8.8 0 0 0 .42-.68l.09-1.58a.8.8 0 0 1 .69-.69l1.58-.09a.8.8 0 0 0 .68-.42l.76-1.38a.8.8 0 0 1 .94-.38l1.46.58a.8.8 0 0 0 .82-.14Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
