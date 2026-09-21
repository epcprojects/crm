import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();
  return baseUrl ? baseUrl.replace(/\/docs\/?$/, '') : null;
}

/** Forwards a push request to the backend with the caller's access token. */
export async function proxyPushRequest(
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const apiBaseUrl = getApiBaseUrl();

    if (!apiBaseUrl) {
      return NextResponse.json(
        { message: 'API_BASE_URL is not configured.' },
        { status: 500 },
      );
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Push request failed.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while handling the push request.' },
      { status: 500 },
    );
  }
}
