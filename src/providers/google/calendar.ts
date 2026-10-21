import { getAccessToken } from './auth.ts';

export interface CalendarEventPayload {
  summary: string;
  description: string;
  location?: string;
  startDateTime: string; // ISO string
  endDateTime: string;   // ISO string
  attendeeEmails?: string[];
}

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
  attendees?: Array<{ email: string; responseStatus?: string; displayName?: string }>;
}

/**
 * Schedule a meeting or milestone in Google Calendar.
 */
export async function createCalendarEvent(
  payload: CalendarEventPayload
): Promise<{ success: boolean; event?: CalendarEventItem; htmlLink?: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Google Workspace not connected. Please sign in with Google first.');
  }

  const eventBody: Record<string, any> = {
    summary: payload.summary,
    description: payload.description,
    start: {
      dateTime: payload.startDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: payload.endDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  if (payload.location) {
    eventBody.location = payload.location;
  }

  if (payload.attendeeEmails && payload.attendeeEmails.length > 0) {
    eventBody.attendees = payload.attendeeEmails.map((email) => ({ email }));
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Calendar API error (${res.status})`);
  }

  const event = await res.json();
  return { success: true, event, htmlLink: event.htmlLink };
}

/**
 * Fetch upcoming calendar events for the broker.
 */
export async function fetchUpcomingCalendarEvents(
  maxResults: number = 8,
  from: Date = new Date(),
  to?: Date
): Promise<CalendarEventItem[]> {
  const token = await getAccessToken();
  if (!token) return [];

  const timeMax = to ? `&timeMax=${encodeURIComponent(to.toISOString())}` : '';
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    from.toISOString()
  )}${timeMax}&maxResults=${maxResults}&orderBy=startTime&singleEvents=true`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return data.items || [];
}
