import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import {
  initialContacts,
  initialListings,
  initialComps,
  dispatchedMessagesLog,
  initialActivityLogs,
} from "./db.ts";

// Persistent SQLite store (Node's built-in node:sqlite, no native dependency).
// Each collection is a table of JSON documents so records can gain fields (source, tags,
// deal stage, ...) without schema migrations.
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "dealpulse.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");

export const COLLECTIONS = [
  "contacts",
  "listings",
  "comps",
  "messages",
  "activity_logs",
  "notes",
  "webhooks",
  "settings",
] as const;
export type Collection = (typeof COLLECTIONS)[number];

for (const name of COLLECTIONS) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS ${name} (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      data TEXT NOT NULL
    );`
  );
}

type WithId = { id: string };

export function listRecords<T extends WithId>(collection: Collection): T[] {
  const rows = db
    .prepare(`SELECT data FROM ${collection} ORDER BY created_at DESC, rowid DESC`)
    .all() as { data: string }[];
  return rows.map((row) => JSON.parse(row.data) as T);
}

export function getRecord<T extends WithId>(collection: Collection, id: string): T | null {
  const row = db.prepare(`SELECT data FROM ${collection} WHERE id = ?`).get(id) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as T) : null;
}

export function insertRecord<T extends WithId>(collection: Collection, record: T): T {
  db.prepare(`INSERT INTO ${collection} (id, created_at, data) VALUES (?, ?, ?)`).run(
    record.id,
    new Date().toISOString(),
    JSON.stringify(record)
  );
  return record;
}

export function updateRecord<T extends WithId>(
  collection: Collection,
  id: string,
  patch: Partial<T>
): T | null {
  const existing = getRecord<T>(collection, id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, id } as T;
  db.prepare(`UPDATE ${collection} SET data = ? WHERE id = ?`).run(JSON.stringify(updated), id);
  return updated;
}

export function deleteRecord(collection: Collection, id: string): boolean {
  return db.prepare(`DELETE FROM ${collection} WHERE id = ?`).run(id).changes > 0;
}

export function countRecords(collection: Collection): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${collection}`).get() as { n: number };
  return row.n;
}

export function getSetting<T>(key: string, fallback: T): T {
  const row = getRecord<{ id: string; value: T }>("settings", key);
  return row ? row.value : fallback;
}

export function setSetting<T>(key: string, value: T): void {
  if (getRecord("settings", key)) {
    updateRecord<{ id: string; value: T }>("settings", key, { value });
  } else {
    insertRecord("settings", { id: key, value });
  }
}

// Seed the sample brokerage workspace on first run. Records are inserted oldest-first so
// the newest-first listing order matches the original sample order.
function seed<T extends WithId>(collection: Collection, records: T[]) {
  if (countRecords(collection) > 0) return;
  const insert = db.prepare(`INSERT INTO ${collection} (id, created_at, data) VALUES (?, ?, ?)`);
  const base = Date.now() - records.length * 1000;
  [...records].reverse().forEach((record, i) => {
    insert.run(record.id, new Date(base + i * 1000).toISOString(), JSON.stringify(record));
  });
}

seed("contacts", initialContacts);
seed("listings", initialListings);
seed("comps", initialComps);
seed("messages", dispatchedMessagesLog);
seed("activity_logs", initialActivityLogs);

// Tag every stored record with where it came from (records created before tagging existed).
function backfillSource<T extends WithId & { source?: string }>(
  collection: Collection,
  sourceFor: (record: T) => string
) {
  for (const record of listRecords<T>(collection)) {
    if (!record.source) updateRecord<T>(collection, record.id, { source: sourceFor(record) } as Partial<T>);
  }
}

backfillSource("contacts", () => "CRM");
backfillSource("listings", () => "CRM");
backfillSource("comps", () => "External");
backfillSource("messages", () => "Email");
backfillSource<WithId & { source?: string; type?: string }>("activity_logs", (log) =>
  log.type === "call" ? "Call" : "Note"
);
