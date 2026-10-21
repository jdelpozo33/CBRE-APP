import React, { useState } from "react";
import {
  Globe,
  Search,
  ExternalLink,
  X,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  Building2,
  Scale,
  Sparkles,
} from "lucide-react";
import { WebResearchResult } from "../types.ts";

interface ExternalIntelModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onApplyToDeal?: (intelText: string) => void;
  showNotification: (msg: string) => void;
  speedMode: "turbo" | "balanced";
}

const QUICK_QUERIES = [
  { label: "1420 Market St SF", query: "1420 Market Street San Francisco commercial real estate cap rates comps" },
  { label: "780 Montgomery St Refi", query: "780 Montgomery Street Financial District commercial building profile sales history" },
  { label: "SF Commercial Cap Rates", query: "San Francisco commercial office retail average cap rates 2026 market report" },
  { label: "SOFR & 10-Yr Debt Rates", query: "Current commercial real estate debt SOFR spreads 10-year Treasury yield" },
  { label: "Transit Density Bonus", query: "San Francisco commercial zoning transit density bonuses planning code" },
];

export const ExternalIntelModal: React.FC<ExternalIntelModalProps> = ({
  isOpen,
  onClose,
  initialQuery = "",
  onApplyToDeal,
  showNotification,
  speedMode,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery || "1420 Market Street, San Francisco, CA");
  const [isLoading, setIsLoading] = useState(false);
  const [intelResult, setIntelResult] = useState<WebResearchResult | null>(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (isOpen && initialQuery) {
      setSearchQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const handleSearch = async (queryToSearch = searchQuery) => {
    if (!queryToSearch.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/web-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryToSearch,
          speedMode,
        }),
      });
      const data = await res.json();
      if (data.webResearch) {
        setIntelResult(data.webResearch);
        showNotification(
          data.cached
            ? "⚡ External intelligence loaded from cache"
            : "⚡ Live web intelligence pulled via Claude web search"
        );
      } else if (data.error) {
        showNotification(`Notice: ${data.error}`);
      }
    } catch (err: any) {
      console.error("External intel error:", err);
      showNotification("Could not complete web pull. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyIntel = () => {
    if (!intelResult) return;
    const text = [
      `EXTERNAL WEB INTELLIGENCE: ${searchQuery}`,
      `SUMMARY:`,
      intelResult.summary,
      ``,
      `KEY FINDINGS:`,
      intelResult.keyFindings?.map((f) => `• ${f}`).join("\n") || "N/A",
      ``,
      `SOURCES & CITATIONS:`,
      intelResult.sources?.map((s) => `• ${s.title}: ${s.url}`).join("\n") || "N/A",
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showNotification("Copied web intelligence to clipboard");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Live External Intelligence & Comps</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                  Claude Web Search
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Quick Buttons */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search property address, submarket comps, financing rates, or zoning..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "Searching..." : "Pull Intel"}</span>
            </button>
          </form>

          {/* Quick Preset Queries */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Suggested:</span>
            {QUICK_QUERIES.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSearchQuery(q.query);
                  handleSearch(q.query);
                }}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-[11px] font-medium border border-slate-200 transition-colors cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {isLoading && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <div className="text-sm font-bold text-slate-800">Querying Real-Time External Web Sources...</div>
              <div className="text-xs text-slate-500">Retrieving submarket comps, debt indices, and municipal permits</div>
            </div>
          )}

          {!isLoading && !intelResult && (
            <div className="py-10 text-center space-y-2 text-slate-500">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-medium">Enter a property address or market question above to pull live web intelligence.</div>
            </div>
          )}

          {!isLoading && intelResult && (
            <div className="space-y-4">
              {/* Executive Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-xs">Market Intelligence Summary</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyIntel}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="text-slate-800 whitespace-pre-line leading-relaxed text-xs">
                  {intelResult.summary}
                </div>
              </div>

              {/* Key Findings */}
              {intelResult.keyFindings && intelResult.keyFindings.length > 0 && (
                <div className="space-y-2">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Key Quantitative & Market Findings</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {intelResult.keyFindings.map((finding, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs flex items-start gap-2.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{finding}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources & Verified URLs */}
              {intelResult.sources && intelResult.sources.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-900 text-xs block">Verified Web Citations</span>
                  <div className="flex flex-wrap gap-2">
                    {intelResult.sources.map((src, idx) => (
                      <a
                        key={idx}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 rounded-lg border border-slate-200 text-xs font-medium transition-colors"
                      >
                        <span className="truncate max-w-[200px]">{src.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="text-[11px] text-slate-500">
            Real-time web search grounding enabled
          </div>
          <div className="flex items-center gap-2">
            {onApplyToDeal && intelResult && (
              <button
                type="button"
                onClick={() => {
                  onApplyToDeal(intelResult.summary);
                  onClose();
                  showNotification("Applied web intel to deal context");
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Apply to Deal Notes
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
