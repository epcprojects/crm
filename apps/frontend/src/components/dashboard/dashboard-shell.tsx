'use client';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  PlusIcon,
  ToggleIcon,
  DashboardIcon,
  TicketsIcon,
  ProjectsIcon,
  UserGroup,
  SettingsIcon,
} from '../../../public/icons/index';
import { logoutThunk } from '../../app/Redux/slices/auth/authThunks';
import {
  clearPersistedSession,
  useAppDispatch,
  useAppSelector,
} from '../../app/Redux/store';
import { useProjectsQuery } from '../../app/(main-pages)/projects/projects.queries';
import { useAppLoader } from '../../app/providers/AppLoaderProvider';
import { usePermissions } from '../../app/providers/PermissionProvider';
import { Images } from '../../app/ui/images';
import ChangePasswordModal, {
  type ChangePasswordFormValues,
} from '../modals/ChangePasswordModal';
import { appToast } from '../toast/AppToast';
import ThemeButton from '../ui/ThemeButton';
import { useIsMobile } from '../hooks/useIsMobile';

type NavItem = {
  href: string;
  label: string;
  icon: (isActive: boolean) => ReactNode;
  roles: UserRole[];
  anyPermissions?: string[];
  roleLabels?: Partial<Record<UserRole, string>>;
};

type HeaderAction = {
  label: string;
  onClick: () => void;
  permission?: string;
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
  initials: string;
  colorHex?: string;
};

type SidebarProject = UserProjectResponse & {
  initials: string;
};

type DashboardHeaderActionContextValue = {
  setHeaderActionOverride: (action: (() => void) | null) => void;
  setHeaderCountOverride: (count: number | null) => void;
};

const DashboardHeaderActionContext =
  createContext<DashboardHeaderActionContextValue | null>(null);

const currentUserRole: UserRole = 'admin';

const navigationItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (isActive) => (
      <DashboardIcon opacity={isActive ? '0.4' : '0'} fill="currentColor" />
    ),
    roles: ['admin', 'developer', 'pm', 'external'],
    anyPermissions: [
      'dashboard.view_stats',
      'dashboard.view_project_cards',
      'dashboard.view_recent_tickets',
      'dashboard.view_upcoming',
    ],
  },
  {
    href: '/tickets',
    label: 'All Tickets',
    icon: (isActive) => (
      <TicketsIcon opacity={isActive ? '0.4' : '0'} fill="currentColor" />
    ),
    roles: ['admin', 'developer', 'pm', 'external'],
    anyPermissions: ['tickets.view_list'],
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
    anyPermissions: ['projects.view_list'],
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
    anyPermissions: ['users.view_list'],
  },
  {
    href: '/roles',
    label: 'Roles',
    icon: (isActive) => (
      <RolesIcon opacity={isActive ? '0.4' : '0'} fill="currentColor" />
    ),
    roles: ['admin'],
    anyPermissions: ['roles.view_list'],
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (isActive) => (
      <SettingsIcon opacity={isActive ? '0.4' : '0'} fill="currentColor" />
    ),
    roles: ['admin'],
    anyPermissions: ['settings.view_statuses', 'settings.view_priorities'],
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
      permission: 'tickets.create',
    },
  },
  {
    href: '/tickets',
    title: 'All Tickets',
    subtitle: 'View and manage all support tickets in one place.',
    action: {
      label: 'New Ticket',
      onClick: () => console.log('Create ticket from tickets'),
      permission: 'tickets.create',
    },
  },
  {
    href: '/projects',
    title: 'Projects',
    subtitle: 'Manage and monitor all your projects.',
    count: 0,
    action: {
      label: 'New Project',
      onClick: () => console.log('Create project'),
      permission: 'projects.create',
    },
  },
  {
    href: '/users',
    title: 'Users',
    subtitle: 'Manage users roles and assign projects.',
    count: 0,
    action: {
      label: 'Add User',
      onClick: () => console.log('Add user'),
      permission: 'users.create',
    },
  },
  {
    href: '/roles',
    title: 'Roles',
    subtitle: 'Manage system roles and permission access across the system.',
    action: {
      label: 'Add Role',
      onClick: () => console.log('Add role'),
      permission: 'roles.create',
    },
  },
  {
    href: '/settings',
    title: 'Settings',
    subtitle: 'Manage ticket statuses and priority levels.',
  },
];

const fallbackAccount = {
  name: 'Admin',
  email: 'admin@gmail.com',
};

function getProjectInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function getAccountInitials(name: string) {
  return getProjectInitials(name).slice(0, 2) || 'A';
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { setLoading } = useAppLoader();
  const { hasPermission, hasAnyPermission, isLoadingCatalog } =
    usePermissions();
  const canViewProjectsList = hasPermission('projects.view_list');
  const canViewProjectDetail = hasPermission('projects.view_detail');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [headerActionOverride, setHeaderActionOverrideState] = useState<
    (() => void) | null
  >(null);
  const [headerCountOverride, setHeaderCountOverrideState] = useState<
    number | null
  >(null);
  const projectsQuery = useProjectsQuery(
    canViewProjectsList || canViewProjectDetail,
  );

  const visibleNavigationItems = useMemo(() => {
    return navigationItems
      .filter(
        (item) =>
          item.roles.includes(currentUserRole) &&
          (!item.anyPermissions?.length ||
            hasAnyPermission(item.anyPermissions)),
      )
      .map((item) => ({
        ...item,
        label: item.roleLabels?.[currentUserRole] ?? item.label,
      }));
  }, [hasAnyPermission]);

  useEffect(() => {
    const currentMainRoute = navigationItems.find(
      (item) => pathname === item.href,
    );

    if (!currentMainRoute || visibleNavigationItems.length === 0) {
      return;
    }

    const canAccessCurrentRoute = visibleNavigationItems.some(
      (item) => item.href === currentMainRoute.href,
    );

    if (!canAccessCurrentRoute) {
      router.replace(visibleNavigationItems[0].href);
    }
  }, [pathname, router, visibleNavigationItems]);

  const sidebarProjects = useMemo<SidebarProject[]>(() => {
    return (projectsQuery.data ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      initials: project.initials || getProjectInitials(project.name),
      colorHex: project.colorHex,
    }));
  }, [projectsQuery.data]);

  const currentAccount = useMemo(() => {
    const name = user?.fullName || fallbackAccount.name;
    const email = user?.email || fallbackAccount.email;

    return {
      name,
      email,
      initials: getAccountInitials(name),
    };
  }, [user]);

  const currentHeader = useMemo(() => {
    const matchedHeader =
      pageHeaderConfigs.find((item) => pathname?.startsWith(item.href)) ??
      pageHeaderConfigs[0];

    if (matchedHeader.href === '/dashboard') {
      return {
        ...matchedHeader,
        title: `Good day, ${currentAccount.name} 👋`,
      };
    }

    if (matchedHeader.href === '/projects') {
      return {
        ...matchedHeader,
        count: projectsQuery.data?.length,
      };
    }

    if (headerCountOverride !== null) {
      return {
        ...matchedHeader,
        count: headerCountOverride,
      };
    }

    return matchedHeader;
  }, [
    currentAccount.name,
    headerCountOverride,
    pathname,
    projectsQuery.data?.length,
  ]);

  const changePasswordMutation = useMutation({
    onMutate: () => {
      setLoading(true);
    },
    mutationFn: async (values: ChangePasswordFormValues) => {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(values),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to change password.');
      }

      return payload;
    },
    onSuccess: () => {
      appToast.success('Password changed successfully.');
    },
    onError: (error) => {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to change password.',
      );
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    await clearPersistedSession();
    router.push('/login');
  };

  const handleChangePassword = () => {
    setChangePasswordOpen(true);
  };

  const handleHeaderAction = () => {
    headerActionOverride?.() ?? currentHeader.action?.onClick();
  };

  const setHeaderActionOverride = (action: (() => void) | null) => {
    setHeaderActionOverrideState(() => action);
  };

  const setHeaderCountOverride = (count: number | null) => {
    setHeaderCountOverrideState(count);
  };

  const headerActionContextValue = useMemo(
    () => ({
      setHeaderActionOverride,
      setHeaderCountOverride,
    }),
    [],
  );

  const sidebarWidth = collapsed ? 'lg:w-18' : 'lg:w-60';
  const contentOffset = collapsed ? 'lg:pl-18' : 'lg:pl-60';
  const shouldShowNoAccessPage =
    !isLoadingCatalog && visibleNavigationItems.length === 0;
  const shouldHideHeader =
    shouldShowNoAccessPage ||
    pathname?.startsWith('/tickets/') ||
    pathname?.startsWith('/projects/');
  const canUseCurrentHeaderAction = currentHeader.action?.permission
    ? hasPermission(currentHeader.action.permission)
    : Boolean(currentHeader.action);
  const shouldShowHeaderAction = Boolean(
    headerActionOverride || (currentHeader.action && canUseCurrentHeaderAction),
  );
  const headerActionLabel = currentHeader.action?.label ?? '';

  const isMobile = useIsMobile();

  return (
    <DashboardHeaderActionContext.Provider value={headerActionContextValue}>
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
          className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-gray-200 bg-gray-50 transition-all duration-300 ease-out ${sidebarWidth} ${
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
                className={`mb-3 px-2 text-xs font-medium captilize text-black transition-opacity duration-200 ${
                  collapsed
                    ? 'opacity-0 hidden lg:h-0 lg:overflow-hidden'
                    : 'opacity-100'
                }`}
              >
                Main Menu
              </p>
              <nav className={`space-y-1.5 ${collapsed ? 'w-fit' : ''}`}>
                {visibleNavigationItems.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      className={`group flex items-center rounded-lg px-3 py-2 text-sm  transition-all duration-200 ${
                        isActive
                          ? 'bg-white text-black shadow ring-1 ring-gray-200 font-medium'
                          : 'text-gray-500 hover:bg-slate-50 hover:text-black font-normal'
                      } ${collapsed ? 'justify-center lg:px-0 w-10 items-center' : 'gap-2'}`}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                    >
                      <span
                        className={`flex items-center justify-center rounded-xl transition ${
                          isActive
                            ? 'bg-white text-violet-600'
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

            {canViewProjectsList ? (
              <div className=" border-t border-gray-200 pt-5 px-4 pb-4">
                <p
                  className={`mb-3 px-2 text-xs font-medium captilize text-black transition-opacity duration-200 ${
                    collapsed
                      ? 'opacity-0 lg:h-0 hidden lg:overflow-hidden'
                      : 'opacity-100'
                  }`}
                >
                  Projects
                </p>
                <div className="space-y-1.5">
                  {sidebarProjects.map((project) => {
                    const projectHref = `/projects/${project.id}`;
                    const isProjectActive = pathname === projectHref;
                    const projectContent = (
                      <>
                        <span
                          className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-xs font-normal drop-shadow-xs"
                          style={{
                            color: !isProjectActive
                              ? (project.colorHex ?? '#6172F3')
                              : '#ffffff',
                            backgroundColor: isProjectActive
                              ? (project.colorHex ?? '#6172F3')
                              : '',
                            borderColor: project.colorHex
                              ? `${project.colorHex}33`
                              : undefined,
                          }}
                        >
                          {project.initials}
                        </span>
                        <span
                          className={`truncate text-sm transition-all duration-300 ${
                            isProjectActive
                              ? 'font-medium text-gray-900'
                              : 'font-normal text-gray-600'
                          } ${
                            collapsed
                              ? 'w-0 overflow-hidden opacity-0'
                              : 'opacity-100'
                          }`}
                        >
                          {project.name}
                        </span>
                      </>
                    );

                    return canViewProjectDetail ? (
                      <Link
                        key={project.id}
                        className={`flex w-full items-center rounded-lg border py-1.25 px-3 text-left transition ${
                          isProjectActive
                            ? 'border-gray-200 bg-white shadow-sm'
                            : 'border-transparent hover:bg-slate-50'
                        } ${collapsed ? 'justify-center lg:px-0' : 'gap-2'}`}
                        href={projectHref}
                        onClick={() => setMobileOpen(false)}
                        title={collapsed ? project.name : undefined}
                      >
                        {projectContent}
                      </Link>
                    ) : (
                      <div
                        key={project.id}
                        className={`flex w-full cursor-not-allowed items-center rounded-lg border border-transparent py-1.25 px-3 text-left opacity-70 ${
                          collapsed ? 'justify-center lg:px-0' : 'gap-2'
                        }`}
                        title={collapsed ? project.name : undefined}
                      >
                        {projectContent}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-auto px-3 pb-3 pt-3.5">
            <Menu as="div" className="relative">
              <MenuButton
                className={`flex w-full items-center rounded-2xl outline-none bg-white p-2 text-left transition hover:bg-gray-50 ${
                  collapsed ? 'justify-center' : 'gap-3'
                }`}
                title={collapsed ? currentAccount.name : undefined}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-slate-700 to-slate-950 text-sm font-semibold text-white">
                  {currentAccount.initials}
                </span>
                <span
                  className={`min-w-0 flex-1 transition-all duration-300 ${
                    collapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'
                  }`}
                >
                  <span className="block truncate text-base font-medium text-black">
                    {currentAccount.name}
                  </span>
                  <span className="block truncate text-xs font-normal text-gray-500">
                    {currentAccount.email}
                  </span>
                </span>
                <span
                  className={`text-gray-700 transition-all duration-300 ${
                    collapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'
                  }`}
                >
                  <AccountChevronIcon />
                </span>
              </MenuButton>

              <MenuItems
                anchor="top start"
                className="z-50 mb-3 w-52 sm:w-66 origin-bottom-left rounded-xl bg-white p-1 ring-1 ring-gray-200 focus:outline-none"
              >
                <MenuItem>
                  <button
                    className="flex w-full items-center gap-2 sm:gap-3 rounded-lg px-3 py-2 text-left text-sm md:text-base font-medium text-black transition data-focus:bg-gray-50"
                    onClick={handleChangePassword}
                    type="button"
                  >
                    <PasswordMenuIcon
                      height={isMobile ? '20' : '24'}
                      width={isMobile ? '20' : '24'}
                    />
                    Change Password
                  </button>
                </MenuItem>
                <MenuItem>
                  <button
                    className="flex w-full items-center gap-2 sm:gap-3 rounded-lg px-3 py-2 text-left text-sm md:text-base font-medium text-red-500 transition data-focus:bg-red-50"
                    onClick={handleLogout}
                    type="button"
                  >
                    <LogoutMenuIcon
                      height={isMobile ? '20' : '24'}
                      width={isMobile ? '20' : '24'}
                    />
                    Logout
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </aside>

        <div
          className={`min-h-dvh transition-all  flex flex-col duration-300 ease-out ${contentOffset}`}
        >
          {!shouldHideHeader ? (
            <header
              className={`fixed ${collapsed ? 'sm:max-w-[calc(100%-72px)]' : 'sm:max-w-[calc(100%-240px)]'} top-0 z-20 border-b border-gray-200 bg-white w-full backdrop-blur`}
            >
              <div className="flex py-4 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                  <button
                    aria-label="Open navigation"
                    className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-600 lg:hidden"
                    onClick={() => setMobileOpen(true)}
                    type="button"
                  >
                    <MenuIcon />
                  </button>
                  <div className="sm:inline-block hidden">
                    <div className="flex items-center gap-2">
                      <p className="text-base md:text-xl font-bold text-black">
                        {currentHeader.title}
                      </p>
                      {typeof currentHeader.count === 'number' ? (
                        <span className="flex md:h-7.5 md:w-7.5 h-5 w-5 items-center justify-center rounded-full border border-[#B2DDFF] bg-[#EFF8FF] text-sm font-medium text-[#175CD3]  md:text-base">
                          {currentHeader.count}
                        </span>
                      ) : null}
                    </div>
                    <h1 className="text-xs md:text-smfont-normal tracking-tight text-gray-600">
                      {currentHeader.subtitle}
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {shouldShowHeaderAction ? (
                    <ThemeButton
                      icon={<PlusIcon />}
                      onClick={handleHeaderAction}
                    >
                      {headerActionLabel}
                    </ThemeButton>
                  ) : null}
                </div>
              </div>
            </header>
          ) : null}

          <main
            className={`px-4 sm:px-6 flex flex-col flex-1 py-4 md:py-8 lg:px-8 ${
              shouldHideHeader ? '' : 'md:pt-28'
            }`}
          >
            {shouldShowNoAccessPage ? <NoAccessPage /> : children}
          </main>
        </div>

        <ChangePasswordModal
          isOpen={changePasswordOpen}
          onClose={() => setChangePasswordOpen(false)}
          onConfirm={async (values) => {
            await changePasswordMutation.mutateAsync(values);
          }}
        />
      </div>
    </DashboardHeaderActionContext.Provider>
  );
}

export function useDashboardHeaderAction() {
  const context = useContext(DashboardHeaderActionContext);

  if (!context) {
    throw new Error(
      'useDashboardHeaderAction must be used within DashboardShell',
    );
  }

  return context;
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

function NoAccessIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14 25.6667C20.4433 25.6667 25.6667 20.4433 25.6667 14C25.6667 7.55668 20.4433 2.33334 14 2.33334C7.55672 2.33334 2.33337 7.55668 2.33337 14C2.33337 20.4433 7.55672 25.6667 14 25.6667Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M9.91663 9.91666L18.0833 18.0833M18.0833 9.91666L9.91663 18.0833"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NoAccessPage() {
  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-1 items-center justify-center">
      <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <NoAccessIcon />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-gray-900">
          No page permissions available
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Your account does not currently have access to any page in this
          workspace. Please contact your administrator to assign the required
          permissions.
        </p>
      </section>
    </div>
  );
}

function LogoutMenuIcon({ width = '24', height = '24' }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15.7494 6.34523C15.6598 4.09011 13.7806 2.19067 11.2973 2.25142C10.7204 2.26553 10.0421 2.45699 8.97809 2.75735L8.84753 2.7942C5.92379 3.61888 3.05604 5.09448 2.37359 8.57412C2.24987 9.20491 2.24992 9.90118 2.25 11.0693L2.25 12.9307C2.24992 14.0988 2.24987 14.7951 2.37359 15.4259C3.05604 18.9055 5.92379 20.3811 8.84752 21.2058L8.97806 21.2427C10.0421 21.543 10.7204 21.7345 11.2973 21.7486C13.7806 21.8093 15.6598 19.9099 15.7494 17.6548C15.7659 17.2409 15.4437 16.892 15.0298 16.8756C14.6159 16.8591 14.267 17.1813 14.2506 17.5952C14.193 19.044 12.9856 20.2894 11.334 20.249C10.9722 20.2402 10.493 20.1114 9.25473 19.7621C6.45545 18.9726 4.35508 17.7352 3.84554 15.1372C3.75341 14.6675 3.75001 14.1267 3.75001 12.8373V11.1628C3.75001 9.87327 3.75341 9.33255 3.84554 8.86281C4.35508 6.26484 6.45545 5.02745 9.25474 4.23787C10.493 3.88859 10.9722 3.75982 11.334 3.75097C12.9856 3.71057 14.193 4.95605 14.2506 6.4048C14.267 6.81868 14.6159 7.14087 15.0298 7.12442C15.4437 7.10797 15.7659 6.75912 15.7494 6.34523Z"
        fill="#F04438"
      />
      <path
        d="M19.0227 8.96219C18.7257 8.67349 18.2509 8.68023 17.9622 8.97726C17.6735 9.27428 17.6802 9.74911 17.9773 10.0378C18.1388 10.1949 18.396 10.3971 18.6407 10.5893L18.6976 10.634C18.9434 10.827 19.2061 11.0333 19.4548 11.2439L19.4619 11.25H10C9.58579 11.25 9.25 11.5858 9.25 12C9.25 12.4142 9.58579 12.75 10 12.75H19.4619L19.4548 12.7561C19.2061 12.9668 18.9434 13.173 18.6976 13.366L18.6407 13.4107C18.396 13.6029 18.1388 13.8051 17.9773 13.9622C17.6802 14.2509 17.6735 14.7257 17.9622 15.0227C18.2509 15.3198 18.7257 15.3265 19.0227 15.0378C19.114 14.9491 19.2958 14.8035 19.5672 14.5903L19.6272 14.5432C19.8693 14.3532 20.1534 14.1302 20.4245 13.9005C20.715 13.6543 21.0168 13.3787 21.2515 13.1032C21.369 12.9652 21.485 12.8096 21.5746 12.6422C21.661 12.4807 21.75 12.2583 21.75 12C21.75 11.7417 21.661 11.5193 21.5746 11.3578C21.485 11.1904 21.369 11.0348 21.2515 10.8968C21.0168 10.6213 20.715 10.3457 20.4245 10.0995C20.1534 9.86982 19.8693 9.64686 19.6272 9.45679L19.5672 9.40971C19.2958 9.19651 19.114 9.05089 19.0227 8.96219Z"
        fill="#F04438"
      />
    </svg>
  );
}

function PasswordMenuIcon({ width = '24', height = '24' }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.5 15.5C8.5 14.9477 8.94772 14.5 9.5 14.5H9.50897C10.0613 14.5 10.509 14.9477 10.509 15.5C10.509 16.0523 10.0613 16.5 9.50897 16.5H9.5C8.94772 16.5 8.5 16.0523 8.5 15.5Z"
        fill="black"
      />
      <path
        d="M13.491 15.5C13.491 14.9477 13.9387 14.5 14.491 14.5H14.5C15.0523 14.5 15.5 14.9477 15.5 15.5C15.5 16.0523 15.0523 16.5 14.5 16.5H14.491C13.9387 16.5 13.491 16.0523 13.491 15.5Z"
        fill="black"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.75 8.45909V6.5C6.75 3.6005 9.1005 1.25 12 1.25C14.8995 1.25 17.25 3.6005 17.25 6.5V8.45909C18.9408 8.86285 20.239 10.2984 20.4755 12.0552C20.6236 13.1556 20.75 14.3118 20.75 15.5C20.75 16.6882 20.6236 17.8444 20.4755 18.9448C20.2039 20.9618 18.5328 22.5555 16.4748 22.6501C15.0464 22.7158 13.5958 22.75 12 22.75C10.4042 22.75 8.95364 22.7158 7.52522 22.6501C5.46716 22.5555 3.79609 20.9618 3.52452 18.9448C3.37636 17.8444 3.25 16.6882 3.25 15.5C3.25 14.3118 3.37636 13.1556 3.52452 12.0552C3.76104 10.2984 5.05919 8.86285 6.75 8.45909ZM8.25 6.5C8.25 4.42893 9.92893 2.75 12 2.75C14.0711 2.75 15.75 4.42893 15.75 6.5V8.31937C14.5532 8.27365 13.3269 8.25 12 8.25C10.6732 8.25 9.44676 8.27365 8.25 8.31937V6.5ZM12 9.75C10.4264 9.75 8.9989 9.78372 7.5941 9.8483C6.2851 9.90848 5.18929 10.9319 5.0111 12.2553C4.86573 13.3351 4.75 14.4129 4.75 15.5C4.75 16.5871 4.86573 17.6649 5.0111 18.7447C5.18929 20.0681 6.2851 21.0915 7.5941 21.1517C8.9989 21.2163 10.4264 21.25 12 21.25C13.5736 21.25 15.0011 21.2163 16.4059 21.1517C17.7149 21.0915 18.8107 20.0681 18.9889 18.7447C19.1343 17.6649 19.25 16.5871 19.25 15.5C19.25 14.4129 19.1343 13.3351 18.9889 12.2553C18.8107 10.9319 17.7149 9.90848 16.4059 9.8483C15.0011 9.78372 13.5736 9.75 12 9.75Z"
        fill="black"
      />
    </svg>
  );
}

function AccountChevronIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.40033 8.81376L4.6001 7.85349L10.0002 3.35339L15.4003 7.85345L14.6001 8.81374L10.0002 4.98053L5.40033 8.81376Z"
        fill="black"
      />
      <path
        d="M5.40033 11.1868L4.6001 12.1471L10.0002 16.6472L15.4003 12.1471L14.6001 11.1868L10.0002 15.02L5.40033 11.1868Z"
        fill="black"
      />
    </svg>
  );
}

function RolesIcon({
  fill = 'currentColor',
  opacity = '0',
}: {
  fill?: string;
  opacity?: string;
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="3" fill={fill} opacity={opacity} />
      <circle cx="16" cy="9" r="2.5" fill={fill} opacity={opacity} />
      <path
        d="M3.75 17C3.75 14.9289 5.42893 13.25 7.5 13.25H8.5C10.5711 13.25 12.25 14.9289 12.25 17V17.5H3.75V17Z"
        stroke={fill}
        strokeWidth="1.5"
        fill={fill}
        fillOpacity={opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.25 17.5V16.75C13.25 15.2312 14.4812 14 16 14H16.5C18.0188 14 19.25 15.2312 19.25 16.75V17.5"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 8C6 6.89543 6.89543 6 8 6C9.10457 6 10 6.89543 10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8Z"
        stroke={fill}
        strokeWidth="1.5"
      />
      <path
        d="M13.5 9C13.5 7.89543 14.3954 7 15.5 7C16.6046 7 17.5 7.89543 17.5 9C17.5 10.1046 16.6046 11 15.5 11C14.3954 11 13.5 10.1046 13.5 9Z"
        stroke={fill}
        strokeWidth="1.5"
      />
    </svg>
  );
}
