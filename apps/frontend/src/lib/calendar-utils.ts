import { DayCell, CalendarEvent, Ticket } from '@/types';

export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function todayString(): string {
  return toDateString(new Date());
}

export function formatDisplayDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export function getMonthDays(year: number, month: number): DayCell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = todayString();

  // Pad to start of week (Sunday = 0)
  const startPad = firstDay.getDay();
  const cells: DayCell[] = [];

  // Previous month days
  for (let i = startPad - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    cells.push({
      date,
      dateString: toDateString(date),
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      events: [],
      tickets: [],
    });
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    const dateString = toDateString(date);
    cells.push({
      date,
      dateString,
      isCurrentMonth: true,
      isToday: dateString === today,
      isSelected: false,
      events: [],
      tickets: [],
    });
  }

  // Next month days to fill grid (6 rows × 7 = 42)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    cells.push({
      date,
      dateString: toDateString(date),
      isCurrentMonth: false,
      isToday: false,
      isSelected: false,
      events: [],
      tickets: [],
    });
  }

  return cells;
}

export function getWeekDays(date: Date): Date[] {
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

export function populateCells(
  cells: DayCell[],
  events: CalendarEvent[],
  tickets: Ticket[],
  selectedDate: string | null
): DayCell[] {
  const eventsByDate = new Map<string, CalendarEvent[]>();
  const ticketsByDate = new Map<string, Ticket[]>();

  events.forEach((e) => {
    if (!eventsByDate.has(e.date)) eventsByDate.set(e.date, []);
    eventsByDate.get(e.date)!.push(e);
  });

  tickets.forEach((t) => {
    if (!ticketsByDate.has(t.dueDate)) ticketsByDate.set(t.dueDate, []);
    ticketsByDate.get(t.dueDate)!.push(t);
  });

  return cells.map((cell) => ({
    ...cell,
    isSelected: cell.dateString === selectedDate,
    events: eventsByDate.get(cell.dateString) || [],
    tickets: ticketsByDate.get(cell.dateString) || [],
  }));
}

export const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export const STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6',
  in_progress: '#8b5cf6',
  review: '#f59e0b',
  closed: '#6b7280',
};

export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
