'use client';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  PlusIcon,
  DashboardIcon,
  TicketsIcon,
  ProjectsIcon,
  UserGroup,
  SettingsIcon,
  RolesIcon,
} from '../../../public/icons/index';
import { logoutThunk } from '../../app/Redux/slices/auth/authThunks';
import {
  clearPersistedSession,
  useAppDispatch,
  useAppSelector,
} from '../../app/Redux/store';
import { NotificationItem } from '@harperhelp/interfaces';
import { useProjectsQuery } from '../../app/(main-pages)/projects/projects.queries';
import { useAppLoader } from '../../app/providers/AppLoaderProvider';
import { usePermissions } from '../../app/providers/PermissionProvider';
import { queryClient } from '../../app/providers/QueryProvider';
import { Images } from '../../app/ui/images';
import ChangePasswordModal, {
  type ChangePasswordFormValues,
} from '../modals/ChangePasswordModal';
import NotificationTray, { NotificationBellIcon } from './NotificationTray';
import { mockNotifications } from './notification-data';
import Portal from '../modals/portal';
import { appToast } from '../toast/AppToast';
import ThemeButton from '../ui/ThemeButton';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileBottomNavigation from './MobileBottomNavigation';
import MobileTopHeader from './MobileTopHeader';
import { useNotificationsSocket } from '../../app/providers/NotificationsSocketProvider';

const PAGE_SIZE = 20;

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
    icon: (isActive) => <DashboardIcon fill="currentColor" />,
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
    icon: (isActive) => <TicketsIcon fill="currentColor" />,
    roles: ['admin', 'developer', 'pm', 'external'],
    anyPermissions: ['tickets.view_list'],
    roleLabels: {
      external: 'My Tickets',
    },
  },
  {
    href: '/projects',
    label: 'Projects',
    icon: (isActive) => <ProjectsIcon fill="currentColor" />,
    roles: ['admin', 'developer', 'pm', 'external'],
    anyPermissions: ['projects.view_list'],
    roleLabels: {
      external: 'My Projects',
    },
  },
  {
    href: '/users',
    label: 'Users',
    icon: (isActive) => <UserGroup fill="currentColor" />,
    roles: ['admin'],
    anyPermissions: ['users.view_list'],
  },
  {
    href: '/roles',
    label: 'Roles',
    icon: (isActive) => <RolesIcon fill="currentColor" />,
    roles: ['admin'],
    anyPermissions: ['roles.view_list'],
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (isActive) => <SettingsIcon fill="currentColor" />,
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

function SidebarNavSkeleton() {
  return (
    <div className="w-fit space-y-1.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={`nav-skeleton-${index}`}
          className="flex w-10 items-center justify-center rounded-lg px-0 py-2"
        >
          <span className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { setLoading } = useAppLoader();
  const { hasPermission, hasAnyPermission, isLoadingCatalog } =
    usePermissions();
  const {
    markAllAsRead: syncMarkAllAsRead,
    recentNotifications,
    unreadCount: socketUnreadCount,
  } = useNotificationsSocket();
  const canViewProjectsList = hasPermission('projects.view_list');
  const canViewProjectDetail = hasPermission('projects.view_detail');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [headerActionOverride, setHeaderActionOverrideState] = useState<
    (() => void) | null
  >(null);
  const [headerCountOverride, setHeaderCountOverrideState] = useState<
    number | null
  >(null);
  const [isNotificationTrayOpen, setIsNotificationTrayOpen] = useState(false);
  const [notificationSearchValue, setNotificationSearchValue] = useState('');
  const [notificationFilter, setNotificationFilter] = useState<
    'all' | 'unread'
  >('all');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [allNotificationCount, setAllNotificationCount] = useState(0);
  const [searchAllCount, setSearchAllCount] = useState(0);
  const [searchUnreadCount, setSearchUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setNotificationLoading] = useState(true);
  const projectsQuery = useProjectsQuery(
    canViewProjectsList || canViewProjectDetail,
  );

  // const unreadNotificationsCount = useMemo(
  //   () => notifications.filter((notification) => !notification.isRead).length,
  //   [notifications],
  // );

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

  const desktopSidebarItems = useMemo(
    () => {
      const notificationItem = {
        href: '__notifications__',
        label: 'Notification',
        icon: (isActive: boolean) => (
          <NotificationBellIcon isActive={isActive} />
        ),
      };
      const settingsIndex = visibleNavigationItems.findIndex(
        (item) => item.href === '/settings',
      );

      if (settingsIndex === -1) {
        return [...visibleNavigationItems, notificationItem];
      }

      return [
        ...visibleNavigationItems.slice(0, settingsIndex),
        notificationItem,
        ...visibleNavigationItems.slice(settingsIndex),
      ];
    },
    [visibleNavigationItems],
  );

  useEffect(() => {
    const currentMainRoute = navigationItems.find(
      (item) => pathname === item.href,
    );

    if (
      isLoggingOut ||
      !isAuthenticated ||
      !currentMainRoute ||
      visibleNavigationItems.length === 0
    ) {
      return;
    }

    const canAccessCurrentRoute = visibleNavigationItems.some(
      (item) => item.href === currentMainRoute.href,
    );

    if (!canAccessCurrentRoute) {
      router.replace(visibleNavigationItems[0].href);
    }
  }, [isAuthenticated, isLoggingOut, pathname, router, visibleNavigationItems]);

  useEffect(() => {
    setIsNotificationTrayOpen(false);
  }, [pathname]);

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
    setIsLoggingOut(true);

    try {
      await dispatch(logoutThunk());
      queryClient.clear();
      await clearPersistedSession();
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
    }
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

  const isSidebarProjectsLoading =
    (canViewProjectsList || canViewProjectDetail) && projectsQuery.isLoading;
  const isSidebarLoading = isLoadingCatalog || isSidebarProjectsLoading;
  const shouldShowNoAccessPage =
    !isLoggingOut &&
    isAuthenticated &&
    !isLoadingCatalog &&
    visibleNavigationItems.length === 0;
  const shouldHideHeader =
    shouldShowNoAccessPage ||
    pathname?.startsWith('/tickets') ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/notifications') ||
    pathname?.startsWith('/settings') ||
    pathname?.startsWith('/users') ||
    pathname?.startsWith('/roles') ||
    pathname?.startsWith('/page-not-found') ||
    pathname?.startsWith('/projects');
  const canUseCurrentHeaderAction = currentHeader.action?.permission
    ? hasPermission(currentHeader.action.permission)
    : Boolean(currentHeader.action);
  const shouldShowHeaderAction = Boolean(
    headerActionOverride || (currentHeader.action && canUseCurrentHeaderAction),
  );
  const headerActionLabel = currentHeader.action?.label ?? '';

  const isMobile = useIsMobile();
  const hasNotificationSearch = notificationSearchValue.trim().length > 0;

  const load = useCallback(
    async (p: number, unreadOnlyFlag: boolean, searchTerm: string) => {
      if (!isAuthenticated) {
        setItems([]);
        setTotal(0);
        setNotificationLoading(false);
        return;
      }

      setNotificationLoading(true);

      const normalizedSearch = searchTerm.trim();

      if (normalizedSearch) {
        const searchParams = new URLSearchParams({
          query: normalizedSearch,
          limit: String(PAGE_SIZE),
          offset: String((p - 1) * PAGE_SIZE),
        });

        const res = await fetch(`/api/notifications/search?${searchParams}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        const data = (await res.json().catch(() => [])) as NotificationItem[];
        const nextItems = unreadOnlyFlag
          ? data.filter((item) => !item.isRead)
          : data;
        const unreadItemsCount = data.filter((item) => !item.isRead).length;

        setItems(nextItems);
        setTotal((p - 1) * PAGE_SIZE + nextItems.length);
        setSearchAllCount(data.length);
        setSearchUnreadCount(unreadItemsCount);
        setNotificationLoading(false);
        return;
      }

      const res = await fetch(
        `/api/notifications?page=${p}&limit=${PAGE_SIZE}&unreadOnly=${unreadOnlyFlag}`,
        {
          cache: 'no-store',
          credentials: 'include',
        },
      );
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
      if (!unreadOnlyFlag) {
        setAllNotificationCount(data.total);
      }
      setNotificationLoading(false);
    },
    [isAuthenticated],
  );

  useEffect(() => {
    setPage(1);
  }, [notificationSearchValue, unreadOnly]);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setTotal(0);
      setNotificationLoading(false);
      return;
    }

    load(page, unreadOnly, notificationSearchValue);
  }, [isAuthenticated, page, unreadOnly, load, notificationSearchValue]);

  useEffect(() => {
    if (!isAuthenticated || hasNotificationSearch) {
      return;
    }

    if (recentNotifications?.length > 0) {
      setItems((prev) => mergeNotificationsById(recentNotifications, prev));
    }
  }, [hasNotificationSearch, isAuthenticated, recentNotifications]);

  async function handleMarkAsRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async function handleMarkAllAsRead() {
    setItems((prev) => prev?.map((n) => ({ ...n, isRead: true })));
    syncMarkAllAsRead();
  }

  const visibleUnreadNotificationsCount = useMemo(
    () => items.filter((notification) => !notification.isRead).length,
    [items],
  );
  const unreadNotificationsCount = hasNotificationSearch
    ? searchUnreadCount
    : socketUnreadCount;
  const totalNotificationsCount = hasNotificationSearch
    ? searchAllCount
    : allNotificationCount;

  if (isLoggingOut || !isAuthenticated) {
    return null;
  }

  return (
    <DashboardHeaderActionContext.Provider value={headerActionContextValue}>
      <div className="flex h-dvh min-h-0  bg-gray-200 text-slate-900">
        {mobileOpen ? (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
        ) : null}
        <div className="hidden w-22.5 2xl:w-29.25  shrink-0 xl:block" />
        <aside
          className={`fixed inset-y-0  left-0 z-40 hidden xl:flex flex-col items-center gap-10 bg-gray-200 px-4  2xl:px-6 pt-4  2xl:pt-6 pb-4 2xl:pb-8 transition-transform duration-300 ease-out  ${
            mobileOpen ? '' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <button
            onClick={() => router.push('/dashboard')}
            className="2xl:min-w-16 2xl:min-h-16 max-h-16 max-w-16 w-10 h-10 bg-white rounded-full flex items-center justify-center"
          >
            <Image
              src={Images.index.logoIconImage}
              className="2xl:h-8 h-6 w-6 2xl:w-8"
              alt={'LOGO'}
            />
          </button>
          <div className="flex flex-col h-full  min-h-0 flex-1  justify-between">
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {isSidebarLoading ? (
                <SidebarNavSkeleton />
              ) : (
                <nav
                  className={`flex flex-col w-fit items-center gap-2.5 2xl:gap-4 scrollbar-hide`}
                >
                  {desktopSidebarItems.map((item) => {
                    const isNotificationItem =
                      item.href === '__notifications__';
                    const isActive = isNotificationItem
                      ? isNotificationTrayOpen ||
                        pathname?.startsWith('/notifications')
                      : pathname === item.href;

                    return (
                      <button
                        key={item.href}
                        onClick={() => {
                          setMobileOpen(false);

                          if (isNotificationItem) {
                            setIsNotificationTrayOpen(
                              (currentValue) => !currentValue,
                            );
                            return;
                          }

                          void router.push(item.href);
                        }}
                        className="flex w-fit flex-col items-center gap-1 2xl:gap-2 scrollbar-hide"
                        type="button"
                      >
                        <div
                          className={`2xl:w-13 2xl:h-13 w-10 relative h-10 rounded-full flex items-center justify-center transition
                             [&>svg]:h-5 [&>svg]:w-5
    2xl:[&>svg]:h-6 2xl:[&>svg]:w-6
                            ${
                              isActive
                                ? 'bg-linear-[271deg] from-aztec-purple  to-cyan-blue text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-primary'
                            }`}
                        >
                          {item.icon(isActive)}{' '}
                          {item.label === 'Notification' &&
                            unreadNotificationsCount > 0 && (
                              <span className="px-1.5 py-0.5 text-xs text-white -top-1 -inset-e-0.5 bg-red-500 rounded-full absolute">
                                {unreadNotificationsCount > 99
                                  ? '99+'
                                  : unreadNotificationsCount}
                              </span>
                            )}
                        </div>

                        <p
                          className={`2xl:text-sm text-xs transition text-gray-900`}
                        >
                          {item.label}
                        </p>
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>

            <div className="relativen self-center z-300">
              <Menu as="div" className="relative z-300">
                <MenuButton
                  className="flex 2xl:h-14 2xl:w-14 w-10 h-10 items-center justify-center rounded-full bg-white text-left outline-none ring-1 ring-gray-200 transition hover:bg-gray-50"
                  title={currentAccount.name}
                >
                  {/* fallback initials */}
                  <span className="flex 2xl:h-14 2xl:w-14 w-10 h-10 items-center justify-center rounded-full bg-linear-to-br from-slate-700 to-slate-950 text-sm font-semibold text-white">
                    {currentAccount.initials}
                  </span>
                </MenuButton>

                <MenuItems
                  anchor="top start"
                  className="z-300 mb-3 w-52 sm:w-66 origin-bottom-left rounded-xl bg-white p-1 ring-1 ring-gray-200 focus:outline-none"
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
          </div>
        </aside>

        <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden  bg-gray-200 transition-all duration-300 ease-out">
          {isNotificationTrayOpen ? (
            <Portal>
              <div
                className="fixed inset-0 z-200 xl:left-22.5 2xl:left-27.5"
                onClick={() => setIsNotificationTrayOpen(false)}
              >
                <div
                  className="pointer-events-auto h-full w-full sm:w-95"
                  onClick={(event) => event.stopPropagation()}
                >
                  <NotificationTray
                    activeFilter={notificationFilter}
                    items={items}
                    onChangeFilter={(value) => {
                      setNotificationFilter(value === 'all' ? 'all' : 'unread');
                      setUnreadOnly(value === 'all' ? false : true);
                    }}
                    onChangeSearch={setNotificationSearchValue}
                    onClose={() => setIsNotificationTrayOpen(false)}
                    onMarkAllAsRead={() => {
                      handleMarkAllAsRead();
                      setNotificationFilter('all');
                    }}
                    onViewAll={() => {
                      setIsNotificationTrayOpen(false);
                      void router.push('/notifications');
                    }}
                    onViewSingle={handleMarkAsRead}
                    searchValue={notificationSearchValue}
                    totalCount={totalNotificationsCount}
                    unreadCount={unreadNotificationsCount}
                  />
                </div>
              </div>
            </Portal>
          ) : null}
          <MobileTopHeader
            profileMenu={
              <Menu as="div" className="relative z-100">
                <MenuButton
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-left outline-none ring-1 ring-gray-200 transition hover:bg-gray-50"
                  title={currentAccount.name}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-br from-slate-700 to-slate-950 text-sm font-semibold text-white">
                    {currentAccount.initials}
                  </span>
                </MenuButton>

                <MenuItems
                  anchor="bottom end"
                  className="z-300 mt-3 w-52 origin-top-right rounded-xl bg-white p-1 ring-1 ring-gray-200 focus:outline-none sm:w-66"
                >
                  <MenuItem>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-black transition data-focus:bg-gray-50 sm:gap-3 md:text-base"
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
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 transition data-focus:bg-red-50 sm:gap-3 md:text-base"
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
            }
            onNotificaitonClick={() =>
              setIsNotificationTrayOpen(!isNotificationTrayOpen)
            }
            unreadNotificationsCount={unreadNotificationsCount}
          />
          {!shouldHideHeader ? (
            <header className="sticky top-0 z-20 border-b border-gray-200 bg-white w-full backdrop-blur">
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
            className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
              shouldHideHeader ? '' : 'xl:pt-28'
            }`}
          >
            {shouldShowNoAccessPage ? <NoAccessPage /> : children}
          </main>
          <MobileBottomNavigation
            items={visibleNavigationItems}
            isLoading={isSidebarLoading}
          />
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

function mergeNotificationsById(
  incoming: NotificationItem[],
  existing: NotificationItem[],
) {
  const merged = [...incoming, ...existing];
  const seen = new Set<string>();

  return merged.filter((notification) => {
    if (seen.has(notification.id)) {
      return false;
    }

    seen.add(notification.id);
    return true;
  });
}

// function RolesIcon({
//   fill = 'currentColor',
//   opacity = '0.4',
// }: {
//   fill?: string;
//   opacity?: string;
// }) {
//   return (
//     <svg
//       width="26"
//       height="26"
//       viewBox="0 0 26 26"
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//     >
//       <g opacity={opacity}>
//         <path
//           d="M9.20822 9.20833C9.20822 10.7041 7.99566 11.9167 6.49989 11.9167C5.00412 11.9167 3.79155 10.7041 3.79155 9.20833C3.79155 7.71256 5.00412 6.5 6.49989 6.5C7.99566 6.5 9.20822 7.71256 9.20822 9.20833Z"
//           fill={fill}
//         />
//         <path
//           d="M22.2082 9.20833C22.2082 10.7041 20.9957 11.9167 19.4999 11.9167C18.0041 11.9167 16.7916 10.7041 16.7916 9.20833C16.7916 7.71256 18.0041 6.5 19.4999 6.5C20.9957 6.5 22.2082 7.71256 22.2082 9.20833Z"
//           fill={fill}
//         />
//         <path
//           d="M8.38015 16.5955C8.5194 16.5137 8.64725 16.4385 8.75734 16.3705C11.3531 14.7654 14.6467 14.7654 17.2424 16.3705C17.3525 16.4385 17.4804 16.5137 17.6196 16.5955C18.8805 17.3364 21.0758 18.6264 19.484 20.2014C18.6205 21.0557 17.6587 21.6667 16.4496 21.6667H9.55015C8.34103 21.6667 7.37931 21.0557 6.51581 20.2014C4.92393 18.6264 7.1193 17.3364 8.38015 16.5955Z"
//           fill={fill}
//         />
//       </g>
//       <path
//         fillRule="evenodd"
//         clipRule="evenodd"
//         d="M8.39572 8.12501C8.39572 5.5822 10.4571 3.52084 12.9999 3.52084C15.5427 3.52084 17.6041 5.5822 17.6041 8.12501C17.6041 10.6678 15.5427 12.7292 12.9999 12.7292C10.4571 12.7292 8.39572 10.6678 8.39572 8.12501ZM12.9999 5.14584C11.3545 5.14584 10.0207 6.47966 10.0207 8.12501C10.0207 9.77036 11.3545 11.1042 12.9999 11.1042C14.6452 11.1042 15.9791 9.77036 15.9791 8.12501C15.9791 6.47966 14.6452 5.14584 12.9999 5.14584Z"
//         fill={fill}
//       />
//       <path
//         fillRule="evenodd"
//         clipRule="evenodd"
//         d="M8.33019 15.6794C11.1878 13.9124 14.8123 13.9124 17.6699 15.6794C17.7541 15.7315 17.8608 15.7939 17.9834 15.8656C18.5383 16.1904 19.4194 16.7059 20.0205 17.317C20.3981 17.7007 20.7747 18.2239 20.8433 18.8762C20.9168 19.574 20.6206 20.22 20.0556 20.779C19.1221 21.7025 17.9659 22.4792 16.4498 22.4792H9.55031C8.03423 22.4792 6.87795 21.7025 5.94453 20.779C5.3795 20.22 5.08331 19.574 5.15677 18.8762C5.22542 18.2239 5.60199 17.7007 5.97956 17.317C6.5807 16.7059 7.46165 16.1904 8.01661 15.8657C8.13922 15.7939 8.24593 15.7315 8.33019 15.6794ZM16.8153 17.0615C14.4814 15.6184 11.5187 15.6184 9.18481 17.0615C9.04472 17.1481 8.89451 17.2367 8.73952 17.3281C8.18499 17.6551 7.56935 18.0181 7.13795 18.4566C6.87254 18.7264 6.78579 18.9233 6.77284 19.0463C6.76468 19.1238 6.76859 19.3084 7.08741 19.6238C7.88099 20.4089 8.64816 20.8542 9.55031 20.8542H16.4498C17.3519 20.8542 18.1191 20.4089 18.9127 19.6238C19.2315 19.3084 19.2354 19.1238 19.2273 19.0463C19.2143 18.9233 19.1275 18.7264 18.8621 18.4566C18.4307 18.0181 17.8152 17.6551 17.2606 17.3281C17.1056 17.2367 16.9554 17.1482 16.8153 17.0615Z"
//         fill={fill}
//       />
//       <path
//         d="M2.43743 9.20834C2.43743 7.26384 4.01376 5.68751 5.95826 5.68751C6.407 5.68751 6.77076 6.05128 6.77076 6.50001C6.77076 6.94874 6.407 7.31251 5.95826 7.31251C4.91122 7.31251 4.06243 8.1613 4.06243 9.20834C4.06243 10.2554 4.91122 11.1042 5.95826 11.1042C6.407 11.1042 6.77076 11.4679 6.77076 11.9167C6.77076 12.3654 6.407 12.7292 5.95826 12.7292C4.01376 12.7292 2.43743 11.1528 2.43743 9.20834Z"
//         fill={fill}
//       />
//       <path
//         d="M5.34339 13.2741C5.7903 13.2337 6.18536 13.5632 6.22579 14.0101C6.26622 14.457 5.93671 14.8521 5.4898 14.8925C4.79614 14.9553 4.09775 15.2232 3.45819 15.7157C3.35514 15.7951 3.24818 15.8737 3.14031 15.953C2.77241 16.2234 2.3939 16.5016 2.12389 16.8434C1.96358 17.0463 1.90629 17.1988 1.89719 17.3065C1.89025 17.3886 1.90195 17.5331 2.08847 17.7629C2.62514 18.4241 3.06192 18.6875 3.49472 18.6875C3.94345 18.6875 4.30722 19.0513 4.30722 19.5C4.30722 19.9487 3.94345 20.3125 3.49472 20.3125C2.30403 20.3125 1.4495 19.5542 0.826745 18.7869C0.419891 18.2857 0.230117 17.7357 0.277965 17.1697C0.323652 16.6291 0.577411 16.1796 0.848767 15.8361C1.27345 15.2985 1.90351 14.8401 2.27259 14.5716C2.35031 14.5151 2.41653 14.4669 2.46674 14.4282C3.33806 13.7573 4.32665 13.3661 5.34339 13.2741Z"
//         fill={fill}
//       />
//       <path
//         d="M18.6874 6.50001C18.6874 6.05128 19.0512 5.68751 19.4999 5.68751C21.4444 5.68751 23.0207 7.26384 23.0207 9.20834C23.0207 11.1528 21.4444 12.7292 19.4999 12.7292C19.0512 12.7292 18.6874 12.3654 18.6874 11.9167C18.6874 11.4679 19.0512 11.1042 19.4999 11.1042C20.5469 11.1042 21.3957 10.2554 21.3957 9.20834C21.3957 8.1613 20.5469 7.31251 19.4999 7.31251C19.0512 7.31251 18.6874 6.94874 18.6874 6.50001Z"
//         fill={fill}
//       />
//       <path
//         d="M19.774 14.0101C19.8145 13.5632 20.2095 13.2337 20.6564 13.2741C21.6732 13.3661 22.6618 13.7573 23.5331 14.4282C23.5833 14.4669 23.6494 14.515 23.7271 14.5715C24.0962 14.84 24.7264 15.2985 25.151 15.8361C25.4224 16.1796 25.6762 16.6291 25.7219 17.1697C25.7697 17.7357 25.5799 18.2857 25.1731 18.7869C24.5503 19.5542 23.6958 20.3125 22.5051 20.3125C22.0564 20.3125 21.6926 19.9487 21.6926 19.5C21.6926 19.0513 22.0564 18.6875 22.5051 18.6875C22.9379 18.6875 23.3747 18.4241 23.9113 17.7629C24.0979 17.5331 24.1096 17.3886 24.1026 17.3065C24.0935 17.1988 24.0362 17.0463 23.8759 16.8434C23.6059 16.5016 23.2274 16.2234 22.8595 15.953C22.7517 15.8737 22.6447 15.7951 22.5416 15.7157C21.9021 15.2232 21.2037 14.9553 20.51 14.8925C20.0631 14.8521 19.7336 14.457 19.774 14.0101Z"
//         fill={fill}
//       />
//     </svg>
//   );
// }
