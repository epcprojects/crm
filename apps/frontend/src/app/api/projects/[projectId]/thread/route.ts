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

    const response = await fetch(`${apiBaseUrl}/projects/${projectId}/thread`, {
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

    return NextResponse.json(Array.isArray(data) ? data : [], { status: 200 });
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
    const formData = await request.formData().catch(() => null);
    const messageValue = formData?.get('message');
    const parentIdValue = formData?.get('parentId');
    const mentionedUserIdValues = formData?.getAll('mentionedUserIds') ?? [];
    const attachments = formData?.getAll('attachments') ?? [];
    const message =
      typeof messageValue === 'string' ? messageValue.trim() : undefined;
    const parentId =
      typeof parentIdValue === 'string' ? parentIdValue.trim() : undefined;
    const mentionedUserIds = mentionedUserIdValues
      .filter(
        (mentionedUserId): mentionedUserId is string =>
          typeof mentionedUserId === 'string',
      )
      .map((mentionedUserId) => mentionedUserId.trim())
      .filter((mentionedUserId) => mentionedUserId.length > 0);
    const validAttachments = attachments.filter(
      (attachment): attachment is File =>
        attachment instanceof File && attachment.size > 0,
    );

    if (!message && !validAttachments.length) {
      return NextResponse.json(
        { message: 'Message or attachment is required.' },
        { status: 400 },
      );
    }

    const upstreamFormData = new FormData();

    if (message) {
      upstreamFormData.append('message', message);
    }

    if (parentId) {
      upstreamFormData.append('parentId', parentId);
    }

    mentionedUserIds.forEach((mentionedUserId) => {
      upstreamFormData.append('mentionedUserIds', mentionedUserId);
    });

    validAttachments.forEach((attachment) => {
      upstreamFormData.append('attachments', attachment, attachment.name);
    });

    const response = await fetch(`${apiBaseUrl}/projects/${projectId}/thread`, {
      method: 'POST',
      headers: {
        Accept: '*/*',
        Authorization: `Bearer ${token}`,
      },
      body: upstreamFormData,
      cache: 'no-store',
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to create project thread message.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while creating the project thread message.' },
      { status: 500 },
    );
  }
}
