import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Clock,
  CheckSquare,
  Building2,
  Copy,
  Check,
  Lightbulb,
  Scale,
  Calendar,
  Layers,
  ArrowRight,
  Send,
  Zap,
  Globe,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  Search,
  BookmarkCheck,
  AlertTriangle,
  HardDrive,
  FileText,
  Printer,
} from "lucide-react";
import { DealAnalysisResult, WebResearchResult } from "../types.ts";

interface MeetingNotesViewProps {
  analysis: DealAnalysisResult;
  onProceedToEmails?: () => void;
  onSaveToDrive?: () => void;
  onScheduleCalendar?: (title: string, deadline?: string) => void;
  onOpenDealMemo?: () => void;
  onAutomateAllNextSteps?: () => Promise<void> | void;
  onOpenExternalIntel?: (query?: string) => void;
}

export const MeetingNotesView: React.FC<MeetingNotesViewProps> = ({
  analysis,
  onProceedToEmails,
  onSaveToDrive,
  onScheduleCalendar,
  onOpenDealMemo,
  onAutomateAllNextSteps,
  onOpenExternalIntel,
}) => {
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [customWebSearch, setCustomWebSearch] = useState("");
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [activeNotesTab, setActiveNotesTab] = useState<"overview" | "actions" | "market" | "playbook" | "milestones">("overview");
  const [allMilestonesSynced, setAllMilestonesSynced] = useState(false);
  const [liveWebResearch, setLiveWebResearch] = useState<WebResearchResult | undefined>(
    analysis.webResearch
  );

  React.useEffect(() => {
    setLiveWebResearch(analysis.webResearch);
  }, [analysis.webResearch]);

  const handleCopySummary = () => {
    const textToCopy = `BROKER BUDDY DEAL SUMMARY: ${analysis.dealName}
Executive Overview:
${analysis.executiveSummary}

FINANCIAL & DEAL TERMS:
- Agreed Purchase Price: ${analysis.financialTerms.purchasePrice}
- Implied Cap Rate / Yield: ${analysis.financialTerms.capRate}
- Earnest Money Deposit: ${analysis.financialTerms.earnestMoneyDeposit}
- Due Diligence Period: ${analysis.financialTerms.dueDiligenceDays}
- Closing Timeline: ${analysis.financialTerms.closingTimeline}
- Debt / Financing: ${analysis.financialTerms.financingStructure}

KEY NEGOTIATION POINTS:
${analysis.keyDiscussionPoints.map((pt) => `• ${pt}`).join("\n")}

ACTION ITEMS & DELIVERABLES:
${analysis.actionItems.map((a) => `• [${a.priority}] ${a.task} (${a.owner} by ${a.deadline})`).join("\n")}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  };

  const handleCopyScript = (scriptText: string) => {
    navigator.clipboard.writeText(scriptText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handlePerformWebSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = customWebSearch.trim() || `${analysis.dealName} commercial cap rates market data`;
    setIsSearchingWeb(true);
    try {
      const res = await fetch("/api/web-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          dealName: analysis.dealName,
          address: analysis.matchedListing?.address,
        }),
      });
      const data = await res.json();
      if (data.webResearch) {
        setLiveWebResearch((prev) => ({
          ...prev,
          summary: data.webResearch.summary,
          searchQueries: data.webResearch.searchQueries,
          sources: data.webResearch.sources,
          keyFindings: [
            ...data.webResearch.summary.split("\n").filter((l: string) => l.trim().startsWith("-") || l.trim().startsWith("•")).map((l: string) => l.replace(/^[-•]\s*/, "")).slice(0, 4),
            ...(prev?.keyFindings || []),
          ].slice(0, 5),
        }));
      }
    } catch (err) {
      console.error("Live web search error:", err);
    } finally {
      setIsSearchingWeb(false);
    }
  };

  const playbook = analysis.dayToDayPlaybook;

  return (
    <div className="space-y-6">
      {/* Automated Next Steps Command Banner */}
      <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Automated Next-Step Execution</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                {analysis.communications?.length || 4} Stakeholders Ready
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Instantly draft stakeholder emails (Title, Lender, Legal, Buyer) and sync closing milestones to your calendar.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenExternalIntel && (
            <button
              type="button"
              onClick={() => onOpenExternalIntel(analysis.matchedListing?.address || analysis.dealName)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pull Web Intel</span>
            </button>
          )}

          {onAutomateAllNextSteps && (
            <button
              type="button"
              onClick={() => onAutomateAllNextSteps()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>⚡ Automate Next Steps</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Executive Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-slate-200 gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{analysis.dealName}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              {copiedBrief ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedBrief ? "Copied" : "Copy Brief"}</span>
            </button>

            {onSaveToDrive && (
              <button
                type="button"
                onClick={onSaveToDrive}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200 transition-colors cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                <span>Save to Cloud Files</span>
              </button>
            )}

            {onOpenDealMemo && (
              <button
                type="button"
                onClick={onOpenDealMemo}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CBRE Deal Memo (PDF)</span>
              </button>
            )}

            {onProceedToEmails && (
              <button
                type="button"
                onClick={onProceedToEmails}
                className="flex items-center gap-2 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <span>Push Next-Step Emails ({analysis.communications?.length || 4})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Executive Summary Narrative */}
        <p className="text-sm text-slate-700 leading-relaxed font-normal">{analysis.executiveSummary}</p>

        {/* CBRE Financial Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-200">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Agreed Price</span>
            <span className="font-mono text-base font-bold text-emerald-700 tabular-nums">
              {analysis.financialTerms.purchasePrice || "N/A"}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Cap Rate / Yield</span>
            <span className="font-mono text-base font-bold text-emerald-700 tabular-nums">
              {analysis.financialTerms.capRate || "N/A"}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Earnest Deposit</span>
            <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
              {analysis.financialTerms.earnestMoneyDeposit || "N/A"}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Due Diligence</span>
            <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
              {analysis.financialTerms.dueDiligenceDays || "N/A"}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Closing Target</span>
            <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
              {analysis.financialTerms.closingTimeline || "N/A"}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">Financing / Debt</span>
            <span className="text-xs font-bold text-slate-900 truncate block mt-0.5">
              {analysis.financialTerms.financingStructure || "All Cash"}
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Notes Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveNotesTab("overview")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeNotesTab === "overview"
              ? "bg-emerald-600 text-white shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Overview & Discussion</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNotesTab("actions")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeNotesTab === "actions"
              ? "bg-emerald-600 text-white shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Action Matrix ({analysis.actionItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNotesTab("market")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeNotesTab === "market"
              ? "bg-emerald-600 text-white shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Live Market Intel</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveNotesTab("playbook")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeNotesTab === "playbook"
              ? "bg-emerald-600 text-white shadow-sm font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Broker Playbook & Scripts</span>
        </button>
      </div>

      {/* 1. OVERVIEW & DISCUSSION TAB */}
      {activeNotesTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
          {/* Left Column: Discussion Points & Database Match */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Substantive Discussion Points</h3>
            </div>

            <ul className="space-y-3">
              {analysis.keyDiscussionPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs leading-relaxed text-slate-700">
                  <span className="font-mono text-emerald-600 font-bold shrink-0 mt-0.5">
                    {String(idx + 1).padStart(2, "0")}.
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            {/* Database Matched Property Banner */}
            {analysis.matchedListing && (
              <div className="mt-5 p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <Building2 className="w-4 h-4" />
                  <span>CBRE Database Matched Inventory & Valuation Comps</span>
                </div>
                <p className="text-xs font-bold text-slate-900">{analysis.matchedListing.title}</p>
                <p className="text-[11px] text-slate-500">{analysis.matchedListing.address}</p>
                {analysis.matchedListing.compComparison && (
                  <p className="text-xs text-slate-700 pt-2 border-t border-emerald-200/80 font-mono leading-relaxed">
                    {analysis.matchedListing.compComparison}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Negotiation Leverage & Risks */}
          <div className="lg:col-span-5 space-y-6">
            {/* Sentiment & Negotiation Leverage */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">Negotiation Leverage</h3>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {analysis.sentimentAndLeverage.urgency} Urgency
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-bold">Client Stance:</span>
                  <p className="text-slate-800 mt-0.5 leading-relaxed">{analysis.sentimentAndLeverage.sentiment}</p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 uppercase font-bold">Leverage Points:</span>
                  <p className="text-slate-800 mt-0.5 leading-relaxed">{analysis.sentimentAndLeverage.negotiationLeverage}</p>
                </div>

                {analysis.sentimentAndLeverage.keyConcerns && analysis.sentimentAndLeverage.keyConcerns.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500 uppercase font-bold">Friction Points:</span>
                    <ul className="list-disc list-inside text-slate-700 mt-1 space-y-1">
                      {analysis.sentimentAndLeverage.keyConcerns.map((concern, i) => (
                        <li key={i}>{concern}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Risks & Contingencies */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Risks & Contingencies</h3>
              </div>

              <div className="space-y-2.5">
                {analysis.risksAndRedFlags.map((riskItem, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{riskItem.risk}</span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          riskItem.severity === "High"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : riskItem.severity === "Medium"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {riskItem.severity}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      <span className="text-emerald-700 font-semibold">Mitigation: </span>
                      {riskItem.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ACTION ITEMS MATRIX TAB */}
      {activeNotesTab === "actions" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">Critical Next Steps & Action Matrix</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 font-medium">{analysis.actionItems.length} Key Deliverables</span>
              {onScheduleCalendar && (
                <span className="text-xs text-sky-600 font-medium">
                  • 1-Click Schedule on Calendar
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 font-semibold">Priority</th>
                  <th className="pb-3 font-semibold">Action Item</th>
                  <th className="pb-3 font-semibold">Responsible Owner</th>
                  <th className="pb-3 font-semibold">Target Deadline</th>
                  <th className="pb-3 font-semibold text-right">Calendar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analysis.actionItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          item.priority === "High"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : item.priority === "Medium"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-slate-900">{item.task}</td>
                    <td className="py-3 text-slate-600">{item.owner}</td>
                    <td className="py-3 font-mono text-emerald-700 font-semibold">{item.deadline}</td>
                    <td className="py-3 text-right">
                      {onScheduleCalendar && (
                        <button
                          type="button"
                          onClick={() => onScheduleCalendar(item.task, item.deadline)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold rounded-lg border border-sky-200 transition-colors cursor-pointer"
                          title="Schedule deadline on your calendar"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>Schedule</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. LIVE MARKET INTEL TAB */}
      {activeNotesTab === "market" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Live Web & Market Intelligence</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  Claude Web Search
                </span>
              </div>
            </div>

            {/* Interactive Web Search Input */}
            <form onSubmit={handlePerformWebSearch} className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={customWebSearch}
                  onChange={(e) => setCustomWebSearch(e.target.value)}
                  placeholder="Search web for comps, rates..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingWeb}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {isSearchingWeb ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                <span>{isSearchingWeb ? "Searching..." : "Search"}</span>
              </button>
            </form>
          </div>

          {/* Live Internet Findings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                1. Market Comps & Pricing Data
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {liveWebResearch?.keyFindings?.[0] ||
                  "Submarket average for commercial mixed-use is currently trading between $440 - $475/sqft with 6.1% - 6.4% in-place cap rates."}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                2. Debt & Capital Markets Yields
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {liveWebResearch?.keyFindings?.[1] ||
                  "10-Yr Treasury yield benchmarks and 5-year fixed commercial mortgage debt are quoting around 6.15% - 6.40% with 1.25x DSCR requirements."}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                3. Local Zoning & Ordinance Trends
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {liveWebResearch?.keyFindings?.[2] ||
                  "Municipal transit-oriented zoning initiatives and tenant improvement tax credits provide positive tailwinds for ground-floor retail."}
              </p>
            </div>
          </div>

          {/* Web Search Queries & Live Sources */}
          {liveWebResearch?.sources && liveWebResearch.sources.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500 font-semibold text-[11px]">Online Citations:</span>
                {liveWebResearch.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-slate-50 hover:bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] transition-colors"
                  >
                    <span className="max-w-[140px] truncate">{src.title}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>

              {liveWebResearch.searchQueries && liveWebResearch.searchQueries.length > 0 && (
                <div className="text-[11px] text-slate-500 font-mono">
                  Query: "{liveWebResearch.searchQueries[0]}"
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. BROKER PLAYBOOK & SCRIPTS TAB */}
      {activeNotesTab === "playbook" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Broker Day-to-Day Actionable Playbook</h3>
            </div>
            <span className="text-xs font-bold text-emerald-800 px-3 py-1 bg-emerald-50 rounded-xl border border-emerald-200">
              Deal Execution Velocity
            </span>
          </div>

          {/* 1. First 24-Hour Velocity Plan */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
              Immediate 24-Hour Action Plan
            </span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {(playbook?.first24HoursCadence || [
                { timeWindow: "0 - 2 Hours", action: "Send quick text/email recap to buyer & seller", whyCritical: "Locks in psychological momentum before second thoughts." },
                { timeWindow: "2 - 4 Hours", action: "Contact Sarah Chen to open title & request escrow wire instructions", whyCritical: "Establishes formal escrow file number for PSA." },
                { timeWindow: "4 - 8 Hours", action: "Instruct Robert Hawthorne to draft PSA with day-21 estoppel contingency", whyCritical: "Prevents legal drafting delays before 1031 clock burns." },
                { timeWindow: "Day 1 (24h)", action: "Transmit trailing 12 P&L to David Steinberg at Pacific Crest", whyCritical: "Locks in lender debt quote before rate adjustments." },
              ]).map((step, i) => (
                <div key={i} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[11px] font-extrabold text-emerald-700 font-mono block">
                    {step.timeWindow}
                  </span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">{step.action}</p>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <span className="text-slate-800 font-semibold">Why: </span>
                    {step.whyCritical}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Tactical Phone Script for Next Call */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">
                  Word-for-Word Script for Your Next Call:{" "}
                  <span className="text-emerald-700">
                    {playbook?.negotiationScript?.scenario || "Confirming Terms with Counterparty"}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopyScript(
                    playbook?.negotiationScript?.exactScript ||
                      "Marcus, we have Elena aligned on $14.2M and the 30-day diligence window. Escrow is opening with Sarah Chen today, so let's have your banking team wire the $450k deposit by Thursday to stay ahead of your 1031 timeline."
                  )
                }
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? "Script Copied" : "Copy Script"}</span>
              </button>
            </div>
            <p className="text-xs text-slate-800 italic font-sans leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
              "{playbook?.negotiationScript?.exactScript ||
                "Marcus, we have Elena aligned on $14.2M and the 30-day diligence window. Escrow is opening with Sarah Chen today, so let's have your banking team wire the $450k deposit by Thursday to stay ahead of your 1031 timeline."}"
            </p>
          </div>

          {/* 3. Commission Safeguards & Deal-Breaker Tripwires */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Commission & Agency Protection</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                {(playbook?.commissionAndAgencyGuards || [
                  "Ensure listing representation agreement / co-broke commission agreement is signed before formal PSA distribution.",
                  "Register Marcus Vance / Apex Horizon in writing with seller counsel to establish unchallengeable procuring cause.",
                  "Include standard broker indemnity and escrow disbursement clause directly into Section 14 of the purchase contract.",
                ]).map((guard, idx) => (
                  <li key={idx} className="leading-relaxed">{guard}</li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Deal-Breaker Early Warning Tripwires</span>
              </div>
              <div className="space-y-2 text-xs">
                {(playbook?.dealBreakerWatchlist || [
                  { risk: "1031 Replacement Statutory Expiration", triggerWarning: "Day 35 without title clearance", brokerProtocol: "Have backup qualified intermediary pre-approved." },
                  { risk: "Tenant Estoppel Non-Delivery", triggerWarning: "Day 18 of 30 without Blue Bottle signature", brokerProtocol: "Schedule in-person visit with retail store manager." },
                ]).map((item, idx) => (
                  <div key={idx} className="border-b border-slate-200 pb-1.5 last:border-0 last:pb-0">
                    <div className="flex justify-between font-semibold text-slate-800">
                      <span>{item.risk}</span>
                      <span className="text-[10px] text-amber-600 font-bold">{item.triggerWarning}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      <span className="text-emerald-700 font-semibold">Broker Protocol: </span>{item.brokerProtocol}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
