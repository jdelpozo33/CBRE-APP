import React, { useState } from "react";
import {
  FileText,
  Search,
  Sparkles,
  ExternalLink,
  Users,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Clock,
  Printer,
  Copy,
  Check,
} from "lucide-react";
import { PreMeetingDossier, Contact, ListingProperty } from "../types.ts";

interface PreMeetingDossierViewProps {
  contacts: Contact[];
  listings: ListingProperty[];
  onStartPostMeetingDebrief: (propertyAddress: string, clientName: string, meetingTitle: string) => void;
  showNotification: (msg: string) => void;
  speedMode: "turbo" | "balanced";
  onOpenExternalIntel?: (query?: string) => void;
  // Meeting selected from the calendar; overrides the preset scenarios when set.
  meeting?: { key: string; property: string; client: string; role: string; type: string; notes: string } | null;
}

const PRESET_MEETINGS = [
  {
    label: "1420 Market St · Walkthrough & Offer Negotiation",
    property: "1420 Market Street, San Francisco, CA",
    client: "Marcus Vance",
    role: "1031 Exchange Buyer",
    type: "Property Walkthrough & Price Terms",
    notes: "Buyer has $6.2M exchange equity closing within 45 days. Target purchase price $14.2M.",
  },
  {
    label: "780 Montgomery St · Lender Debt Quote & Refi Review",
    property: "780 Montgomery St, Financial District, CA",
    client: "David Steinberg",
    role: "Commercial Mortgage Lender",
    type: "Debt Sizing & SOFR Spread Review",
    notes: "Need 5-year fixed debt quote with minimum 65% LTV and non-recourse pricing.",
  },
  {
    label: "SOMA Industrial Warehouse · Exclusive Listing Pitch",
    property: "450 10th Street, SOMA, San Francisco, CA",
    client: "Elena Rostova",
    role: "Property Owner / Seller",
    type: "Seller Listing Presentation & Valuation",
    notes: "Seller considering disposition before fiscal year-end. Discuss tenant lease rollover and cap rate.",
  },
];

export const PreMeetingDossierView: React.FC<PreMeetingDossierViewProps> = ({
  contacts,
  listings,
  onStartPostMeetingDebrief,
  showNotification,
  speedMode,
  onOpenExternalIntel,
  meeting,
}) => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [customProperty, setCustomProperty] = useState(PRESET_MEETINGS[0].property);
  const [customClient, setCustomClient] = useState(PRESET_MEETINGS[0].client);
  const [customRole, setCustomRole] = useState(PRESET_MEETINGS[0].role);
  const [customMeetingType, setCustomMeetingType] = useState(PRESET_MEETINGS[0].type);
  const [customNotes, setCustomNotes] = useState(PRESET_MEETINGS[0].notes);

  const [isLoading, setIsLoading] = useState(false);
  const [dossier, setDossier] = useState<PreMeetingDossier | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Fetch or generate dossier
  const handleFetchDossier = async (
    prop = customProperty,
    client = customClient,
    role = customRole,
    mType = customMeetingType,
    notes = customNotes
  ) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/pre-meeting-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetProperty: prop,
          clientName: client,
          clientRole: role,
          meetingType: mType,
          notes,
          speedMode,
        }),
      });
      const data = await res.json();
      if (data.dossier) {
        setDossier(data.dossier);
        showNotification(
          data.cached
            ? `⚡ Pre-Meeting Dossier loaded (Instant Cache)`
            : `⚡ Live Pre-Meeting Dossier generated via Claude web search & CRM`
        );
      }
    } catch (err: any) {
      console.error("Dossier error:", err);
      showNotification("Could not pull live dossier, using standard briefing.");
    } finally {
      setIsLoading(false);
    }
  };

  // Load the selected calendar meeting, or the default scenario on first render
  React.useEffect(() => {
    if (meeting) {
      setSelectedPresetIndex(-1);
      setCustomProperty(meeting.property);
      setCustomClient(meeting.client);
      setCustomRole(meeting.role);
      setCustomMeetingType(meeting.type);
      setCustomNotes(meeting.notes);
      handleFetchDossier(meeting.property, meeting.client, meeting.role, meeting.type, meeting.notes);
    } else if (!dossier) {
      handleFetchDossier();
    }
  }, [meeting?.key]);

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    const p = PRESET_MEETINGS[idx];
    setCustomProperty(p.property);
    setCustomClient(p.client);
    setCustomRole(p.role);
    setCustomMeetingType(p.type);
    setCustomNotes(p.notes);
    handleFetchDossier(p.property, p.client, p.role, p.type, p.notes);
  };

  const handleCopyBrief = () => {
    if (!dossier) return;
    const text = [
      `PRE-MEETING DOSSIER: ${dossier.meetingTitle}`,
      `PROPERTY: ${dossier.targetPropertyAddress}`,
      `COUNTERPARTY: ${dossier.clientOrCounterparty.name} (${dossier.clientOrCounterparty.role}) · ${dossier.clientOrCounterparty.company}`,
      ``,
      `ASSET SPECS & VALUATION:`,
      `• Target Value: ${dossier.propertyProfile.estimatedValue}`,
      `• Target Cap Rate: ${dossier.propertyProfile.targetCapRate}`,
      `• Area: ${dossier.propertyProfile.squareFeet}`,
      `• Zoning: ${dossier.propertyProfile.zoningAndUse}`,
      `• Existing Debt: ${dossier.propertyProfile.taxAssessmentOrDebtNote || "Conventional"}`,
      ``,
      `SUBMARKET INTELLIGENCE & BENCHMARKS:`,
      `• Cap Rate Spread: ${dossier.externalWebIntel.submarketCapRateRange}`,
      `• Debt Yield: ${dossier.externalWebIntel.interestRateBenchmark}`,
      `• Municipal/Zoning: ${dossier.externalWebIntel.localMunicipalOrZoningNews}`,
      ``,
      `AUTOMATED NEXT STEPS QUEUE:`,
      ...dossier.recommendedNextStepsPrep.map((s, i) => `${i + 1}. [${s.contingencyTrigger}] ${s.step} (Owner: ${s.assignedTo})`),
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    showNotification("Copied asset & market brief to clipboard");
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Meeting Switcher */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                Pre-Meeting Intelligence Dossier
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Pre-Meeting Briefing & Live Market Comps
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {onOpenExternalIntel && (
              <button
                type="button"
                onClick={() => onOpenExternalIntel(dossier?.targetPropertyAddress || customProperty)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
                title="Pull real-time submarket comps and public records"
              >
                <Search className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pull Web Intel</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyBrief}
              disabled={!dossier}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedScript ? "Copied" : "Copy Brief"}</span>
            </button>

            {dossier && (
              <button
                type="button"
                onClick={() =>
                  onStartPostMeetingDebrief(
                    dossier.targetPropertyAddress,
                    dossier.clientOrCounterparty.name,
                    dossier.meetingTitle
                  )
                }
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <span>Finished Meeting? Debrief</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Preset Selector Chips */}
        <div className="pt-5 border-t border-slate-100 mt-5">
          <div className="text-xs font-medium text-slate-500 mb-2">Upcoming Meetings / Quick Scenarios:</div>
          <div className="flex flex-wrap gap-2">
            {PRESET_MEETINGS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  selectedPresetIndex === idx
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Search & Live Refresh Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Property</label>
            <input
              type="text"
              value={customProperty}
              onChange={(e) => setCustomProperty(e.target.value)}
              placeholder="e.g. 1420 Market Street, San Francisco"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Counterparty / Client</label>
            <input
              type="text"
              value={customClient}
              onChange={(e) => setCustomClient(e.target.value)}
              placeholder="e.g. Marcus Vance"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Meeting Type</label>
            <input
              type="text"
              value={customMeetingType}
              onChange={(e) => setCustomMeetingType(e.target.value)}
              placeholder="e.g. Walkthrough & Terms"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleFetchDossier()}
          disabled={isLoading}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 mt-1 md:mt-4"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>{isLoading ? "Pulling Live Intel..." : "Pull Dossier"}</span>
        </button>
      </div>

      {isLoading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Gathering Pre-Meeting Intelligence...</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Pulling live comparable sales via Claude web search, interest rate yields, municipal zoning notices, and your CRM history.
          </p>
        </div>
      )}

      {/* Dossier Presentation Content */}
      {!isLoading && dossier && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Client & Property Profile (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Client Intelligence Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Counterparty Intelligence</h3>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Name:</span>
                  <span className="font-bold text-slate-900">{dossier.clientOrCounterparty.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Role:</span>
                  <span className="text-emerald-700 font-semibold px-2 py-0.5 rounded bg-emerald-100/60">
                    {dossier.clientOrCounterparty.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Company:</span>
                  <span className="text-slate-800 font-semibold">{dossier.clientOrCounterparty.company}</span>
                </div>
                {dossier.clientOrCounterparty.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Email:</span>
                    <span className="text-slate-700">{dossier.clientOrCounterparty.email}</span>
                  </div>
                )}
                {dossier.clientOrCounterparty.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Phone:</span>
                    <span className="text-slate-700 font-mono">{dossier.clientOrCounterparty.phone}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-700 mb-1">Relationship Context & Intel</span>
                <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-relaxed">
                  {dossier.clientOrCounterparty.relationshipHistory}
                </p>
              </div>
            </div>

            {/* Target Property Profile */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Property & Asset Specifications</h3>
                  <div className="text-[11px] text-slate-500">{dossier.targetPropertyAddress}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Target Valuation</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">{dossier.propertyProfile.estimatedValue}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Benchmark Cap Rate</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">{dossier.propertyProfile.targetCapRate}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Area</span>
                  <span className="text-xs font-bold text-slate-800">{dossier.propertyProfile.squareFeet}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Zoning & Use</span>
                  <span className="text-xs font-bold text-slate-800 truncate block">{dossier.propertyProfile.zoningAndUse}</span>
                </div>
              </div>

              {dossier.propertyProfile.taxAssessmentOrDebtNote && (
                <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="font-semibold text-slate-900 block mb-0.5">Existing Debt & Capital Stack:</span>
                  <span>{dossier.propertyProfile.taxAssessmentOrDebtNote}</span>
                </div>
              )}
            </div>

            {/* Live External Web & Market Intelligence */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Live External Web Market Grounding</h3>
                  </div>
                </div>
                {onOpenExternalIntel && (
                  <button
                    type="button"
                    onClick={() => onOpenExternalIntel(dossier.targetPropertyAddress)}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="w-3 h-3" />
                    <span>Search Web</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium block text-[11px]">Submarket Cap Rate Spread:</span>
                  <span className="text-slate-900 font-bold">{dossier.externalWebIntel.submarketCapRateRange}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium block text-[11px]">Debt Yield Benchmark:</span>
                  <span className="text-slate-900 font-semibold">{dossier.externalWebIntel.interestRateBenchmark}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium block text-[11px]">Municipal & Zoning Intelligence:</span>
                  <span className="text-slate-700 leading-relaxed block mt-0.5">{dossier.externalWebIntel.localMunicipalOrZoningNews}</span>
                </div>

                {dossier.externalWebIntel.webSources && dossier.externalWebIntel.webSources.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-slate-600 block mb-1">Sources & Citations:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {dossier.externalWebIntel.webSources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-emerald-800 text-[10px] font-semibold rounded border border-slate-200"
                        >
                          <span className="truncate max-w-[140px]">{s.title}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Automated Next Steps & Submarket Comps (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Submarket Closed Sales Comps & Pricing Spreads */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Submarket Comparable Sales & Pricing</h3>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  {dossier.externalWebIntel.submarketCapRateRange}
                </span>
              </div>

              {dossier.externalWebIntel.recentSubmarketSalesComps && dossier.externalWebIntel.recentSubmarketSalesComps.length > 0 ? (
                <div className="space-y-2.5">
                  {dossier.externalWebIntel.recentSubmarketSalesComps.map((comp, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 flex items-start gap-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed font-medium">{comp}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-600 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  Recent transit corridor sales averaged between 5.9% and 6.4% cap rate ($420 - $480/RSF).
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-[11px] text-slate-500 font-medium block">Debt Yield Benchmark:</span>
                  <span className="text-xs font-bold text-slate-900 mt-0.5 block">{dossier.externalWebIntel.interestRateBenchmark}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="text-[11px] text-slate-500 font-medium block">Municipal / Zoning Status:</span>
                  <span className="text-xs font-semibold text-slate-800 mt-0.5 line-clamp-2 block">{dossier.externalWebIntel.localMunicipalOrZoningNews}</span>
                </div>
              </div>
            </div>

            {/* Pre-Arranged Automated Next Steps Queue */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Automated Next-Step Execution Queue</h3>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Ready To Fire Post-Meeting
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {dossier.recommendedNextStepsPrep.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-left"
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-900 block">{step.step}</span>
                      <span className="text-[11px] text-slate-500">
                        Assigned: <strong className="text-slate-700">{step.assignedTo}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-200 text-slate-800 shrink-0">
                      {step.contingencyTrigger}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Once your meeting concludes, 1-click debrief populates all final agreed terms.
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onStartPostMeetingDebrief(
                      dossier.targetPropertyAddress,
                      dossier.clientOrCounterparty.name,
                      dossier.meetingTitle
                    )
                  }
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
                >
                  <span>Step Into Debrief</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
