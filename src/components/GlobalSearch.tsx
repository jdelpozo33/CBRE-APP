import React, { useEffect, useRef, useState } from "react";
import { Search, X, Globe, CalendarClock, Building2 } from "lucide-react";
import { workspace, ProviderAccount } from "../providers/index.ts";
import { UpcomingMeeting } from "../hooks/useUpcomingMeetings.ts";
import { DataSource, DealStage, ListingProperty } from "../types.ts";

interface SearchResult {
  id: string;
  kind: "property" | "contact" | "call" | "note" | "email" | "comp" | "meeting";
  title: string;
  subtitle?: string;
  source: DataSource;
  dealStage?: DealStage;
  date?: string;
}

interface GlobalSearchProps {
  user: ProviderAccount | null;
  meetings: UpcomingMeeting[];
  listings: ListingProperty[];
  onOpenMeeting: (meeting: UpcomingMeeting) => void;
  onOpenRecord: (result: { kind: SearchResult["kind"]; id: string }) => void;
  onSearchWeb: (query: string) => void;
}

const SOURCE_STYLES: Record<DataSource, string> = {
  Email: "bg-sky-50 text-sky-800 border-sky-200",
  Call: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Note: "bg-amber-50 text-amber-800 border-amber-200",
  Calendar: "bg-violet-50 text-violet-800 border-violet-200",
  External: "bg-slate-100 text-slate-700 border-slate-300",
  CRM: "bg-white text-slate-700 border-slate-300",
};

const STAGE_STYLES: Record<DealStage, string> = {
  "New deal": "bg-emerald-600 text-white",
  Lead: "bg-amber-500 text-white",
  "In progress": "bg-sky-600 text-white",
  Closed: "bg-slate-400 text-white",
};

export const SourceBadge: React.FC<{ source: DataSource }> = ({ source }) => (
  <span className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${SOURCE_STYLES[source]}`}>
    {source}
  </span>
);

const StageBadge: React.FC<{ stage: DealStage }> = ({ stage }) => (
  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${STAGE_STYLES[stage]}`}>{stage}</span>
);

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  user,
  meetings,
  listings,
  onOpenMeeting,
  onOpenRecord,
  onSearchWeb,
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const q = query.trim();

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const lower = q.toLowerCase();
      const meetingResults: SearchResult[] = meetings
        .filter((m) => [m.title, m.location, m.description].join(" ").toLowerCase().includes(lower))
        .map((m) => ({
          id: m.id,
          kind: "meeting",
          title: m.title,
          subtitle: new Date(m.start).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }),
          source: "Calendar",
        }));
      const [server, mailbox] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(q)}`)
          .then((r) => r.json())
          .then((d) => (d.results || []) as SearchResult[])
          .catch(() => []),
        user
          ? workspace.email
              .listRecent(q, 5)
              .then((msgs) =>
                msgs.map<SearchResult>((m) => ({
                  id: m.id,
                  kind: "email",
                  title: m.subject,
                  subtitle: `From ${m.from}`,
                  source: "Email",
                  date: m.date,
                }))
              )
              .catch(() => [])
          : Promise.resolve([] as SearchResult[]),
      ]);
      if (!cancelled) {
        setResults([...meetingResults, ...server, ...mailbox]);
        setIsSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, meetings, user]);

  const activeDeals = listings.filter((l) => l.dealStage === "New deal" || l.dealStage === "In progress").slice(0, 5);

  const pick = (result: SearchResult) => {
    setIsOpen(false);
    if (result.kind === "meeting") {
      const meeting = meetings.find((m) => m.id === result.id);
      if (meeting) onOpenMeeting(meeting);
    } else {
      onOpenRecord({ kind: result.kind, id: result.id });
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 shadow-xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setIsOpen(false)}
          placeholder="Search people, properties, calls, notes, emails..."
          className="flex-1 min-h-11 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          aria-label="Search"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-30 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[70vh] overflow-y-auto">
          {!q ? (
            <div className="p-3 space-y-3">
              <div>
                <p className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5" /> Upcoming meetings
                </p>
                {meetings.length === 0 ? (
                  <p className="px-1 text-xs text-slate-400">No meetings in the next 48 hours.</p>
                ) : (
                  meetings.slice(0, 4).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => pick({ id: m.id, kind: "meeting", title: m.title, source: "Calendar" })}
                      className="w-full text-left flex items-center justify-between gap-2 px-2 py-2 min-h-11 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      <span className="text-sm text-slate-900 truncate">{m.title}</span>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(m.start).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div>
                <p className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Active deals
                </p>
                {activeDeals.length === 0 ? (
                  <p className="px-1 text-xs text-slate-400">No active deals.</p>
                ) : (
                  activeDeals.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => pick({ id: l.id, kind: "property", title: l.title, source: "CRM" })}
                      className="w-full text-left flex items-center justify-between gap-2 px-2 py-2 min-h-11 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm text-slate-900 truncate">{l.title}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{l.address}</span>
                      </span>
                      {l.dealStage && <StageBadge stage={l.dealStage} />}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="p-2">
              {isSearching && results.length === 0 && <p className="p-3 text-xs text-slate-500">Searching...</p>}
              {!isSearching && results.length === 0 && (
                <p className="p-3 text-xs text-slate-500">No matches in your CRM, calls, notes, emails or calendar.</p>
              )}
              {results.map((r) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  type="button"
                  onClick={() => pick(r)}
                  className="w-full text-left flex items-start justify-between gap-3 px-2 py-2.5 min-h-11 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900 truncate">{r.title}</span>
                    {r.subtitle && <span className="block text-[11px] text-slate-500 truncate">{r.subtitle}</span>}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    {r.dealStage && <StageBadge stage={r.dealStage} />}
                    <SourceBadge source={r.source} />
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSearchWeb(q);
                }}
                className="w-full flex items-center gap-2 px-2 py-2.5 min-h-11 rounded-xl text-sm text-emerald-800 hover:bg-emerald-50 border-t border-slate-100 mt-1 cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                Search the web for "{q}"
                <span className="ml-auto">
                  <SourceBadge source="External" />
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
