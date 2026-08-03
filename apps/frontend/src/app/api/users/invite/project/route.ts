import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { normalizeEmail } from '../../../../../lib/api-client';

type InviteProjectUserPayload = {
  email?: string;
  fullName?: string;
  userType?: 'INTERNAL' | 'EXTERNAL';
  roleKey?: 'PROJECT_ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER' | 'VIEWER';
  projectIds?: string[];
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

    const body = (await request.json()) as InviteProjectUserPayload;
    const normalizedBody = {
      ...body,
      email:
        typeof body.email === 'string' ? normalizeEmail(body.email) : body.email,
    };

    const response = await fetch(`${apiBaseUrl}/users/invite/project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(normalizedBody),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to invite user.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while inviting the user.' },
      { status: 500 },
    );
  }
}
