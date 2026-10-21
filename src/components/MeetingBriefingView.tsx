import React from "react";
import { Compass, Mic, FileText, Send, Database, MapPin, X, CalendarClock } from "lucide-react";
import { AppTab } from "../types.ts";
import { UpcomingMeeting } from "../hooks/useUpcomingMeetings.ts";

// The sections of a meeting briefing, in the order a broker works through a meeting.
export const BRIEFING_SECTIONS = ["premeeting", "intake", "notes", "comms", "database"] as const;
export type BriefingSection = (typeof BRIEFING_SECTIONS)[number];

export const isBriefingSection = (tab: AppTab): tab is BriefingSection =>
  (BRIEFING_SECTIONS as readonly string[]).includes(tab);

interface MeetingBriefingViewProps {
  section: BriefingSection;
  onSectionChange: (section: BriefingSection) => void;
  meeting: UpcomingMeeting | null;
  onClearMeeting: () => void;
  hasActiveDeal: boolean;
  pendingCommsCount: number;
  totalContactsCount: number;
  children: React.ReactNode;
}

export const MeetingBriefingView: React.FC<MeetingBriefingViewProps> = ({
  section,
  onSectionChange,
  meeting,
  onClearMeeting,
  hasActiveDeal,
  pendingCommsCount,
  totalContactsCount,
  children,
}) => {
  const tabs: { id: BriefingSection; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "premeeting", label: "Dossier", icon: <Compass className="w-3.5 h-3.5" /> },
    { id: "intake", label: "Debrief", icon: <Mic className="w-3.5 h-3.5" /> },
    { id: "notes", label: hasActiveDeal ? "Deal Notes" : "Notes", icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "comms", label: "Emails", icon: <Send className="w-3.5 h-3.5" />, badge: pendingCommsCount || undefined },
    { id: "database", label: `CRM (${totalContactsCount})`, icon: <Database className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Meeting Briefing</p>
            {meeting ? (
              <>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{meeting.title}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {new Date(meeting.start).toLocaleString([], {
                      weekday: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  {meeting.location && (
                    <span className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{meeting.location}</span>
                    </span>
                  )}
                  {meeting.snapshot && (
                    <span className="font-semibold text-slate-700">{meeting.snapshot.dataStrength} data</span>
                  )}
                </div>
              </>
            ) : (
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">Prepare, debrief and follow up</h1>
            )}
          </div>
          {meeting && (
            <button
              type="button"
              onClick={onClearMeeting}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="Clear selected meeting"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="flex gap-1.5 overflow-x-auto -mx-1 px-1" aria-label="Briefing sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSectionChange(tab.id)}
              aria-current={section === tab.id ? "page" : undefined}
              className={`flex items-center gap-1.5 px-3.5 py-2 min-h-10 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                section === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    section === tab.id ? "bg-white text-emerald-700" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {children}
    </div>
  );
};
