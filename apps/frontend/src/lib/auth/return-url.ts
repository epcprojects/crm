import type { UserProfile } from '../../app/Redux/slices/auth/types';

export const DEFAULT_POST_LOGIN_PATH = '/dashboard';

const PUBLIC_ROUTES = [
  '/login',
  '/set-password',
  '/auth/set-password',
  '/auth/accept-invite',
] as const;

function isExactOrNested(pathname: string, baseRoute: string) {
  return pathname === baseRoute || pathname.startsWith(`${baseRoute}/`);
}

export function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => isExactOrNested(pathname, route));
}

export function sanitizeReturnUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (
    !trimmedValue ||
    !trimmedValue.startsWith('/') ||
    trimmedValue.startsWith('//') ||
    /[\r\n]/.test(trimmedValue)
  ) {
    return null;
  }

  try {
    const url = new URL(trimmedValue, 'http://localhost');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function getLoginPathWithReturnUrl(pathname: string, search = '') {
  const returnUrl = sanitizeReturnUrl(`${pathname}${search}`);

  if (!returnUrl || returnUrl === '/' || isPublicRoute(pathname)) {
    return '/login';
  }

  return `/login?returnurl=${encodeURIComponent(returnUrl)}`;
}

export async function resolveAuthorizedReturnUrl(
  returnUrl: string | null | undefined,
  user?: Pick<UserProfile, 'permissions'> | null,
) {
  const safeReturnUrl = sanitizeReturnUrl(returnUrl);

  if (!safeReturnUrl) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  const parsedUrl = new URL(safeReturnUrl, window.location.origin);

  if (
    parsedUrl.pathname === '/' ||
    isPublicRoute(parsedUrl.pathname)
  ) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  const hasAccess = await canAccessRoute(parsedUrl, user);

  if (!hasAccess) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
}

async function canAccessRoute(
  url: URL,
  user?: Pick<UserProfile, 'permissions'> | null,
) {
  const permissions = (user?.permissions ?? []).map(normalizePermission);
  const ticketMatch = url.pathname.match(/^\/tickets\/([^/]+)$/);

  if (ticketMatch) {
    if (!permissions.includes('tickets.view_detail')) {
      return false;
    }

    const projectId = url.searchParams.get('projectId')?.trim();

    if (!projectId) {
      return false;
    }

    return canAccessApiRoute(
      `/api/projects/${encodeURIComponent(projectId)}/tickets/${encodeURIComponent(ticketMatch[1])}`,
    );
  }

  const projectMatch = url.pathname.match(/^\/projects\/([^/]+)$/);

  if (projectMatch) {
    if (!permissions.includes('projects.view_detail')) {
      return false;
    }

    return canAccessApiRoute(
      `/api/projects/${encodeURIComponent(projectMatch[1])}`,
    );
  }

  return true;
}

async function canAccessApiRoute(pathname: string) {
  try {
    const response = await fetch(pathname, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    return response.ok;
  } catch {
    return false;
  }
}

function normalizePermission(permission: string) {
  return permission.replace(/:/g, '.').trim();
}
