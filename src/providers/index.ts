import type {
  CalendarProvider,
  ConnectionKind,
  ConnectionSelection,
  EmailProvider,
  FileStorageProvider,
  OutgoingEmail,
  ProviderAccount,
  WorkspaceProvider,
} from "./types.ts";
import { googleWorkspaceProvider } from "./google/index.ts";
import { microsoft365Provider } from "./microsoft/index.ts";
import { dropboxProvider } from "./dropbox/index.ts";

export * from "./types.ts";

// All available providers. Brokers choose one for email & calendar and one for files on the
// Connections page; the UI only talks to the chosen ones through the `workspace` object below.
export const workspaceProviders: WorkspaceProvider[] = [googleWorkspaceProvider, microsoft365Provider, dropboxProvider];

export const providersFor = (kind: ConnectionKind) => workspaceProviders.filter((p) => p.kinds.includes(kind));

const byId = (id: string, kind: ConnectionKind) =>
  providersFor(kind).find((p) => p.id === id) || providersFor(kind)[0];

export const DEFAULT_SELECTION: ConnectionSelection = { mailCalendar: "google", files: "google" };

let selection: ConnectionSelection = { ...DEFAULT_SELECTION };
const selectionListeners = new Set<(selection: ConnectionSelection, persist: boolean) => void>();

// Subscribes to a provider's account and re-subscribes whenever the chosen provider changes.
function followAccount(kind: ConnectionKind, callback: (account: ProviderAccount | null) => void) {
  let unsubscribe = byId(selection[kind], kind).onAccountChange(callback);
  let current = selection[kind];
  const onSelection = (next: ConnectionSelection) => {
    if (next[kind] === current) return;
    current = next[kind];
    unsubscribe();
    callback(null);
    unsubscribe = byId(current, kind).onAccountChange(callback);
  };
  selectionListeners.add(onSelection);
  return () => {
    unsubscribe();
    selectionListeners.delete(onSelection);
  };
}

// The active connections: email & calendar from one provider, files from another (or the same).
export const workspace = {
  get selection(): ConnectionSelection {
    return selection;
  },
  // `persist` is false when applying a saved selection on startup.
  select(next: Partial<ConnectionSelection>, persist = true) {
    selection = {
      mailCalendar: byId(next.mailCalendar ?? selection.mailCalendar, "mailCalendar").id,
      files: byId(next.files ?? selection.files, "files").id,
    };
    selectionListeners.forEach((cb) => cb(selection, persist));
  },
  onSelectionChange(callback: (selection: ConnectionSelection, persist: boolean) => void) {
    selectionListeners.add(callback);
    return () => {
      selectionListeners.delete(callback);
    };
  },

  get mailProvider(): WorkspaceProvider {
    return byId(selection.mailCalendar, "mailCalendar");
  },
  get filesProvider(): WorkspaceProvider {
    return byId(selection.files, "files");
  },
  // Name of the email & calendar provider, e.g. "Google Workspace".
  get displayName(): string {
    return this.mailProvider.displayName;
  },
  get labels() {
    return {
      email: this.mailProvider.labels.email || "Email",
      calendar: this.mailProvider.labels.calendar || "Calendar",
      files: this.filesProvider.labels.files || "Files",
    };
  },
  get calendar(): CalendarProvider {
    return this.mailProvider.calendar!;
  },
  get email(): EmailProvider {
    return this.mailProvider.email!;
  },
  get files(): FileStorageProvider | undefined {
    return this.filesProvider.files;
  },
  // True when files live with a different provider that needs its own sign-in.
  get filesNeedSeparateConnection(): boolean {
    return this.filesProvider.id !== this.mailProvider.id;
  },

  // Email & calendar account.
  connect: () => byId(selection.mailCalendar, "mailCalendar").connect(),
  disconnect: () => byId(selection.mailCalendar, "mailCalendar").disconnect(),
  onAccountChange: (callback: (account: ProviderAccount | null) => void) => followAccount("mailCalendar", callback),

  // Files account (the same account when both use one provider).
  connectFiles: () => byId(selection.files, "files").connect(),
  disconnectFiles: () => byId(selection.files, "files").disconnect(),
  onFilesAccountChange: (callback: (account: ProviderAccount | null) => void) => followAccount("files", callback),
};

// Send or draft several messages through the active provider, collecting per-recipient errors.
async function runBatch(
  messages: OutgoingEmail[],
  action: (message: OutgoingEmail) => Promise<unknown>
): Promise<{ success: boolean; count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;
  for (const message of messages) {
    try {
      await action(message);
      count++;
    } catch (err: any) {
      errors.push(`${message.to}: ${err?.message || err}`);
    }
  }
  return { success: errors.length === 0, count, errors };
}

export const sendEmailBatch = (messages: OutgoingEmail[]) =>
  runBatch(messages, (m) => workspace.email.send(m));

export const draftEmailBatch = (messages: OutgoingEmail[]) =>
  runBatch(messages, (m) => workspace.email.createDraft(m));
