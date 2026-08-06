import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

type ReactionPayload = {
  emoji?: string;
};

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      projectId: string;
      ticketId: string;
      channel: string;
      messageId: string;
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

    const { projectId, ticketId, channel, messageId } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | ReactionPayload
      | null;

    const response = await fetch(
      `${apiBaseUrl}/projects/${projectId}/tickets/${ticketId}/chat/${channel}/messages/${messageId}/reactions`,
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
        { message: data?.message || 'Failed to add chat reaction.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while adding the chat reaction.' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      projectId: string;
      ticketId: string;
      channel: string;
      messageId: string;
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

    const { projectId, ticketId, channel, messageId } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | ReactionPayload
      | null;

    const response = await fetch(
      `${apiBaseUrl}/projects/${projectId}/tickets/${ticketId}/chat/${channel}/messages/${messageId}/reactions`,
      {
        method: 'DELETE',
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
        { message: data?.message || 'Failed to remove chat reaction.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while removing the chat reaction.' },
      { status: 500 },
    );
  }
}
