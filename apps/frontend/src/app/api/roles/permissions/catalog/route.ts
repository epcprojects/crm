import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type PermissionCatalogItem = {
  module?: string;
  label?: string;
  permissions?: string[];
};

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
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

    const response = await fetch(`${apiBaseUrl}/roles/permissions/catalog`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    const data = (await response.json().catch(() => null)) as
      | PermissionCatalogItem[]
      | { message?: string }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            !Array.isArray(data) ? data?.message : 'Failed to fetch permission catalog.',
        },
        { status: response.status },
      );
    }

    return NextResponse.json(Array.isArray(data) ? data : [], { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while fetching the permission catalog.' },
      { status: 500 },
    );
  }
}
