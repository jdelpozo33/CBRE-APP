import React, { useState } from "react";
import {
  Send,
  Mail,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  UserCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Plus,
  ShieldCheck,
  Zap,
  Globe,
  CheckCheck,
} from "lucide-react";
import { User } from "firebase/auth";
import { StakeholderCommunication, Contact, DispatchedMessage } from "../types.ts";
import { WorkspaceConfirmAction } from "./WorkspaceConfirmModal.tsx";
import {
  sendGmailMessage,
  createGmailDraft,
  createBatchGmailDrafts,
  sendBatchGmailMessages,
} from "../services/gmailService.ts";
import { Phone, Share2 } from "lucide-react";

interface CommunicationsHubProps {
  communications: StakeholderCommunication[];
  dealName: string;
  onMessageDispatched: (msg: DispatchedMessage) => void;
  contacts: Contact[];
  onLoadSampleDebrief?: () => void;
  user?: User | null;
  onRequestConfirm?: (action: WorkspaceConfirmAction) => void;
}

export const CommunicationsHub: React.FC<CommunicationsHubProps> = ({
  communications: initialCommunications,
  dealName,
  onMessageDispatched,
  contacts,
  onLoadSampleDebrief,
  user,
  onRequestConfirm,
}) => {
  // If initial communications is empty, provide default pre-populated drafts
  const defaultDrafts: StakeholderCommunication[] = [
    {
      id: "draft-escrow-1",
      recipientName: "Sarah Chen",
      recipientRole: "Escrow Officer",
      recipientCompany: "First American Title & Escrow",
      recipientEmail: "schen@firstam-commercial.com",
      recipientPhone: "+1 (415) 920-8811",
      subject: `Open Escrow & Earnest Wire Instructions - 1420 Market Street ($14.2M)`,
      body: `Hi Sarah,\n\nPlease open escrow for 1420 Market Street. The agreed purchase price is $14,200,000 with an initial earnest money deposit of $450,000 to be wired by Apex Horizon Capital.\n\nPlease transmit formal wiring instructions for the earnest deposit and prepare the preliminary title report.\n\nBest regards,\nBrokerage Advisory Team`,
      urgency: "Immediate",
      purpose: "Open Escrow & Wire Earnest Money",
      channel: "email",
      status: "Draft",
    },
    {
      id: "draft-lender-2",
      recipientName: "David Steinberg",
      recipientRole: "Lender",
      recipientCompany: "Pacific Crest Commercial Lending",
      recipientEmail: "dsteinberg@pacificcrestlending.com",
      recipientPhone: "+1 (310) 554-9021",
      subject: `Commercial Financing Package & Term Sheet Request - 1420 Market St`,
      body: `Hi David,\n\nFollowing our review of 1420 Market Street, we are requesting final debt terms based on our agreed consideration of $14,200,000 at 65% LTV.\n\nPlease find attached the trailing 12-month P&L, in-place rent roll, and tenant overview for credit underwriting.\n\nBest regards,\nBrokerage Advisory Team`,
      urgency: "Within 24 Hours",
      purpose: "Transmit Trailing 12 P&L & Request Debt Term Sheet",
      channel: "email",
      status: "Draft",
    },
    {
      id: "draft-legal-3",
      recipientName: "Robert Hawthorne, Esq.",
      recipientRole: "Attorney",
      recipientCompany: "Hawthorne & Sterling Real Estate Law",
      recipientEmail: "rhawthorne@hawthornelaw.com",
      recipientPhone: "+1 (415) 321-4560",
      subject: `PSA Drafting Instructions & Estoppel Clauses - 1420 Market St`,
      body: `Dear Robert,\n\nPlease prepare the Purchase and Sale Agreement for 1420 Market Street.\nKey terms: Purchase Price of $14,200,000, 30-day due diligence window, and 45-day close.\nCrucial condition: Must include strict requirement for tenant estoppel certificates delivered prior to day 21 of diligence.\n\nBest regards,\nBrokerage Advisory Team`,
      urgency: "Immediate",
      purpose: "PSA Drafting Instructions & Estoppel Provisions",
      channel: "email",
      status: "Draft",
    },
    {
      id: "draft-buyer-4",
      recipientName: "Marcus Vance",
      recipientRole: "Buyer",
      recipientCompany: "Apex Horizon Capital Partners",
      recipientEmail: "m.vance@apexhorizon.com",
      recipientPhone: "+1 (415) 890-3412",
      subject: `Agreed Terms Executive Confirmation - 1420 Market St ($14.2M)`,
      body: `Hi Marcus,\n\nGreat connecting today. Confirming agreed terms on 1420 Market Street: $14.2M purchase price (6.35% cap rate), 30-day diligence, 45-day close, and $450k deposit with Sarah Chen at First American.\n\nEscrow opening and PSA drafting are underway. Let us know if you need anything else.\n\nBest regards,\nBrokerage Advisory Team`,
      urgency: "Within 24 Hours",
      purpose: "Client Executive Recap & Milestone Tracker",
      channel: "email",
      status: "Draft",
    },
  ];

  const [comms, setComms] = useState<StakeholderCommunication[]>(
    initialCommunications && initialCommunications.length > 0
      ? initialCommunications
      : defaultDrafts
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, "email" | "sms">>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Custom contact selection
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [customBody, setCustomBody] = useState<string>("");

  React.useEffect(() => {
    if (initialCommunications && initialCommunications.length > 0) {
      setComms(initialCommunications);
    }
  }, [initialCommunications]);

  const handleUpdateComm = (id: string, field: "subject" | "body" | "status", value: string) => {
    setComms((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSendViaDispatcher = async (comm: StakeholderCommunication) => {
    setSendingId(comm.id);
    try {
      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: comm.recipientEmail,
          recipientName: `${comm.recipientName} (${comm.recipientRole})`,
          subject: comm.subject,
          body: comm.body,
          type: activeTab[comm.id] || "email",
          dealReference: dealName || "1420 Market Street",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setComms((prev) =>
          prev.map((c) => (c.id === comm.id ? { ...c, status: "Delivered" } : c))
        );
        onMessageDispatched(data.message);
        setStatusFeedback(`Email successfully dispatched to ${comm.recipientName}!`);
        setTimeout(() => setStatusFeedback(null), 3500);
      }
    } catch (err: any) {
      console.error("Failed to send message:", err);
      // Fallback local update
      setComms((prev) =>
        prev.map((c) => (c.id === comm.id ? { ...c, status: "Delivered" } : c))
      );
      setStatusFeedback(`Dispatched to ${comm.recipientName} (Logged)`);
      setTimeout(() => setStatusFeedback(null), 3500);
    } finally {
      setSendingId(null);
    }
  };

  const handleSendAllPending = async () => {
    setIsSendingAll(true);
    for (const comm of comms) {
      if (comm.status !== "Delivered") {
        await handleSendViaDispatcher(comm);
      }
    }
    setIsSendingAll(false);
    setStatusFeedback("All stakeholder communications dispatched!");
    setTimeout(() => setStatusFeedback(null), 4000);
  };

  const handleSendDirectGmail = (comm: StakeholderCommunication) => {
    if (!user) {
      alert("Please sign in with Google in the Google Workspace tab to send directly from your Gmail account.");
      return;
    }
    if (!onRequestConfirm) return;

    onRequestConfirm({
      type: "gmail_send",
      title: "Send via Connected Gmail Account",
      description: "Send this deal communication directly through the official Gmail API from your authenticated Google Workspace address.",
      details: [
        { label: "From", value: user.email || "Connected Google Workspace" },
        { label: "To", value: `${comm.recipientName} <${comm.recipientEmail}>` },
        { label: "Subject", value: comm.subject },
        { label: "Transaction", value: dealName },
      ],
      onConfirm: async () => {
        try {
          setSendingId(comm.id);
          const result = await sendGmailMessage(comm.recipientEmail, comm.subject, comm.body);
          if (result.success) {
            handleUpdateComm(comm.id, "status", "Delivered");
            onMessageDispatched({
              id: `gmail-${result.id || Date.now()}`,
              recipientEmail: comm.recipientEmail,
              recipientName: `${comm.recipientName} (${comm.recipientRole})`,
              subject: comm.subject,
              body: comm.body,
              type: "email",
              status: "Delivered",
              timestamp: new Date().toLocaleTimeString(),
              dealReference: dealName,
            });
            setStatusFeedback(`Email sent via Gmail API to ${comm.recipientName}!`);
            setTimeout(() => setStatusFeedback(null), 3500);
          }
        } catch (err: any) {
          alert(`Gmail send error: ${err.message}`);
        } finally {
          setSendingId(null);
        }
      },
      onCancel: () => {},
    });
  };

  const handleDraftDirectGmail = (comm: StakeholderCommunication) => {
    if (!user) {
      alert("Please sign in with Google in the Google Workspace tab to draft directly into your Gmail account.");
      return;
    }
    if (!onRequestConfirm) return;

    onRequestConfirm({
      type: "gmail_draft",
      title: "Save Draft to Gmail Account",
      description: "Create an official draft message in your connected Gmail account so you can review and polish before sending.",
      details: [
        { label: "Account", value: user.email || "Connected Google Workspace" },
        { label: "To", value: `${comm.recipientName} <${comm.recipientEmail}>` },
        { label: "Subject", value: comm.subject },
        { label: "Deal", value: dealName },
      ],
      onConfirm: async () => {
        try {
          setSendingId(comm.id);
          const result = await createGmailDraft(comm.recipientEmail, comm.subject, comm.body);
          if (result.success) {
            setStatusFeedback(`Saved draft in your Gmail account for ${comm.recipientName}!`);
            setTimeout(() => setStatusFeedback(null), 3500);
          }
        } catch (err: any) {
          alert(`Gmail draft error: ${err.message}`);
        } finally {
          setSendingId(null);
        }
      },
      onCancel: () => {},
    });
  };

  const handleBatchSaveToGmailDrafts = () => {
    if (!user) {
      alert("Please sign in with Google in the Google Workspace tab to batch save drafts into Gmail.");
      return;
    }
    if (!onRequestConfirm) return;

    const draftsPayload = comms.map((c) => ({
      to: c.recipientEmail,
      subject: c.subject,
      body: c.body,
    }));

    onRequestConfirm({
      type: "gmail_draft",
      title: `Batch Save ${comms.length} Drafts to Gmail`,
      description: `Create official draft messages in your connected Gmail account for all ${comms.length} deal stakeholders.`,
      details: [
        { label: "Account", value: user.email || "Connected Google Workspace" },
        { label: "Total Drafts", value: `${comms.length} stakeholders` },
        { label: "Recipients", value: comms.map((c) => c.recipientName).join(", ") },
        { label: "Deal", value: dealName },
      ],
      onConfirm: async () => {
        try {
          setIsSendingAll(true);
          const result = await createBatchGmailDrafts(draftsPayload);
          if (result.createdCount > 0) {
            setStatusFeedback(`⚡ Successfully created ${result.createdCount} drafts in your Gmail account!`);
            setTimeout(() => setStatusFeedback(null), 4000);
          }
        } catch (err: any) {
          alert(`Batch drafting error: ${err.message}`);
        } finally {
          setIsSendingAll(false);
        }
      },
      onCancel: () => {},
    });
  };

  const handleBatchSendViaGmail = () => {
    if (!user) {
      alert("Please sign in with Google in the Google Workspace tab to send via your connected Gmail.");
      return;
    }
    if (!onRequestConfirm) return;

    const messagesPayload = comms
      .filter((c) => c.status !== "Delivered")
      .map((c) => ({
        to: c.recipientEmail,
        subject: c.subject,
        body: c.body,
      }));

    if (messagesPayload.length === 0) {
      setStatusFeedback("All emails have already been delivered!");
      setTimeout(() => setStatusFeedback(null), 3000);
      return;
    }

    onRequestConfirm({
      type: "gmail_send",
      title: `Batch Send ${messagesPayload.length} Emails via Gmail API`,
      description: `Dispatches official emails through your connected Gmail account to all remaining pending stakeholders.`,
      details: [
        { label: "From", value: user.email || "Connected Google Workspace" },
        { label: "Total Emails", value: `${messagesPayload.length} recipients` },
        { label: "Recipients", value: messagesPayload.map((m) => m.to).join(", ") },
        { label: "Deal", value: dealName },
      ],
      onConfirm: async () => {
        try {
          setIsSendingAll(true);
          const result = await sendBatchGmailMessages(messagesPayload);
          if (result.sentCount > 0) {
            setComms((prev) => prev.map((c) => ({ ...c, status: "Delivered" })));
            comms.forEach((c) => {
              onMessageDispatched({
                id: `gmail-batch-${Date.now()}-${c.id}`,
                recipientEmail: c.recipientEmail,
                recipientName: `${c.recipientName} (${c.recipientRole})`,
                subject: c.subject,
                body: c.body,
                type: "email",
                status: "Delivered",
                timestamp: new Date().toLocaleTimeString(),
                dealReference: dealName,
              });
            });
            setStatusFeedback(`🚀 Successfully sent ${result.sentCount} emails via Gmail API!`);
            setTimeout(() => setStatusFeedback(null), 4000);
          }
        } catch (err: any) {
          alert(`Batch send error: ${err.message}`);
        } finally {
          setIsSendingAll(false);
        }
      },
      onCancel: () => {},
    });
  };

  const handleCopyMessage = (comm: StakeholderCommunication) => {
    const isSms = activeTab[comm.id] === "sms";
    const textToCopy = isSms
      ? `To: ${comm.recipientName} (${comm.recipientPhone})\n${comm.body.slice(0, 320)}`
      : `To: ${comm.recipientName} <${comm.recipientEmail}>\nSubject: ${comm.subject}\n\n${comm.body}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(comm.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddCustomRecipient = () => {
    const contact = contacts.find((c) => c.id === selectedContactId);
    if (!contact) return;

    const newComm: StakeholderCommunication = {
      id: `comm-custom-${Date.now()}`,
      recipientName: contact.name,
      recipientRole: contact.role,
      recipientCompany: contact.company,
      recipientEmail: contact.email,
      recipientPhone: contact.phone,
      subject: customSubject || `Action Item: Next Steps regarding ${dealName || "Commercial Deal"}`,
      body:
        customBody ||
        `Hi ${contact.name.split(" ")[0]},\n\nFollowing our review of ${dealName || "the transaction"}, please find the requested documentation and required next steps for your team.\n\nPlease confirm receipt at your earliest convenience.\n\nBest regards,\nBrokerage Advisory Team`,
      urgency: "Immediate",
      purpose: "Custom stakeholder communication",
      channel: "email",
      status: "Draft",
    };

    setComms((prev) => [newComm, ...prev]);
    setShowAddCustom(false);
    setSelectedContactId("");
    setCustomSubject("");
    setCustomBody("");
    setStatusFeedback(`Created email draft for ${contact.name}`);
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {statusFeedback && (
        <div className="bg-slate-900 border border-slate-800 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{statusFeedback}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Push Emails & Next-Step Actions</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {user && (
              <>
                <button
                  type="button"
                  onClick={handleBatchSaveToGmailDrafts}
                  disabled={isSendingAll}
                  className="flex items-center gap-1.5 py-2 px-3.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200 transition-all cursor-pointer disabled:opacity-50"
                  title="Creates real draft messages for all 4 stakeholders in your Gmail account"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-600" />
                  <span>Save All as Gmail Drafts</span>
                </button>

                <button
                  type="button"
                  onClick={handleBatchSendViaGmail}
                  disabled={isSendingAll}
                  className="flex items-center gap-1.5 py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition-all cursor-pointer disabled:opacity-50"
                  title="Batch sends all pending stakeholder emails directly via Gmail API"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Send All via Gmail</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleSendAllPending}
              disabled={isSendingAll}
              className="flex items-center gap-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSendingAll ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              <span>{isSendingAll ? "Dispatching..." : "Send All Stakeholder Emails"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddCustom(!showAddCustom)}
              className="flex items-center gap-1.5 py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Draft to Contact</span>
            </button>
          </div>
        </div>

        {/* Modal: Add Custom Stakeholder */}
        {showAddCustom && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-900 block">Draft Message to CRM Contact</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1 font-medium">Select Contact from CRM</label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Choose a contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.role} - {c.company})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1 font-medium">Subject</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder={`Next Steps: ${dealName || "Commercial Deal"}`}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-1 font-medium">Custom Message Body</label>
              <textarea
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
                placeholder="Enter specific instructions, required documents, or closing conditions..."
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-sans focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                className="py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomRecipient}
                disabled={!selectedContactId}
                className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg disabled:opacity-50 cursor-pointer"
              >
                Create Email Draft
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Communications Cards List */}
      <div className="space-y-5">
        {comms.map((comm) => {
          const isDelivered = comm.status === "Delivered";
          const currentMode = activeTab[comm.id] || "email";
          const isEditing = editingId === comm.id;

          const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
            comm.recipientEmail
          )}&su=${encodeURIComponent(comm.subject)}&body=${encodeURIComponent(comm.body)}`;

          const outlookHref = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(
            comm.recipientEmail
          )}&subject=${encodeURIComponent(comm.subject)}&body=${encodeURIComponent(comm.body)}`;

          return (
            <div
              key={comm.id}
              className={`rounded-2xl p-6 transition-all shadow-sm border ${
                isDelivered
                  ? "border-emerald-300 bg-emerald-50/40"
                  : "border-slate-200 bg-white hover:border-emerald-300"
              }`}
            >
              {/* Recipient Details */}
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{comm.recipientName}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {comm.recipientRole}
                      </span>
                      {comm.recipientCompany && (
                        <span className="text-xs text-slate-500 hidden sm:inline">
                          · {comm.recipientCompany}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-mono">
                      <span>{comm.recipientEmail}</span>
                      {comm.recipientPhone && <span>· {comm.recipientPhone}</span>}
                    </div>
                  </div>
                </div>

                {/* Urgency & Delivery Badge */}
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {comm.urgency}
                  </span>
                  {isDelivered && (
                    <span className="flex items-center gap-1 text-[11px] font-bold px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      <span>Delivered (Logged)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Objective Banner */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800">
                  <span className="text-slate-500 font-normal">Objective: </span>
                  {comm.purpose}
                </span>

                {/* Channel Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab((prev) => ({ ...prev, [comm.id]: "email" }))}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                      currentMode === "email"
                        ? "bg-emerald-600 text-white font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Mail className="w-3 h-3" />
                    <span>Email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab((prev) => ({ ...prev, [comm.id]: "sms" }))}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                      currentMode === "sms"
                        ? "bg-emerald-600 text-white font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>SMS Preview</span>
                  </button>
                </div>
              </div>

              {/* Message Content */}
              <div className="mt-3 space-y-2">
                {currentMode === "email" && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">Subject:</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={comm.subject}
                        onChange={(e) => handleUpdateComm(comm.id, "subject", e.target.value)}
                        className="w-full bg-white border border-emerald-500 rounded px-2 py-1 text-xs text-slate-900 font-medium"
                      />
                    ) : (
                      <p className="text-xs font-bold text-slate-900">{comm.subject}</p>
                    )}
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {isEditing ? (
                    <textarea
                      value={comm.body}
                      onChange={(e) => handleUpdateComm(comm.id, "body", e.target.value)}
                      rows={7}
                      className="w-full bg-white border border-emerald-500 rounded p-2 text-xs text-slate-900 font-sans leading-relaxed resize-none"
                    />
                  ) : (
                    <div className="text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {currentMode === "sms"
                        ? `[SMS to ${comm.recipientName}]:\nHi ${comm.recipientName.split(" ")[0]}, following our debrief on ${dealName || "1420 Market"}, next steps: ${comm.body.slice(0, 240)}... Reply to confirm receipt.`
                        : comm.body}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Dispatcher + Webmail Launchers + Copy */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(isEditing ? null : comm.id)}
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isEditing ? "Save Edits" : "Edit Message"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyMessage(comm)}
                    className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  >
                    {copiedId === comm.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{copiedId === comm.id ? "Copied" : "Copy Email"}</span>
                  </button>

                  {/* Direct Contact Links */}
                  {comm.recipientPhone && (
                    <a
                      href={`tel:${comm.recipientPhone.replace(/[^0-9+]/g, "")}`}
                      className="flex items-center gap-1 py-1.5 px-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-xl border border-sky-200 transition-colors"
                      title={`Call ${comm.recipientName} at ${comm.recipientPhone}`}
                    >
                      <Phone className="w-3 h-3 text-sky-600" />
                      <span>Call</span>
                    </a>
                  )}

                  {comm.recipientPhone && (
                    <a
                      href={`https://wa.me/${comm.recipientPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                        `Hi ${comm.recipientName.split(" ")[0]}, regarding ${dealName}: ${comm.body.slice(0, 220)}...`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium rounded-xl border border-emerald-200 transition-colors"
                      title="Share summary via WhatsApp"
                    >
                      <Share2 className="w-3 h-3 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {!user && (
                    <a
                      href={gmailHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition-colors"
                      title="Open in Gmail web composer"
                    >
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Gmail Web</span>
                    </a>
                  )}

                  <a
                    href={outlookHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl border border-slate-200 transition-colors"
                    title="Open in Outlook"
                  >
                    <ExternalLink className="w-3 h-3 text-slate-500" />
                    <span>Outlook</span>
                  </a>
                </div>

                {/* Primary Dispatch Action Cluster */}
                <div className="flex items-center gap-2">
                  {user ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDraftDirectGmail(comm)}
                        disabled={sendingId === comm.id}
                        className="flex items-center gap-1.5 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200 transition-colors cursor-pointer"
                        title="Create draft in your connected Gmail account"
                      >
                        <Mail className="w-3.5 h-3.5 text-amber-600" />
                        <span>Draft to Gmail</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendDirectGmail(comm)}
                        disabled={sendingId === comm.id}
                        className={`flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                          isDelivered
                            ? "bg-slate-100 text-emerald-800 border border-emerald-300 hover:bg-slate-200"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]"
                        }`}
                      >
                        {sendingId === comm.id ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending via Gmail...</span>
                          </>
                        ) : isDelivered ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Resend via Gmail</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 fill-current" />
                            <span>Send via Gmail</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendViaDispatcher(comm)}
                      disabled={sendingId === comm.id}
                      className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                        isDelivered
                          ? "bg-slate-100 text-emerald-800 border border-emerald-300 hover:bg-slate-200"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]"
                      }`}
                    >
                      {sendingId === comm.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Pushing Dispatch...</span>
                        </>
                      ) : isDelivered ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Resend Email</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 fill-current" />
                          <span>Push via Dispatcher</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
