import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

export async function GET(request: NextRequest) {
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
    const upstreamUrl = new URL(`${apiBaseUrl}/dashboard/kanban-board`);

    for (const key of [
      'search',
      'priorityKey',
      'limit',
      'page',
      'statusKey',
    ]) {
      const value = requestUrl.searchParams.get(key);

      if (value) {
        upstreamUrl.searchParams.set(key, value);
      }
    }

    requestUrl.searchParams.getAll('projectIds').forEach((projectId) => {
      if (projectId) {
        upstreamUrl.searchParams.append('projectIds', projectId);
      }
    });

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
          message: data?.message || 'Failed to fetch Kanban board.',
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while fetching Kanban board.' },
      { status: 500 },
    );
  }
}