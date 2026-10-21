import React, { useRef } from "react";
import {
  Printer,
  X,
  Copy,
  Check,
  Building2,
  Calendar,
  DollarSign,
  ShieldCheck,
  Download,
  ExternalLink,
} from "lucide-react";
import { DealAnalysisResult } from "../types.ts";

interface DealMemoPrintModalProps {
  analysis: DealAnalysisResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DealMemoPrintModal: React.FC<DealMemoPrintModalProps> = ({
  analysis,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !analysis) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = [
      `=============================================================`,
      `CBRE DEAL INTELLIGENCE BRIEF / TRANSACTION TERM SHEET`,
      `=============================================================`,
      `DEAL: ${analysis.dealName}`,
      `DATE: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      `PROPERTY: ${analysis.matchedListing?.address || "CBRE Advisory Portfolio"}`,
      ``,
      `--- FINANCIAL & COMMERCIAL TERMS ---`,
      `Agreed Consideration: ${analysis.financialTerms.purchasePrice}`,
      `Entry Cap Rate / Yield: ${analysis.financialTerms.capRate}`,
      `Earnest Money Deposit: ${analysis.financialTerms.earnestMoneyDeposit}`,
      `Due Diligence Window: ${analysis.financialTerms.dueDiligenceDays}`,
      `Closing Timeline: ${analysis.financialTerms.closingTimeline}`,
      `Financing Structure: ${analysis.financialTerms.financingStructure}`,
      ``,
      `--- EXECUTIVE TRANSACTION SUMMARY ---`,
      analysis.executiveSummary,
      ``,
      `--- KEY DISCUSSION POINTS & AGREED TERMS ---`,
      analysis.keyDiscussionPoints.map((p, i) => `${i + 1}. ${p}`).join("\n"),
      ``,
      `--- ACTION MATRIX & DELIVERABLES ---`,
      analysis.actionItems
        .map((a) => `[${a.priority}] ${a.task} - Assigned to: ${a.owner} (Target: ${a.deadline})`)
        .join("\n"),
      ``,
      `--- STAKEHOLDER DIRECTORY & NEXT-STEPS ---`,
      analysis.communications
        .map((c) => `• ${c.recipientName} (${c.recipientRole}, ${c.recipientCompany}) - ${c.purpose}`)
        .join("\n"),
      `=============================================================`,
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Modal Top Toolbar (Hidden during print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">CBRE Deal Memo & Term Sheet</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Text"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Content Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100 print:bg-white print:text-slate-900 print:p-0 print:overflow-visible">
          <div
            ref={printAreaRef}
            className="max-w-3xl mx-auto bg-white print:bg-white text-slate-900 print:text-slate-900 rounded-xl p-8 sm:p-10 border border-slate-200 print:border-none shadow-sm print:shadow-none space-y-6"
          >
            {/* Document Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-emerald-600 print:border-emerald-700 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-widest text-emerald-700 uppercase">
                    CBRE ADVISORY & TRANSACTION SERVICES
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500">Confidential Deal Brief</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                  {analysis.dealName}
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Property: {analysis.matchedListing?.address || "Commercial Real Estate Portfolio"}
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 font-bold text-xs uppercase tracking-wider rounded-lg border border-emerald-200 mb-1">
                  Status: Under Contract
                </span>
                <p className="text-xs text-slate-500 font-mono">
                  Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
            </div>

            {/* Financial Terms Grid */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Key Economic Terms & Transaction Matrix
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Agreed Price
                  </span>
                  <span className="text-base font-bold text-emerald-700 font-mono">
                    {analysis.financialTerms.purchasePrice}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Cap Rate / Yield
                  </span>
                  <span className="text-base font-bold text-emerald-700 font-mono">
                    {analysis.financialTerms.capRate}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Earnest Money
                  </span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    {analysis.financialTerms.earnestMoneyDeposit}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Due Diligence
                  </span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    {analysis.financialTerms.dueDiligenceDays}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Closing Timeline
                  </span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    {analysis.financialTerms.closingTimeline}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Financing
                  </span>
                  <span className="text-base font-bold text-slate-900 font-mono truncate">
                    {analysis.financialTerms.financingStructure}
                  </span>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Executive Transaction Overview
              </h4>
              <p className="text-xs leading-relaxed text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-200">
                {analysis.executiveSummary}
              </p>
            </div>

            {/* Key Discussion Points */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Key Negotiation Points & Agreed Conditions
              </h4>
              <ul className="space-y-2 text-xs text-slate-800">
                {analysis.keyDiscussionPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="font-bold text-emerald-700 shrink-0 font-mono">
                      {i + 1}.
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Matrix & Deliverables */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Critical Deliverables & Action Matrix
              </h4>
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-2 border border-slate-200 font-bold">Priority</th>
                    <th className="p-2 border border-slate-200 font-bold">Action Item</th>
                    <th className="p-2 border border-slate-200 font-bold">Owner</th>
                    <th className="p-2 border border-slate-200 font-bold">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.actionItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-200">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.priority === "High"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="p-2 border border-slate-200 font-medium text-slate-900">
                        {item.task}
                      </td>
                      <td className="p-2 border border-slate-200 text-slate-700">{item.owner}</td>
                      <td className="p-2 border border-slate-200 font-mono text-slate-600">{item.deadline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stakeholder Directory */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Stakeholder Action Directory
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {analysis.communications.map((comm) => (
                  <div key={comm.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>{comm.recipientName}</span>
                      <span className="text-[10px] text-emerald-700 uppercase font-semibold">
                        {comm.recipientRole}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">{comm.recipientCompany}</div>
                    <div className="text-[10px] text-slate-600 mt-1 font-mono">
                      {comm.purpose}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Sign-off */}
            <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <div>Prepared by Broker Buddy · CBRE Advisory Services</div>
              <div>Strictly Confidential · For Intended Principals Only</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
