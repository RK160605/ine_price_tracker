import React from "react";
import { Plus, RefreshCw, Activity, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { StoreHealth } from "../types";

interface NavbarProps {
  health: StoreHealth | null;
  onOpenSearch: () => void;
  onTriggerCron: () => void;
  isTriggeringCron: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  onOpenSearch,
  onTriggerCron,
  isTriggeringCron
}) => {
  return (
    <header className="sticky top-0 z-30 glass-panel-burgundy border-b border-pink-500/35 bg-[#420a2a]/90 backdrop-blur-2xl shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-600 to-amber-400 flex items-center justify-center shadow-lg shadow-pink-600/40 text-white font-black text-lg transform hover:scale-105 transition-transform">
            INE
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-white drop-shadow-sm">
                PriceTracker
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-pink-900/80 text-pink-200 border border-pink-400/40 shadow-sm">
                Live
              </span>
            </div>
            <p className="text-xs text-pink-200/70">Autonomous Mock Store Price Monitor</p>
          </div>
        </div>

        {/* Center: Target Store Health status */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#520f36] border border-pink-400/30 text-xs shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                health?.status === "HEALTHY" ? "bg-emerald-400" : "bg-amber-400"
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                health?.status === "HEALTHY" ? "bg-emerald-500" : "bg-amber-500"
              }`}></span>
            </span>
            <span className="text-pink-100 font-medium">Mock Store:</span>
            <span className={health?.status === "HEALTHY" ? "text-emerald-300 font-bold" : "text-amber-300 font-bold"}>
              {health ? `${health.status} (${health.latencyMs}ms)` : "Connecting..."}
            </span>
          </div>

          <a
            href="https://demo.inelabteamdev.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-pink-200/80 hover:text-white transition-colors flex items-center space-x-1 font-medium"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Storefront</span>
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onTriggerCron}
            disabled={isTriggeringCron}
            title="Simulate 2-hour scheduled cron run across all products"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#520f36] hover:bg-[#681345] border border-pink-400/40 text-pink-100 hover:text-white text-xs font-semibold transition-all disabled:opacity-50 active:scale-95 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringCron ? "animate-spin text-pink-400" : ""}`} />
            <span className="hidden sm:inline">Trigger 2h Cron</span>
          </button>

          <button
            onClick={onOpenSearch}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 via-fuchsia-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-pink-600/30 hover:shadow-pink-600/50 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Track Product</span>
          </button>
        </div>
      </div>
    </header>
  );
};
