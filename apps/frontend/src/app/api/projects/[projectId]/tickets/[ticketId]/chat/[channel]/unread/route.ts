import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      projectId: string;
      ticketId: string;
      channel: string;
    }>;
  },
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

    const { projectId, ticketId, channel } = await context.params;

    const response = await fetch(
      `${apiBaseUrl}/projects/${projectId}/tickets/${ticketId}/chat/${channel}/unread`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to fetch unread counts.' },
        { status: response.status },
      );
    }

    return NextResponse.json(
      data ?? { internal: 0, external: 0 },
      { status: response.status },
    );
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while fetching unread counts.' },
      { status: 500 },
    );
  }
}
