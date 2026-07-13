import type {
  GoogleCalendarListItem,
  ProjectCalendarEvent,
  ProjectCalendarEventInput,
  ProjectCalendarEventType,
} from '../components/projects/project-calendar.types';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const GOOGLE_CALENDAR_BASE_URL = 'https://www.googleapis.com/calendar/v3';
const PROJECT_PROPERTY_KEY = 'harperhelpProjectId';

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
  updated?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
  colorId?: string;
};

type GoogleCalendarMutationResult = {
  id: string;
  updated?: string;
};

export function getGoogleCalendarClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID?.trim() ?? '';
}

export function isGoogleCalendarConfigured() {
  return Boolean(getGoogleCalendarClientId());
}

export function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Calendar is only available in the browser.'));
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Identity Services.')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });
}

export async function requestGoogleCalendarAccessToken(
  prompt: '' | 'consent' = 'consent',
) {
  const clientId = getGoogleCalendarClientId();

  if (!clientId) {
    throw new Error(
      'Missing NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID. Add it to your frontend environment first.',
    );
  }

  await loadGoogleIdentityScript();

  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'Failed to authorize Google Calendar.'));
          return;
        }

        resolve(response.access_token);
      },
    });

    if (!tokenClient) {
      reject(new Error('Google token client is unavailable.'));
      return;
    }

    tokenClient.requestAccessToken({ prompt });
  });
}

export async function listGoogleCalendars(accessToken: string) {
  const response = await fetch(`${GOOGLE_CALENDAR_BASE_URL}/users/me/calendarList`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { items?: Array<Record<string, unknown>>; error?: { message?: string } }
    | null;

  if (!response.ok || !Array.isArray(payload?.items)) {
    throw new Error(payload?.error?.message || 'Failed to fetch Google calendars.');
  }

  return payload.items.reduce<GoogleCalendarListItem[]>((result, item) => {
    const id = readString(item.id);

    if (!id) {
      return result;
    }

    result.push({
      id,
      summary: readString(item.summary) ?? 'Untitled calendar',
      primary: Boolean(item.primary),
      backgroundColor: readString(item.backgroundColor),
    });

    return result;
  }, []);
}

export async function fetchGoogleProjectEvents({
  accessToken,
  calendarId,
  projectId,
}: {
  accessToken: string;
  calendarId: string;
  projectId: string;
}) {
  const searchParams = new URLSearchParams({
    singleEvents: 'true',
    showDeleted: 'false',
    maxResults: '2500',
    privateExtendedProperty: `${PROJECT_PROPERTY_KEY}=${projectId}`,
  });

  const response = await fetch(
    `${GOOGLE_CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events?${searchParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { items?: GoogleCalendarEvent[]; error?: { message?: string } }
    | null;

  if (!response.ok || !Array.isArray(payload?.items)) {
    throw new Error(payload?.error?.message || 'Failed to fetch Google events.');
  }

  return payload.items.map((event) => mapGoogleEventToProjectEvent(event, projectId));
}

export async function createGoogleCalendarEvent({
  accessToken,
  calendarId,
  projectId,
  event,
}: {
  accessToken: string;
  calendarId: string;
  projectId: string;
  event: ProjectCalendarEvent;
}) {
  const response = await fetch(
    `${GOOGLE_CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toGoogleCalendarEventPayload(event, projectId)),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | GoogleCalendarEvent
    | { error?: { message?: string } }
    | null;

  if (!response.ok || !payload || 'error' in payload) {
    throw new Error(getGoogleApiErrorMessage(payload) || 'Failed to create Google event.');
  }

  if (!isGoogleCalendarEventPayload(payload)) {
    throw new Error('Google Calendar returned an unexpected event payload.');
  }

  return {
    id: payload.id,
    updated: payload.updated,
  } satisfies GoogleCalendarMutationResult;
}

export async function updateGoogleCalendarEvent({
  accessToken,
  calendarId,
  projectId,
  event,
}: {
  accessToken: string;
  calendarId: string;
  projectId: string;
  event: ProjectCalendarEvent;
}) {
  if (!event.googleEventId) {
    throw new Error('Missing Google event id for update.');
  }

  const response = await fetch(
    `${GOOGLE_CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.googleEventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(toGoogleCalendarEventPayload(event, projectId)),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | GoogleCalendarEvent
    | { error?: { message?: string } }
    | null;

  if (!response.ok || !payload || 'error' in payload) {
    throw new Error(getGoogleApiErrorMessage(payload) || 'Failed to update Google event.');
  }

  if (!isGoogleCalendarEventPayload(payload)) {
    throw new Error('Google Calendar returned an unexpected event payload.');
  }

  return {
    id: payload.id,
    updated: payload.updated,
  } satisfies GoogleCalendarMutationResult;
}

export async function deleteGoogleCalendarEvent({
  accessToken,
  calendarId,
  googleEventId,
}: {
  accessToken: string;
  calendarId: string;
  googleEventId: string;
}) {
  const response = await fetch(
    `${GOOGLE_CALENDAR_BASE_URL}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(getGoogleApiErrorMessage(payload) || 'Failed to delete Google event.');
  }
}

export function buildProjectCalendarEvent(
  input: ProjectCalendarEventInput,
  projectId: string,
  currentEvent?: ProjectCalendarEvent,
): ProjectCalendarEvent {
  const now = new Date().toISOString();

  return {
    id: currentEvent?.id ?? crypto.randomUUID(),
    projectId,
    title: input.title.trim(),
    description: input.description.trim(),
    start: input.start,
    end: input.end,
    allDay: input.allDay,
    type: input.type,
    googleEventId: currentEvent?.googleEventId,
    syncStatus: currentEvent?.googleEventId ? 'pending' : 'local',
    updatedAt: now,
    lastSyncedAt: currentEvent?.lastSyncedAt,
  };
}

export function mapGoogleEventToProjectEvent(
  event: GoogleCalendarEvent,
  projectId: string,
): ProjectCalendarEvent {
  const start = event.start?.dateTime ?? normalizeGoogleAllDayStart(event.start?.date);
  const end = event.end?.dateTime ?? normalizeGoogleAllDayEnd(event.end?.date, event.start?.date);
  const type = mapGoogleColorToEventType(event.colorId);

  return {
    id: `google-${event.id}`,
    projectId,
    title: event.summary?.trim() || 'Untitled event',
    description: event.description?.trim() || '',
    start: start ?? new Date().toISOString(),
    end: end ?? start ?? new Date().toISOString(),
    allDay: Boolean(event.start?.date && !event.start?.dateTime),
    type,
    googleEventId: event.id,
    syncStatus: 'synced',
    updatedAt: event.updated ?? new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  };
}

function toGoogleCalendarEventPayload(
  event: ProjectCalendarEvent,
  projectId: string,
) {
  return {
    summary: event.title,
    description: event.description,
    start: event.allDay
      ? { date: toDateOnly(event.start) }
      : { dateTime: event.start },
    end: event.allDay
      ? { date: toExclusiveDateOnly(event.end || event.start) }
      : { dateTime: event.end },
    colorId: mapEventTypeToGoogleColor(event.type),
    extendedProperties: {
      private: {
        [PROJECT_PROPERTY_KEY]: projectId,
      },
    },
  };
}

function normalizeGoogleAllDayStart(value?: string) {
  if (!value) {
    return undefined;
  }

  return `${value}T00:00:00.000Z`;
}

function normalizeGoogleAllDayEnd(end?: string, start?: string) {
  const rawValue = end ?? start;

  if (!rawValue) {
    return undefined;
  }

  const date = new Date(`${rawValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString();
}

function toDateOnly(value: string) {
  return value.slice(0, 10);
}

function toExclusiveDateOnly(value: string) {
  const date = new Date(value);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function mapEventTypeToGoogleColor(type: ProjectCalendarEventType) {
  if (type === 'due_date') return '11';
  if (type === 'launch') return '3';
  if (type === 'meeting') return '9';
  return '10';
}

function mapGoogleColorToEventType(colorId?: string): ProjectCalendarEventType {
  if (colorId === '11') return 'due_date';
  if (colorId === '3') return 'launch';
  if (colorId === '9') return 'meeting';
  return 'milestone';
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function getGoogleApiErrorMessage(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    'error' in value &&
    value.error &&
    typeof value.error === 'object' &&
    'message' in value.error
  ) {
    return readString(value.error.message);
  }

  return undefined;
}

function isGoogleCalendarEventPayload(value: unknown): value is GoogleCalendarEvent {
  return Boolean(value && typeof value === 'object' && 'id' in value);
}
