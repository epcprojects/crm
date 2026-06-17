import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type CreateRolePayload = {
  name?: string;
  description?: string;
  permissions?: string[];
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

function isRolePayload(value: unknown): value is RolePayload {
  return Boolean(value) && typeof value === 'object';
}

function extractRolesPayload(payload: unknown): RolePayload[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRolePayload);
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const payloadRecord = payload as Record<string, unknown>;
  const nestedCandidates = [
    payloadRecord.roles,
    payloadRecord.data,
    payloadRecord.items,
  ];

  for (const candidate of nestedCandidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRolePayload);
    }
  }

  return [];
}

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
        permissions: Array.isArray(body.permissions) ? body.permissions : [],
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
      | Record<string, unknown>
      | null;
    const roles = extractRolesPayload(data);

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            !Array.isArray(data) && data && 'message' in data
              ? String(data.message || 'Failed to fetch roles.')
              : 'Failed to fetch roles.',
        },
        { status: response.status },
      );
    }

    return NextResponse.json(roles, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while fetching roles.' },
      { status: 500 },
    );
  }
}
