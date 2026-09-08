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
  ProfileIcon,
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
import NotificationTray, {
  NotificationBellIcon,
  type NotificationGroup,
  type NotificationGroupCategory,
} from './NotificationTray';
import Portal from '../modals/portal';
import { appToast } from '../toast/AppToast';
import ThemeButton from '../ui/ThemeButton';
import { useIsMobile } from '../hooks/useIsMobile';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import MobileBottomNavigation from './MobileBottomNavigation';
import MobileTopHeader from './MobileTopHeader';
import { useNotificationsSocket } from '../../app/providers/NotificationsSocketProvider';
import EmptyState from '../EmptyState';

const PAGE_SIZE = 20;
const INITIAL_GROUP_PAGE_SIZE = 20;

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

type NotificationCategoryCounts = Record<NotificationGroupCategory, number>;

type NotificationCountSummary = {
  totalCount: number;
  totalUnreadCount: number;
  categoryUnreadCounts: NotificationCategoryCounts;
};

type CategorizedNotificationBucket = {
  items: NotificationItem[];
  hasMore: boolean;
  cursor: string | null;
};

type CategorizedNotificationResponse = Partial<
  Record<NotificationGroupCategory, CategorizedNotificationBucket>
>;

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
  {
    href: '/profile',
    title: 'Profile',
    subtitle: 'Manage your personal account details.',
  },
];

const fallbackAccount = {
  name: 'Admin',
  email: 'admin@gmail.com',
};

const notificationCategoryLabels: Record<NotificationGroupCategory, string> = {
  tickets: 'Tickets',
  ticket_replies: 'Ticket Replies',
  threads: 'Threads',
  mentions: 'Mentions',
  projects: 'Projects',
  internal_messages: 'Internal Messages',
  members: 'Members',
  events: 'Events',
};

const emptyNotificationCategoryCounts: NotificationCategoryCounts = {
  projects: 0,
  threads: 0,
  tickets: 0,
  ticket_replies: 0,
  internal_messages: 0,
  mentions: 0,
  members: 0,
  events: 0,
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
  const debouncedNotificationSearchValue = useDebouncedValue(
    notificationSearchValue,
  );
  const [notificationFilter, setNotificationFilter] = useState<
    'all' | 'unread'
  >('all');
  const [searchItems, setSearchItems] = useState<NotificationItem[]>([]);
  const [groupedItems, setGroupedItems] = useState<NotificationGroup[]>([]);
  const [categoryUnreadCounts, setCategoryUnreadCounts] =
    useState<NotificationCategoryCounts>(emptyNotificationCategoryCounts);
  const [allNotificationCount, setAllNotificationCount] = useState(0);
  const [totalUnreadNotificationCount, setTotalUnreadNotificationCount] =
    useState(0);
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
  const canShowNotificationEntry =
    !isLoggingOut &&
    isAuthenticated &&
    !isLoadingCatalog &&
    visibleNavigationItems.length > 0;

  const desktopSidebarItems = useMemo(() => {
    const notificationItem = {
      href: '__notifications__',
      label: 'Notification',
      icon: (isActive: boolean) => <NotificationBellIcon isActive={isActive} />,
    };
    const settingsIndex = visibleNavigationItems.findIndex(
      (item) => item.href === '/settings',
    );

    if (settingsIndex === -1) {
      return canShowNotificationEntry
        ? [...visibleNavigationItems, notificationItem]
        : visibleNavigationItems;
    }

    return [
      ...visibleNavigationItems.slice(0, settingsIndex),
      ...(canShowNotificationEntry ? [notificationItem] : []),
      ...visibleNavigationItems.slice(settingsIndex),
    ];
  }, [canShowNotificationEntry, visibleNavigationItems]);

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

  useEffect(() => {
    if (!canShowNotificationEntry && isNotificationTrayOpen) {
      setIsNotificationTrayOpen(false);
    }
  }, [canShowNotificationEntry, isNotificationTrayOpen]);

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

  const handleOpenProfile = () => {
    void router.push('/profile');
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
    pathname?.startsWith('/profile') ||
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

  const loadCategoryUnreadCounts = useCallback(async () => {
    const response = await fetch('/api/notifications/unread-count', {
      cache: 'no-store',
      credentials: 'include',
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          totalCount?: number;
          totalUnreadCount?: number;
          categoryUnreadCounts?: Partial<
            Record<NotificationGroupCategory, number>
          >;
          message?: string;
        }
      | { message?: string }
      | null;

    if (!response.ok) {
      throw new Error(
        payload && 'message' in payload
          ? payload.message || 'Failed to fetch unread notification counts.'
          : 'Failed to fetch unread notification counts.',
      );
    }

    const normalizedSummary = normalizeNotificationCountSummary(payload);
    setCategoryUnreadCounts(normalizedSummary.categoryUnreadCounts);
    setAllNotificationCount(normalizedSummary.totalCount);
    setTotalUnreadNotificationCount(normalizedSummary.totalUnreadCount);
    return normalizedSummary;
  }, []);

  const load = useCallback(
    async (unreadOnlyFlag: boolean, searchTerm: string) => {
      if (!isAuthenticated) {
        setSearchItems([]);
        setGroupedItems([]);
        setNotificationLoading(false);
        return;
      }

      setNotificationLoading(true);

      const normalizedSearch = searchTerm.trim();

      if (normalizedSearch) {
        const searchParams = new URLSearchParams({
          query: normalizedSearch,
          limit: String(PAGE_SIZE),
          offset: '0',
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

        setSearchItems(nextItems);
        setGroupedItems([]);
        setSearchAllCount(data.length);
        setSearchUnreadCount(unreadItemsCount);
        setNotificationLoading(false);
        return;
      }

      const groupedSearchParams = new URLSearchParams({
        grouped: 'true',
        limit: String(INITIAL_GROUP_PAGE_SIZE),
        unreadOnly: String(unreadOnlyFlag),
      });
      const [categorizedResponse, countSummary] = await Promise.all([
        fetch(`/api/notifications?${groupedSearchParams}`, {
          cache: 'no-store',
          credentials: 'include',
        }).then((response) => response.json()),
        loadCategoryUnreadCounts(),
      ]);
      const nextGroupedItems = mapCategorizedResponseToGroups(
        categorizedResponse,
        countSummary.categoryUnreadCounts,
      );
      setSearchItems([]);
      setGroupedItems(nextGroupedItems);
      setAllNotificationCount(countSummary.totalCount);
      setTotalUnreadNotificationCount(countSummary.totalUnreadCount);
      setNotificationLoading(false);
    },
    [isAuthenticated, loadCategoryUnreadCounts],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setSearchItems([]);
      setGroupedItems([]);
      setNotificationLoading(false);
      return;
    }

    load(unreadOnly, debouncedNotificationSearchValue);
  }, [isAuthenticated, unreadOnly, load, debouncedNotificationSearchValue]);

  useEffect(() => {
    if (!isAuthenticated || hasNotificationSearch) {
      return;
    }

    if (recentNotifications?.length > 0) {
      void load(unreadOnly, '');
    }
  }, [
    hasNotificationSearch,
    isAuthenticated,
    load,
    recentNotifications,
    unreadOnly,
  ]);

  async function handleLoadMoreGroup(
    category: NotificationGroupCategory,
    cursor: string | null,
  ) {
    if (!cursor) {
      return;
    }

    setGroupedItems((currentGroups) =>
      currentGroups.map((group) =>
        group.category === category ? { ...group, isLoadingMore: true } : group,
      ),
    );

    try {
      const searchParams = new URLSearchParams({
        category,
        limit: String(INITIAL_GROUP_PAGE_SIZE),
        unreadOnly: String(unreadOnly),
      });
      searchParams.set('cursor', cursor);
      const response = await fetch(`/api/notifications?${searchParams}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.message || 'Failed to load more notifications.',
        );
      }

      setGroupedItems((currentGroups) =>
        currentGroups.map((group) => {
          if (group.category !== category) {
            return group;
          }

          return {
            ...group,
            items: appendNotificationsById(
              group.items,
              extractCategorizedBucketItems(payload, category),
            ),
            nextCursor: extractCategorizedBucketCursor(payload, category),
            hasMore: extractCategorizedBucketHasMore(payload, category),
            isLoadingMore: false,
          };
        }),
      );
    } catch (error) {
      setGroupedItems((currentGroups) =>
        currentGroups.map((group) =>
          group.category === category
            ? { ...group, isLoadingMore: false }
            : group,
        ),
      );
      appToast.error(
        error instanceof Error
          ? error.message
          : 'Failed to load more notifications.',
      );
    }
  }

  async function handleMarkAsRead(id: string) {
    setSearchItems((prev) =>
      unreadOnly
        ? prev.filter((n) => n.id !== id)
        : prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setGroupedItems((prev) =>
      prev.map((group) => {
        const containsUnreadTarget = group.items.some(
          (item) => item.id === id && !item.isRead,
        );

        if (!containsUnreadTarget) {
          return {
            ...group,
            items: unreadOnly
              ? group.items.filter((item) => item.id !== id)
              : group.items.map((item) =>
                  item.id === id ? { ...item, isRead: true } : item,
                ),
          };
        }

        return {
          ...group,
          count: Math.max(0, group.count - 1),
          items: unreadOnly
            ? group.items.filter((item) => item.id !== id)
            : group.items.map((item) =>
                item.id === id ? { ...item, isRead: true } : item,
              ),
        };
      }),
    );
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
    await loadCategoryUnreadCounts().catch(() => undefined);
  }

  async function handleMarkAllAsRead() {
    setSearchItems((prev) =>
      unreadOnly
        ? []
        : prev.map((notification) => ({ ...notification, isRead: true })),
    );
    setGroupedItems((prev) =>
      prev.map((group) => ({
        ...group,
        count: 0,
        items: unreadOnly
          ? []
          : group.items.map((notification) => ({
              ...notification,
              isRead: true,
            })),
        hasMore: unreadOnly ? false : group.hasMore,
        nextCursor: unreadOnly ? null : group.nextCursor,
      })),
    );
    syncMarkAllAsRead();
    setCategoryUnreadCounts(emptyNotificationCategoryCounts);
    setTotalUnreadNotificationCount(0);
  }

  const unreadNotificationsCount = hasNotificationSearch
    ? searchUnreadCount
    : totalUnreadNotificationCount || socketUnreadCount;
  const totalNotificationsCount = hasNotificationSearch
    ? searchAllCount
    : allNotificationCount;

  if (isLoggingOut || !isAuthenticated) {
    return null;
  }

  return (
    <DashboardHeaderActionContext.Provider value={headerActionContextValue}>
      <div className="flex h-dvh min-h-0  bg-gray-200 text-slate-900">
        {mobileOpen && !shouldShowNoAccessPage ? (
          <button
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
        ) : null}
        {!shouldShowNoAccessPage ? (
          <>
            <div className="hidden w-22.5 2xl:w-29.25  shrink-0 xl:block" />
            <aside
              className={`fixed inset-y-0  left-0 z-40 hidden xl:flex flex-col items-center gap-4 2xl:gap-6 bg-gray-200 px-4  2xl:px-6 pt-4  2xl:pt-6 pb-4 2xl:pb-8 transition-transform duration-300 ease-out  ${
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
                          onClick={handleOpenProfile}
                          type="button"
                        >
                          <svg
                            width={isMobile ? '20' : '24'}
                            height={isMobile ? '20' : '24'}
                            viewBox="0 0 18 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M9 0.9375C6.82538 0.9375 5.0625 2.70038 5.0625 4.875C5.0625 7.04962 6.82538 8.8125 9 8.8125C11.1746 8.8125 12.9375 7.04962 12.9375 4.875C12.9375 2.70038 11.1746 0.9375 9 0.9375ZM6.1875 4.875C6.1875 3.3217 7.4467 2.0625 9 2.0625C10.5533 2.0625 11.8125 3.3217 11.8125 4.875C11.8125 6.4283 10.5533 7.6875 9 7.6875C7.4467 7.6875 6.1875 6.4283 6.1875 4.875Z"
                              fill="#111827"
                            />
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M13.6716 11.3094C13.5497 11.2406 13.4419 11.1798 13.3547 11.1279C10.6892 9.54071 7.31107 9.54071 4.64553 11.1279C4.5583 11.1798 4.45054 11.2406 4.32854 11.3094C3.79393 11.6111 2.9858 12.067 2.43217 12.6089C2.08592 12.9478 1.75693 13.3944 1.69712 13.9416C1.63352 14.5235 1.88736 15.0695 2.39663 15.5547C3.27521 16.3917 4.32955 17.0625 5.69328 17.0625H12.307C13.6707 17.0625 14.725 16.3917 15.6036 15.5547C16.1129 15.0695 16.3667 14.5235 16.3031 13.9416C16.2433 13.3944 15.9143 12.9478 15.5681 12.6089C15.0145 12.067 14.2062 11.611 13.6716 11.3094ZM5.2211 12.0945C7.53198 10.7185 10.4683 10.7185 12.7792 12.0945C12.9051 12.1695 13.0431 12.2477 13.1876 12.3297C13.722 12.6329 14.3461 12.987 14.7812 13.4128C15.0512 13.6772 15.1664 13.8953 15.1848 14.0638C15.1994 14.1976 15.1656 14.4182 14.8276 14.7402C14.0507 15.4803 13.2613 15.9375 12.307 15.9375H5.69328C4.73895 15.9375 3.94952 15.4803 3.17263 14.7402C2.83466 14.4182 2.80084 14.1976 2.81546 14.0638C2.83388 13.8953 2.94901 13.6772 3.21911 13.4128C3.65417 12.987 4.27819 12.633 4.81265 12.3298C4.95715 12.2478 5.0952 12.1695 5.2211 12.0945Z"
                              fill="#111827"
                            />
                          </svg>
                          Profile
                        </button>
                      </MenuItem>

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
          </>
        ) : null}

        <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden  bg-gray-200 transition-all duration-300 ease-out">
          {canShowNotificationEntry && isNotificationTrayOpen ? (
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
                    groupedItems={groupedItems}
                    isLoading={loading}
                    onChangeFilter={(value) => {
                      setNotificationFilter(value === 'all' ? 'all' : 'unread');
                      setUnreadOnly(value === 'all' ? false : true);
                    }}
                    onChangeSearch={setNotificationSearchValue}
                    onClose={() => setIsNotificationTrayOpen(false)}
                    onLoadMoreGroup={handleLoadMoreGroup}
                    onMarkAllAsRead={() => {
                      handleMarkAllAsRead();
                      setNotificationFilter('all');
                    }}
                    onViewAll={() => {
                      setIsNotificationTrayOpen(false);
                      void router.push('/notifications');
                    }}
                    onViewSingle={handleMarkAsRead}
                    searchItems={searchItems}
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
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-left outline-none ring-1 ring-gray-200 transition hover:bg-gray-50"
                  title={currentAccount.name}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-slate-700 to-slate-950 text-sm font-semibold text-white">
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
                      onClick={handleOpenProfile}
                      type="button"
                    >
                      <svg
                        width={isMobile ? '20' : '24'}
                        height={isMobile ? '20' : '24'}
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M9 0.9375C6.82538 0.9375 5.0625 2.70038 5.0625 4.875C5.0625 7.04962 6.82538 8.8125 9 8.8125C11.1746 8.8125 12.9375 7.04962 12.9375 4.875C12.9375 2.70038 11.1746 0.9375 9 0.9375ZM6.1875 4.875C6.1875 3.3217 7.4467 2.0625 9 2.0625C10.5533 2.0625 11.8125 3.3217 11.8125 4.875C11.8125 6.4283 10.5533 7.6875 9 7.6875C7.4467 7.6875 6.1875 6.4283 6.1875 4.875Z"
                          fill="#111827"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M13.6716 11.3094C13.5497 11.2406 13.4419 11.1798 13.3547 11.1279C10.6892 9.54071 7.31107 9.54071 4.64553 11.1279C4.5583 11.1798 4.45054 11.2406 4.32854 11.3094C3.79393 11.6111 2.9858 12.067 2.43217 12.6089C2.08592 12.9478 1.75693 13.3944 1.69712 13.9416C1.63352 14.5235 1.88736 15.0695 2.39663 15.5547C3.27521 16.3917 4.32955 17.0625 5.69328 17.0625H12.307C13.6707 17.0625 14.725 16.3917 15.6036 15.5547C16.1129 15.0695 16.3667 14.5235 16.3031 13.9416C16.2433 13.3944 15.9143 12.9478 15.5681 12.6089C15.0145 12.067 14.2062 11.611 13.6716 11.3094ZM5.2211 12.0945C7.53198 10.7185 10.4683 10.7185 12.7792 12.0945C12.9051 12.1695 13.0431 12.2477 13.1876 12.3297C13.722 12.6329 14.3461 12.987 14.7812 13.4128C15.0512 13.6772 15.1664 13.8953 15.1848 14.0638C15.1994 14.1976 15.1656 14.4182 14.8276 14.7402C14.0507 15.4803 13.2613 15.9375 12.307 15.9375H5.69328C4.73895 15.9375 3.94952 15.4803 3.17263 14.7402C2.83466 14.4182 2.80084 14.1976 2.81546 14.0638C2.83388 13.8953 2.94901 13.6772 3.21911 13.4128C3.65417 12.987 4.27819 12.633 4.81265 12.3298C4.95715 12.2478 5.0952 12.1695 5.2211 12.0945Z"
                          fill="#111827"
                        />
                      </svg>
                      Profile
                    </button>
                  </MenuItem>

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
            showNotifications={canShowNotificationEntry}
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
          {!shouldShowNoAccessPage ? (
            <MobileBottomNavigation
              items={visibleNavigationItems}
              isLoading={isSidebarLoading}
            />
          ) : null}
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
    <div className="xl:py-5 xl:pr-5 px-4 pt-2 pb-0 z-100 h-full xl:h-dvh relative">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden xl:rounded-2xl  bg-gray-200 xl:flex-row xl:border xl:border-white xl:bg-white xl:p-3">
        <div className="flex items-center w-120 mx-auto">
          <EmptyState
            imageUrl="/images/noPermissionIllu.svg"
            imageAlt="No permissions available"
            title="No permissions available"
            description="Your account does not currently have access to any page in this workspace. Please contact your administrator to assign the required permissions.
"
            buttonLabel="New Project"
          />
        </div>
      </div>
    </div>
  );
}

function ProfileMenuIcon({ width = '24', height = '24' }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
      <span style={{ height, width }}>
        <ProfileIcon />
      </span>
    </span>
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

function appendNotificationsById(
  existing: NotificationItem[],
  incoming: NotificationItem[],
) {
  const merged = [...existing, ...incoming];
  const seen = new Set<string>();

  return merged.filter((notification) => {
    if (seen.has(notification.id)) {
      return false;
    }

    seen.add(notification.id);
    return true;
  });
}

function mapCategorizedResponseToGroups(
  payload: unknown,
  categoryCounts: NotificationCategoryCounts,
): NotificationGroup[] {
  const normalizedPayload = isCategorizedNotificationResponse(payload)
    ? payload
    : {};

  return (
    Object.keys(notificationCategoryLabels) as NotificationGroupCategory[]
  )
    .slice(0, 6)
    .map((category) => {
      const bucket = normalizedPayload[category];

      return {
        category,
        label: notificationCategoryLabels[category],
        count: categoryCounts[category] ?? 0,
        items: Array.isArray(bucket?.items) ? bucket.items : [],
        nextCursor: typeof bucket?.cursor === 'string' ? bucket.cursor : null,
        hasMore: Boolean(bucket?.hasMore),
      };
    });
}

function isCategorizedNotificationResponse(
  value: unknown,
): value is CategorizedNotificationResponse {
  return Boolean(value && typeof value === 'object');
}

function extractCategorizedBucket(
  payload: unknown,
  category: NotificationGroupCategory,
): CategorizedNotificationBucket | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (category in (payload as Record<string, unknown>)) {
    const bucket = (payload as Record<string, unknown>)[category];

    if (bucket && typeof bucket === 'object') {
      return bucket as CategorizedNotificationBucket;
    }
  }

  if (
    'items' in (payload as Record<string, unknown>) ||
    'hasMore' in (payload as Record<string, unknown>) ||
    'cursor' in (payload as Record<string, unknown>)
  ) {
    return payload as CategorizedNotificationBucket;
  }

  return null;
}

function extractCategorizedBucketItems(
  payload: unknown,
  category: NotificationGroupCategory,
) {
  const bucket = extractCategorizedBucket(payload, category);
  return Array.isArray(bucket?.items) ? bucket.items : [];
}

function extractCategorizedBucketCursor(
  payload: unknown,
  category: NotificationGroupCategory,
) {
  const bucket = extractCategorizedBucket(payload, category);
  return typeof bucket?.cursor === 'string' ? bucket.cursor : null;
}

function extractCategorizedBucketHasMore(
  payload: unknown,
  category: NotificationGroupCategory,
) {
  const bucket = extractCategorizedBucket(payload, category);
  return Boolean(bucket?.hasMore);
}

function normalizeNotificationCountSummary(
  payload: {
    totalCount?: number;
    totalUnreadCount?: number;
    categoryUnreadCounts?: Partial<Record<NotificationGroupCategory, number>>;
    message?: string;
  } | null,
): NotificationCountSummary {
  const source =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {};
  const categorySource =
    source.categoryUnreadCounts &&
    typeof source.categoryUnreadCounts === 'object'
      ? (source.categoryUnreadCounts as Record<string, unknown>)
      : {};

  return {
    totalCount: Number(source.totalCount ?? 0),
    totalUnreadCount: Number(source.totalUnreadCount ?? 0),
    categoryUnreadCounts: {
      projects: Number(categorySource.projects ?? 0),
      threads: Number(categorySource.threads ?? 0),
      tickets: Number(categorySource.tickets ?? 0),
      ticket_replies: Number(categorySource.ticket_replies ?? 0),
      internal_messages: Number(categorySource.internal_messages ?? 0),
      mentions: Number(categorySource.mentions ?? 0),
      members: Number(categorySource.members ?? 0),
      events: Number(categorySource.events ?? 0),
    },
  };
}
