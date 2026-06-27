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
