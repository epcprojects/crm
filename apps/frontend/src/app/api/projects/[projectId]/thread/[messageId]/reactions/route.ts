import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ projectId: string; messageId: string }>;
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

    const { projectId, messageId } = await context.params;
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

    const response = await fetch(
      `${apiBaseUrl}/projects/${projectId}/thread/${messageId}/reactions`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
        cache: 'no-store',
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to add thread reaction.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while adding the thread reaction.' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ projectId: string; messageId: string }>;
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

    const { projectId, messageId } = await context.params;

    const response = await fetch(
      `${apiBaseUrl}/projects/${projectId}/thread/${messageId}/reactions`,
      {
        method: 'DELETE',
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
        { message: data?.message || 'Failed to remove thread reaction.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while removing the thread reaction.' },
      { status: 500 },
    );
  }
}
