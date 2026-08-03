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

type ApiTicket = {
  id: string;
  title: string;
  description?: string | null;
  createdAt: string;
  ticketRefNo?: string;
  dueDate?: string | null;
  project?: { id: string; name: string } | null;
  status?: { key: string; label: string; color?: string } | null;
  priority?: { key: string; label: string; color?: string } | null;
  assignee?: { id?: string; fullName?: string; email?: string } | null;
};

type ApiTicketsPage = {
  items: ApiTicket[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

// Controls exactly what ends up in the CSV, in this order.
// Add/remove/reorder entries here — nothing else needs to change.
const EXPORT_COLUMNS: {
  header: string;
  getValue: (ticket: ApiTicket) => string;
}[] = [
  { header: 'Ticket Ref No', getValue: (t) => t.ticketRefNo ?? t.id },
  { header: 'Title', getValue: (t) => t.title },
  {header : 'Description', getValue: (t) => htmlToPlainText(t.description ?? '')},
  {
    header: 'Status',
    getValue: (t) => t.status?.label ?? t.status?.key ?? '',
  },
  {
    header: 'Priority',
    getValue: (t) => t.priority?.label ?? t.priority?.key ?? '',
  },
  {
    header: 'Assignee',
    getValue: (t) => t.assignee?.fullName ?? 'Unassigned',
  },
  {
    header: 'Project',
    getValue: (t) => t.project?.name ?? 'No Project',
  },
  { header: 'Due Date', getValue: (t) => t.dueDate ?? '' },
  { header: 'Created At', getValue: (t) => t.createdAt },
];

// Hard ceiling on how many pages we'll fetch, purely as a safety net
// against a runaway loop if the backend ever returns a malformed
// `hasNext`. 100 pages * 100/page = 10,000 tickets max per export.
const MAX_EXPORT_PAGES = 100;
const PAGE_SIZE = 100;

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function buildCsv(items: ApiTicket[]) {
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
    const filterParams = new URLSearchParams();

    for (const key of ['statusKey', 'priorityKey', 'search', 'projectId']) {
      const value = requestUrl.searchParams.get(key);

      if (value) {
        filterParams.set(key, value);
      }
    }

    const allItems: ApiTicket[] = [];
    let currentPage = 1;

    while (currentPage <= MAX_EXPORT_PAGES) {
      const upstreamUrl = new URL(`${apiBaseUrl}/dashboard/tickets`);

      filterParams.forEach((value, key) => {
        upstreamUrl.searchParams.set(key, value);
      });

      upstreamUrl.searchParams.set('page', String(currentPage));
      upstreamUrl.searchParams.set('limit', String(PAGE_SIZE));

      const response = await fetch(upstreamUrl.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const data = (await response.json().catch(() => null)) as
        | ApiTicketsPage
        | { message?: string }
        | null;

      if (!response.ok) {
        const message =
          data && 'message' in data
            ? data.message || 'Failed to fetch tickets for export.'
            : 'Failed to fetch tickets for export.';
        return NextResponse.json({ message }, { status: response.status });
      }

      const page = data as ApiTicketsPage;

      if (!Array.isArray(page?.items)) {
        break;
      }

      allItems.push(...page.items);

      if (!page.meta?.hasNext) {
        break;
      }

      currentPage += 1;
    }

    if (allItems.length === 0) {
  return NextResponse.json(
    { message: 'No tickets found to export with the current filters.' },
    { status: 404 },
  );
}
    const csv = buildCsv(allItems);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tickets-${new Date()
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