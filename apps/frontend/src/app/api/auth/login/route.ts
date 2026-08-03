import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { normalizeEmail } from '../../../../lib/api-client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const normalizedBody =
      typeof body?.email === 'string'
        ? { ...body, email: normalizeEmail(body.email) }
        : body;

    const response = await fetch(`${process.env.API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizedBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          message: data.message || 'Invalid credentials',
        },
        {
          status: response.status,
        },
      );
    }

    const cookieStore = await cookies();

    cookieStore.set({
      name: 'access_token',
      value: data.accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 2,
    });

    return NextResponse.json({
      accessToken: data.accessToken,
      user: data.user,
    });
  } catch (e) {
    console.debug('ERROR:', e);
    return NextResponse.json(
      {
        message: 'Internal server error',
      },
      {
        status: 500,
      },
    );
  }
}
