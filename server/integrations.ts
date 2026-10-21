import crypto from "crypto";
import { listRecords, insertRecord, updateRecord, getRecord } from "./database.ts";

// --- Outgoing webhooks: push new records into the broker's own CRM or tools ---

export const WEBHOOK_EVENTS = ["call.logged", "note.created", "briefing.created"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  createdAt: string;
  lastDelivery?: { at: string; event: string; status: number | null; error?: string };
}

export function validateWebhookUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Enter a valid URL.";
  }
  // Local development only: allow http:// and private hosts for testing receivers.
  if (process.env.ALLOW_LOCAL_WEBHOOKS === "true") return null;
  if (parsed.protocol !== "https:") return "Webhook URLs must use https://.";
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[?::1\]?$)/i.test(parsed.hostname)) {
    return "Webhook URLs must point to a public host.";
  }
  return null;
}

export function createWebhook(url: string, events: WebhookEvent[]): Webhook {
  return insertRecord<Webhook>("webhooks", {
    id: `wh-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    url,
    events: events.length > 0 ? events : [...WEBHOOK_EVENTS],
    secret: crypto.randomBytes(24).toString("hex"),
    createdAt: new Date().toISOString(),
  });
}

// POSTs {event, occurredAt, data} signed with HMAC-SHA256 of the body in X-BrokerBuddy-Signature.
async function deliver(hook: Webhook, event: string, data: unknown) {
  const body = JSON.stringify({ event, occurredAt: new Date().toISOString(), data });
  const signature = crypto.createHmac("sha256", hook.secret).update(body).digest("hex");
  let lastDelivery: Webhook["lastDelivery"];
  try {
    const res = await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BrokerBuddy-Event": event,
        "X-BrokerBuddy-Signature": `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    lastDelivery = { at: new Date().toISOString(), event, status: res.status };
  } catch (err: any) {
    lastDelivery = { at: new Date().toISOString(), event, status: null, error: err?.message || String(err) };
  }
  updateRecord<Webhook>("webhooks", hook.id, { lastDelivery });
  return lastDelivery;
}

// Fire-and-forget delivery to every webhook subscribed to the event.
export function emitWebhookEvent(event: WebhookEvent, data: unknown) {
  for (const hook of listRecords<Webhook>("webhooks")) {
    if (hook.events.includes(event)) void deliver(hook, event, data);
  }
}

export async function sendTestEvent(id: string) {
  const hook = getRecord<Webhook>("webhooks", id);
  if (!hook) return null;
  return deliver(hook, "test", { message: "Broker Buddy webhook test" });
}

// --- Briefings: saved dossiers and debrief analyses, so they can be exported ---

export interface StoredBriefing {
  id: string;
  kind: "dossier" | "debrief";
  title: string;
  createdAt: string;
  // "claude" for AI-generated briefings, "fallback" when the built-in sample data was used.
  generatedBy: "claude" | "fallback";
  source: "External";
  data: unknown;
}

export function saveBriefing(kind: StoredBriefing["kind"], title: string, data: unknown, generatedBy: StoredBriefing["generatedBy"]) {
  const briefing = insertRecord<StoredBriefing>("briefings", {
    id: `brief-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    kind,
    title,
    createdAt: new Date().toISOString(),
    generatedBy,
    source: "External",
    data,
  });
  emitWebhookEvent("briefing.created", briefing);
  return briefing;
}

// --- Export ---

function csvCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  const text = typeof value === "string" ? value : Array.isArray(value) ? value.join("; ") : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  return [columns.join(","), ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(","))].join("\r\n");
}

export const EXPORT_COLUMNS = {
  calls: ["id", "occurredAt", "timestamp", "entityName", "propertyOrContext", "notes", "tags", "meetingTitle", "source"],
  notes: ["id", "occurredAt", "timestamp", "type", "title", "notes", "propertyOrContext", "tags", "meetingTitle", "source"],
  briefings: ["id", "createdAt", "kind", "title", "generatedBy", "source", "data"],
};
