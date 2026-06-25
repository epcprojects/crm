'use client';

import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import ThemeButton from '../ui/ThemeButton';
import { appToast } from '../toast/AppToast';
import ProjectCalendarEventModal from '../modals/ProjectCalendarEventModal';
import type {
  GoogleCalendarListItem,
  ProjectCalendarEvent,
  ProjectCalendarEventInput,
  ProjectCalendarStoredState,
  ProjectCalendarSyncStatus,
} from './project-calendar.types';
import {
  buildProjectCalendarEvent,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  fetchGoogleProjectEvents,
  isGoogleCalendarConfigured,
  listGoogleCalendars,
  requestGoogleCalendarAccessToken,
  updateGoogleCalendarEvent,
} from '../../lib/google-calendar';

const STORAGE_PREFIX = 'harperhelp:project-calendar:v1';

type ProjectCalendarPanelProps = {
  projectId: string;
  projectName: string;
};

type TokenState = {
  accessToken: string;
  grantedAt: number;
};

export default function ProjectCalendarPanel({
  projectId,
  projectName,
}: ProjectCalendarPanelProps) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [currentDateLabel, setCurrentDateLabel] = useState('');
  const [storedState, setStoredState] = useState<ProjectCalendarStoredState>({
    events: [],
  });
  const [accessTokenState, setAccessTokenState] = useState<TokenState | null>(null);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendarListItem[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ProjectCalendarEvent | null>(null);
  const [selectedRange, setSelectedRange] = useState<{
    start: string;
    end: string;
    allDay: boolean;
  } | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  useEffect(() => {
    setStoredState(readProjectCalendarState(projectId));
  }, [projectId]);

  useEffect(() => {
    writeProjectCalendarState(projectId, storedState);
  }, [projectId, storedState]);

  const calendarEvents = useMemo(
    () =>
      storedState.events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.allDay ? addOneDayForFullCalendar(event.end || event.start) : event.end,
        allDay: event.allDay,
        backgroundColor: getEventTypeColors(event.type).background,
        borderColor: getEventTypeColors(event.type).border,
        textColor: getEventTypeColors(event.type).text,
        extendedProps: {
          sourceEvent: event,
        },
      })),
    [storedState.events],
  );

  const upcomingEvents = useMemo(
    () =>
      [...storedState.events]
        .filter((event) => new Date(event.end || event.start).getTime() >= Date.now())
        .sort(
          (left, right) =>
            new Date(left.start).getTime() - new Date(right.start).getTime(),
        )
        .slice(0, 6),
    [storedState.events],
  );

  const syncSummary = useMemo(() => {
    const total = storedState.events.length;
    const pending = storedState.events.filter(
      (event) => event.syncStatus === 'pending' || event.syncStatus === 'failed',
    ).length;

    return { total, pending };
  }, [storedState.events]);

  const selectedCalendarId = storedState.connection?.selectedCalendarId;
  const isConfigured = isGoogleCalendarConfigured();
  const isConnected = Boolean(selectedCalendarId && accessTokenState?.accessToken);

  const syncEventsWithGoogle = async (accessToken: string, calendarId: string) => {
    const remoteEvents = await fetchGoogleProjectEvents({
      accessToken,
      calendarId,
      projectId,
    });

    let nextEvents = [...storedState.events];
    const remoteByGoogleId = new Map(
      remoteEvents
        .filter((event) => event.googleEventId)
        .map((event) => [event.googleEventId as string, event]),
    );

    for (const localEvent of nextEvents) {
      if (!localEvent.googleEventId) {
        const createdEvent = await createGoogleCalendarEvent({
          accessToken,
          calendarId,
          projectId,
          event: localEvent,
        });

        nextEvents = nextEvents.map((event) =>
          event.id === localEvent.id
            ? {
                ...event,
                googleEventId: createdEvent.id,
                syncStatus: 'synced',
                updatedAt: createdEvent.updated ?? event.updatedAt,
                lastSyncedAt: new Date().toISOString(),
              }
            : event,
        );
        continue;
      }

      if (localEvent.syncStatus === 'pending') {
        const updatedEvent = await updateGoogleCalendarEvent({
          accessToken,
          calendarId,
          projectId,
          event: localEvent,
        });

        nextEvents = nextEvents.map((event) =>
          event.id === localEvent.id
            ? {
                ...event,
                syncStatus: 'synced',
                updatedAt: updatedEvent.updated ?? event.updatedAt,
                lastSyncedAt: new Date().toISOString(),
              }
            : event,
        );
        continue;
      }

      const remoteMatch = remoteByGoogleId.get(localEvent.googleEventId);

      if (!remoteMatch) {
        continue;
      }

      if (
        localEvent.lastSyncedAt &&
        new Date(remoteMatch.updatedAt).getTime() >
          new Date(localEvent.lastSyncedAt).getTime()
      ) {
        nextEvents = nextEvents.map((event) =>
          event.id === localEvent.id
            ? {
                ...remoteMatch,
                id: event.id,
                googleEventId: event.googleEventId,
              }
            : event,
        );
      }
    }

    const localGoogleEventIds = new Set(
      nextEvents.map((event) => event.googleEventId).filter(Boolean),
    );

    for (const remoteEvent of remoteEvents) {
      if (remoteEvent.googleEventId && localGoogleEventIds.has(remoteEvent.googleEventId)) {
        continue;
      }

      nextEvents.push(remoteEvent);
    }

    const now = new Date().toISOString();
    setStoredState((current) => ({
      connection: {
        ...current.connection,
        selectedCalendarId: calendarId,
        selectedCalendarSummary:
          current.connection?.selectedCalendarSummary ??
          googleCalendars.find((calendar) => calendar.id === calendarId)?.summary,
        lastSyncedAt: now,
      },
      events: dedupeEvents(nextEvents).map((event) => ({
        ...event,
        syncStatus: event.googleEventId ? 'synced' : event.syncStatus,
        lastSyncedAt: event.googleEventId ? now : event.lastSyncedAt,
      })),
    }));
  };

  const handleConnectGoogle = async () => {
    try {
      setIsConnecting(true);
      const accessToken = await requestGoogleCalendarAccessToken(
        accessTokenState ? '' : 'consent',
      );
      setAccessTokenState({
        accessToken,
        grantedAt: Date.now(),
      });

      const calendars = await listGoogleCalendars(accessToken);
      setGoogleCalendars(calendars);

      const preferredCalendar =
        calendars.find((calendar) => calendar.id === selectedCalendarId) ??
        calendars.find((calendar) => calendar.primary) ??
        calendars[0];

      if (!preferredCalendar) {
        throw new Error('No Google calendars were found for this account.');
      }

      setStoredState((current) => ({
        ...current,
        connection: {
          ...current.connection,
          selectedCalendarId: preferredCalendar.id,
          selectedCalendarSummary: preferredCalendar.summary,
        },
      }));

      await syncEventsWithGoogle(accessToken, preferredCalendar.id);
      appToast.success('Google Calendar connected and synced.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to connect Google Calendar.',
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualSync = async () => {
    if (!selectedCalendarId) {
      appToast.error('Connect Google Calendar first.');
      return;
    }

    try {
      setIsSyncing(true);
      const accessToken =
        accessTokenState?.accessToken ??
        (await requestGoogleCalendarAccessToken(accessTokenState ? '' : 'consent'));

      if (!accessTokenState?.accessToken) {
        setAccessTokenState({
          accessToken,
          grantedAt: Date.now(),
        });
      }

      await syncEventsWithGoogle(accessToken, selectedCalendarId);
      appToast.success('Calendar synced with Google.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to sync Google Calendar.',
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateOrUpdateEvent = async (values: ProjectCalendarEventInput) => {
    const nextEvent = buildProjectCalendarEvent(values, projectId, editingEvent ?? undefined);

    setStoredState((current) => ({
      ...current,
      events: editingEvent
        ? current.events.map((event) => (event.id === editingEvent.id ? nextEvent : event))
        : [...current.events, nextEvent],
    }));

    if (selectedCalendarId && accessTokenState?.accessToken) {
      try {
        if (editingEvent?.googleEventId) {
          const updatedEvent = await updateGoogleCalendarEvent({
            accessToken: accessTokenState.accessToken,
            calendarId: selectedCalendarId,
            projectId,
            event: nextEvent,
          });

          setStoredState((current) => ({
            ...current,
            events: current.events.map((event) =>
              event.id === nextEvent.id
                ? {
                    ...event,
                    syncStatus: 'synced',
                    lastSyncedAt: new Date().toISOString(),
                    updatedAt: updatedEvent.updated ?? event.updatedAt,
                  }
                : event,
            ),
          }));
        } else {
          const createdEvent = await createGoogleCalendarEvent({
            accessToken: accessTokenState.accessToken,
            calendarId: selectedCalendarId,
            projectId,
            event: nextEvent,
          });

          setStoredState((current) => ({
            ...current,
            events: current.events.map((event) =>
              event.id === nextEvent.id
                ? {
                    ...event,
                    googleEventId: createdEvent.id,
                    syncStatus: 'synced',
                    lastSyncedAt: new Date().toISOString(),
                    updatedAt: createdEvent.updated ?? event.updatedAt,
                  }
                : event,
            ),
          }));
        }
      } catch (error) {
        setStoredState((current) => ({
          ...current,
          events: current.events.map((event) =>
            event.id === nextEvent.id ? { ...event, syncStatus: 'failed' } : event,
          ),
        }));
        throw error;
      }
    }

    setEditingEvent(null);
    setSelectedRange(null);
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) {
      return;
    }

    try {
      setIsDeletingEvent(true);

      if (
        editingEvent.googleEventId &&
        selectedCalendarId &&
        accessTokenState?.accessToken
      ) {
        await deleteGoogleCalendarEvent({
          accessToken: accessTokenState.accessToken,
          calendarId: selectedCalendarId,
          googleEventId: editingEvent.googleEventId,
        });
      }

      setStoredState((current) => ({
        ...current,
        events: current.events.filter((event) => event.id !== editingEvent.id),
      }));
      setEditingEvent(null);
      setIsModalOpen(false);
      appToast.success('Event deleted.');
    } catch (error) {
      appToast.error(
        error instanceof Error ? error.message : 'Failed to delete event.',
      );
    } finally {
      setIsDeletingEvent(false);
    }
  };

  const handleDateSelect = (selection: DateSelectArg) => {
    setEditingEvent(null);
    setSelectedRange({
      start: selection.startStr,
      end: selection.allDay
        ? new Date(selection.end.getTime() - 86400000).toISOString()
        : selection.endStr,
      allDay: selection.allDay,
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (info: EventClickArg) => {
    const sourceEvent = info.event.extendedProps.sourceEvent as ProjectCalendarEvent | undefined;

    if (!sourceEvent) {
      return;
    }

    setEditingEvent(sourceEvent);
    setSelectedRange(null);
    setIsModalOpen(true);
  };

  const handlePrevMonth = () => {
    const api = calendarRef.current?.getApi();
    api?.prev();
    setCurrentDateLabel(api?.view.title ?? '');
  };

  const handleNextMonth = () => {
    const api = calendarRef.current?.getApi();
    api?.next();
    setCurrentDateLabel(api?.view.title ?? '');
  };

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="rounded-[24px] border border-gray-200 bg-white p-4 md:p-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="flex h-11 w-11 items-center justify-center text-gray-700"
                >
                  <ArrowLeftIcon />
                </button>
                <div className="min-w-32 px-3 text-center text-lg font-semibold text-gray-900">
                  {currentDateLabel}
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="flex h-11 w-11 items-center justify-center text-gray-700"
                >
                  <ArrowRightIcon />
                </button>
              </div>

              <div className="rounded-xl border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500">
                {storedState.connection?.selectedCalendarSummary
                  ? `Google: ${storedState.connection.selectedCalendarSummary}`
                  : 'Google not connected yet'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ThemeButton
                variant="secondary"
                onClick={handleConnectGoogle}
                disabled={!isConfigured || isConnecting}
              >
                {isConnecting
                  ? 'Connecting...'
                  : selectedCalendarId
                    ? 'Reconnect Google'
                    : 'Connect Google'}
              </ThemeButton>
              <ThemeButton
                variant="secondary"
                onClick={handleManualSync}
                disabled={!selectedCalendarId || isSyncing}
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </ThemeButton>
              <ThemeButton
                variant="primary"
                onClick={() => {
                  setEditingEvent(null);
                  setSelectedRange(null);
                  setIsModalOpen(true);
                }}
              >
                + Add Event
              </ThemeButton>
            </div>
          </div>

          {!isConfigured ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Set `NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID` to enable Google Calendar sync.
            </div>
          ) : null}

          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false}
            events={calendarEvents}
            selectable
            dayMaxEvents={3}
            selectMirror
            height="auto"
            select={handleDateSelect}
            eventClick={handleEventClick}
            datesSet={(arg) => setCurrentDateLabel(arg.view.title)}
          />
        </div>

        <div className="space-y-4">
          <SidebarCard title="Upcoming">
            {upcomingEvents.length ? (
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
                        <span
                          className="mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: getEventTypeColors(event.type).pillBackground,
                            color: getEventTypeColors(event.type).pillText,
                          }}
                        >
                          {formatEventTypeLabel(event.type)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No upcoming events yet.</p>
            )}
          </SidebarCard>

          <SidebarCard title="Legend">
            <div className="space-y-3">
              {(['due_date', 'launch', 'meeting', 'milestone'] as const).map((type) => (
                <LegendRow key={type} type={type} />
              ))}
            </div>
            <div className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-500">
              <p>{syncSummary.total} events in this project calendar</p>
              <p>{syncSummary.pending} event(s) still waiting to sync</p>
              {storedState.connection?.lastSyncedAt ? (
                <p>Last sync: {formatSyncDate(storedState.connection.lastSyncedAt)}</p>
              ) : null}
            </div>
          </SidebarCard>

          <SidebarCard title="Sync status">
            <div className="space-y-2">
              <StatusPill
                label={
                  selectedCalendarId
                    ? storedState.connection?.selectedCalendarSummary || 'Connected calendar'
                    : 'Not connected'
                }
                status={selectedCalendarId ? 'synced' : 'local'}
              />
              <StatusPill
                label={
                  isConnected
                    ? 'Session authorized'
                    : selectedCalendarId
                      ? 'Reconnect to continue syncing'
                      : 'Authorize Google to sync'
                }
                status={isConnected ? 'synced' : 'pending'}
              />
            </div>
          </SidebarCard>
        </div>
      </div>

      <ProjectCalendarEventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
          setSelectedRange(null);
        }}
        onSubmit={handleCreateOrUpdateEvent}
        onDelete={editingEvent ? handleDeleteEvent : undefined}
        event={editingEvent}
        initialRange={selectedRange}
        isDeleting={isDeletingEvent}
      />
    </>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
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
}: {
  type: ProjectCalendarEvent['type'];
}) {
  const colors = getEventTypeColors(type);

  return (
    <div className="flex items-center gap-3">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors.dot }} />
      <span className="text-[15px] font-semibold text-gray-900">
        {formatEventTypeLabel(type)}
      </span>
    </div>
  );
}

function StatusPill({
  label,
  status,
}: {
  label: string;
  status: ProjectCalendarSyncStatus;
}) {
  const classes =
    status === 'synced'
      ? 'bg-green-50 text-green-700 border-green-200'
      : status === 'failed'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div className={clsx('rounded-full border px-3 py-2 text-sm', classes)}>{label}</div>
  );
}

function readProjectCalendarState(projectId: string): ProjectCalendarStoredState {
  if (typeof window === 'undefined') {
    return { events: [] };
  }

  try {
    const rawValue = window.localStorage.getItem(getStorageKey(projectId));

    if (!rawValue) {
      return { events: [] };
    }

    const parsedValue = JSON.parse(rawValue) as ProjectCalendarStoredState;

    if (!parsedValue || !Array.isArray(parsedValue.events)) {
      return { events: [] };
    }

    return {
      connection: parsedValue.connection,
      events: parsedValue.events,
    };
  } catch {
    return { events: [] };
  }
}

function writeProjectCalendarState(
  projectId: string,
  state: ProjectCalendarStoredState,
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getStorageKey(projectId), JSON.stringify(state));
}

function getStorageKey(projectId: string) {
  return `${STORAGE_PREFIX}:${projectId}`;
}

function dedupeEvents(events: ProjectCalendarEvent[]) {
  const byKey = new Map<string, ProjectCalendarEvent>();

  for (const event of events) {
    const key = event.googleEventId ?? event.id;
    byKey.set(key, event);
  }

  return Array.from(byKey.values());
}

function addOneDayForFullCalendar(value: string) {
  const date = new Date(value);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

function formatEventTypeLabel(type: ProjectCalendarEvent['type']) {
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

function formatSyncDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getEventTypeColors(type: ProjectCalendarEvent['type']) {
  if (type === 'due_date') {
    return {
      background: '#FFF1F0',
      border: '#FECACA',
      text: '#DC2626',
      dot: '#EF4444',
      pillBackground: '#FFF1F0',
      pillText: '#DC2626',
    };
  }

  if (type === 'launch') {
    return {
      background: '#F5F3FF',
      border: '#C4B5FD',
      text: '#6D28D9',
      dot: '#8B5CF6',
      pillBackground: '#F5F3FF',
      pillText: '#7C3AED',
    };
  }

  if (type === 'meeting') {
    return {
      background: '#EFF6FF',
      border: '#93C5FD',
      text: '#2563EB',
      dot: '#3B82F6',
      pillBackground: '#EFF6FF',
      pillText: '#2563EB',
    };
  }

  return {
    background: '#ECFDF3',
    border: '#86EFAC',
    text: '#059669',
    dot: '#10B981',
    pillBackground: '#ECFDF3',
    pillText: '#059669',
  };
}

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M10.875 4.5L6.375 9L10.875 13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M7.125 4.5L11.625 9L7.125 13.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
