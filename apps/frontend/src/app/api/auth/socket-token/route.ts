import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  const apiBaseUrl = process.env.API_BASE_URL?.trim();

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!apiBaseUrl) {
    return NextResponse.json(
      { message: 'API_BASE_URL is not configured.' },
      { status: 500 },
    );
  }

  let socketUrl = '';

  try {
    socketUrl = new URL(apiBaseUrl).origin;
  } catch {
    return NextResponse.json(
      { message: 'API_BASE_URL is invalid.' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      accessToken: token,
      socketUrl,
    },
    { status: 200 },
  );
}
