import React, { useState } from "react";
import { Plus, X, Mic, StickyNote, PhoneCall, Link2, Square, RefreshCw } from "lucide-react";
import { Contact, QuickActivityLog } from "../types.ts";
import { LogCallForm, LogCallDraft, toDateInput, toTimeInput } from "./LogCallForm.tsx";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder.ts";

export interface LinkedMeeting {
  id: string;
  title: string;
}

interface QuickCaptureProps {
  contacts: Contact[];
  // Meeting happening now or starting within 30 minutes; captures are linked to it.
  activeMeeting: LinkedMeeting | null;
  onSaveLog: (log: Partial<QuickActivityLog>) => Promise<void>;
}

type Sheet = "record" | "note" | "call" | null;

const formatTime = (secs: number) => `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

const MeetingLink: React.FC<{ meeting: LinkedMeeting | null }> = ({ meeting }) =>
  meeting ? (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
      <Link2 className="w-4 h-4 shrink-0" />
      <span className="truncate">
        Linked to meeting: <strong>{meeting.title}</strong>
      </span>
    </div>
  ) : null;

const SheetFrame: React.FC<{ title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode }> = ({
  title,
  icon,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
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
      {children}
    </div>
  </div>
);

const RecordSheet: React.FC<{
  activeMeeting: LinkedMeeting | null;
  onSaveNote: (text: string) => Promise<void>;
  onFillLogCall: (transcript: string) => Promise<void>;
  onClose: () => void;
}> = ({ activeMeeting, onSaveNote, onFillLogCall, onClose }) => {
  const voice = useVoiceRecorder();
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const busy = voice.isRecording || voice.isTranscribing || isExtracting;

  const close = async () => {
    if (voice.isRecording) await voice.stop();
    onClose();
  };

  return (
    <SheetFrame title="Record" icon={<Mic className="w-5 h-5 text-emerald-600" />} onClose={close}>
      <MeetingLink meeting={activeMeeting} />
      <div className="flex flex-col items-center gap-3 py-2">
        <button
          type="button"
          onClick={voice.isRecording ? () => voice.stop() : voice.start}
          disabled={voice.isTranscribing}
          className={`w-24 h-24 rounded-full flex flex-col items-center justify-center text-white shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-60 ${
            voice.isRecording ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
          aria-label={voice.isRecording ? "Stop recording" : "Start recording"}
        >
          {voice.isRecording ? <Square className="w-7 h-7 fill-current" /> : <Mic className="w-8 h-8" />}
          <span className="text-[10px] font-extrabold uppercase tracking-wider mt-1">
            {voice.isRecording ? "Stop" : "Record"}
          </span>
        </button>
        <span className="font-mono text-sm text-slate-700">{formatTime(voice.seconds)}</span>
        {(voice.status || voice.isTranscribing) && (
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            {voice.status || "Transcribing..."}
          </span>
        )}
        {voice.error && <p className="text-xs text-rose-700 text-center">{voice.error}</p>}
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-700">Transcript</span>
        <textarea
          value={voice.transcript}
          onChange={(e) => voice.setTranscript(e.target.value)}
          className="w-full min-h-28 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:bg-white focus:border-emerald-500"
          placeholder="Your words appear here as you speak. You can edit them before saving."
        />
      </label>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          disabled={busy || isSaving || !voice.transcript.trim()}
          onClick={async () => {
            setIsSaving(true);
            try {
              await onSaveNote(voice.transcript.trim());
              onClose();
            } finally {
              setIsSaving(false);
            }
          }}
          className="flex-1 min-h-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? "Saving..." : "Save as Note"}
        </button>
        <button
          type="button"
          disabled={busy || isSaving || !voice.transcript.trim()}
          onClick={async () => {
            setIsExtracting(true);
            try {
              await onFillLogCall(voice.transcript.trim());
            } finally {
              setIsExtracting(false);
            }
          }}
          className="flex-1 min-h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          {isExtracting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Reading call details...
            </>
          ) : (
            <>
              <PhoneCall className="w-4 h-4" />
              Fill Log Call
            </>
          )}
        </button>
      </div>
    </SheetFrame>
  );
};

const NoteSheet: React.FC<{
  activeMeeting: LinkedMeeting | null;
  onSaveNote: (text: string) => Promise<void>;
  onClose: () => void;
}> = ({ activeMeeting, onSaveNote, onClose }) => {
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  return (
    <SheetFrame title="Quick Note" icon={<StickyNote className="w-5 h-5 text-emerald-600" />} onClose={onClose}>
      <MeetingLink meeting={activeMeeting} />
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full min-h-40 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:bg-white focus:border-emerald-500"
        placeholder="Jot it down..."
      />
      <button
        type="button"
        disabled={isSaving || !text.trim()}
        onClick={async () => {
          setIsSaving(true);
          try {
            await onSaveNote(text.trim());
            onClose();
          } finally {
            setIsSaving(false);
          }
        }}
        className="w-full min-h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
      >
        {isSaving ? "Saving..." : "Save Note"}
      </button>
    </SheetFrame>
  );
};

// Floating quick-capture button shown on every screen: Record, Quick note, Log call.
export const QuickCapture: React.FC<QuickCaptureProps> = ({ contacts, activeMeeting, onSaveLog }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [callDraft, setCallDraft] = useState<Partial<LogCallDraft> | undefined>(undefined);
  const [callReviewNotice, setCallReviewNotice] = useState<string | undefined>(undefined);

  // Turn a recording into a pre-filled Log Call draft that the broker reviews before saving.
  const fillLogCallFromRecording = async (transcript: string) => {
    const now = new Date();
    let draft: Partial<LogCallDraft> = { notes: transcript };
    let notice = "Pre-filled from your recording. Review the details and confirm before saving.";
    try {
      const res = await fetch("/api/extract-call-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          localNow: now.toLocaleString([], { dateStyle: "full", timeStyle: "short" }),
          localDate: toDateInput(now),
          localTime: toTimeInput(now),
        }),
      });
      const data = await res.json();
      if (data.draft) draft = data.draft;
      if (data.extractedBy !== "claude") {
        notice = "Claude was unavailable, so only CRM names and properties were matched. Review carefully before saving.";
      }
    } catch {
      notice = "Could not read call details automatically. The transcript is in the notes; fill in the rest before saving.";
    }
    setCallDraft({
      ...draft,
      date: draft.date || toDateInput(now),
      time: draft.time || toTimeInput(now),
    });
    setCallReviewNotice(notice);
    setSheet("call");
  };

  const saveNote = (text: string) => {
    const firstLine = text.split("\n")[0];
    return onSaveLog({
      type: "note",
      title: firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine,
      entityName: activeMeeting?.title || "Quick note",
      propertyOrContext: activeMeeting?.title || "General",
      outcome: "Note captured",
      notes: text,
      occurredAt: new Date().toISOString(),
      meetingId: activeMeeting?.id,
      meetingTitle: activeMeeting?.title,
    });
  };

  const open = (next: Sheet) => {
    setIsOpen(false);
    setCallDraft(undefined);
    setCallReviewNotice(undefined);
    setSheet(next);
  };

  const actions: { id: Exclude<Sheet, null>; label: string; icon: React.ReactNode }[] = [
    { id: "record", label: "Record", icon: <Mic className="w-5 h-5" /> },
    { id: "note", label: "Quick note", icon: <StickyNote className="w-5 h-5" /> },
    { id: "call", label: "Log call", icon: <PhoneCall className="w-5 h-5" /> },
  ];

  return (
    <>
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-4 right-4 z-40 flex flex-col items-end gap-2 print:hidden">
        {isOpen && (
          <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xl w-60 space-y-1">
            {activeMeeting && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-emerald-800">
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Linked: {activeMeeting.title}</span>
              </div>
            )}
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => open(action.id)}
                className="w-full flex items-center gap-3 px-3 min-h-12 rounded-xl text-sm font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer"
              >
                <span className="text-emerald-600">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center active:scale-95 transition-all cursor-pointer relative"
          aria-label={isOpen ? "Close quick actions" : "Quick actions"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-7 h-7" />}
          {activeMeeting && !isOpen && (
            <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white" />
          )}
        </button>
      </div>

      {sheet === "record" && (
        <RecordSheet
          activeMeeting={activeMeeting}
          onSaveNote={saveNote}
          onFillLogCall={fillLogCallFromRecording}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "note" && <NoteSheet activeMeeting={activeMeeting} onSaveNote={saveNote} onClose={() => setSheet(null)} />}
      {sheet === "call" && (
        <LogCallForm
          contacts={contacts}
          initial={callDraft}
          reviewNotice={callReviewNotice}
          linkedMeeting={activeMeeting}
          onSave={onSaveLog}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
};
