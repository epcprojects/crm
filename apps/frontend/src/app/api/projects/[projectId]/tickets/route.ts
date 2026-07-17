import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

export async function GET(
  request: NextRequest,
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
    const upstreamUrl = new URL(`${apiBaseUrl}/projects/${projectId}/tickets`);
    const page = request.nextUrl.searchParams.get('page');
    const limit = request.nextUrl.searchParams.get('limit');

    if (page) {
      upstreamUrl.searchParams.set('page', page);
    }

    if (limit) {
      upstreamUrl.searchParams.set('limit', limit);
    }

    const response = await fetch(upstreamUrl.toString(), {
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
        { message: data?.message || 'Failed to fetch project tickets.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while fetching the project tickets.' },
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

    if (!formData) {
      return NextResponse.json(
        { message: 'Invalid ticket payload.' },
        { status: 400 },
      );
    }

    const upstreamFormData = new FormData();
    const title = formData.get('title');
    const description = formData.get('description');
    const statusKey = formData.get('statusKey');
    const priorityKey = formData.get('priorityKey');
    const assigneeId = formData.get('assigneeId');
    const dueDate = formData.get('dueDate');
    const attachments = formData.getAll('attachments');

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { message: 'Title is required.' },
        { status: 400 },
      );
    }

    upstreamFormData.append('title', title.trim());

    if (typeof description === 'string' && description.trim()) {
      upstreamFormData.append('description', description.trim());
    }

    if (typeof statusKey === 'string' && statusKey.trim()) {
      upstreamFormData.append('statusKey', statusKey.trim());
    }

    if (typeof priorityKey === 'string' && priorityKey.trim()) {
      upstreamFormData.append('priorityKey', priorityKey.trim());
    }

    if (typeof assigneeId === 'string' && assigneeId.trim()) {
      upstreamFormData.append('assigneeId', assigneeId.trim());
    }

    if (typeof dueDate === 'string' && dueDate.trim()) {
      upstreamFormData.append('dueDate', dueDate.trim());
    }

    attachments.forEach((attachment) => {
      if (attachment instanceof File && attachment.size > 0) {
        upstreamFormData.append('attachments', attachment, attachment.name);
      }
    });

    const response = await fetch(`${apiBaseUrl}/projects/${projectId}/tickets`, {
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
        { message: data?.message || 'Failed to create ticket.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while creating the ticket.' },
      { status: 500 },
    );
  }
}
