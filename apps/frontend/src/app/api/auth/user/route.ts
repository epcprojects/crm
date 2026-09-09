import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();

  const token = cookieStore.get('access_token');

  if (!token) {
    return NextResponse.json(
      { authenticated: false },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  const response = await fetch(`${process.env.API_BASE_URL}/users/myself`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token.value}`,
    },
  });

  if (response.status === 401) {
    cookieStore.delete('access_token');
    return NextResponse.json(
      { authenticated: false },
      {
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { message: 'Unable to verify session.' },
      { status: response.status, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const user = await response.json();

  return NextResponse.json(
    {
      authenticated: true,
      user,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
