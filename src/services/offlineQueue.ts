import { QuickActivityLog } from "../types.ts";

// Notes and call logs captured without a connection are kept on this device and sent to the
// server when the connection returns. Each carries a clientId so a retry never duplicates it.
const STORAGE_KEY = "broker-buddy.pending-activity-logs";

interface PendingLog {
  clientId: string;
  payload: Partial<QuickActivityLog>;
  queuedAt: string;
}

function readQueue(): PendingLog[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingLog[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage unavailable (private mode / full); nothing more we can do offline.
  }
}

const toLocalLog = (item: PendingLog): QuickActivityLog => ({
  type: "note",
  title: "Note",
  entityName: "",
  propertyOrContext: "",
  outcome: "",
  notes: "",
  ...item.payload,
  id: item.clientId,
  timestamp: item.payload.timestamp || item.queuedAt.replace("T", " ").slice(0, 19),
  pendingSync: true,
});

async function post(payload: Partial<QuickActivityLog>): Promise<QuickActivityLog> {
  const res = await fetch("/api/activity-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return (await res.json()).log;
}

// Saves a log, or queues it on this device if the network is unreachable.
export async function submitActivityLog(
  log: Partial<QuickActivityLog>
): Promise<{ log: QuickActivityLog; queued: boolean }> {
  const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = { ...log, clientId };
  if (navigator.onLine) {
    try {
      return { log: await post(payload), queued: false };
    } catch (err) {
      // Only network failures are queued; a server-side rejection is reported.
      if (!(err instanceof TypeError)) throw err;
    }
  }
  const item: PendingLog = { clientId, payload, queuedAt: new Date().toISOString() };
  writeQueue([...readQueue(), item]);
  return { log: toLocalLog(item), queued: true };
}

export function pendingActivityLogs(): QuickActivityLog[] {
  return readQueue().map(toLocalLog);
}

// Sends queued logs; returns the saved ones keyed by the clientId they replace.
export async function flushPendingActivityLogs(): Promise<Map<string, QuickActivityLog>> {
  const saved = new Map<string, QuickActivityLog>();
  for (const item of readQueue()) {
    try {
      saved.set(item.clientId, await post(item.payload));
      writeQueue(readQueue().filter((q) => q.clientId !== item.clientId));
    } catch {
      break; // still offline; try again later
    }
  }
  return saved;
}
