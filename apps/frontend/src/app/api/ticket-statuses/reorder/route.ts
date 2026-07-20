import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

type ReorderTicketStatusPayload = {
    statusId?: string;
    newIndex?: number;
};

function getApiBaseUrl() {
    const baseUrl = process.env.API_BASE_URL?.trim();

    if (!baseUrl) {
        return null;
    }

    return baseUrl.replace(/\/docs\/?$/, '');
}

export async function PATCH(request: Request) {
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

        const body = (await request.json()) as ReorderTicketStatusPayload;

        const response = await fetch(`${apiBaseUrl}/ticket-statuses/reorder`, {
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
                { message: data?.message || 'Failed to reorder ticket statuses.' },
                { status: response.status },
            );
        }

        return NextResponse.json(data, { status: response.status });
    } catch {
        return NextResponse.json(
            { message: 'Something went wrong while reordering ticket statuses.' },
            { status: 500 },
        );
    }
}