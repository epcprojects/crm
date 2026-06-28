'use client';

import dayGridPlugin from '@fullcalendar/daygrid';
import type { DatesSetArg } from '@fullcalendar/core';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

type ProjectCalendarPanelProps = {
  projectId: string;
  projectName: string;
};

type CalendarView = 'day' | 'week' | 'month' | 'year';

type ApiProjectCalendarEvent = {
  id?: string;
  title?: string;
  name?: string;
  subject?: string;
  description?: string | null;
  start?: string;
  startAt?: string;
  startDate?: string;
  date?: string;
  end?: string;
  endAt?: string;
  endDate?: string;
  allDay?: boolean;
  type?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ProjectCalendarEventType =
  | 'due_date'
  | 'launch'
  | 'meeting'
  | 'milestone';

type ProjectCalendarEvent = {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  allDay: boolean;
  type: ProjectCalendarEventType;
};

const VIEW_BY_FULLCALENDAR: Record<string, CalendarView> = {
  dayGridDay: 'day',
  timeGridDay: 'day',
  dayGridWeek: 'week',
  timeGridWeek: 'week',
  dayGridMonth: 'month',
  multiMonthYear: 'year',
};

export default function ProjectCalendarPanel({
  projectId,
  projectName,
}: ProjectCalendarPanelProps) {
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [referenceDate, setReferenceDate] = useState(() =>
    formatDateForApi(new Date()),
  );
  const [currentDateLabel, setCurrentDateLabel] = useState('');

  const visibleEventsQuery = useQuery({
    queryKey: ['project-calendar-events', projectId, calendarView, referenceDate],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        view: calendarView,
        date: referenceDate,
      });
      const response = await fetch(
        `/api/projects/${projectId}/calendar/events?${searchParams.toString()}`,
        {
          cache: 'no-store',
        },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || 'Failed to fetch project calendar events.',
        );
      }

      return normalizeProjectCalendarEvents(data);
    },
    enabled: Boolean(projectId),
  });

  const allEventsQuery = useQuery({
    queryKey: ['project-calendar-all-events', projectId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/calendar/events/all`,
        {
          cache: 'no-store',
        },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || 'Failed to fetch all project calendar events.',
        );
      }

      return normalizeProjectCalendarEvents(data);
    },
    enabled: Boolean(projectId),
  });

  const visibleEvents = visibleEventsQuery.data ?? [];
  const allEvents = allEventsQuery.data ?? [];

  const calendarEvents = useMemo(
    () =>
      visibleEvents.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.allDay ? addOneDayForFullCalendar(event.end) : event.end,
        allDay: event.allDay,
        backgroundColor: getEventTypeColors(event.type).background,
        borderColor: getEventTypeColors(event.type).border,
        textColor: getEventTypeColors(event.type).text,
      })),
    [visibleEvents],
  );

  const upcomingEvents = useMemo(
    () =>
      [...allEvents]
        .filter((event) => {
          const eventTime = new Date(event.end || event.start).getTime();
          return !Number.isNaN(eventTime) && eventTime >= Date.now();
        })
        .sort(
          (left, right) =>
            new Date(left.start).getTime() - new Date(right.start).getTime(),
        )
        .slice(0, 6),
    [allEvents],
  );

  const eventTypeSummary = useMemo(() => {
    const counts: Record<ProjectCalendarEventType, number> = {
      due_date: 0,
      launch: 0,
      meeting: 0,
      milestone: 0,
    };

    allEvents.forEach((event) => {
      counts[event.type] += 1;
    });

    return counts;
  }, [allEvents]);

  const hasError = visibleEventsQuery.isError || allEventsQuery.isError;
  const errorMessage =
    (visibleEventsQuery.error instanceof Error && visibleEventsQuery.error.message) ||
    (allEventsQuery.error instanceof Error && allEventsQuery.error.message) ||
    'Failed to load project calendar events.';

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
      <div className="rounded-[24px] border border-gray-200 bg-white p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Project calendar</h3>
            <p className="text-sm text-gray-500">{projectName}</p>
          </div>

          <div className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700">
            {currentDateLabel || 'Calendar'}
          </div>
        </div>

        {hasError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={calendarEvents}
          dayMaxEvents={3}
          height="auto"
          datesSet={(arg) => handleDatesSet(arg, setCalendarView, setReferenceDate, setCurrentDateLabel)}
        />

        {visibleEventsQuery.isLoading ? (
          <p className="mt-4 text-sm text-gray-500">Loading calendar events...</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <SidebarCard title="Upcoming">
          {allEventsQuery.isLoading ? (
            <p className="text-sm text-gray-500">Loading upcoming events...</p>
          ) : upcomingEvents.length ? (
            <div className="space-y-4">
              {upcomingEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={clsx(index > 0 && 'border-t border-gray-100 pt-4')}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-2 h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: getEventTypeColors(event.type).dot,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-gray-900">
                        {event.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatEventDate(event.start, event.allDay)}
                      </p>
                      {event.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                          {event.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No upcoming events found.</p>
          )}
        </SidebarCard>

        <SidebarCard title="Summary">
          <div className="space-y-3">
            {(
              ['due_date', 'launch', 'meeting', 'milestone'] as ProjectCalendarEventType[]
            ).map((type) => (
              <LegendRow
                key={type}
                type={type}
                count={eventTypeSummary[type]}
              />
            ))}
          </div>
          <div className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-500">
            <p>{allEvents.length} events in this project calendar</p>
          </div>
        </SidebarCard>
      </div>
    </div>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function LegendRow({
  type,
  count,
}: {
  type: ProjectCalendarEventType;
  count: number;
}) {
  const colors = getEventTypeColors(type);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.dot }} />
        <span className="text-[15px] font-semibold text-gray-900">
          {formatEventTypeLabel(type)}
        </span>
      </div>
      <span className="text-sm text-gray-500">{count}</span>
    </div>
  );
}

function handleDatesSet(
  arg: DatesSetArg,
  setCalendarView: (value: CalendarView) => void,
  setReferenceDate: (value: string) => void,
  setCurrentDateLabel: (value: string) => void,
) {
  setCurrentDateLabel(arg.view.title);
  setCalendarView(VIEW_BY_FULLCALENDAR[arg.view.type] ?? 'month');
  setReferenceDate(formatDateForApi(arg.view.currentStart));
}

function normalizeProjectCalendarEvents(payload: unknown): ProjectCalendarEvent[] {
  return extractEventArray(payload)
    .map((event, index) => normalizeProjectCalendarEvent(event, index))
    .filter((event): event is ProjectCalendarEvent => Boolean(event));
}

function extractEventArray(payload: unknown): ApiProjectCalendarEvent[] {
  if (Array.isArray(payload)) {
    return payload as ApiProjectCalendarEvent[];
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.data)) {
      return record.data as ApiProjectCalendarEvent[];
    }

    if (Array.isArray(record.items)) {
      return record.items as ApiProjectCalendarEvent[];
    }

    if (Array.isArray(record.events)) {
      return record.events as ApiProjectCalendarEvent[];
    }
  }

  return [];
}

function normalizeProjectCalendarEvent(
  value: ApiProjectCalendarEvent,
  index: number,
): ProjectCalendarEvent | null {
  const start =
    value.start ?? value.startAt ?? value.startDate ?? value.date ?? '';
  const end = value.end ?? value.endAt ?? value.endDate ?? start;

  if (!start) {
    return null;
  }

  const title = value.title ?? value.name ?? value.subject ?? 'Untitled event';
  const allDay = typeof value.allDay === 'boolean' ? value.allDay : isDateOnly(start);

  return {
    id: value.id ?? `${title}-${start}-${index}`,
    title,
    description: value.description ?? '',
    start,
    end,
    allDay,
    type: normalizeEventType(value.type),
  };
}

function normalizeEventType(value?: string | null): ProjectCalendarEventType {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (normalized === 'due_date') return 'due_date';
  if (normalized === 'launch') return 'launch';
  if (normalized === 'milestone') return 'milestone';
  return 'meeting';
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addOneDayForFullCalendar(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

function formatDateForApi(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatEventTypeLabel(type: ProjectCalendarEventType) {
  if (type === 'due_date') return 'Due Date';
  if (type === 'launch') return 'Launch';
  if (type === 'meeting') return 'Meeting';
  return 'Milestone';
}

function formatEventDate(value: string, allDay: boolean) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(allDay
      ? {}
      : {
          hour: 'numeric',
          minute: '2-digit',
        }),
  }).format(date);
}

function getEventTypeColors(type: ProjectCalendarEventType) {
  if (type === 'due_date') {
    return {
      dot: '#F97316',
      background: '#FFF7ED',
      border: '#FDBA74',
      text: '#C2410C',
    };
  }

  if (type === 'launch') {
    return {
      dot: '#8B5CF6',
      background: '#F5F3FF',
      border: '#C4B5FD',
      text: '#6D28D9',
    };
  }

  if (type === 'milestone') {
    return {
      dot: '#0EA5E9',
      background: '#F0F9FF',
      border: '#7DD3FC',
      text: '#0369A1',
    };
  }

  return {
    dot: '#10B981',
    background: '#ECFDF5',
    border: '#86EFAC',
    text: '#047857',
  };
}
