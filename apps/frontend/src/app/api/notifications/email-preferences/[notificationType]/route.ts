import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ notificationType: string }> },
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

    const { notificationType } = await context.params;
    const body = await request.json().catch(() => null);
    const enabled = body?.enabled;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { message: 'enabled must be a boolean.' },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${apiBaseUrl}/notifications/email-preferences/${encodeURIComponent(
        notificationType,
      )}`,
      {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
        cache: 'no-store',
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          message: data?.message || 'Failed to update email preference.',
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        message: 'Something went wrong while updating email preference.',
      },
      { status: 500 },
    );
  }
}
