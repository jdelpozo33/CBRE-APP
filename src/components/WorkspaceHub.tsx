import React, { useState, useEffect } from "react";
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
  workspace,
  providersFor,
  ProviderAccount,
  CalendarEvent,
  EmailMessage,
  StoredFile,
  ConnectionKind,
} from "../providers/index.ts";
import { useConnectionSelection } from "../hooks/useConnectionSelection.ts";
import { WorkspaceConfirmAction } from "./WorkspaceConfirmModal.tsx";
import { DealAnalysisResult, Contact } from "../types.ts";

interface WorkspaceHubProps {
  user: ProviderAccount | null;
  // Files account; the same as `user` when files use the email & calendar provider.
  filesAccount: ProviderAccount | null;
  onConnectFiles: () => Promise<void>;
  onDisconnectFiles: () => Promise<void>;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  isLoggingIn: boolean;
  onRequestConfirm: (action: WorkspaceConfirmAction) => void;
  showNotification: (msg: string) => void;
  activeDeal: DealAnalysisResult | null;
  contacts: Contact[];
}

export const WorkspaceHub: React.FC<WorkspaceHubProps> = ({
  user,
  filesAccount,
  onConnectFiles,
  onDisconnectFiles,
  onSignIn,
  onSignOut,
  isLoggingIn,
  onRequestConfirm,
  showNotification,
  activeDeal,
  contacts,
}) => {
  const selection = useConnectionSelection();
  const labels = workspace.labels;
  const [activeTab, setActiveTab] = useState<"email" | "calendar" | "files">("email");

  // Email State
  const [emailMessages, setEmailMessages] = useState<EmailMessage[]>([]);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [eventSummary, setEventSummary] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("10:00");
  const [eventDuration, setEventDuration] = useState("60");
  const [eventLocation, setEventLocation] = useState("");
  const [eventAttendee, setEventAttendee] = useState("");
  const [eventNotes, setEventNotes] = useState("");

  // Files State
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [fileSearch, setFileSearch] = useState("");

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
      setEventLocation(activeDeal.matchedListing?.address || "CBRE Conference Room / Video Call");
      setEventNotes(
        `Review contract milestones for ${activeDeal.dealName}.\nPurchase Price: ${activeDeal.financialTerms.purchasePrice}.\nKey action items: Escrow wire & PSA drafting.`
      );
    }
  }, [activeDeal]);

  // Load recent emails
  const loadEmail = async () => {
    if (!user) return;
    setIsLoadingEmail(true);
    try {
      const q = activeDeal ? activeDeal.dealName : "";
      const msgs = await workspace.email.listRecent(q, 8);
      setEmailMessages(msgs);
    } catch (err) {
      console.error("Error loading email messages:", err);
    } finally {
      setIsLoadingEmail(false);
    }
  };

  // Load Calendar events
  const loadCalendar = async () => {
    if (!user) return;
    setIsLoadingCalendar(true);
    try {
      const events = await workspace.calendar.listUpcomingEvents({ max: 8 });
      setCalendarEvents(events);
    } catch (err) {
      console.error("Error loading Calendar events:", err);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  // Load stored files
  const loadFiles = async () => {
    if (!filesAccount) return;
    setIsLoadingFiles(true);
    try {
      const files = workspace.files ? await workspace.files.listFiles(fileSearch, 12) : [];
      setStoredFiles(files);
    } catch (err) {
      console.error("Error loading files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (activeTab === "email") loadEmail();
      if (activeTab === "calendar") loadCalendar();
    }
    if (filesAccount && activeTab === "files") loadFiles();
  }, [user, filesAccount, activeTab, selection]);

  // Clear data from the previous provider when the broker switches.
  useEffect(() => {
    setEmailMessages([]);
    setCalendarEvents([]);
  }, [selection.mailCalendar]);
  useEffect(() => setStoredFiles([]), [selection.files]);

  // Handle Send Email with Mandatory Confirmation
  const handleInitiateSendEmail = (isDraft: boolean = false) => {
    if (!composeRecipient || !composeSubject) {
      showNotification("Please specify both recipient email and subject.");
      return;
    }

    onRequestConfirm({
      type: isDraft ? "email_draft" : "email_send",
      title: isDraft ? "Save Email Draft" : "Send Email from Your Account",
      description: isDraft
        ? `Create a new draft in your connected ${labels.email} account.`
        : `Send this email directly from your connected ${labels.email} address.`,
      details: [
        { label: "Sender Account", value: user?.email || "Connected account" },
        { label: "Recipient", value: composeRecipient },
        { label: "Subject", value: composeSubject },
        { label: "Length", value: `${composeBody.length} characters` },
      ],
      onConfirm: async () => {
        try {
          if (isDraft) {
            await workspace.email.createDraft({ to: composeRecipient, subject: composeSubject, body: composeBody });
            showNotification(`Draft created for ${composeRecipient}`);
          } else {
            await workspace.email.send({ to: composeRecipient, subject: composeSubject, body: composeBody });
            showNotification(`Email sent to ${composeRecipient}`);
          }
          loadEmail();
        } catch (err: any) {
          alert(`Email error: ${err.message}`);
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
      title: "Schedule Calendar Event",
      description: `Create an event and milestone in your connected ${labels.calendar}.`,
      details: [
        { label: "Event Title", value: eventSummary },
        { label: "Date & Time", value: `${selectedDate} at ${eventTime} (${durationMinutes} mins)` },
        { label: "Location", value: eventLocation || "None specified" },
        { label: "Attendees", value: attendeesList.join(", ") || "No additional attendees" },
      ],
      onConfirm: async () => {
        try {
          await workspace.calendar.createEvent({
            title: eventSummary,
            description: eventNotes,
            location: eventLocation,
            start: startDateTime,
            end: endDateTime,
            attendeeEmails: attendeesList,
          });
          showNotification(`Calendar event scheduled: "${eventSummary}"`);
          loadCalendar();
        } catch (err: any) {
          alert(`Calendar error: ${err.message}`);
        }
      },
      onCancel: () => {},
    });
  };

  // Handle Export to file storage with Mandatory Confirmation
  const handleInitiateExportFiles = () => {
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
      type: "file_upload",
      title: "Save Brief to Cloud Files",
      description: `Upload a complete markdown briefing document to your ${labels.files}.`,
      details: [
        { label: "Target Account", value: filesAccount?.email || "Connected account" },
        { label: "File Name", value: `${filename}.md` },
        { label: "Format", value: "Markdown (text/markdown)" },
        { label: "Deal Reference", value: activeDeal.dealName },
      ],
      onConfirm: async () => {
        try {
          if (!workspace.files) throw new Error("Your connected account does not support file storage.");
          await workspace.files.uploadNote(filename, markdownContent, activeDeal.dealName);
          showNotification(`Saved "${filename}.md" to ${labels.files}`);
          loadFiles();
        } catch (err: any) {
          alert(`File upload error: ${err.message}`);
        }
      },
      onCancel: () => {},
    });
  };

  return (
    <div className="space-y-6">
      {/* Calendar & Email Connection Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                Calendar & Email Connection
              </span>
              {user && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {user ? workspace.displayName : "Connect your calendar & email"}
            </h2>
          </div>

          {/* Auth Action */}
          <div className="shrink-0">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.name || "User"}
                    className="w-9 h-9 rounded-full border border-emerald-500"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    {(user.email || user.name).substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[170px]">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[170px]">
                    {user.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  title={`Disconnect ${workspace.displayName}`}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={isLoggingIn}
                  className="cursor-pointer inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:shadow-sm transition-all border border-slate-200 disabled:opacity-60 text-xs sm:text-sm min-h-11"
                >
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800">
                    {isLoggingIn ? "Connecting..." : `Connect ${workspace.displayName}`}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Provider choice: brokers use different email, calendar and file services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5 border-t border-slate-100 mt-5">
          {(
            [
              { kind: "mailCalendar", title: "Email & calendar" },
              { kind: "files", title: "Files" },
            ] as { kind: ConnectionKind; title: string }[]
          ).map(({ kind, title }) => (
            <fieldset key={kind} className="space-y-2">
              <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{title}</legend>
              <div className="flex flex-wrap gap-2">
                {providersFor(kind).map((provider) => {
                  const selected = selection[kind] === provider.id;
                  const label = kind === "files" ? provider.labels.files : provider.displayName;
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => workspace.select({ [kind]: provider.id })}
                      className={`text-left px-3.5 py-2 min-h-11 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        selected
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                      title={provider.isConfigured ? undefined : provider.setupHint}
                    >
                      <span className="block">{label}</span>
                      {!provider.isConfigured && (
                        <span className={`block text-[10px] font-medium ${selected ? "text-emerald-100" : "text-amber-700"}`}>
                          Setup needed
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Mail className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800">Email · {labels.email}</div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800">Calendar · {labels.calendar}</div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800">Files · {labels.files}</div>
          </div>
        </div>
      </div>

      {/* Main Workspace Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("email")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "email"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email</span>
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
          <span>Calendar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("files")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "files"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Files</span>
        </button>
      </div>

      {/* Email Section */}
      {activeTab === "email" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Direct Send Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Send className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Send Email</h3>
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
                  onClick={() => handleInitiateSendEmail(true)}
                  disabled={!user || isLoggingIn}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleInitiateSendEmail(false)}
                  disabled={!user || isLoggingIn}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send from My Email</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Email Feed */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent Email Activity</h3>
              </div>
              <button
                type="button"
                onClick={loadEmail}
                disabled={isLoadingEmail || !user}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Refresh messages"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEmail ? "animate-spin" : ""}`} />
              </button>
            </div>

            {!user ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                <Mail className="w-8 h-8 text-slate-400" />
                <p className="text-xs text-slate-600">
                  Connect your email account to view recent deal correspondence.
                </p>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Connect Email
                </button>
              </div>
            ) : isLoadingEmail ? (
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin mr-2 text-emerald-600" />
                Loading recent emails...
              </div>
            ) : emailMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                <span>No recent emails found.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {emailMessages.map((msg) => (
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

      {/* Calendar Section */}
      {activeTab === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Quick Schedule Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Schedule on Calendar</h3>
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
                placeholder="1420 Market Street, San Francisco, CA or video call link"
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
                  Connect your calendar to see your upcoming meetings.
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
                        {evt.title}
                      </span>
                      {evt.link && (
                        <a
                          href={evt.link}
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
                        {evt.allDay
                          ? new Date(evt.start).toLocaleDateString([], { month: "short", day: "numeric" })
                          : new Date(evt.start).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
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

      {/* Files Section */}
      {activeTab === "files" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Export Debrief Card */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <HardDrive className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Archive to {labels.files}</h3>
            </div>

            {/* Files can use a different provider than email & calendar, with its own sign-in */}
            {workspace.filesNeedSeparateConnection && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="min-w-0 truncate">
                  {filesAccount ? (
                    <>
                      <span className="font-bold text-slate-900">{labels.files}:</span>{" "}
                      <span className="text-slate-600">{filesAccount.email || filesAccount.name}</span>
                    </>
                  ) : (
                    <span className="text-slate-600">{labels.files} is not connected</span>
                  )}
                </span>
                {filesAccount ? (
                  <button
                    type="button"
                    onClick={onDisconnectFiles}
                    title={`Disconnect ${labels.files}`}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onConnectFiles}
                    className="px-3 min-h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    Connect {labels.files}
                  </button>
                )}
              </div>
            )}

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
                Exports all parsed meeting intelligence, executive summaries, cap rate comparisons, and action items directly to your {labels.files}.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleInitiateExportFiles}
                disabled={!filesAccount || !activeDeal || isLoggingIn}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
                <span>Save Debrief to {labels.files}</span>
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Requires confirmation before saving.
              </p>
            </div>
          </div>

          {/* Files Browser */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Deal Files · {labels.files}</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadFiles()}
                    placeholder="Search files..."
                    className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white w-36 sm:w-44"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadFiles}
                  disabled={isLoadingFiles || !filesAccount}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Refresh files"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {!filesAccount ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                <HardDrive className="w-8 h-8 text-slate-400" />
                <p className="text-xs text-slate-600">
                  Connect {labels.files} to browse deal documents and briefs.
                </p>
                <button
                  type="button"
                  onClick={workspace.filesNeedSeparateConnection ? onConnectFiles : onSignIn}
                  className="px-4 py-2 min-h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Connect {labels.files}
                </button>
              </div>
            ) : isLoadingFiles ? (
              <div className="flex-1 flex items-center justify-center p-12 text-xs text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin mr-2 text-emerald-600" />
                Loading files...
              </div>
            ) : storedFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                <span>No files found matching search.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {storedFiles.map((file) => (
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
                    {file.link && (
                      <a
                        href={file.link}
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
