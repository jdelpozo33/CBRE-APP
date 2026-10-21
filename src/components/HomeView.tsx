import React, { useEffect, useState } from "react";
import { Bell, Phone, StickyNote, Clock } from "lucide-react";
import { QuickActivityLog } from "../types.ts";

interface HomeViewProps {
  // Record & Scribe console, shown first on the home screen.
  recorder: React.ReactNode;
  activityLogs: QuickActivityLog[];
  // Optional slots filled by later home-screen features (search, upcoming meetings).
  search?: React.ReactNode;
  upcomingMeetings?: React.ReactNode;
}

function useToday() {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    // Keep the date header correct if the app stays open past midnight.
    const timer = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return today;
}

export const HomeView: React.FC<HomeViewProps> = ({ recorder, activityLogs, search, upcomingMeetings }) => {
  const today = useToday();
  const dateLabel = today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const reminders = activityLogs.filter((log) => log.followUpDate).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Today</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{dateLabel}</h1>
        </div>
        {search && <div className="w-full sm:max-w-md">{search}</div>}
      </div>

      {recorder}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {upcomingMeetings && <div className="lg:col-span-8">{upcomingMeetings}</div>}

        <section
          className={`${upcomingMeetings ? "lg:col-span-4" : "lg:col-span-12"} bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3`}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Reminders</h2>
          </div>
          {reminders.length === 0 ? (
            <p className="text-xs text-slate-500">No follow-ups due. Logged calls and notes with a follow-up date show here.</p>
          ) : (
            <ul className="space-y-2">
              {reminders.map((log) => (
                <li key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  {log.type === "call" ? (
                    <Phone className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <StickyNote className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate">{log.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">{log.entityName}</div>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {log.followUpDate}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
