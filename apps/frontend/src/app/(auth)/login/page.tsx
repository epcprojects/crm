import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginPageClient from './LoginPageClient';
import {
  DEFAULT_POST_LOGIN_PATH,
  sanitizeReturnUrl,
  RETURN_URL_FALLBACK_PATH,
} from '../../../lib/auth/return-url';

type PageProps = {
  searchParams: Promise<{
    returnurl?: string;
  }>;
};

type JwtPayload = {
  exp?: number;
};

const ACCESS_TOKEN_COOKIE = 'access_token';

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payloadJson) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(exp?: number) {
  if (!exp) {
    return true;
  }

  return exp * 1000 <= Date.now();
}

export default async function Page({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const payload = token ? decodeJwtPayload(token) : null;
  const isAuthenticated = Boolean(
    token && payload && !isTokenExpired(payload.exp),
  );

  if (isAuthenticated) {
    const { returnurl } = await searchParams;
    const safeReturnUrl = sanitizeReturnUrl(returnurl);

    if (!safeReturnUrl) {
      redirect(DEFAULT_POST_LOGIN_PATH);
    }

    if (safeReturnUrl === RETURN_URL_FALLBACK_PATH) {
      redirect(RETURN_URL_FALLBACK_PATH);
    }

    return <LoginPageClient />;
  }

  return <LoginPageClient />;
}
