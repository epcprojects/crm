import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      ticketId: string;
      projectId: string;
      replyId: string;
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

    const { ticketId, projectId, replyId } = await context.params;
    const formData = await request.formData().catch(() => null);
    const messageValue = formData?.get('message');
    const message = typeof messageValue === 'string' ? messageValue.trim() : '';

    if (!message) {
      return NextResponse.json(
        { message: 'Message is required.' },
        { status: 400 },
      );
    }

    const upstreamFormData = new FormData();
    upstreamFormData.append('message', message);

    const response = await fetch(
      `${apiBaseUrl}/tickets/${ticketId}/projects/${projectId}/reply/${replyId}`,
      {
        method: 'PUT',
        headers: {
          Accept: '*/*',
          Authorization: `Bearer ${token}`,
        },
        body: upstreamFormData,
        cache: 'no-store',
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to update ticket reply.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while updating the ticket reply.' },
      { status: 500 },
    );
  }
}
