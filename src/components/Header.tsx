import React from "react";
import type { ProviderAccount } from "../providers/index.ts";
import type { AppTab } from "../types.ts";
import {
  Building2,
  Mic,
  Send,
  Database,
  Layers,
  Mail,
  Calendar,
  HardDrive,
  Zap,
  Compass,
  Globe,
  Home,
} from "lucide-react";

interface HeaderProps {
  currentTab: AppTab;
  setCurrentTab: (tab: AppTab) => void;
  pendingCommsCount: number;
  totalContactsCount: number;
  hasActiveDeal: boolean;
  user?: ProviderAccount | null;
  onSignIn?: () => void;
  isLoggingIn?: boolean;
  speedMode?: "turbo" | "balanced";
  onToggleSpeedMode?: (mode: "turbo" | "balanced") => void;
  lastAiLatency?: { ms: number; model: string; cached: boolean } | null;
  onOpenExternalIntel?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  pendingCommsCount,
  totalContactsCount,
  hasActiveDeal,
  user,
  onSignIn,
  isLoggingIn,
  speedMode = "turbo",
  onToggleSpeedMode,
  lastAiLatency,
  onOpenExternalIntel,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo / Brand - Broker Buddy */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-700/20">
              <Building2 className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Broker Buddy</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider hidden xs:inline">
                CBRE
              </span>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
            <button
              type="button"
              onClick={() => setCurrentTab("home")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === "home"
                  ? "bg-emerald-600 text-white shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab("premeeting")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === "premeeting"
                  ? "bg-emerald-600 text-white shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Pre-Meeting Dossier</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab(hasActiveDeal ? "notes" : "intake")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === "intake" || currentTab === "notes"
                  ? "bg-emerald-600 text-white shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{hasActiveDeal ? "Deal Notes" : "Debrief"}</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab("comms")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === "comms"
                  ? "bg-emerald-600 text-white shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>2. Push Emails</span>
              {pendingCommsCount > 0 && (
                <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  currentTab === "comms" ? "bg-white text-emerald-700" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {pendingCommsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab("database")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === "database"
                  ? "bg-emerald-600 text-white shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>3. CRM ({totalContactsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab("workspace")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                currentTab === "workspace"
                  ? "bg-emerald-600 text-white shadow-sm font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <div className="flex items-center -space-x-1">
                <Mail className="w-3 h-3 text-emerald-500" />
                <Calendar className="w-3 h-3 text-sky-500" />
                <HardDrive className="w-3 h-3 text-amber-500" />
              </div>
              <span className="hidden sm:inline">Connections</span>
              <span className="sm:hidden">Connect</span>
              {user && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          </nav>

          {/* Right Section: Speed Engine & Workspace Auth */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenExternalIntel && (
              <button
                type="button"
                onClick={onOpenExternalIntel}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-800 transition-colors cursor-pointer"
                title="Search live web comps & public property records"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Web Intel</span>
              </button>
            )}

            {/* Speed & Anti-Saturation Engine Toggle */}
            {onToggleSpeedMode && (
              <button
                type="button"
                onClick={() => onToggleSpeedMode(speedMode === "turbo" ? "balanced" : "turbo")}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 transition-colors cursor-pointer"
                title="Toggle Claude Engine: Turbo (low effort, fastest) vs Balanced (medium effort, deeper analysis)"
              >
                <Zap className={`w-3.5 h-3.5 ${speedMode === "turbo" ? "text-amber-500 fill-amber-500" : "text-emerald-600"}`} />
                <span>{speedMode === "turbo" ? "Turbo Engine" : "Balanced Engine"}</span>
                {lastAiLatency && (
                  <span className="text-[10px] text-emerald-700 font-mono pl-1 border-l border-emerald-200 font-bold">
                    {lastAiLatency.cached ? "0s" : `${(lastAiLatency.ms / 1000).toFixed(1)}s`}
                  </span>
                )}
              </button>
            )}

            {user ? (
              <button
                type="button"
                onClick={() => setCurrentTab("workspace")}
                className="hidden lg:flex items-center gap-2 p-1.5 pl-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors cursor-pointer"
              >
                <div className="text-right">
                  <div className="text-[11px] font-bold text-slate-800 truncate max-w-[120px]">
                    {user.name || "Connected"}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold">Active</div>
                </div>
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt="User"
                    className="w-7 h-7 rounded-lg border border-emerald-300"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    {(user.name || user.email || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            ) : onSignIn ? (
              <button
                type="button"
                onClick={onSignIn}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{isLoggingIn ? "Connecting..." : "Connect calendar & email"}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
