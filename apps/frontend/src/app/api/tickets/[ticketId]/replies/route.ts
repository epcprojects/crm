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
  context: { params: Promise<{ ticketId: string }> },
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

    const { ticketId } = await context.params;

    const response = await fetch(`${apiBaseUrl}/tickets/${ticketId}/replies`, {
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
        { message: data?.message || 'Failed to fetch ticket replies.' },
        { status: response.status },
      );
    }

    return NextResponse.json(Array.isArray(data) ? data : [], { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while fetching the ticket replies.' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ ticketId: string }> },
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

    const { ticketId } = await context.params;
    const projectId = new URL(request.url).searchParams.get('projectId')?.trim();

    if (!projectId) {
      return NextResponse.json(
        { message: 'Project ID is required.' },
        { status: 400 },
      );
    }

    const formData = await request.formData().catch(() => null);
    const messageValue = formData?.get('message');
    const attachment = formData?.get('attachments');
    const message =
      typeof messageValue === 'string' ? messageValue.trim() : undefined;
    const hasAttachment = attachment instanceof File && attachment.size > 0;

    if (!message && !hasAttachment) {
      return NextResponse.json(
        { message: 'Message or attachment is required.' },
        { status: 400 },
      );
    }

    const upstreamFormData = new FormData();

    if (message) {
      upstreamFormData.append('message', message);
    }

    if (hasAttachment) {
      upstreamFormData.append('attachments', attachment, attachment.name);
    }

    const response = await fetch(
      `${apiBaseUrl}/tickets/${ticketId}/projects/${projectId}`,
      {
        method: 'POST',
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
        { message: data?.message || 'Failed to create ticket reply.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while creating the ticket reply.' },
      { status: 500 },
    );
  }
}
