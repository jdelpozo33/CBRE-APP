import React from "react";
import { AlertTriangle, Mail, Calendar, HardDrive, Check, X } from "lucide-react";

export interface WorkspaceConfirmAction {
  type: "email_send" | "email_draft" | "calendar_event" | "file_upload" | "file_delete";
  title: string;
  description: string;
  details: { label: string; value: string }[];
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  isProcessing?: boolean;
}

interface WorkspaceConfirmModalProps {
  action: WorkspaceConfirmAction | null;
}

export const WorkspaceConfirmModal: React.FC<WorkspaceConfirmModalProps> = ({ action }) => {
  if (!action) return null;

  const getIcon = () => {
    switch (action.type) {
      case "email_send":
      case "email_draft":
        return <Mail className="w-5 h-5 text-emerald-600" />;
      case "calendar_event":
        return <Calendar className="w-5 h-5 text-emerald-600" />;
      case "file_upload":
      case "file_delete":
        return <HardDrive className="w-5 h-5 text-emerald-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
  };

  const getConfirmButtonColor = () => {
    switch (action.type) {
      case "file_delete":
        return "bg-rose-600 hover:bg-rose-700 text-white font-bold";
      case "email_send":
      case "email_draft":
      case "calendar_event":
      case "file_upload":
      default:
        return "bg-emerald-600 hover:bg-emerald-700 text-white font-bold";
    }
  };

  const getConfirmLabel = () => {
    if (action.isProcessing) return "Executing...";
    switch (action.type) {
      case "email_send":
        return "Confirm & Send";
      case "email_draft":
        return "Confirm & Save Draft";
      case "calendar_event":
        return "Confirm & Schedule in Calendar";
      case "file_upload":
        return "Confirm & Save File";
      case "file_delete":
        return "Confirm & Delete";
      default:
        return "Confirm Action";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 text-left">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">{action.title}</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{action.description}</p>
          </div>
          <button
            type="button"
            onClick={action.onCancel}
            disabled={action.isProcessing}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Details Table */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
          {action.details.map((detail, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 border-b border-slate-200/70 last:border-b-0 pb-1.5 last:pb-0">
              <span className="text-slate-500 font-semibold shrink-0 sm:w-28">{detail.label}:</span>
              <span className="text-slate-900 font-medium break-words sm:text-right flex-1">{detail.value}</span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-400">
          This operation will update your connected calendar, email or file account with your explicit authorization.
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={action.onCancel}
            disabled={action.isProcessing}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => action.onConfirm()}
            disabled={action.isProcessing}
            className={`px-5 py-2 text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer ${getConfirmButtonColor()} disabled:opacity-50`}
          >
            <Check className="w-4 h-4" />
            <span>{getConfirmLabel()}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
