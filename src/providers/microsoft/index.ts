import {
  createStandardPublicClientApplication,
  IPublicClientApplication,
  AccountInfo,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import type { CalendarEvent, EmailMessage, ProviderAccount, StoredFile, WorkspaceProvider } from "../types.ts";

// Microsoft 365: Outlook mail, Outlook calendar and OneDrive through Microsoft Graph.
// Requires an Azure app registration (SPA platform) with redirect URI <app origin>/auth/microsoft.
const PROVIDER_ID = "microsoft";
const CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID as string | undefined;
const GRAPH = "https://graph.microsoft.com/v1.0";
const SCOPES = ["User.Read", "Mail.ReadWrite", "Mail.Send", "Calendars.ReadWrite", "Files.ReadWrite"];
export const MICROSOFT_REDIRECT_PATH = "/auth/microsoft";

let msalPromise: Promise<IPublicClientApplication> | null = null;
const listeners = new Set<(account: ProviderAccount | null) => void>();
let currentAccount: ProviderAccount | null = null;

function msal() {
  if (!CLIENT_ID) {
    return Promise.reject(
      new Error("Microsoft 365 isn't set up for this app yet. Add VITE_MICROSOFT_CLIENT_ID to the environment.")
    );
  }
  if (!msalPromise) {
    msalPromise = createStandardPublicClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: "https://login.microsoftonline.com/common",
        redirectUri: `${window.location.origin}${MICROSOFT_REDIRECT_PATH}`,
      },
      cache: { cacheLocation: "sessionStorage" },
    });
  }
  return msalPromise;
}

const toAccount = (a: AccountInfo): ProviderAccount => ({
  id: a.homeAccountId,
  name: a.name || a.username,
  email: a.username,
  providerId: PROVIDER_ID,
});

function setAccount(account: ProviderAccount | null) {
  currentAccount = account;
  listeners.forEach((cb) => cb(account));
}

async function getToken(): Promise<string> {
  const app = await msal();
  const account = app.getAllAccounts()[0];
  if (!account) throw new Error("Microsoft 365 not connected. Connect your account first.");
  try {
    return (await app.acquireTokenSilent({ scopes: SCOPES, account })).accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      return (await app.acquireTokenPopup({ scopes: SCOPES, account })).accessToken;
    }
    throw err;
  }
}

async function graph<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(path.startsWith("http") ? path : `${GRAPH}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || `Microsoft Graph error (${res.status})`);
  }
  return (res.status === 202 || res.status === 204 ? {} : await res.json()) as T;
}

// Graph returns UTC times without a zone suffix when asked for UTC.
const utc = (dateTime: string) => (/[zZ]|[+-]\d\d:\d\d$/.test(dateTime) ? dateTime : `${dateTime}Z`);

function toCalendarEvent(e: any): CalendarEvent {
  return {
    id: e.id,
    title: e.subject || "(No title)",
    description: e.bodyPreview,
    location: e.location?.displayName || undefined,
    start: new Date(utc(e.start.dateTime)).toISOString(),
    end: new Date(utc(e.end.dateTime)).toISOString(),
    allDay: Boolean(e.isAllDay),
    attendees: (e.attendees || []).map((a: any) => ({
      email: a.emailAddress?.address || "",
      name: a.emailAddress?.name,
      responseStatus: a.status?.response,
    })),
    link: e.webLink,
    providerId: PROVIDER_ID,
    source: "Calendar",
  };
}

const toStoredFile = (item: any): StoredFile => ({
  id: item.id,
  name: item.name,
  mimeType: item.file?.mimeType || (item.folder ? "folder" : "file"),
  link: item.webUrl,
  modifiedTime: item.lastModifiedDateTime,
  size: item.size !== undefined ? String(item.size) : undefined,
  providerId: PROVIDER_ID,
});

const message = (to: string, subject: string, body: string) => ({
  subject,
  body: { contentType: "Text", content: body },
  toRecipients: [{ emailAddress: { address: to } }],
});

export const microsoft365Provider: WorkspaceProvider = {
  id: PROVIDER_ID,
  displayName: "Microsoft 365",
  kinds: ["mailCalendar", "files"],
  labels: { email: "Outlook", calendar: "Outlook Calendar", files: "OneDrive" },
  isConfigured: Boolean(CLIENT_ID),
  setupHint: "Needs VITE_MICROSOFT_CLIENT_ID (Azure app registration)",

  async connect() {
    const app = await msal();
    const result = await app.loginPopup({ scopes: SCOPES, prompt: "select_account" });
    const account = toAccount(result.account);
    setAccount(account);
    return account;
  },

  async disconnect() {
    const app = await msal();
    await app.clearCache();
    setAccount(null);
  },

  onAccountChange(callback) {
    listeners.add(callback);
    if (CLIENT_ID) {
      msal()
        .then((app) => {
          const account = app.getAllAccounts()[0];
          callback(account ? toAccount(account) : currentAccount);
        })
        .catch(() => callback(null));
    } else {
      callback(null);
    }
    return () => {
      listeners.delete(callback);
    };
  },

  calendar: {
    async listUpcomingEvents({ from = new Date(), to, max = 8 }) {
      const end = to || new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
      const params = new URLSearchParams({
        startDateTime: from.toISOString(),
        endDateTime: end.toISOString(),
        $orderby: "start/dateTime",
        $top: String(max),
      });
      const data = await graph<{ value: any[] }>(`/me/calendarView?${params}`, {
        headers: { Prefer: 'outlook.timezone="UTC"' },
      });
      return data.value.map(toCalendarEvent);
    },
    async createEvent(event) {
      const created = await graph<any>("/me/events", {
        method: "POST",
        headers: { Prefer: 'outlook.timezone="UTC"' },
        body: JSON.stringify({
          subject: event.title,
          body: { contentType: "Text", content: event.description },
          start: { dateTime: event.start, timeZone: "UTC" },
          end: { dateTime: event.end, timeZone: "UTC" },
          location: event.location ? { displayName: event.location } : undefined,
          attendees: (event.attendeeEmails || []).map((address) => ({
            emailAddress: { address },
            type: "required",
          })),
        }),
      });
      return { event: toCalendarEvent(created), link: created.webLink };
    },
  },

  email: {
    async send({ to, subject, body }) {
      await graph("/me/sendMail", {
        method: "POST",
        body: JSON.stringify({ message: message(to, subject, body), saveToSentItems: true }),
      });
      return {};
    },
    async createDraft({ to, subject, body }) {
      const draft = await graph<{ id: string }>("/me/messages", {
        method: "POST",
        body: JSON.stringify(message(to, subject, body)),
      });
      return { id: draft.id };
    },
    async listRecent(query = "", max = 6) {
      const params = new URLSearchParams({
        $top: String(max),
        $select: "id,conversationId,subject,from,toRecipients,receivedDateTime,bodyPreview",
      });
      if (query) params.set("$search", `"${query.replace(/"/g, "")}"`);
      const data = await graph<{ value: any[] }>(`/me/messages?${params}`);
      return data.value.map(
        (m): EmailMessage => ({
          id: m.id,
          threadId: m.conversationId,
          subject: m.subject || "(No Subject)",
          from: m.from?.emailAddress?.address || "",
          to: (m.toRecipients || []).map((r: any) => r.emailAddress?.address).join(", "),
          date: m.receivedDateTime,
          snippet: m.bodyPreview || "",
          providerId: PROVIDER_ID,
          source: "Email",
        })
      );
    },
  },

  files: {
    async uploadNote(filename, content) {
      const name = filename.endsWith(".md") ? filename : `${filename}.md`;
      const token = await getToken();
      const res = await fetch(`${GRAPH}/me/drive/root:/Broker Buddy/${encodeURIComponent(name)}:/content`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/markdown" },
        body: content,
      });
      if (!res.ok) throw new Error(`OneDrive upload error (${res.status})`);
      const item = await res.json();
      return { file: toStoredFile(item), link: item.webUrl };
    },
    async listFiles(query = "", max = 12) {
      const path = query.trim()
        ? `/me/drive/root/search(q='${encodeURIComponent(query.replace(/'/g, "''"))}')?$top=${max}`
        : `/me/drive/recent?$top=${max}`;
      const data = await graph<{ value: any[] }>(path);
      return data.value.map(toStoredFile);
    },
  },
};
