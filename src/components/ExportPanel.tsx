import React, { useEffect, useState } from "react";
import { Download, Webhook, Trash2, Send, Copy, CheckCircle2, AlertTriangle } from "lucide-react";

interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
  secretPreview: string;
  lastDelivery?: { at: string; event: string; status: number | null; error?: string };
}

const EXPORTS = [
  { type: "calls", label: "Call logs" },
  { type: "notes", label: "Notes" },
  { type: "briefings", label: "Briefings" },
] as const;

const EVENT_LABELS: Record<string, string> = {
  "call.logged": "Call logged",
  "note.created": "Note created",
  "briefing.created": "Briefing created",
};

const buttonClass =
  "inline-flex items-center justify-center gap-1.5 px-3 min-h-10 rounded-xl text-xs font-semibold border cursor-pointer transition-colors";

export const ExportPanel: React.FC<{ showNotification: (msg: string) => void }> = ({ showNotification }) => {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const load = async () => {
    const data = await fetch("/api/webhooks").then((r) => r.json());
    setWebhooks(data.webhooks || []);
    setEvents(data.events || []);
    setSelectedEvents((prev) => (prev.length ? prev : data.events || []));
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const addWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events: selectedEvents }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not add webhook");
      return;
    }
    setNewSecret(data.webhook.secret);
    setUrl("");
    load();
  };

  const testWebhook = async (id: string) => {
    const data = await fetch(`/api/webhooks/${id}/test`, { method: "POST" }).then((r) => r.json());
    const d = data.delivery;
    showNotification(d?.status && d.status < 300 ? `Test delivered (HTTP ${d.status})` : `Test failed: ${d?.error || `HTTP ${d?.status}`}`);
    load();
  };

  const removeWebhook = async (id: string) => {
    await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900">Export & Connect to Other Systems</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Download your data, or send new records to your own CRM or tools with a webhook.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <Download className="w-4 h-4 text-emerald-600" /> Export
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {EXPORTS.map((item) => (
            <div key={item.type} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-800">{item.label}</span>
              <span className="flex gap-1.5">
                <a href={`/api/export?type=${item.type}&format=csv`} className={`${buttonClass} bg-white border-slate-200 text-slate-700 hover:bg-slate-100`}>
                  CSV
                </a>
                <a href={`/api/export?type=${item.type}&format=json`} className={`${buttonClass} bg-white border-slate-200 text-slate-700 hover:bg-slate-100`}>
                  JSON
                </a>
              </span>
            </div>
          ))}
        </div>
        <a href="/api/export?type=all&format=json" className={`${buttonClass} bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100`}>
          <Download className="w-3.5 h-3.5" /> Export everything (JSON)
        </a>
      </div>

      <div className="space-y-3">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <Webhook className="w-4 h-4 text-emerald-600" /> Webhooks
        </h3>
        <p className="text-xs text-slate-500">
          Each event is sent as a JSON POST: <code className="font-mono">{"{ event, occurredAt, data }"}</code>, signed with
          HMAC-SHA256 in the <code className="font-mono">X-BrokerBuddy-Signature</code> header.
        </p>

        <form onSubmit={addWebhook} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-crm.example.com/hooks/broker-buddy"
              className="flex-1 min-h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:bg-white focus:border-emerald-500"
              required
            />
            <button type="submit" className={`${buttonClass} bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 min-h-11`}>
              Add webhook
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {events.map((ev) => (
              <label key={ev} className="flex items-center gap-1.5 px-2.5 min-h-9 rounded-lg bg-slate-50 border border-slate-200 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(ev)}
                  onChange={(e) =>
                    setSelectedEvents(e.target.checked ? [...selectedEvents, ev] : selectedEvents.filter((x) => x !== ev))
                  }
                />
                {EVENT_LABELS[ev] || ev}
              </label>
            ))}
          </div>
          {error && <p className="text-xs text-rose-700">{error}</p>}
        </form>

        {newSecret && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
            <p className="font-semibold">Signing secret (shown once; store it in your receiving system):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono break-all">{newSecret}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(newSecret).then(() => showNotification("Secret copied"))}
                className={`${buttonClass} bg-white border-amber-300`}
              >
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
          </div>
        )}

        {webhooks.length === 0 ? (
          <p className="text-xs text-slate-400">No webhooks yet.</p>
        ) : (
          <ul className="space-y-2">
            {webhooks.map((hook) => (
              <li key={hook.id} className="p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono text-slate-800 break-all">{hook.url}</span>
                  <span className="flex gap-1.5">
                    <button type="button" onClick={() => testWebhook(hook.id)} className={`${buttonClass} bg-white border-slate-200 text-slate-700 hover:bg-slate-100`}>
                      <Send className="w-3.5 h-3.5" /> Test
                    </button>
                    <button type="button" onClick={() => removeWebhook(hook.id)} className={`${buttonClass} bg-white border-rose-200 text-rose-700 hover:bg-rose-50`} aria-label="Delete webhook">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  {hook.events.map((ev) => (
                    <span key={ev} className="px-1.5 py-0.5 rounded bg-slate-100">{EVENT_LABELS[ev] || ev}</span>
                  ))}
                  {hook.lastDelivery &&
                    (hook.lastDelivery.status && hook.lastDelivery.status < 300 ? (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Last delivery OK ({hook.lastDelivery.status})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5" /> Last delivery failed:{" "}
                        {hook.lastDelivery.error || `HTTP ${hook.lastDelivery.status}`}
                      </span>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
