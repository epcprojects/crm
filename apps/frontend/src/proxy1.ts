import { NextRequest, NextResponse } from 'next/server';

enum OrgUserRole {
  ORG_ADMIN = 'ORG_ADMIN',
  ORG_MEMBER = 'ORG_MEMBER',
  ORG_VIEWER = 'ORG_VIEWER',
}

enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

type JwtPayload = {
  exp?: number;
  roles?: string[];
};

const ACCESS_TOKEN_COOKIE = 'access_token';

const PUBLIC_ROUTES = [
  '/login',
  '/set-password',
  '/auth/set-password',
  '/auth/accept-invite',
];
const ADMIN_ROUTES = ['/dashboard', '/organizations', '/ledger', '/users'];
const USER_ROUTES = ['/score', '/viable'];
const SUPER_ADMIN_ONLY_ROUTES = ['/users'];

function isExactOrNested(pathname: string, baseRoute: string) {
  return pathname === baseRoute || pathname.startsWith(`${baseRoute}/`);
}

function isRouteInSet(pathname: string, routes: string[]) {
  return routes.some((route) => isExactOrNested(pathname, route));
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payloadJson = atob(padded);

    return JSON.parse(payloadJson) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(exp?: number) {
  if (!exp) return true;
  return exp * 1000 <= Date.now();
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tokenParam = request.nextUrl.searchParams.get('token')?.trim();
  const isPasswordTokenRoute =
    pathname === '/set-password' ||
    pathname === '/auth/set-password' ||
    pathname === '/auth/accept-invite';

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const payload = token ? decodeJwtPayload(token) : null;
  const roles = payload?.roles ?? [];
  const isAuthenticated = Boolean(token && payload && !isTokenExpired(payload.exp));

  const isAdmin = roles.some((role) =>
    Object.values(AdminRole).includes(role as AdminRole),
  );
  const isOrgUser = roles.some((role) =>
    Object.values(OrgUserRole).includes(role as OrgUserRole),
  );

  const isPublicRoute = isRouteInSet(pathname, PUBLIC_ROUTES);
  const isAdminRoute = isRouteInSet(pathname, ADMIN_ROUTES);
  const isUserRoute = isRouteInSet(pathname, USER_ROUTES);
  const isSuperAdminOnlyRoute = isRouteInSet(pathname, SUPER_ADMIN_ONLY_ROUTES);
  const isSuperAdmin = roles.some((role) => role === AdminRole.SUPER_ADMIN);

  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthenticated && isPublicRoute) {
    if (isPasswordTokenRoute && tokenParam) {
      return NextResponse.next();
    }

    if (isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (isOrgUser) {
      return NextResponse.redirect(new URL('/viable', request.url));
    }
  }

  if (isAuthenticated && isOrgUser && isAdminRoute) {
    return NextResponse.redirect(new URL('/viable', request.url));
  }

  if (isAuthenticated && isAdmin && isUserRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isAuthenticated && isSuperAdminOnlyRoute && !isSuperAdmin) {
    if (isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/viable', request.url));
  }

  if (isAuthenticated && isAdmin && (isAdminRoute || pathname === '/')) {
    return NextResponse.next();
  }

  if (isAuthenticated && isOrgUser && (isUserRoute || pathname === '/')) {
    return NextResponse.next();
  }

  if (isAuthenticated && !isAdmin && !isOrgUser) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|icons).*)'],
};

