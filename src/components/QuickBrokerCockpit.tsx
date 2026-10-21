import React, { useState } from "react";
import { User } from "firebase/auth";
import {
  Zap,
  Mic,
  PhoneCall,
  Calendar,
  FileText,
  Clock,
  CheckCircle2,
  X,
  Plus,
  Send,
  Building2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Compass,
} from "lucide-react";
import { Contact, DealAnalysisResult, QuickActivityLog } from "../types.ts";

interface QuickBrokerCockpitProps {
  currentTab: "premeeting" | "intake" | "notes" | "comms" | "database" | "workspace";
  setCurrentTab: (tab: "premeeting" | "intake" | "notes" | "comms" | "database" | "workspace") => void;
  hasActiveDeal: boolean;
  activeDeal: DealAnalysisResult | null;
  pendingCommsCount: number;
  contacts: Contact[];
  user: User | null;
  onOpenDealMemo: () => void;
  onQuickLogCall: (log: Partial<QuickActivityLog>) => Promise<void>;
  onQuickScheduleCalendar: (title: string, deadline?: string) => void;
}

export const QuickBrokerCockpit: React.FC<QuickBrokerCockpitProps> = ({
  currentTab,
  setCurrentTab,
  hasActiveDeal,
  activeDeal,
  pendingCommsCount,
  contacts,
  user,
  onOpenDealMemo,
  onQuickLogCall,
  onQuickScheduleCalendar,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Quick Call Log State
  const [callContactId, setCallContactId] = useState<string>(contacts[0]?.id || "");
  const [callOutcome, setCallOutcome] = useState("Agreed On Price & Terms");
  const [callNotes, setCallNotes] = useState("");
  const [isLoggingCall, setIsLoggingCall] = useState(false);

  // Quick Calendar Event State
  const [eventTitle, setEventTitle] = useState(
    activeDeal ? `Showing & Tour: ${activeDeal.dealName}` : "Client Walkthrough / LOI Review"
  );
  const [eventDeadline, setEventDeadline] = useState("Tomorrow 10:00 AM");

  const handleLogCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const contact = contacts.find((c) => c.id === callContactId) || contacts[0];
    if (!contact) return;

    setIsLoggingCall(true);
    await onQuickLogCall({
      type: "call",
      title: `Fast Call Log: ${contact.name}`,
      entityName: `${contact.name} (${contact.role}, ${contact.company})`,
      propertyOrContext: activeDeal?.matchedListing?.address || "Active Deal Portfolio",
      outcome: callOutcome,
      notes: callNotes || `Spoke with ${contact.name}. Outcome: ${callOutcome}.`,
      followUpDate: "Within 24 Hours",
    });

    setIsLoggingCall(false);
    setCallNotes("");
    setShowCallModal(false);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onQuickScheduleCalendar(eventTitle, eventDeadline);
    setShowCalendarModal(false);
  };

  return (
    <>
      {/* Floating Action Cockpit Bar */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 print:hidden">
        {/* Expanded Quick Options Menu */}
        {isExpanded && (
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xl space-y-2 w-64 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Speed Actions</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCurrentTab("premeeting");
                setIsExpanded(false);
              }}
              className="w-full flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-emerald-50 rounded-xl text-xs font-medium text-slate-800 hover:text-emerald-800 transition-colors cursor-pointer border border-slate-200"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pre-Meeting Dossier</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentTab("intake");
                setIsExpanded(false);
              }}
              className="w-full flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-emerald-50 rounded-xl text-xs font-medium text-slate-800 hover:text-emerald-800 transition-colors cursor-pointer border border-slate-200"
            >
              <Mic className="w-3.5 h-3.5 text-emerald-600" />
              <span>Record Voice Debrief</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCallModal(true);
                setIsExpanded(false);
              }}
              className="w-full flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-emerald-50 rounded-xl text-xs font-medium text-slate-800 hover:text-emerald-800 transition-colors cursor-pointer border border-slate-200"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
              <span>Log Client Call</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCalendarModal(true);
                setIsExpanded(false);
              }}
              className="w-full flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-emerald-50 rounded-xl text-xs font-medium text-slate-800 hover:text-emerald-800 transition-colors cursor-pointer border border-slate-200"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Schedule Showing / Tour</span>
            </button>

            {hasActiveDeal && (
              <button
                type="button"
                onClick={() => {
                  onOpenDealMemo();
                  setIsExpanded(false);
                }}
                className="w-full flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-emerald-50 rounded-xl text-xs font-medium text-emerald-700 transition-colors cursor-pointer border border-emerald-200"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export CBRE Deal Memo</span>
              </button>
            )}

            {hasActiveDeal && (
              <button
                type="button"
                onClick={() => {
                  setCurrentTab("comms");
                  setIsExpanded(false);
                }}
                className="w-full flex items-center justify-between p-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-xs font-bold text-emerald-800 transition-colors cursor-pointer border border-emerald-200"
              >
                <div className="flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Push Emails</span>
                </div>
                {pendingCommsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {pendingCommsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {/* Master Floating Toggle Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all cursor-pointer border border-emerald-500"
          title="Quick Actions"
        >
          <Zap className="w-3.5 h-3.5 text-emerald-200 fill-emerald-200" />
          <span>Quick Actions</span>
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-emerald-200" />
          ) : (
            <ChevronUp className="w-3 h-3 text-emerald-200" />
          )}
        </button>
      </div>

      {/* Quick Log Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Log Client Call</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCallModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogCallSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Select Contact
                </label>
                <select
                  value={callContactId}
                  onChange={(e) => setCallContactId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.role} - {c.company})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Call Outcome
                </label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                >
                  <option value="Agreed On Price & Terms">Agreed On Price & Terms</option>
                  <option value="Requested Revised Financial Pro-Forma">Requested Revised Financial Pro-Forma</option>
                  <option value="Scheduled On-Site Walkthrough">Scheduled On-Site Walkthrough</option>
                  <option value="Awaiting Lender Approval">Awaiting Lender Approval</option>
                  <option value="Counter-Offer Received">Counter-Offer Received</option>
                  <option value="Left Voicemail / Follow-up Tomorrow">Left Voicemail / Follow-up Tomorrow</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Memo
                </label>
                <input
                  type="text"
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="e.g. Buyer confirmed 1031 timeline and $450k deposit"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCallModal(false)}
                  className="py-2 px-3 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingCall}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  {isLoggingCall ? "Logging..." : "Log Call to CRM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Schedule Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Schedule on Google Calendar</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Event / Milestone Title
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Timing
                </label>
                <input
                  type="text"
                  value={eventDeadline}
                  onChange={(e) => setEventDeadline(e.target.value)}
                  placeholder="e.g. Tomorrow 10:00 AM or Friday 3:00 PM"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(false)}
                  className="py-2 px-3 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Continue to Calendar Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
