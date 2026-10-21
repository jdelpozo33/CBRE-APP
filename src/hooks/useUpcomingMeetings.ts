import { useCallback, useEffect, useState } from "react";
import { workspace, CalendarEvent, ProviderAccount } from "../providers/index.ts";
import { MeetingSnapshot } from "../types.ts";

export interface UpcomingMeeting extends CalendarEvent {
  snapshot?: MeetingSnapshot;
  // True for the demo meetings shown before a calendar is connected.
  isSample?: boolean;
}

const HOUR = 60 * 60 * 1000;
// Meetings that started up to this long ago still count as "happening now".
const IN_PROGRESS_GRACE = HOUR;

function at(base: Date, dayOffset: number, hours: number, minutes = 0) {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// Demo meetings relative to now, so the view is useful before a calendar is connected.
function sampleMeetings(now: Date): UpcomingMeeting[] {
  const soon = new Date(Math.ceil((now.getTime() + 20 * 60 * 1000) / (15 * 60 * 1000)) * 15 * 60 * 1000);
  const later = new Date(soon.getTime() + 3 * HOUR);
  const tomorrow = at(now, 1, 10);
  const make = (
    id: string,
    title: string,
    start: Date,
    location: string,
    attendees: { email: string; name: string }[],
    description: string
  ): UpcomingMeeting => ({
    id,
    title,
    description,
    location,
    start: start.toISOString(),
    end: new Date(start.getTime() + HOUR).toISOString(),
    allDay: false,
    attendees,
    providerId: "sample",
    source: "Calendar",
    isSample: true,
  });
  return [
    make(
      "sample-1",
      "1420 Market St · Walkthrough & Offer Negotiation",
      soon,
      "1420 Market Street, San Francisco, CA",
      [{ email: "m.vance@apexhorizon.com", name: "Marcus Vance" }],
      "Buyer has $6.2M exchange equity closing within 45 days. Target purchase price $14.2M."
    ),
    make(
      "sample-2",
      "Lender Debt Quote & Refi Review",
      later,
      "780 Montgomery St, San Francisco, CA",
      [{ email: "dsteinberg@pacificcrestlending.com", name: "David Steinberg" }],
      "Need 5-year fixed debt quote with minimum 65% LTV and non-recourse pricing."
    ),
    make(
      "sample-3",
      "Grandview Plaza · Listing Strategy with Owner",
      tomorrow,
      "750 Grandview Boulevard, San Mateo, CA",
      [{ email: "elena@bayshoream.com", name: "Elena Rostova" }],
      "Seller considering disposition before fiscal year-end."
    ),
  ];
}

async function attachSnapshots(meetings: UpcomingMeeting[]): Promise<UpcomingMeeting[]> {
  if (meetings.length === 0) return meetings;
  try {
    const res = await fetch("/api/meeting-snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetings: meetings.map(({ id, title, description, location, attendees }) => ({
          id,
          title,
          description,
          location,
          attendees,
        })),
      }),
    });
    const data = await res.json();
    const byId = new Map<string, MeetingSnapshot>((data.snapshots || []).map((s: MeetingSnapshot) => [s.meetingId, s]));
    return meetings.map((m) => ({ ...m, snapshot: byId.get(m.id) }));
  } catch {
    return meetings;
  }
}

// Loads meetings for the next 48 hours (plus any in progress) from the connected calendar,
// each with its CRM snapshot. Falls back to sample meetings when no calendar is connected.
export function useUpcomingMeetings(user: ProviderAccount | null) {
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const now = new Date();
    try {
      const events: UpcomingMeeting[] = user
        ? await workspace.calendar.listUpcomingEvents({
            from: new Date(now.getTime() - IN_PROGRESS_GRACE),
            to: new Date(now.getTime() + 48 * HOUR),
            max: 25,
          })
        : sampleMeetings(now);
      // Drop meetings that already ended.
      const current = events.filter((m) => new Date(m.end).getTime() > now.getTime());
      setMeetings(await attachSnapshots(current));
    } catch (err: any) {
      setError(err?.message || "Could not load calendar");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  return { meetings, isLoading, error, refresh, isSample: !user };
}

// The meeting happening now or starting within the next 30 minutes, if any.
export function findActiveMeeting(meetings: UpcomingMeeting[], now = new Date()): UpcomingMeeting | null {
  const t = now.getTime();
  return (
    meetings.find((m) => {
      const start = new Date(m.start).getTime();
      const end = new Date(m.end).getTime();
      return !m.allDay && start - 30 * 60 * 1000 <= t && t < end;
    }) || null
  );
}
