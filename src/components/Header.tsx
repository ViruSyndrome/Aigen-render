"use client";

import React from "react";
import { Wifi, WifiOff, Coins, ArrowUpRight } from "lucide-react";

interface HeaderProps {
  mode: "merch" | "asset";
  activeTab: string;
  isBackendOnline: boolean;
  backendMode: string;
  creditsUsed: number;
  creditsMax: number;
}

export default function Header({
  mode,
  activeTab,
  isBackendOnline,
  backendMode,
  creditsUsed,
  creditsMax
}: HeaderProps) {
  const getTabTitle = (id: string) => {
    switch (id) {
      case "generator": return "AI Generator Pipeline";
      case "bg-remover": return "AI Background Remover";
      case "compressor": return "Smart Image Compressor";
      case "compare": return "Compare & Review Studio";
      case "canvas": return "Canvas Drawing Studio";
      default: return "Creative Hub";
    }
  };

  return (
    <header className="flex items-center justify-between p-4 bg-[#0a0c16]/30 border-b border-[#ffffff]/8 backdrop-blur-md shrink-0">
      {/* Title & Mode */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-display font-bold text-lg text-white">
            {getTabTitle(activeTab)}
          </h1>
          <p className="text-[10px] text-[#64748b] font-medium uppercase tracking-wider mt-0.5">
            Active Workspace: {mode === "merch" ? "Merch Render" : "Asset Render"} &bull; {backendMode === "local" ? "Local eGPU Connection" : "Pollinations AI Cloud"}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-3">
        {/* Backend Online status badge */}
        <div 
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors ${
            isBackendOnline
              ? "bg-[#10b981]/8 text-[#10b981] border-[#10b981]/25"
              : "bg-[#ef4444]/8 text-[#ef4444] border-[#ef4444]/25"
          }`}
          title={isBackendOnline ? `Backend is connected (${backendMode} mode)` : `Failed to connect to ${backendMode} backend`}
        >
          {isBackendOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              <span>Backend Ready</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Backend Offline</span>
            </>
          )}
        </div>

        {/* Shiny Coins / Credits Badge */}
        <div 
          onClick={() => alert("Upgrade to PRO for unlimited generations, faster speeds, and cloud history syncing!")}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-[#fbbf24]/18 to-[#f59e0b]/18 text-[#fbbf24] border border-[#fbbf24]/30 rounded-lg cursor-pointer hover:border-[#fbbf24]/60 hover:shadow-[0_0_15px_rgba(251,191,36,0.2)] transition-all group"
          title="Upgrade your credits plan"
        >
          <Coins className="w-4 h-4 text-[#fbbf24] group-hover:scale-110 transition-transform duration-300" />
          <span className="text-xs font-bold font-display tracking-wide">
            {creditsMax - creditsUsed} Credits Left
          </span>
          <span className="text-[9px] bg-[#fbbf24] text-[#07080f] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide flex items-center gap-0.5 group-hover:bg-[#fbbf24]/90 transition-colors">
            Free <ArrowUpRight className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    </header>
  );
}
