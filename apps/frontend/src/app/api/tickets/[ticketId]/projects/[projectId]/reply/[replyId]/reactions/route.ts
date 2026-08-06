import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

async function requestReplyReactionEndpoint(
  apiBaseUrl: string,
  token: string,
  ticketId: string,
  projectId: string,
  replyId: string,
  method: 'POST' | 'DELETE',
  emoji?: string,
) {
  const endpoints = [
    `${apiBaseUrl}/tickets/${ticketId}/projects/${projectId}/reply/${replyId}/reactions`,
    `${apiBaseUrl}/tickets/${ticketId}/projects/${projectId}/replies/${replyId}/reactions`,
  ];

  let lastResponse: Response | null = null;

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { body: JSON.stringify({ emoji }) } : {}),
      cache: 'no-store',
    });

    if (response.status !== 404) {
      return response;
    }

    lastResponse = response;
  }

  return lastResponse;
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ ticketId: string; projectId: string; replyId: string }>;
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
    const body = await request.json().catch(() => null);
    const emoji =
      body && typeof body === 'object' && 'emoji' in body
        ? String(body.emoji ?? '').trim()
        : '';

    if (!emoji) {
      return NextResponse.json(
        { message: 'Emoji is required.' },
        { status: 400 },
      );
    }

    const response = await requestReplyReactionEndpoint(
      apiBaseUrl,
      token,
      ticketId,
      projectId,
      replyId,
      'POST',
      emoji,
    );

    if (!response) {
      return NextResponse.json(
        { message: 'Failed to add reply reaction.' },
        { status: 500 },
      );
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to add reply reaction.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while adding the reply reaction.' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ ticketId: string; projectId: string; replyId: string }>;
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

    const response = await requestReplyReactionEndpoint(
      apiBaseUrl,
      token,
      ticketId,
      projectId,
      replyId,
      'DELETE',
    );

    if (!response) {
      return NextResponse.json(
        { message: 'Failed to remove reply reaction.' },
        { status: 500 },
      );
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to remove reply reaction.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while removing the reply reaction.' },
      { status: 500 },
    );
  }
}
