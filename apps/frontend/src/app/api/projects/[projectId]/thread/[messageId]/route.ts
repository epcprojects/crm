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
  context: { params: Promise<{ projectId: string; messageId: string }> },
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
      `${apiBaseUrl}/projects/${projectId}/thread/${messageId}`,
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
        { message: data?.message || 'Failed to fetch thread details.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while fetching the thread details.' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string; messageId: string }> },
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
    const message =
      typeof body?.message === 'string' ? body.message.trim() : undefined;
    const parentId =
      typeof body?.parentId === 'string' ? body.parentId.trim() : undefined;
    const mentionedUserIds = Array.isArray(body?.mentionedUserIds)
      ? body.mentionedUserIds
          .filter(
            (mentionedUserId: unknown): mentionedUserId is string =>
              typeof mentionedUserId === 'string',
          )
          .map((mentionedUserId: string) => mentionedUserId.trim())
          .filter((mentionedUserId: string) => mentionedUserId.length > 0)
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

    const response = await fetch(
      `${apiBaseUrl}/projects/${projectId}/thread/${messageId}`,
      {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(upstreamBody),
        cache: 'no-store',
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to update project thread.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while updating the project thread.' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string; messageId: string }> },
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
      `${apiBaseUrl}/projects/${projectId}/thread/${messageId}`,
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
        { message: data?.message || 'Failed to delete project thread.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data ?? { success: true }, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while deleting the project thread.' },
      { status: 500 },
    );
  }
}
