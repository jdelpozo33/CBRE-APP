import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  Mail,
  Calendar,
  HardDrive,
  CheckCircle2,
  ExternalLink,
  Plus,
  RefreshCw,
  LogOut,
  Send,
  FileText,
  Search,
  Sparkles,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import {
  sendGmailMessage,
  createGmailDraft,
  fetchRecentGmailMessages,
  GmailMessagePreview,
} from "../services/gmailService.ts";
import {
  createCalendarEvent,
  fetchUpcomingCalendarEvents,
  CalendarEventItem,
} from "../services/calendarService.ts";
import {
  uploadDealNoteToDrive,
  listGoogleDriveFiles,
  DriveFileItem,
} from "../services/driveService.ts";
import { WorkspaceConfirmAction } from "./WorkspaceConfirmModal.tsx";
import { DealAnalysisResult, Contact } from "../types.ts";

interface GoogleWorkspaceHubProps {
  user: User | null;
  token: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  isLoggingIn: boolean;
  onRequestConfirm: (action: WorkspaceConfirmAction) => void;
  showNotification: (msg: string) => void;
  activeDeal: DealAnalysisResult | null;
  contacts: Contact[];
}

export const GoogleWorkspaceHub: React.FC<GoogleWorkspaceHubProps> = ({
  user,
  token,
  onSignIn,
  onSignOut,
  isLoggingIn,
  onRequestConfirm,
  showNotification,
  activeDeal,
  contacts,
}) => {
  const [activeTab, setActiveTab] = useState<"gmail" | "calendar" | "drive">("gmail");

  // Gmail State
  const [gmailMessages, setGmailMessages] = useState<GmailMessagePreview[]>([]);
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [eventSummary, setEventSummary] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("10:00");
  const [eventDuration, setEventDuration] = useState("60");
  const [eventLocation, setEventLocation] = useState("");
  const [eventAttendee, setEventAttendee] = useState("");
  const [eventNotes, setEventNotes] = useState("");

  // Drive State
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveSearch, setDriveSearch] = useState("");

  // Populate defaults when activeDeal changes
  useEffect(() => {
    if (activeDeal) {
      setComposeSubject(`Deal Update: ${activeDeal.dealName}`);
      setComposeBody(
        `Hi Team,\n\nHere is the latest briefing for ${activeDeal.dealName}:\n\n` +
          `• Purchase Price: ${activeDeal.financialTerms.purchasePrice}\n` +
          `• Cap Rate: ${activeDeal.financialTerms.capRate}\n` +
          `• Key Terms: ${activeDeal.financialTerms.dueDiligenceDays} Diligence / ${activeDeal.financialTerms.closingTimeline} Close\n\n` +
          `Notes:\n${activeDeal.executiveSummary}\n\nBest regards,\nCBRE Brokerage Advisory`
      );

      setEventSummary(`Follow-up & Milestone Review: ${activeDeal.dealName}`);
      setEventLocation(activeDeal.matchedListing?.address || "CBRE Conference Room / Google Meet");
      setEventNotes(
        `Review contract milestones for ${activeDeal.dealName}.\nPurchase Price: ${activeDeal.financialTerms.purchasePrice}.\nKey action items: Escrow wire & PSA drafting.`
      );
    }
  }, [activeDeal]);

  // Load Gmail messages
  const loadGmail = async () => {
    if (!token) return;
    setIsLoadingGmail(true);
    try {
      const q = activeDeal ? activeDeal.dealName : "";
      const msgs = await fetchRecentGmailMessages(q, 8);
      setGmailMessages(msgs);
    } catch (err) {
      console.error("Error loading Gmail messages:", err);
    } finally {
      setIsLoadingGmail(false);
    }
  };

  // Load Calendar events
  const loadCalendar = async () => {
    if (!token) return;
    setIsLoadingCalendar(true);
    try {
      const events = await fetchUpcomingCalendarEvents(8);
      setCalendarEvents(events);
    } catch (err) {
      console.error("Error loading Calendar events:", err);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  // Load Drive files
  const loadDrive = async () => {
    if (!token) return;
    setIsLoadingDrive(true);
    try {
      const files = await listGoogleDriveFiles(driveSearch, 12);
      setDriveFiles(files);
    } catch (err) {
      console.error("Error loading Drive files:", err);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  useEffect(() => {
    if (token) {
      if (activeTab === "gmail") loadGmail();
      if (activeTab === "calendar") loadCalendar();
      if (activeTab === "drive") loadDrive();
    }
  }, [token, activeTab]);

  // Handle Send Email via Gmail with Mandatory Confirmation
  const handleInitiateSendGmail = (isDraft: boolean = false) => {
    if (!composeRecipient || !composeSubject) {
      showNotification("Please specify both recipient email and subject.");
      return;
    }

    onRequestConfirm({
      type: isDraft ? "gmail_draft" : "gmail_send",
      title: isDraft ? "Save Gmail Draft" : "Send Email via Connected Gmail",
      description: isDraft
        ? "Create a new draft in your connected Google Workspace Gmail account."
        : "Send this email directly from your authenticated Google Workspace address.",
      details: [
        { label: "Sender Account", value: user?.email || "Connected Google User" },
        { label: "Recipient", value: composeRecipient },
        { label: "Subject", value: composeSubject },
        { label: "Length", value: `${composeBody.length} characters` },
      ],
      onConfirm: async () => {
        try {
          if (isDraft) {
            await createGmailDraft(composeRecipient, composeSubject, composeBody);
            showNotification(`Gmail draft created for ${composeRecipient}`);
          } else {
            await sendGmailMessage(composeRecipient, composeSubject, composeBody);
            showNotification(`Email successfully sent via Gmail to ${composeRecipient}`);
          }
          loadGmail();
        } catch (err: any) {
          alert(`Gmail API Error: ${err.message}`);
        }
      },
      onCancel: () => {},
    });
  };

  // Handle Schedule Event with Mandatory Confirmation
  const handleInitiateScheduleEvent = () => {
    if (!eventSummary) {
      showNotification("Please provide a meeting title.");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const selectedDate = eventDate || todayStr;
    const startDateTime = new Date(`${selectedDate}T${eventTime || "10:00"}:00`).toISOString();
    const durationMinutes = parseInt(eventDuration || "60", 10);
    const endDateTime = new Date(
      new Date(startDateTime).getTime() + durationMinutes * 60000
    ).toISOString();

    const attendeesList = eventAttendee
      ? eventAttendee.split(",").map((e) => e.trim()).filter(Boolean)
      : [];

    onRequestConfirm({
      type: "calendar_event",
      title: "Schedule Google Calendar Event",
      description: "Create an official event and milestone in your connected Google Calendar.",
      details: [
        { label: "Event Title", value: eventSummary },
        { label: "Date & Time", value: `${selectedDate} at ${eventTime} (${durationMinutes} mins)` },
        { label: "Location", value: eventLocation || "None specified" },
        { label: "Attendees", value: attendeesList.join(", ") || "No additional attendees" },
      ],
      onConfirm: async () => {
        try {
          const res = await createCalendarEvent({
            summary: eventSummary,
            description: eventNotes,
            location: eventLocation,
            startDateTime,
            endDateTime,
            attendeeEmails: attendeesList,
          });
          showNotification(`Calendar event scheduled: "${eventSummary}"`);
          loadCalendar();
        } catch (err: any) {
          alert(`Google Calendar API Error: ${err.message}`);
        }
      },
      onCancel: () => {},
    });
  };

  // Handle Export to Drive with Mandatory Confirmation
  const handleInitiateExportDrive = () => {
    if (!activeDeal) {
      showNotification("No active deal available to export.");
      return;
    }

    const filename = `${activeDeal.dealName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Debrief_Notes`;
    const markdownContent = [
      `# CBRE Broker Buddy Deal Intelligence Brief`,
      `**Deal**: ${activeDeal.dealName}`,
      `**Date**: ${new Date().toLocaleDateString()}`,
      `**Property Address**: ${activeDeal.matchedListing?.address || "CBRE Portfolio"}`,
      `**Purchase Price**: ${activeDeal.financialTerms.purchasePrice}`,
      `**Cap Rate**: ${activeDeal.financialTerms.capRate}`,
      `**Due Diligence**: ${activeDeal.financialTerms.dueDiligenceDays}`,
      `**Closing Timeline**: ${activeDeal.financialTerms.closingTimeline}`,
      ``,
      `## Executive Summary`,
      activeDeal.executiveSummary,
      ``,
      `## Key Discussion Points`,
      activeDeal.keyDiscussionPoints.map((p) => `- ${p}`).join("\n"),
      ``,
      `## Action Items & Next Steps`,
      activeDeal.actionItems
        .map((a) => `- [ ] **${a.task}** (Owner: ${a.owner}, Due: ${a.deadline})`)
        .join("\n"),
      ``,
      `## Strategic Insights`,
      activeDeal.strategicInsights.map((s) => `- **${s.category}**: ${s.insight} (${s.recommendedAction})`).join("\n"),
    ].join("\n");

    onRequestConfirm({
      type: "drive_upload",
      title: "Save Brief to Google Drive",
      description: "Upload a complete markdown briefing document to your Google Drive root folder.",
      details: [
        { label: "Target Account", value: user?.email || "Connected Google User" },
        { label: "File Name", value: `${filename}.md` },
        { label: "Format", value: "Markdown (text/markdown)" },
        { label: "Deal Reference", value: activeDeal.dealName },
      ],
      onConfirm: async () => {
        try {
          const res = await uploadDealNoteToDrive(filename, markdownContent, activeDeal.dealName);
          showNotification(`Saved "${filename}.md" to Google Drive`);
          loadDrive();
        } catch (err: any) {
          alert(`Google Drive API Error: ${err.message}`);
        }
      },
      onCancel: () => {},
    });
  };

  return (
    <div className="space-y-6">
      {/* Google Workspace Connection Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                1P Google Workspace
              </span>
              {user && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Gmail, Google Calendar & Google Drive
            </h2>
          </div>

          {/* Auth Action */}
          <div className="shrink-0">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-9 h-9 rounded-full border border-emerald-500"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    {user.email ? user.email.substring(0, 2).toUpperCase() : "GW"}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[170px]">
                    {user.displayName || "Google Workspace User"}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[170px]">
                    {user.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  title="Sign out of Google Workspace"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                {/* Official Sign in with Google Button */}
                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={isLoggingIn}
                  className="gsi-material-button group cursor-pointer inline-flex items-center justify-center bg-white hover:bg-slate-50 text-slate-800 font-semibold px-4 py-2 rounded-xl shadow-xs hover:shadow-sm transition-all border border-slate-200 disabled:opacity-60 text-xs sm:text-sm"
                >
                  <div className="w-5 h-5 mr-3 shrink-0">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      className="w-full h-full"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  </div>
                  <span className="font-bold text-slate-800">
                    {isLoggingIn ? "Signing in..." : "Sign in with Google"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-slate-100 mt-5">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Mail className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800">Gmail Integration</div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800">Google Calendar</div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800">Google Drive</div>
          </div>
        </div>
      </div>

      {/* Main Workspace Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("gmail")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "gmail"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Gmail Dispatcher</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("calendar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "calendar"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Google Calendar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("drive")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "drive"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Google Drive</span>
        </button>
      </div>

      {/* Gmail Section */}
      {activeTab === "gmail" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Direct Send Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Send className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Send Email via Gmail</h3>
              </div>
            </div>

            {/* Quick Contact Picker */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Auto-fill Recipient from CRM
              </label>
              <select
                onChange={(e) => {
                  const contact = contacts.find((c) => c.id === e.target.value);
                  if (contact) {
                    setComposeRecipient(contact.email);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
              >
                <option value="">Choose a CRM stakeholder...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role}) — {c.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient Input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Recipient Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={composeRecipient}
                onChange={(e) => setComposeRecipient(e.target.value)}
                placeholder="client@apexhorizon.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            {/* Subject Input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Subject Line <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Next Steps: 1420 Market Street Deal"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Message Body
              </label>
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                rows={8}
                placeholder="Enter email body..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-sans focus:outline-none focus:border-emerald-500 focus:bg-white leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-400">
                Requires confirmation before sending.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleInitiateSendGmail(true)}
                  disabled={!user || isLoggingIn}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleInitiateSendGmail(false)}
                  disabled={!user || isLoggingIn}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send via Gmail</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Gmail Messages Feed */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent Gmail Activity</h3>
              </div>
              <button
                type="button"
                onClick={loadGmail}
                disabled={isLoadingGmail || !user}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Refresh messages"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGmail ? "animate-spin" : ""}`} />
              </button>
            </div>

            {!user ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                <Mail className="w-8 h-8 text-slate-400" />
                <p className="text-xs text-slate-600">
                  Sign in with Google to view recent deal correspondence.
                </p>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Connect Gmail
                </button>
              </div>
            ) : isLoadingGmail ? (
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin mr-2 text-emerald-600" />
                Loading recent emails...
              </div>
            ) : gmailMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                <span>No recent emails found.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {gmailMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 rounded-xl space-y-1.5 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-700 truncate max-w-[180px]">
                        {msg.from || "Unknown"}
                      </span>
                      <span className="text-slate-400 text-[10px]">{msg.date ? new Date(msg.date).toLocaleDateString() : ""}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 truncate">{msg.subject}</div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {msg.snippet}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Calendar Section */}
      {activeTab === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Quick Schedule Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Schedule on Google Calendar</h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Event Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={eventSummary}
                onChange={(e) => setEventSummary(e.target.value)}
                placeholder="Property Tour / Due Diligence Review"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Time</label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Duration</label>
                <select
                  value={eventDuration}
                  onChange={(e) => setEventDuration(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Location or Video Link
              </label>
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="1420 Market Street, San Francisco, CA or Google Meet"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Attendee Emails (comma separated)
              </label>
              <input
                type="text"
                value={eventAttendee}
                onChange={(e) => setEventAttendee(e.target.value)}
                placeholder="m.vance@apexhorizon.com, schen@firstam.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description / Agenda
              </label>
              <textarea
                value={eventNotes}
                onChange={(e) => setEventNotes(e.target.value)}
                rows={4}
                placeholder="Notes and agenda items..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-sans focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Requires confirmation before scheduling.
              </span>
              <button
                type="button"
                onClick={handleInitiateScheduleEvent}
                disabled={!user || isLoggingIn}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule Event</span>
              </button>
            </div>
          </div>

          {/* Upcoming Calendar Events Feed */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Upcoming Schedule</h3>
              </div>
              <button
                type="button"
                onClick={loadCalendar}
                disabled={isLoadingCalendar || !user}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Refresh schedule"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCalendar ? "animate-spin" : ""}`} />
              </button>
            </div>

            {!user ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                <Calendar className="w-8 h-8 text-slate-400" />
                <p className="text-xs text-slate-600">
                  Connect Google Calendar to see your upcoming meetings.
                </p>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Connect Calendar
                </button>
              </div>
            ) : isLoadingCalendar ? (
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin mr-2 text-emerald-600" />
                Loading upcoming events...
              </div>
            ) : calendarEvents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                <span>No upcoming calendar events found.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {calendarEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 rounded-xl space-y-1.5 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-800 truncate max-w-[200px]">
                        {evt.summary}
                      </span>
                      {evt.htmlLink && (
                        <a
                          href={evt.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-slate-700 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>
                        {evt.start.dateTime
                          ? new Date(evt.start.dateTime).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : evt.start.date}
                      </span>
                    </div>
                    {evt.location && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{evt.location}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Drive Section */}
      {activeTab === "drive" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Export Debrief Card */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <HardDrive className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Archive to Google Drive</h3>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Active Deal:</span>
                <span className="text-slate-900 font-bold">
                  {activeDeal ? activeDeal.dealName : "No deal active"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Export Format:</span>
                <span className="text-emerald-700 font-mono font-bold">Markdown (.md)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                Exports all parsed meeting intelligence, executive summaries, cap rate comparisons, and action items directly to your personal Google Drive folder.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleInitiateExportDrive}
                disabled={!user || !activeDeal || isLoggingIn}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
                <span>Save Debrief to Google Drive</span>
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Requires confirmation before saving.
              </p>
            </div>
          </div>

          {/* Drive Files Browser */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Google Drive Deal Files</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={driveSearch}
                    onChange={(e) => setDriveSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadDrive()}
                    placeholder="Search drive..."
                    className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white w-36 sm:w-44"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadDrive}
                  disabled={isLoadingDrive || !user}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Refresh files"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrive ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {!user ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                <HardDrive className="w-8 h-8 text-slate-400" />
                <p className="text-xs text-slate-600">
                  Connect Google Drive to browse deal documents and briefs.
                </p>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Connect Google Drive
                </button>
              </div>
            ) : isLoadingDrive ? (
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin mr-2 text-emerald-600" />
                Loading Drive files...
              </div>
            ) : driveFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                <span>No Google Drive files found matching search.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {driveFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ""} · {file.mimeType}
                        </span>
                      </div>
                    </div>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-emerald-700 text-[11px] font-semibold rounded-lg border border-slate-200 flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
