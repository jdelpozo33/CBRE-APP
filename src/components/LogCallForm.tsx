import React, { useState } from "react";
import { PhoneCall, X, Link2, Sparkles, Tag } from "lucide-react";
import { Contact, QuickActivityLog } from "../types.ts";

export interface LogCallDraft {
  who: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:MM
  property: string;
  notes: string;
  tags: string[];
}

interface LogCallFormProps {
  contacts: Contact[];
  initial?: Partial<LogCallDraft>;
  linkedMeeting?: { id: string; title: string } | null;
  // Shown when the form was pre-filled automatically (e.g. from a recording).
  reviewNotice?: string;
  onSave: (log: Partial<QuickActivityLog>) => Promise<void>;
  onClose: () => void;
}

const SUGGESTED_TAGS = ["Follow-up", "Pricing", "LOI", "Tour", "Financing", "Lease", "Hot lead"];

const pad = (n: number) => String(n).padStart(2, "0");
export const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const inputClass =
  "w-full min-h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

export const LogCallForm: React.FC<LogCallFormProps> = ({
  contacts,
  initial,
  linkedMeeting,
  reviewNotice,
  onSave,
  onClose,
}) => {
  const now = new Date();
  const [who, setWho] = useState(initial?.who || "");
  const [date, setDate] = useState(initial?.date || toDateInput(now));
  const [time, setTime] = useState(initial?.time || toTimeInput(now));
  const [property, setProperty] = useState(initial?.property || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#/, "");
    if (tag && !tags.some((t) => t.toLowerCase() === tag.toLowerCase())) setTags([...tags, tag]);
    setTagInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!who.trim()) return;
    const contact = contacts.find((c) => c.name.toLowerCase() === who.trim().toLowerCase());
    const pendingTag = tagInput.trim();
    const allTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags;

    setIsSaving(true);
    try {
      await onSave({
        type: "call",
        title: `Call with ${who.trim()}`,
        entityName: contact ? `${contact.name} (${contact.role}, ${contact.company})` : who.trim(),
        propertyOrContext: property.trim() || linkedMeeting?.title || "General",
        outcome: "Call logged",
        notes: notes.trim(),
        tags: allTags,
        occurredAt: new Date(`${date}T${time || "00:00"}`).toISOString(),
        timestamp: `${date} ${time}`,
        meetingId: linkedMeeting?.id,
        meetingTitle: linkedMeeting?.title,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
        aria-labelledby="log-call-title"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-emerald-600" />
            <h2 id="log-call-title" className="text-base font-bold text-slate-900">
              Log Call
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {reviewNotice && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{reviewNotice}</span>
          </div>
        )}

        {linkedMeeting && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <Link2 className="w-4 h-4 shrink-0" />
            <span className="truncate">
              Linked to meeting: <strong>{linkedMeeting.title}</strong>
            </span>
          </div>
        )}

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700">Who you called *</span>
          <input
            className={inputClass}
            value={who}
            onChange={(e) => setWho(e.target.value)}
            list="log-call-contacts"
            placeholder="Contact name"
            required
            autoFocus={!initial?.who}
          />
          <datalist id="log-call-contacts">
            {contacts.map((c) => (
              <option key={c.id} value={c.name}>
                {c.role} · {c.company}
              </option>
            ))}
          </datalist>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700">Date</span>
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700">Time</span>
            <input type="time" className={inputClass} value={time} onChange={(e) => setTime(e.target.value)} required />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700">Property / deal</span>
          <input
            className={inputClass}
            value={property}
            onChange={(e) => setProperty(e.target.value)}
            placeholder="Optional, e.g. 1420 Market Street"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700">Notes</span>
          <textarea
            className={`${inputClass} min-h-28 resize-y`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What was discussed, next steps..."
          />
        </label>

        <div className="space-y-1.5">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
            <Tag className="w-3.5 h-3.5" /> Tags
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                aria-label={`Remove tag ${tag}`}
              >
                {tag}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
          <input
            className={inputClass}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder="Add a tag and press Enter"
          />
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs cursor-pointer"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !who.trim()}
            className="flex-1 min-h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? "Saving..." : reviewNotice ? "Confirm & Save" : "Save Call"}
          </button>
        </div>
      </form>
    </div>
  );
};
