import { NextRequest, NextResponse } from 'next/server';

enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER',
}

type JwtPayload = {
  exp?: number;
  roles?: string[];
  user?: {
    roles?: string[];
  };
};

const ACCESS_TOKEN_COOKIE = 'access_token';

const PUBLIC_ROUTES = [
  '/login',
  '/set-password',
  '/auth/set-password',
  '/auth/accept-invite',
];

const ADMIN_ROUTES = [
  '/dashboard',
  '/tickets',
  '/projects',
  '/users',
  '/roles',
  '/settings',
];
const LIMITED_USER_ROUTES = ['/dashboard', '/tickets', '/projects'];
const ADMIN_ONLY_ROUTES = ['/users', '/roles', '/settings'];

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

function getUserRoles(payload: JwtPayload | null) {
  return payload?.roles ?? payload?.user?.roles ?? [];
}

function hasAnyRole(roles: string[], allowedRoles: UserRole[]) {
  return roles.some((role) => allowedRoles.includes(role as UserRole));
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
  const roles = getUserRoles(payload);
  const isAuthenticated = Boolean(
    token && payload && !isTokenExpired(payload.exp),
  );

  const isPublicRoute = isRouteInSet(pathname, PUBLIC_ROUTES);
  const isAdminRoute = isRouteInSet(pathname, ADMIN_ROUTES);
  const isLimitedUserRoute = isRouteInSet(pathname, LIMITED_USER_ROUTES);
  const isAdminOnlyRoute = isRouteInSet(pathname, ADMIN_ONLY_ROUTES);

  const isAdmin = hasAnyRole(roles, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  const isLimitedUser = hasAnyRole(roles, [
    UserRole.PROJECT_MANAGER,
    UserRole.DEVELOPER,
    UserRole.VIEWER,
  ]);

  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthenticated && isPublicRoute) {
    if (isPasswordTokenRoute && tokenParam) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isAuthenticated && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isAuthenticated && isAdmin) {
    if (isAdminRoute) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isAuthenticated && isLimitedUser) {
    if (isAdminOnlyRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (isLimitedUserRoute) {
      return NextResponse.next();
    }
  }

  if (isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|icons).*)'],
};
