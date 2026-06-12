import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type CreateRolePayload = {
  name?: string;
  description?: string;
};

type RolePayload = {
  id?: string;
  name?: string;
  normalizedName?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  roleClaims?: unknown[];
};

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

export async function POST(request: Request) {
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

    const body = (await request.json()) as CreateRolePayload;

    const response = await fetch(`${apiBaseUrl}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: body.name,
        description: body.description,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to create role.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while creating the role.' },
      { status: 500 },
    );
  }
}

export async function GET() {
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

    const response = await fetch(`${apiBaseUrl}/roles`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    const data = (await response.json().catch(() => null)) as
      | RolePayload[]
      | { message?: string }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            !Array.isArray(data) ? data?.message : 'Failed to fetch roles.',
        },
        { status: response.status },
      );
    }

    return NextResponse.json(Array.isArray(data) ? data : [], { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while fetching roles.' },
      { status: 500 },
    );
  }
}
