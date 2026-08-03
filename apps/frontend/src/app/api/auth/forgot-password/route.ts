import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmail } from '../../../../lib/api-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const normalizedBody =
      typeof body?.email === 'string'
        ? { ...body, email: normalizeEmail(body.email) }
        : body;

    const response = await fetch(
      `${process.env.API_BASE_URL}/auth/forgot-password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(normalizedBody),
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || 'Failed to send reset password email.' },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while processing forgot password.' },
      { status: 500 },
    );
  }
}

