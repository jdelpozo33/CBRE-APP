// Provider-neutral interfaces for calendar, email and file storage. UI code depends only on
// these types, so Microsoft 365 / Outlook or other providers can be added as new
// implementations without touching components.

// Where a piece of data came from. Every record shown in the app carries one of these.
export type DataSource = "Email" | "Call" | "Note" | "Calendar" | "External" | "CRM";

export interface ProviderAccount {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  providerId: string;
}

export interface CalendarAttendee {
  email: string;
  name?: string;
  responseStatus?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO date-time
  end: string; // ISO date-time
  allDay: boolean;
  attendees: CalendarAttendee[];
  link?: string;
  providerId: string;
  source: "Calendar";
}

export interface NewCalendarEvent {
  title: string;
  description: string;
  location?: string;
  start: string; // ISO date-time
  end: string; // ISO date-time
  attendeeEmails?: string[];
}

export interface EmailMessage {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  providerId: string;
  source: "Email";
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  body: string;
}

export interface StoredFile {
  id: string;
  name: string;
  mimeType: string;
  link?: string;
  modifiedTime?: string;
  size?: string;
  providerId: string;
}

export interface CalendarProvider {
  listUpcomingEvents(options: { from?: Date; to?: Date; max?: number }): Promise<CalendarEvent[]>;
  createEvent(event: NewCalendarEvent): Promise<{ event: CalendarEvent; link?: string }>;
}

export interface EmailProvider {
  send(message: OutgoingEmail): Promise<{ id?: string }>;
  createDraft(message: OutgoingEmail): Promise<{ id?: string }>;
  listRecent(query?: string, max?: number): Promise<EmailMessage[]>;
}

export interface FileStorageProvider {
  uploadNote(filename: string, content: string, dealName: string): Promise<{ file: StoredFile; link?: string }>;
  listFiles(query?: string, max?: number): Promise<StoredFile[]>;
}

export interface WorkspaceProvider {
  id: string;
  // Shown in the UI, e.g. "Google Workspace" or "Microsoft 365".
  displayName: string;
  labels: { email: string; calendar: string; files: string };
  connect(): Promise<ProviderAccount>;
  disconnect(): Promise<void>;
  // Calls back with the connected account, or null when disconnected. Returns an unsubscribe.
  onAccountChange(callback: (account: ProviderAccount | null) => void): () => void;
  calendar: CalendarProvider;
  email: EmailProvider;
  files?: FileStorageProvider;
}
