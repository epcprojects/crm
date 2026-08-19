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
  request: Request,
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
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const upstreamUrl = `${apiBaseUrl}/projects/${projectId}/tickets/${ticketId}/chat/${channel}/messages${searchParams ? `?${searchParams}` : ''}`;

    const response = await fetch(upstreamUrl, {
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
        { message: data?.message || 'Failed to fetch chat messages.' },
        { status: response.status },
      );
    }

    if (Array.isArray(data)) {
      return NextResponse.json(
        {
          messages: data,
          cursor: null,
          hasMore: false,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while fetching chat messages.' },
      { status: 500 },
    );
  }
}

type SendMessagePayload = {
  message: string;
  messageType?: 'text' | 'attachment';
  attachmentUrl?: string;
  attachmentUrls?: string[];
  attachmentName?: string;
  attachmentSize?: number;
  mentionedUserIds?: string[];
};

export async function POST(
  request: Request,
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
    const body = (await request
      .json()
      .catch(() => null)) as SendMessagePayload | null;

    const response = await fetch(
      `${apiBaseUrl}/projects/${projectId}/tickets/${ticketId}/chat/${channel}/messages`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body ?? {}),
        cache: 'no-store',
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to send chat message.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while sending the chat message.' },
      { status: 500 },
    );
  }
}
