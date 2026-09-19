import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  return baseUrl.replace(/\/docs\/?$/, '');
}

function htmlToPlainText(html: string) {
  return html
    .replace(/<\/(p|div|li|br|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n+/g, ' ')
    .trim();
}

type ApiDashboardTicket = {
  id: string;
  ticketRefNo?: string;
  createdAt: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  project: { id: string; name: string } | null;
  status: { key: string; label: string; color?: string } | null;
  priority: { key: string; label: string; color?: string } | null;
  assignee: { id?: string; fullName?: string; name?: string } | null;
  reporter?: { id?: string; fullName?: string; email?: string } | null;
};

// Controls exactly what ends up in the CSV, in this order.
// Add/remove/reorder entries here — nothing else needs to change.
const EXPORT_COLUMNS: {
  header: string;
  getValue: (ticket: ApiDashboardTicket) => string;
}[] = [
  { header: 'Ticket Ref No', getValue: (t) => t.ticketRefNo ?? t.id },
  { header: 'Title', getValue: (t) => t.title },
  {header: 'Description', getValue: (t) => htmlToPlainText(t.description ?? '')},
  {
    header: 'Status',
    getValue: (t) => t.status?.label ?? t.status?.key ?? '',
  },
  {
    header: 'Priority',
    getValue: (t) => t.priority?.label ?? t.priority?.key ?? '',
  },
  {
    header: 'Agent',
    getValue: (t) => t.assignee?.fullName ?? t.assignee?.name ?? 'Unassigned',
  },
  {
    header: 'Created By',
    getValue: (t) => t.reporter?.fullName ?? '',
  },
  { header: 'Project', getValue: (t) => t.project?.name ?? 'No Project' },
  { header: 'Due Date', getValue: (t) => t.dueDate ?? '' },
  { header: 'Created At', getValue: (t) => t.createdAt },
];

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function buildCsv(items: ApiDashboardTicket[]) {
  const headerRow = EXPORT_COLUMNS.map((column) =>
    escapeCsvValue(column.header),
  ).join(',');

  const rows = items.map((item) =>
    EXPORT_COLUMNS.map((column) =>
      escapeCsvValue(column.getValue(item) ?? ''),
    ).join(','),
  );

  return [headerRow, ...rows].join('\n');
}

export async function GET(request: NextRequest) {
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

    const requestUrl = new URL(request.url);
    const upstreamUrl = new URL(`${apiBaseUrl}/dashboard/tickets`);

    for (const key of [
      'statusKey',
      'priorityKey',
      'search',
      'contactId',
      'dateFrom',
      'dateTo',
      'assigneeId',
      'reporterId',
    ]) {
      const value = requestUrl.searchParams.get(key);

      if (value) {
        upstreamUrl.searchParams.set(key, value);
      }
    }

    requestUrl.searchParams.getAll('projectIds').forEach((projectId) => {
      if (projectId) {
        upstreamUrl.searchParams.append('projectIds', projectId);
      }
    });

    // Mirrors exactly what "Recent Tickets" shows — first page, 20 items.
    upstreamUrl.searchParams.set('page', '1');
    upstreamUrl.searchParams.set('limit', '20');

    const response = await fetch(upstreamUrl.toString(), {
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
        { message: data?.message || 'Failed to fetch tickets for export.' },
        { status: response.status },
      );
    }

    const items: ApiDashboardTicket[] = Array.isArray(data?.items)
      ? data.items
      : [];

      if (items.length === 0) {
  return NextResponse.json(
    { message: 'No tickets found to export with the current filters.' },
    { status: 404 },
  );
}
    const csv = buildCsv(items);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="recent-tickets-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Something went wrong while exporting tickets.' },
      { status: 500 },
    );
  }
}
