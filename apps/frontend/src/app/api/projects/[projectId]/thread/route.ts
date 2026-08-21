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
  context: { params: Promise<{ projectId: string }> },
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

    const { projectId } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const upstreamSearchParams = new URLSearchParams();
    const limit = searchParams.get('limit')?.trim();
    const cursorCreatedAt = searchParams.get('cursorCreatedAt')?.trim();
    const cursorId = searchParams.get('cursorId')?.trim();

    if (limit) {
      upstreamSearchParams.set('limit', limit);
    }

    if (cursorCreatedAt) {
      upstreamSearchParams.set('cursorCreatedAt', cursorCreatedAt);
    }

    if (cursorId) {
      upstreamSearchParams.set('cursorId', cursorId);
    }

    const upstreamUrl = `${apiBaseUrl}/projects/${projectId}/thread${
      upstreamSearchParams.size ? `?${upstreamSearchParams.toString()}` : ''
    }`;

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
        { message: data?.message || 'Failed to fetch project thread.' },
        { status: response.status },
      );
    }

    if (Array.isArray(data)) {
      return NextResponse.json(
        {
          threads: data,
          cursor: null,
          hasMore: false,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while fetching the project thread.' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
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

    const { projectId } = await context.params;

    const body = await request.json().catch(() => null);
    const message =
      typeof body?.message === 'string' ? body.message.trim() : undefined;
    const parentId =
      typeof body?.parentId === 'string' ? body.parentId.trim() : undefined;
    const mentionedUserIds = Array.isArray(body?.mentionedUserIds)
      ? body.mentionedUserIds
          .filter((id: unknown): id is string => typeof id === 'string')
          .map((id: string) => id.trim())
          .filter((id: string) => id.length > 0)
      : [];
    const attachments = Array.isArray(body?.attachments)
      ? body.attachments
      : [];

    if (!message && !attachments.length) {
      return NextResponse.json(
        { message: 'Message or attachment is required.' },
        { status: 400 },
      );
    }

    const upstreamBody: Record<string, unknown> = {};

    if (message) {
      upstreamBody.message = message;
    }

    if (parentId) {
      upstreamBody.parentId = parentId;
    }

    if (mentionedUserIds.length) {
      upstreamBody.mentionedUserIds = mentionedUserIds;
    }

    if (attachments.length) {
      upstreamBody.attachments = attachments;
    }

    const response = await fetch(`${apiBaseUrl}/projects/${projectId}/thread`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(upstreamBody),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          message: data?.message || 'Failed to create project thread message.',
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        message:
          'Something went wrong while creating the project thread message.',
      },
      { status: 500 },
    );
  }
}
