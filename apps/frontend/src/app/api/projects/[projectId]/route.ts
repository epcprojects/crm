import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getProjectsApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const apiBaseUrl = getProjectsApiBaseUrl();

    if (!apiBaseUrl) {
      return NextResponse.json(
        { message: 'API_BASE_URL is not configured.' },
        { status: 500 },
      );
    }

    const response = await fetch(`${apiBaseUrl}/projects/${projectId}`, {
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
        { message: data?.message || 'Failed to fetch project.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while fetching the project.' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const apiBaseUrl = getProjectsApiBaseUrl();

    if (!apiBaseUrl) {
      return NextResponse.json(
        { message: 'API_BASE_URL is not configured.' },
        { status: 500 },
      );
    }

    const body = await request.json();

    const response = await fetch(`${apiBaseUrl}/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to update project.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while updating the project.' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const apiBaseUrl = getProjectsApiBaseUrl();

    if (!apiBaseUrl) {
      return NextResponse.json(
        { message: 'API_BASE_URL is not configured.' },
        { status: 500 },
      );
    }

    const response = await fetch(`${apiBaseUrl}/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to delete project.' },
        { status: response.status },
      );
    }

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while deleting the project.' },
      { status: 500 },
    );
  }
}
