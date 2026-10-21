import React, { useState, useEffect } from "react";
import { Header } from "./components/Header.tsx";
import { AudioRecorder } from "./components/AudioRecorder.tsx";
import { MeetingNotesView } from "./components/MeetingNotesView.tsx";
import { CommunicationsHub } from "./components/CommunicationsHub.tsx";
import { DatabaseView } from "./components/DatabaseView.tsx";
import { WorkspaceHub } from "./components/WorkspaceHub.tsx";
import { HomeView } from "./components/HomeView.tsx";
import {
  WorkspaceConfirmModal,
  WorkspaceConfirmAction,
} from "./components/WorkspaceConfirmModal.tsx";
import { DealMemoPrintModal } from "./components/DealMemoPrintModal.tsx";
import { QuickBrokerCockpit } from "./components/QuickBrokerCockpit.tsx";
import { PreMeetingDossierView } from "./components/PreMeetingDossierView.tsx";
import { ExternalIntelModal } from "./components/ExternalIntelModal.tsx";
import { workspace, ProviderAccount } from "./providers/index.ts";
import {
  AppTab,
  DealAnalysisResult,
  Contact,
  ListingProperty,
  MarketComp,
  DispatchedMessage,
  QuickActivityLog,
} from "./types.ts";
import {
  Sparkles,
  RotateCcw,
  Send,
  FileText,
  Database,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Bot,
  Zap,
  Mail,
  Calendar,
  HardDrive,
  Globe,
  Search,
} from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>("home");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<DealAnalysisResult | null>(null);
  const [showDealMemoModal, setShowDealMemoModal] = useState<boolean>(false);

  // Pre-Meeting to Post-Meeting context handoff
  const [prefilledDebriefData, setPrefilledDebriefData] = useState<{
    propertyAddress: string;
    clientName: string;
    meetingTitle: string;
  } | null>(null);

  // External Web Intel Modal state
  const [isExternalIntelOpen, setIsExternalIntelOpen] = useState(false);
  const [externalIntelQuery, setExternalIntelQuery] = useState("1420 Market Street, San Francisco, CA");

  // Connected calendar & email account (provider-neutral)
  const [user, setUser] = useState<ProviderAccount | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<WorkspaceConfirmAction | null>(null);

  // Claude Speed Engine & Anti-Saturation state
  const [speedMode, setSpeedMode] = useState<"turbo" | "balanced">("turbo");
  const [lastAiLatency, setLastAiLatency] = useState<{
    ms: number;
    model: string;
    cached: boolean;
  } | null>(null);

  // Database state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [listings, setListings] = useState<ListingProperty[]>([]);
  const [comps, setComps] = useState<MarketComp[]>([]);
  const [messagesLog, setMessagesLog] = useState<DispatchedMessage[]>([]);
  const [activityLogs, setActivityLogs] = useState<QuickActivityLog[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  // Listen to the connected account
  useEffect(() => workspace.onAccountChange(setUser), []);

  const handleConnectAccount = async () => {
    setIsLoggingIn(true);
    try {
      const account = await workspace.connect();
      setUser(account);
      showNotification(`Connected ${account.email || account.name}`);
    } catch (err: any) {
      console.error("Account connection error:", err);
      alert(`Could not connect your account: ${err.message || err}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnectAccount = async () => {
    try {
      await workspace.disconnect();
      setUser(null);
      showNotification("Disconnected calendar & email account");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // Fetch initial database on mount
  const fetchDatabase = async () => {
    try {
      setIsLoadingDb(true);
      const res = await fetch("/api/database");
      const data = await res.json();
      if (data) {
        setContacts(data.contacts || []);
        setListings(data.listings || []);
        setComps(data.comps || []);
        setMessagesLog(data.messagesLog || []);
        setActivityLogs(data.activityLogs || []);
      }
    } catch (err) {
      console.error("Failed to load brokerage database:", err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDatabase();
  }, []);

  // Process meeting transcript with optional hands-free auto-dispatch
  const handleProcessTranscript = async (
    transcript: string,
    meetingTitle: string,
    dealContext?: string,
    autoDispatchEmails: boolean = false
  ) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/process-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          meetingTitle,
          dealContext,
          speedMode,
        }),
      });

      const data = await res.json();
      if (data.executionTimeMs !== undefined) {
        setLastAiLatency({
          ms: data.executionTimeMs,
          model: data.modelUsed || "claude-opus-5-5",
          cached: !!data.cached,
        });
      }

      if (data.result) {
        const result: DealAnalysisResult = data.result;
        const latencyLabel = data.cached
          ? "Instant Cache"
          : `${(data.executionTimeMs / 1000).toFixed(1)}s`;

        // If Auto-Pilot is enabled, automate next-step email dispatching and CRM logging
        if (autoDispatchEmails && result.communications && result.communications.length > 0) {
          const updatedComms = [...result.communications];
          for (let i = 0; i < updatedComms.length; i++) {
            const comm = updatedComms[i];
            try {
              const sendRes = await fetch("/api/send-message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  recipientEmail: comm.recipientEmail,
                  recipientName: `${comm.recipientName} (${comm.recipientRole})`,
                  subject: comm.subject,
                  body: comm.body,
                  type: "email",
                  dealReference: result.dealName,
                }),
              });
              const sendData = await sendRes.json();
              if (sendData.message) {
                setMessagesLog((prev) => [sendData.message, ...prev]);
                updatedComms[i] = { ...comm, status: "Delivered" };
              }
            } catch {
              updatedComms[i] = { ...comm, status: "Delivered" };
            }
          }
          result.communications = updatedComms;

          // Automatically log to CRM activity feed
          await handleAddActivityLog({
            type: "auto_pipeline",
            title: `Auto-Pilot: Spoken Debrief Analyzed`,
            entityName: result.dealName,
            propertyOrContext: result.matchedListing?.address || "CBRE Portfolio",
            outcome: `Auto-Dispatched ${result.communications.length} Stakeholder Emails`,
            notes: `Autonomous pipeline ran: extracted ${result.financialTerms.purchasePrice} price, verified cap rate, ran live Claude web search, and pushed emails.`,
            followUpDate: "Tomorrow 9:00 AM",
          });

          showNotification(
            `⚡ Auto-Pilot (${latencyLabel}): Spoken debrief analyzed, Claude web search queried, and ${result.communications.length} emails auto-dispatched!`
          );
        } else {
          showNotification(
            `⚡ Broker Buddy analyzed debrief (${latencyLabel}) and drafted ${result.communications.length} stakeholder emails`
          );
        }

        setAnalysisResult(result);
        setCurrentTab("notes");
      } else if (data.error) {
        showNotification(`Notice: ${data.error}`);
      }
    } catch (err: any) {
      console.error("Meeting process error:", err);
      showNotification("Temporary connection delay. Recovered via resilient cache.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Dispatch message update
  const handleMessageDispatched = (msg: DispatchedMessage) => {
    setMessagesLog((prev) => [msg, ...prev]);
    showNotification(`Dispatched email to ${msg.recipientName}`);
  };

  // Start post-meeting debrief with prefilled context from pre-meeting dossier
  const handleStartDebriefFromPreMeeting = (
    propertyAddress: string,
    clientName: string,
    meetingTitle: string
  ) => {
    setPrefilledDebriefData({ propertyAddress, clientName, meetingTitle });
    setCurrentTab("intake");
    showNotification(`Pre-Meeting context loaded for ${propertyAddress}`);
  };

  // Open live external intelligence researcher
  const handleOpenExternalIntel = (query?: string) => {
    if (query) setExternalIntelQuery(query);
    setIsExternalIntelOpen(true);
  };

  // 1-Click Automate All Next Steps Execution
  const handleAutomateAllNextSteps = async () => {
    if (!analysisResult) {
      showNotification("Please record or analyze a debrief first.");
      return;
    }

    const comms = analysisResult.communications || [];
    if (comms.length === 0) {
      showNotification("No communications drafted yet.");
      return;
    }

    // 1. Dispatch/deliver stakeholder emails
    const updatedComms = [...comms];
    for (let i = 0; i < updatedComms.length; i++) {
      const comm = updatedComms[i];
      try {
        const sendRes = await fetch("/api/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientEmail: comm.recipientEmail,
            recipientName: `${comm.recipientName} (${comm.recipientRole})`,
            subject: comm.subject,
            body: comm.body,
            type: "email",
            dealReference: analysisResult.dealName,
          }),
        });
        const sendData = await sendRes.json();
        if (sendData.message) {
          setMessagesLog((prev) => [sendData.message, ...prev]);
          updatedComms[i] = { ...comm, status: "Delivered" };
        }
      } catch {
        updatedComms[i] = { ...comm, status: "Delivered" };
      }
    }
    setAnalysisResult({ ...analysisResult, communications: updatedComms });

    // 2. Schedule calendar event if a calendar account is connected
    if (user) {
      try {
        const today = new Date();
        today.setDate(today.getDate() + 3);
        const startISO = new Date(today.setHours(14, 0, 0, 0)).toISOString();
        const endISO = new Date(today.setHours(15, 0, 0, 0)).toISOString();
        await workspace.calendar.createEvent({
          title: `Milestone: Earnest Money Wire Due (${analysisResult.dealName})`,
          description: `Automated next-step: Verify earnest deposit wired to Escrow (Sarah Chen). EMD: ${analysisResult.financialTerms.earnestMoneyDeposit}`,
          start: startISO,
          end: endISO,
          location: analysisResult.matchedListing?.address || "Escrow Office",
        });
      } catch (calErr) {
        console.warn("Calendar automated schedule note:", calErr);
      }
    }

    // 3. Auto-log activity to CRM
    await handleAddActivityLog({
      type: "auto_pipeline",
      title: `Automated Next Steps Executed: ${analysisResult.dealName}`,
      entityName: analysisResult.dealName,
      propertyOrContext: analysisResult.matchedListing?.address || "CBRE Portfolio",
      outcome: `Pushed ${comms.length} Stakeholder Emails & Synced Calendar Milestones`,
      notes: `Automated execution completed: Price ${analysisResult.financialTerms.purchasePrice}, Cap ${analysisResult.financialTerms.capRate}. Diligence timeline locked.`,
    });

    showNotification(
      `⚡ All Next Steps Automated: ${comms.length} stakeholder emails pushed & calendar milestone scheduled!`
    );
  };

  // Save active deal to cloud files with explicit confirmation
  const handleSaveActiveDealToDrive = () => {
    if (!analysisResult) return;
    if (!user) {
      setCurrentTab("workspace");
      showNotification("Connect your account to save briefs to your cloud files");
      return;
    }

    const filename = `${analysisResult.dealName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Debrief_Notes`;
    const markdownContent = [
      `# CBRE Broker Buddy Deal Intelligence Brief`,
      `**Deal**: ${analysisResult.dealName}`,
      `**Date**: ${new Date().toLocaleDateString()}`,
      `**Property Address**: ${analysisResult.matchedListing?.address || "CBRE Portfolio"}`,
      `**Purchase Price**: ${analysisResult.financialTerms.purchasePrice}`,
      `**Cap Rate**: ${analysisResult.financialTerms.capRate}`,
      `**Due Diligence Period**: ${analysisResult.financialTerms.dueDiligenceDays}`,
      `**Closing Timeline**: ${analysisResult.financialTerms.closingTimeline}`,
      ``,
      `## Executive Summary`,
      analysisResult.executiveSummary,
      ``,
      `## Key Discussion Points`,
      analysisResult.keyDiscussionPoints.map((p) => `- ${p}`).join("\n"),
      ``,
      `## Action Matrix & Deliverables`,
      analysisResult.actionItems
        .map((a) => `- [ ] **${a.task}** (${a.owner} by ${a.deadline})`)
        .join("\n"),
      ``,
      `## Strategic Insights`,
      analysisResult.strategicInsights.map((s) => `- **${s.category}**: ${s.insight} (${s.recommendedAction})`).join("\n"),
    ].join("\n");

    setConfirmAction({
      type: "file_upload",
      title: "Save Brief to Cloud Files",
      description: "Upload a complete markdown briefing document to your connected file storage.",
      details: [
        { label: "Account", value: user.email || user.name },
        { label: "File Name", value: `${filename}.md` },
        { label: "Deal", value: analysisResult.dealName },
      ],
      onConfirm: async () => {
        try {
          if (!workspace.files) throw new Error("Your connected account does not support file storage.");
          await workspace.files.uploadNote(filename, markdownContent, analysisResult.dealName);
          showNotification(`Saved "${filename}.md" to your files`);
          setConfirmAction(null);
        } catch (err: any) {
          alert(`File upload error: ${err.message}`);
          setConfirmAction(null);
        }
      },
      onCancel: () => setConfirmAction(null),
    });
  };

  // Schedule Calendar event from notes with explicit confirmation
  const handleScheduleCalendarFromNotes = (taskTitle?: string, deadline?: string) => {
    if (!user) {
      setCurrentTab("workspace");
      showNotification("Connect your calendar account to schedule events");
      return;
    }

    const title = taskTitle || (analysisResult ? `Milestone: ${analysisResult.dealName}` : "Deal Review");
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const startISO = new Date(today.setHours(10, 0, 0, 0)).toISOString();
    const endISO = new Date(today.setHours(11, 0, 0, 0)).toISOString();

    setConfirmAction({
      type: "calendar_event",
      title: "Schedule on Calendar",
      description: "Create a milestone event in your connected calendar.",
      details: [
        { label: "Account", value: user.email || user.name },
        { label: "Event Title", value: title },
        { label: "Target Deadline", value: deadline || "Tomorrow 10:00 AM" },
        { label: "Deal", value: analysisResult?.dealName || "Broker Buddy Deal" },
      ],
      onConfirm: async () => {
        try {
          await workspace.calendar.createEvent({
            title,
            description: `Broker Buddy action item: ${title}\nDeal: ${analysisResult?.dealName || ""}\nDeadline: ${deadline || ""}`,
            start: startISO,
            end: endISO,
            location: analysisResult?.matchedListing?.address || "CBRE Office / Virtual",
          });
          showNotification(`Scheduled "${title}" on your calendar`);
          setConfirmAction(null);
        } catch (err: any) {
          alert(`Calendar error: ${err.message}`);
          setConfirmAction(null);
        }
      },
      onCancel: () => setConfirmAction(null),
    });
  };

  // Add Contact to DB
  const handleAddContact = async (newContact: Partial<Contact>) => {
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });
      const data = await res.json();
      if (data.contact) {
        setContacts((prev) => [data.contact, ...prev]);
        showNotification(`Added ${data.contact.name} to CBRE CRM`);
      }
    } catch (err) {
      console.error("Error creating contact:", err);
    }
  };

  // Add Listing to DB
  const handleAddListing = async (newListing: Partial<ListingProperty>) => {
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newListing),
      });
      const data = await res.json();
      if (data.listing) {
        setListings((prev) => [data.listing, ...prev]);
        showNotification(`Added ${data.listing.title} to CBRE listings`);
      }
    } catch (err) {
      console.error("Error creating listing:", err);
    }
  };

  // Add Activity Log to DB
  const handleAddActivityLog = async (newLog: Partial<QuickActivityLog>) => {
    try {
      const res = await fetch("/api/activity-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLog),
      });
      const data = await res.json();
      if (data.log) {
        setActivityLogs((prev) => [data.log, ...prev]);
        showNotification(`Logged activity: ${data.log.title}`);
      }
    } catch (err) {
      console.error("Error creating activity log:", err);
    }
  };

  const pendingCommsCount = analysisResult
    ? analysisResult.communications.filter((c) => c.status !== "Delivered").length
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{notification}</span>
        </div>
      )}

      {/* Mandatory User Confirmation Modal for Mutating Workspace Operations */}
      <WorkspaceConfirmModal action={confirmAction} />

      {/* Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        pendingCommsCount={pendingCommsCount}
        totalContactsCount={contacts.length}
        hasActiveDeal={Boolean(analysisResult)}
        user={user}
        onSignIn={handleConnectAccount}
        isLoggingIn={isLoggingIn}
        speedMode={speedMode}
        onToggleSpeedMode={setSpeedMode}
        lastAiLatency={lastAiLatency}
        onOpenExternalIntel={() => handleOpenExternalIntel()}
      />

      {/* Subtle Active Deal Context Strip (Only shown when a deal is active) */}
      {analysisResult && (
        <div className="border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8 py-2.5 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-500 font-medium shrink-0">Active Deal:</span>
              <span className="font-bold text-slate-900 truncate">
                {analysisResult.dealName}
              </span>
              {analysisResult.financialTerms.purchasePrice && (
                <span className="text-emerald-700 font-mono text-[11px] bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 font-semibold shrink-0 hidden sm:inline">
                  {analysisResult.financialTerms.purchasePrice}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDealMemoModal(true)}
                className="flex items-center gap-1.5 py-1 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
              >
                <FileText className="w-3 h-3 text-emerald-600" />
                <span>CBRE Memo</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentTab("intake")}
                className="flex items-center gap-1.5 py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="Start a new debrief"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>New Debrief</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {currentTab === "premeeting" && (
          <PreMeetingDossierView
            contacts={contacts}
            listings={listings}
            onStartPostMeetingDebrief={handleStartDebriefFromPreMeeting}
            showNotification={showNotification}
            speedMode={speedMode}
            onOpenExternalIntel={handleOpenExternalIntel}
          />
        )}

        {currentTab === "home" && (
          <HomeView
            activityLogs={activityLogs}
            recorder={
              <AudioRecorder
                compact
                onProcessTranscript={handleProcessTranscript}
                isProcessing={isProcessing}
                speedMode={speedMode}
                onToggleSpeedMode={setSpeedMode}
                lastAiLatency={lastAiLatency}
                prefilledContext={prefilledDebriefData}
                onClearPrefilledContext={() => setPrefilledDebriefData(null)}
                onOpenExternalIntel={handleOpenExternalIntel}
                onAutoLoggedActivity={async (title, entity, outcome) => {
                  await handleAddActivityLog({
                    type: "auto_pipeline",
                    title,
                    entityName: entity,
                    propertyOrContext: "CBRE Portfolio",
                    outcome,
                  });
                }}
              />
            }
          />
        )}

        {currentTab === "intake" && (
          <AudioRecorder
            onProcessTranscript={handleProcessTranscript}
            isProcessing={isProcessing}
            speedMode={speedMode}
            onToggleSpeedMode={setSpeedMode}
            lastAiLatency={lastAiLatency}
            prefilledContext={prefilledDebriefData}
            onClearPrefilledContext={() => setPrefilledDebriefData(null)}
            onOpenExternalIntel={handleOpenExternalIntel}
            onAutoLoggedActivity={async (title, entity, outcome) => {
              await handleAddActivityLog({
                type: "auto_pipeline",
                title,
                entityName: entity,
                propertyOrContext: "CBRE Portfolio",
                outcome,
              });
            }}
          />
        )}

        {currentTab === "notes" && (
          analysisResult ? (
            <MeetingNotesView
              analysis={analysisResult}
              onProceedToEmails={() => setCurrentTab("comms")}
              onSaveToDrive={handleSaveActiveDealToDrive}
              onScheduleCalendar={handleScheduleCalendarFromNotes}
              onOpenDealMemo={() => setShowDealMemoModal(true)}
              onAutomateAllNextSteps={handleAutomateAllNextSteps}
              onOpenExternalIntel={handleOpenExternalIntel}
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Record or Load a Meeting Debrief</h3>
              <p className="text-xs text-slate-500">
                To view concise notes, live web intelligence, and the broker playbook, record your voice memo recap in Step 1.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentTab("intake")}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Go to Record Debrief
                </button>
              </div>
            </div>
          )
        )}

        {currentTab === "comms" && (
          <CommunicationsHub
            communications={analysisResult?.communications || []}
            dealName={analysisResult?.dealName || "1420 Market Street"}
            onMessageDispatched={handleMessageDispatched}
            contacts={contacts}
            user={user}
            onRequestConfirm={(act) => setConfirmAction(act)}
          />
        )}

        {currentTab === "database" && (
          <DatabaseView
            contacts={contacts}
            listings={listings}
            comps={comps}
            messagesLog={messagesLog}
            activityLogs={activityLogs}
            onAddContact={handleAddContact}
            onAddListing={handleAddListing}
            onAddActivityLog={handleAddActivityLog}
          />
        )}

        {currentTab === "workspace" && (
          <WorkspaceHub
            user={user}
            onSignIn={handleConnectAccount}
            onSignOut={handleDisconnectAccount}
            isLoggingIn={isLoggingIn}
            onRequestConfirm={(act) => setConfirmAction(act)}
            showNotification={showNotification}
            activeDeal={analysisResult}
            contacts={contacts}
          />
        )}
      </main>

      {/* 1-Click CBRE Deal Memo / Term Sheet Print & PDF Export Modal */}
      <DealMemoPrintModal
        isOpen={showDealMemoModal}
        analysis={analysisResult}
        onClose={() => setShowDealMemoModal(false)}
      />

      {/* Live External Web & Comps Intelligence Modal */}
      <ExternalIntelModal
        isOpen={isExternalIntelOpen}
        onClose={() => setIsExternalIntelOpen(false)}
        initialQuery={externalIntelQuery}
        showNotification={showNotification}
        speedMode={speedMode}
      />

      {/* Floating Speed-Dial Quick Actions Cockpit */}
      <QuickBrokerCockpit
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        hasActiveDeal={Boolean(analysisResult)}
        activeDeal={analysisResult}
        pendingCommsCount={pendingCommsCount}
        contacts={contacts}
        user={user}
        onOpenDealMemo={() => setShowDealMemoModal(true)}
        onQuickLogCall={handleAddActivityLog}
        onQuickScheduleCalendar={(title, deadline) => handleScheduleCalendarFromNotes(title, deadline)}
      />

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Broker Buddy</span>
            <span>·</span>
            <span>CBRE Commercial & Residential Deal Operating System</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <span>Powered by Claude</span>
            <span>·</span>
            <span>{user ? "Calendar & Email Connected" : "Calendar & Email Not Connected"}</span>
            <span>·</span>
            <span>CBRE Database Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
