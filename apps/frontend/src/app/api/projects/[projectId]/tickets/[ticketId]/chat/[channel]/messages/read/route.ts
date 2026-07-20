import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

type MarkReadPayload = {
  messageIds: string[];
};

export async function PATCH(
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
    const body = (await request.json().catch(() => null)) as
      | MarkReadPayload
      | null;

    const response = await fetch(
      `${apiBaseUrl}/projects/${projectId}/tickets/${ticketId}/chat/${channel}/messages/read`,
      {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body ?? { messageIds: [] }),
        cache: 'no-store',
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to mark messages as read.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data ?? { success: true }, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while marking messages as read.' },
      { status: 500 },
    );
  }
}
