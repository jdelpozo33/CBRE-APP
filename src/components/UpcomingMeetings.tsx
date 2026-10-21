import React, { useState } from "react";
import { CalendarClock, MapPin, User, TrendingUp, Building2, RefreshCw, ChevronRight } from "lucide-react";
import { UpcomingMeeting } from "../hooks/useUpcomingMeetings.ts";
import { DataStrength } from "../types.ts";

interface UpcomingMeetingsProps {
  meetings: UpcomingMeeting[];
  isLoading: boolean;
  error: string | null;
  isSample: boolean;
  onRefresh: () => void;
  onConnectCalendar?: () => void;
  onOpenBriefing?: (meeting: UpcomingMeeting) => void;
}

const STRENGTH_STYLES: Record<DataStrength, string> = {
  Strong: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Partial: "bg-amber-50 text-amber-800 border-amber-200",
  Limited: "bg-slate-100 text-slate-600 border-slate-200",
};

const STRENGTH_HINT: Record<DataStrength, string> = {
  Strong: "Counterparty, property and comps all backed by CRM records",
  Partial: "Two of counterparty, property and comps backed by CRM records",
  Limited: "Little CRM data matches this meeting yet",
};

const money = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000).toLocaleString()}k`;

function timeLabel(meeting: UpcomingMeeting, now: Date) {
  const start = new Date(meeting.start);
  const end = new Date(meeting.end);
  if (start <= now && now < end) return "Now";
  const time = start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const isToday = start.toDateString() === now.toDateString();
  if (meeting.allDay) return isToday ? "Today · All day" : start.toLocaleDateString([], { weekday: "short" });
  return isToday ? time : `${start.toLocaleDateString([], { weekday: "short" })} ${time}`;
}

const SnapshotBlock: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({
  icon,
  label,
  children,
}) => (
  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 min-w-0">
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
      {icon}
      {label}
    </div>
    <div className="text-xs text-slate-800 space-y-0.5">{children}</div>
  </div>
);

export const UpcomingMeetings: React.FC<UpcomingMeetingsProps> = ({
  meetings,
  isLoading,
  error,
  isSample,
  onRefresh,
  onConnectCalendar,
  onOpenBriefing,
}) => {
  const [range, setRange] = useState<"today" | "48h">("today");
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const visible = meetings.filter((m) => range === "48h" || new Date(m.start) <= endOfToday);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Upcoming Meetings</h2>
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center justify-center min-w-11 min-h-11 sm:min-w-9 sm:min-h-9 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="Refresh meetings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200" role="tablist">
          {(["today", "48h"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 min-h-11 sm:min-h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                range === r ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {r === "today" ? "Today" : "Next 48h"}
            </button>
          ))}
        </div>
      </div>

      {isSample && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <span>Showing sample meetings. Connect your calendar to see your own.</span>
          {onConnectCalendar && (
            <button
              type="button"
              onClick={onConnectCalendar}
              className="px-3 py-1.5 min-h-11 sm:min-h-9 rounded-lg bg-white border border-amber-300 font-semibold hover:bg-amber-100 cursor-pointer"
            >
              Connect calendar
            </button>
          )}
        </div>
      )}

      {error && <p className="text-xs text-rose-700">{error}</p>}

      {!isLoading && visible.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">
          No meetings {range === "today" ? "for the rest of today" : "in the next 48 hours"}.
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((meeting) => {
            const snap = meeting.snapshot;
            const label = timeLabel(meeting, now);
            return (
              <li key={meeting.id} className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`font-bold ${label === "Now" ? "text-rose-600" : "text-emerald-700"}`}
                      >
                        {label}
                      </span>
                      {meeting.location && (
                        <span className="flex items-center gap-1 text-slate-500 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{meeting.location}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 truncate">{meeting.title}</h3>
                  </div>
                  {snap && (
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-md border text-[11px] font-bold ${STRENGTH_STYLES[snap.dataStrength]}`}
                      title={STRENGTH_HINT[snap.dataStrength]}
                    >
                      {snap.dataStrength} data
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <SnapshotBlock icon={<User className="w-3 h-3" />} label="Counterparty">
                    {snap?.counterparty ? (
                      <>
                        <div className="font-semibold truncate">{snap.counterparty.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {snap.counterparty.role} · {snap.counterparty.company}
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2">{snap.counterparty.notes}</p>
                      </>
                    ) : (
                      <span className="text-slate-400">
                        {meeting.attendees[0]?.name || meeting.attendees[0]?.email || "No CRM match"}
                      </span>
                    )}
                  </SnapshotBlock>

                  <SnapshotBlock icon={<TrendingUp className="w-3 h-3" />} label="Top comps">
                    {snap && snap.topComps.length > 0 ? (
                      snap.topComps.map((c) => (
                        <div key={c.id} className="truncate">
                          <span className="font-semibold">{c.address.split(",")[0]}</span>{" "}
                          <span className="text-slate-500">
                            {money(c.salePrice)} · {c.capRate}% cap
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400">No comps on file</span>
                    )}
                  </SnapshotBlock>

                  <SnapshotBlock icon={<Building2 className="w-3 h-3" />} label="Property">
                    {snap?.property ? (
                      <>
                        <div className="font-semibold truncate">{snap.property.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {money(snap.property.price)}
                          {snap.property.capRate ? ` · ${snap.property.capRate}% cap` : ""} ·{" "}
                          {snap.property.squareFeet.toLocaleString()} SF
                        </div>
                        <div className="text-[11px] text-slate-500">{snap.property.status}</div>
                      </>
                    ) : (
                      <span className="text-slate-400">No property match</span>
                    )}
                  </SnapshotBlock>
                </div>

                {onOpenBriefing && (
                  <button
                    type="button"
                    onClick={() => onOpenBriefing(meeting)}
                    className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-2 min-h-11 sm:min-h-10 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                  >
                    Open full briefing
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
