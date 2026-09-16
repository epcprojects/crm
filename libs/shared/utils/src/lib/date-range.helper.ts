import { CalendarView } from '@epc-crm/types';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

/**
 * Given a view type and a reference date string (YYYY-MM-DD),
 * returns the inclusive [start, end] date range for that view.
 *
 * DAY   → just that single date
 * WEEK  → Monday–Sunday of the week containing that date
 * MONTH → 1st–last day of the month
 * YEAR  → Jan 1 – Dec 31 of the year
 */
export function getDateRange(view: CalendarView, dateStr: string): DateRange {
  const ref = new Date(`${dateStr}T00:00:00Z`);

  switch (view) {
    case CalendarView.DAY: {
      return { start: dateStr, end: dateStr };
    }

    case CalendarView.WEEK: {
      // ISO week: Monday = 0 offset
      const day = ref.getUTCDay(); // 0 Sun … 6 Sat
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(ref);
      monday.setUTCDate(ref.getUTCDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);

      return {
        start: toDateStr(monday),
        end: toDateStr(sunday),
      };
    }

    case CalendarView.MONTH: {
      const year = ref.getUTCFullYear();
      const month = ref.getUTCMonth();
      const first = new Date(Date.UTC(year, month, 1));
      const last = new Date(Date.UTC(year, month + 1, 0));
      return {
        start: toDateStr(first),
        end: toDateStr(last),
      };
    }

    case CalendarView.YEAR: {
      const year = ref.getUTCFullYear();
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      };
    }
  }
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}
