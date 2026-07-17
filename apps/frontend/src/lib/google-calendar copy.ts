/**
 * Google Calendar Integration
 *
 * SETUP REQUIRED:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable "Google Calendar API" under APIs & Services > Library
 * 4. Create OAuth 2.0 credentials under APIs & Services > Credentials
 *    - Application type: Web application
 *    - Authorized redirect URIs: http://localhost:3000/api/auth/google/callback
 *                                https://yourdomain.com/api/auth/google/callback
 * 5. Copy Client ID and Client Secret to .env.local
 *
 * Required .env.local variables:
 * GOOGLE_CLIENT_ID=your_client_id_here
 * GOOGLE_CLIENT_SECRET=your_client_secret_here
 * GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
 * NEXTAUTH_SECRET=any_random_string_32_chars_minimum
 * NEXTAUTH_URL=http://localhost:3000
 */

import { CalendarEvent, GoogleCalendar } from '../components/types';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) throw new Error('Failed to refresh access token');
  return response.json();
}

export async function fetchGoogleCalendars(
  accessToken: string,
): Promise<GoogleCalendar[]> {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) throw new Error('Failed to fetch calendars');

  const data = await response.json();
  return data.items.map((cal: any) => ({
    id: cal.id,
    summary: cal.summary,
    backgroundColor: cal.backgroundColor || '#4285f4',
    selected: cal.selected ?? true,
  }));
}

export async function fetchGoogleEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok)
    throw new Error(`Failed to fetch events from ${calendarId}`);

  const data = await response.json();

  return (data.items || []).map((event: any): CalendarEvent => {
    const isAllDay = !!event.start?.date;
    const startRaw = event.start?.dateTime || event.start?.date || '';
    const endRaw = event.end?.dateTime || event.end?.date || '';

    const date = isAllDay ? startRaw : startRaw.split('T')[0];
    const startTime = !isAllDay
      ? startRaw.split('T')[1]?.slice(0, 5)
      : undefined;
    const endTime = !isAllDay ? endRaw.split('T')[1]?.slice(0, 5) : undefined;

    return {
      id: `google_${event.id}`,
      title: event.summary || '(No title)',
      date,
      startTime,
      endTime,
      type: 'google',
      description: event.description,
      allDay: isAllDay,
      googleEventId: event.id,
      googleCalendarId: calendarId,
      hangoutLink: event.hangoutLink,
      location: event.location,
    };
  });
}

export async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  event: {
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    location?: string;
    allDay?: boolean;
  },
) {
  const body: any = {
    summary: event.title,
    description: event.description,
    location: event.location,
  };

  if (event.allDay || !event.startTime) {
    body.start = { date: event.date };
    body.end = { date: event.date };
  } else {
    body.start = {
      dateTime: `${event.date}T${event.startTime}:00`,
      timeZone: 'UTC',
    };
    body.end = {
      dateTime: `${event.date}T${event.endTime || event.startTime}:00`,
      timeZone: 'UTC',
    };
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) throw new Error('Failed to create Google event');
  return response.json();
}

export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok && response.status !== 410) {
    throw new Error('Failed to delete Google event');
  }
}
