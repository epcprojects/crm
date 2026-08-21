import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key')?.trim();
    const action = searchParams.get('action')?.trim();
    const contentType = searchParams.get('contentType')?.trim();

    if (!key) {
      return NextResponse.json({ message: 'Key is required.' }, { status: 400 });
    }

    if (action !== 'upload' && action !== 'download') {
      return NextResponse.json(
        { message: 'Action must be either "upload" or "download".' },
        { status: 400 },
      );
    }

    const upstreamParams = new URLSearchParams({ key, action });

    if (contentType) {
      upstreamParams.set('contentType', contentType);
    }

    const response = await fetch(
      `${apiBaseUrl}/utility/presigned-url?${upstreamParams.toString()}`,
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
        { message: data?.message || 'Failed to get presigned url.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while generating the presigned url.' },
      { status: 500 },
    );
  }
}