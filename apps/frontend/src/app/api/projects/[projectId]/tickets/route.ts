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
    request.nextUrl.searchParams.forEach(
      (value, key) => {
        upstreamUrl.searchParams.set(key, value);
      },
    );
    // const page = request.nextUrl.searchParams.get('page');
    // const limit = request.nextUrl.searchParams.get('limit');

    // if (page) {
    //   upstreamUrl.searchParams.set('page', page);
    // }

    // if (limit) {
    //   upstreamUrl.searchParams.set('limit', limit);
    // }

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
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { message: 'Invalid ticket payload.' },
        { status: 400 },
      );
    }


    const title = body.title;
    const description = body.description;
    const statusKey = body.statusKey;
    const priorityKey = body.priorityKey;
    const assigneeId = body.assigneeId;
    const dueDate = body.dueDate;
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];


    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { message: 'Title is required.' },
        { status: 400 },
      );
    }
 if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { message: 'Title is required.' },
        { status: 400 },
      );
    }

    const upstreamBody: Record<string, unknown> = {
      title: title.trim(),
    };

    if (typeof description === 'string' && description.trim()) {
      upstreamBody.description = description.trim();
    }

    if (typeof statusKey === 'string' && statusKey.trim()) {
      upstreamBody.statusKey = statusKey.trim();
    }

    if (typeof priorityKey === 'string' && priorityKey.trim()) {
      upstreamBody.priorityKey = priorityKey.trim();
    }

    if (typeof assigneeId === 'string' && assigneeId.trim()) {
      upstreamBody.assigneeId = assigneeId.trim();
    }

    if (typeof dueDate === 'string' && dueDate.trim()) {
      upstreamBody.dueDate = dueDate.trim();
    }

    if (attachments.length) {
      upstreamBody.attachments = attachments;
    }
    const response = await fetch(`${apiBaseUrl}/projects/${projectId}/tickets`, {
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
