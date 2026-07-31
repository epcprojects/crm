import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

export async function GET(request: Request) {
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

    const requestUrl = new URL(request.url);
    const upstreamUrl = new URL(`${apiBaseUrl}/notifications`);

    const page = requestUrl.searchParams.get('page');
    const limit = requestUrl.searchParams.get('limit');
    const unreadOnly = requestUrl.searchParams.get('unreadOnly');

    if (page) {
      upstreamUrl.searchParams.set('page', page);
    }

    if (limit) {
      upstreamUrl.searchParams.set('limit', limit);
    }

    if (unreadOnly) {
      upstreamUrl.searchParams.set('unreadOnly', unreadOnly);
    }

    const response = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          message: data?.message || 'Failed to fetch notifications.',
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        message: 'Something went wrong while fetching notifications.',
      },
      { status: 500 },
    );
  }
}
