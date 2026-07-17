import { NextRequest, NextResponse } from 'next/server';

type JwtPayload = {
  exp?: number;
};

const ACCESS_TOKEN_COOKIE = 'access_token';

const PUBLIC_ROUTES = [
  '/login',
  '/set-password',
  '/auth/set-password',
  '/auth/accept-invite',
];

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
  const isAuthenticated = Boolean(
    token && payload && !isTokenExpired(payload.exp),
  );
  const isPublicRoute = isRouteInSet(pathname, PUBLIC_ROUTES);

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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|icons).*)'],
};
