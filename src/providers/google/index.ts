import type { User } from "firebase/auth";
import type { CalendarEvent, ProviderAccount, WorkspaceProvider } from "../types.ts";
import { initAuth, googleSignIn, googleSignOut } from "./auth.ts";
import { createCalendarEvent, fetchUpcomingCalendarEvents, CalendarEventItem } from "./calendar.ts";
import { sendGmailMessage, createGmailDraft, fetchRecentGmailMessages } from "./gmail.ts";
import { uploadDealNoteToDrive, listGoogleDriveFiles, DriveFileItem } from "./drive.ts";

const PROVIDER_ID = "google";

function toAccount(user: User): ProviderAccount {
  return {
    id: user.uid,
    name: user.displayName || user.email || "Google account",
    email: user.email || "",
    photoUrl: user.photoURL || undefined,
    providerId: PROVIDER_ID,
  };
}

function toCalendarEvent(item: CalendarEventItem): CalendarEvent {
  const allDay = !item.start.dateTime;
  return {
    id: item.id,
    title: item.summary || "(No title)",
    description: item.description,
    location: item.location,
    start: item.start.dateTime || new Date(`${item.start.date}T00:00:00`).toISOString(),
    end: item.end.dateTime || new Date(`${item.end.date}T00:00:00`).toISOString(),
    allDay,
    attendees: (item.attendees || []).map((a) => ({
      email: a.email,
      name: a.displayName,
      responseStatus: a.responseStatus,
    })),
    link: item.htmlLink,
    providerId: PROVIDER_ID,
    source: "Calendar",
  };
}

function toStoredFile(file: DriveFileItem) {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    link: file.webViewLink || file.webContentLink,
    modifiedTime: file.modifiedTime,
    size: file.size,
    providerId: PROVIDER_ID,
  };
}

export const googleWorkspaceProvider: WorkspaceProvider = {
  id: PROVIDER_ID,
  displayName: "Google Workspace",
  kinds: ["mailCalendar", "files"],
  labels: { email: "Gmail", calendar: "Google Calendar", files: "Google Drive" },
  isConfigured: true,

  async connect() {
    const result = await googleSignIn();
    if (!result) throw new Error("Google sign-in was cancelled.");
    return toAccount(result.user);
  },

  disconnect: googleSignOut,

  onAccountChange(callback) {
    return initAuth(
      (user) => callback(toAccount(user)),
      () => callback(null)
    );
  },

  calendar: {
    async listUpcomingEvents({ from, to, max = 8 }) {
      const items = await fetchUpcomingCalendarEvents(max, from, to);
      return items.map(toCalendarEvent);
    },
    async createEvent(event) {
      const result = await createCalendarEvent({
        summary: event.title,
        description: event.description,
        location: event.location,
        startDateTime: event.start,
        endDateTime: event.end,
        attendeeEmails: event.attendeeEmails,
      });
      if (!result.event) throw new Error("Calendar event was not created.");
      return { event: toCalendarEvent(result.event), link: result.htmlLink };
    },
  },

  email: {
    async send({ to, subject, body }) {
      const result = await sendGmailMessage(to, subject, body);
      return { id: result.id };
    },
    async createDraft({ to, subject, body }) {
      const result = await createGmailDraft(to, subject, body);
      return { id: result.id };
    },
    async listRecent(query = "", max = 6) {
      const messages = await fetchRecentGmailMessages(query, max);
      return messages.map((m) => ({
        id: m.id,
        threadId: m.threadId,
        subject: m.subject || "(No Subject)",
        from: m.from || "",
        to: m.to || "",
        date: m.date || "",
        snippet: m.snippet,
        providerId: PROVIDER_ID,
        source: "Email" as const,
      }));
    },
  },

  files: {
    async uploadNote(filename, content, dealName) {
      const result = await uploadDealNoteToDrive(filename, content, dealName);
      if (!result.file) throw new Error("File was not uploaded.");
      return { file: toStoredFile(result.file), link: result.webViewLink };
    },
    async listFiles(query = "", max = 12) {
      return (await listGoogleDriveFiles(query, max)).map(toStoredFile);
    },
  },
};
