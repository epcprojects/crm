'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import {
  PlusIcon,
  ToggleIcon,
  DashboardIcon,
  TicketsIcon,
  ProjectsIcon,
  UserGroup,
  SettingsIcon,
} from '../../../public/icons/index';
import { Images } from '../../app/ui/images';
import ThemeButton from '../ui/ThemeButton';

type NavItem = {
  href: string;
  label: string;
  icon: (isActive: boolean) => ReactNode;
  roles: UserRole[];
  roleLabels?: Partial<Record<UserRole, string>>;
};

type HeaderAction = {
  label: string;
  onClick: () => void;
};

type PageHeaderConfig = {
  href: string;
  title: string;
  subtitle: string;
  count?: number;
  action?: HeaderAction;
};

type UserRole = 'admin' | 'developer' | 'pm' | 'external';

type UserProjectResponse = {
  id: string;
  name: string;
  textColor: string;
};

type SidebarProject = UserProjectResponse & {
  initials: string;
};

const currentUserRole: UserRole = 'admin';

const navigationItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (isActive) => (
      <DashboardIcon opacity={isActive ? '0.4' : '0'} fill="currentColor" />
    ),
    roles: ['admin', 'developer', 'pm', 'external'],
  },
  {
    href: '/tickets',
    label: 'All Tickets',
    icon: (isActive) => (
      <TicketsIcon opacity={isActive ? '0.4' : '0'} fill="currentColor" />
    ),
    roles: ['admin', 'developer', 'pm', 'external'],
    roleLabels: {
      external: 'My Tickets',
    },
  },
  {
    href: '/projects',
    label: 'Projects',
    icon: (isActive) => (
      <ProjectsIcon opacity={isActive ? '0.4' : '0'} fill="currentColor" />
    ),
    roles: ['admin', 'developer', 'pm', 'external'],
    roleLabels: {
      external: 'My Projects',
    },
  },
  {
    href: '/users',
    label: 'Users',
    icon: (isActive) => (
      <UserGroup opacity={isActive ? '0.4' : '0'} fill="currentColor" />
    ),
    roles: ['admin'],
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (isActive) => (
      <SettingsIcon opacity={isActive ? '0.4' : '0'} fill="currentColor" />
    ),
    roles: ['admin'],
  },
];

const pageHeaderConfigs: PageHeaderConfig[] = [
  {
    href: '/dashboard',
    title: 'Good day, Admin 👋',
    subtitle: "Here's what's happening across your companies",
    action: {
      label: 'New Ticket',
      onClick: () => console.log('Create ticket from dashboard'),
    },
  },
  {
    href: '/tickets',
    title: 'All Tickets',
    subtitle: 'View and manage all support tickets in one place.',
    action: {
      label: 'New Ticket',
      onClick: () => console.log('Create ticket from tickets'),
    },
  },
  {
    href: '/projects',
    title: 'Projects',
    subtitle: 'Manage and monitor all your projects.',
    count: 3,
    action: {
      label: 'New Project',
      onClick: () => console.log('Create project'),
    },
  },
  {
    href: '/users',
    title: 'Users',
    subtitle:
      'Manage team members, roles, and company access permissions from one place.',
    count: 3,
    action: {
      label: 'Add User',
      onClick: () => console.log('Add user'),
    },
  },
  {
    href: '/settings',
    title: 'Settings',
    subtitle: 'Manage ticket statuses and priority levels.',
  },
];

const currentUserProjects: UserProjectResponse[] = [
  {
    id: 'acme-corp',
    name: 'Acme Corp',
    textColor: 'text-orange-500',
  },
  {
    id: 'stellar-tech',
    name: 'Stellar Tech',
    textColor: 'text-sky-500',
  },
  {
    id: 'greenleaf-co',
    name: 'GreenLeaf Co',
    textColor: 'text-emerald-500',
  },
];

function getProjectInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNavigationItems = useMemo(() => {
    return navigationItems
      .filter((item) => item.roles.includes(currentUserRole))
      .map((item) => ({
        ...item,
        label: item.roleLabels?.[currentUserRole] ?? item.label,
      }));
  }, []);

  const sidebarProjects = useMemo<SidebarProject[]>(() => {
    return currentUserProjects.map((project) => ({
      ...project,
      initials: getProjectInitials(project.name),
    }));
  }, []);

  const currentHeader = useMemo(() => {
    return (
      pageHeaderConfigs.find((item) => pathname?.startsWith(item.href)) ??
      pageHeaderConfigs[0]
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
            <Image alt="" src={Images.index.logo} className="w-10 md:w-12" />

            <div
              className={`min-w-0 transition-all duration-300 ${
                collapsed
                  ? 'pointer-events-none w-0 opacity-0'
                  : 'w-auto opacity-100'
              }`}
            >
              <p className=" text-base md:text-lg font-semibold text-start leading-none text-black">
                Harper
              </p>
              <p className="text-xs md:text-base font-extralight text-black">
                HelpDesk
              </p>
            </div>
          </button>

          <button
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`${collapsed ? 'absolute -right-2 rotate-180' : 'md:inline-block hidden'}  hover:scale-110`}
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
              {visibleNavigationItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm md:text-base  transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-black shadow ring-1 ring-gray-200 font-medium'
                        : 'text-gray-500 hover:bg-slate-50 hover:text-black font-normal'
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
                      {item.icon(isActive)}
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
              {sidebarProjects.map((project) => (
                <button
                  key={project.id}
                  className={`flex w-full items-center gap-2 rounded-2xl py-1.25 px-3 text-left transition hover:bg-slate-50 ${
                    collapsed ? 'justify-center lg:px-0' : ''
                  }`}
                  type="button"
                  title={collapsed ? project.name : undefined}
                >
                  <span
                    className={`flex h-7.5 w-7.5 border border-gray-200 drop-shadow-xs bg-white shrink-0 items-center justify-center rounded-full bg-linear-to-br ${project.textColor} text-xs font-normal`}
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
        className={`min-h-dvh transition-all flex flex-col duration-300 ease-out ${contentOffset}`}
      >
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white backdrop-blur">
          <div className="flex py-4 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                aria-label="Open navigation"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-600 lg:hidden"
                onClick={() => setMobileOpen(true)}
                type="button"
              >
                <MenuIcon />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg md:text-3xl font-semibold text-black">
                    {currentHeader.title}
                  </p>
                  {typeof currentHeader.count === 'number' ? (
                    <span className="flex md:h-7.5 md:w-7.5 h-5 w-5 items-center justify-center rounded-full border border-[#B2DDFF] bg-[#EFF8FF] text-sm font-medium text-[#175CD3]  md:text-base">
                      {currentHeader.count}
                    </span>
                  ) : null}
                </div>
                <h1 className="text-sm md:text-lg font-normal tracking-tight text-gray-600">
                  {currentHeader.subtitle}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentHeader.action ? (
                <ThemeButton
                  icon={<PlusIcon />}
                  onClick={currentHeader.action.onClick}
                >
                  {currentHeader.action.label}
                </ThemeButton>
              ) : null}
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 py-4 md:py-8 lg:px-8">{children}</main>
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
