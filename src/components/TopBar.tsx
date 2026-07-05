"use client";

import React from "react";
import { Coins, ArrowUpRight, Wifi, WifiOff } from "lucide-react";

interface TopBarProps {
  activeTab: string;
  isBackendOnline: boolean;
  isSignedIn?: boolean;
  cloudCredits?: number;
  creditsUsed?: number;
  creditsMax?: number;
  onUpgradeClick?: () => void;
}

const TAB_TITLES: Record<string, string> = {
  generator: "AI Image Generator",
  "audio-studio": "Audio Studio",
  "bg-remover": "Background Remover",
  compressor: "Smart Upscaler",
  compare: "Compare & Review",
  canvas: "Canvas Studio",
};

export default function TopBar({
  activeTab,
  isBackendOnline,
  isSignedIn,
  cloudCredits,
  creditsUsed = 0,
  creditsMax = 50,
  onUpgradeClick,
}: TopBarProps) {
  const title = TAB_TITLES[activeTab] || "Workspace";
  const credits = isSignedIn ? cloudCredits ?? 0 : creditsMax - creditsUsed;
  const isPro = isSignedIn && cloudCredits !== undefined && cloudCredits > 50;

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-[#08091266] border-b border-white/[0.06] backdrop-blur-xl shrink-0 z-20">
      {/* Left: Title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile logo (shown instead of sidebar on mobile) */}
        <div className="md:hidden flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent-main to-purple flex items-center justify-center shrink-0">
            <span className="text-bg-deep font-black text-xs">G</span>
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <h1 className="font-display font-bold text-sm md:text-base text-white truncate">
            {title}
          </h1>
          <p className="text-[10px] text-[#475569] font-medium tracking-wider uppercase hidden md:block">
            Replicate Cloud • {isBackendOnline ? "Connected" : "Offline"}
          </p>
        </div>
      </div>

      {/* Right: Status + Credits */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Connection Status - desktop only */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-colors ${
            isBackendOnline
              ? "bg-[#10b981]/8 text-[#10b981] border-[#10b981]/20"
              : "bg-[#ef4444]/8 text-[#ef4444] border-[#ef4444]/20"
          }`}
        >
          {isBackendOnline ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </>
          )}
        </div>

        {/* Credits Badge */}
        <button
          onClick={onUpgradeClick}
          className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3.5 py-1.5 bg-gradient-to-r from-[#fbbf24]/10 to-[#f59e0b]/10 text-[#fbbf24] border border-[#fbbf24]/20 rounded-lg cursor-pointer hover:border-[#fbbf24]/40 hover:shadow-[0_0_12px_rgba(251,191,36,0.15)] transition-all group"
        >
          <Coins className="w-3.5 h-3.5 text-[#fbbf24] group-hover:scale-110 transition-transform duration-300" />
          <span className="text-[11px] md:text-xs font-bold font-display tracking-wide">
            {credits}
          </span>
          <span className="text-[8px] md:text-[9px] bg-[#fbbf24] text-[#07080f] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide flex items-center gap-0.5">
            {isPro ? "Pro" : "Free"}
            <ArrowUpRight className="w-2 h-2 md:w-2.5 md:h-2.5" />
          </span>
        </button>
      </div>
    </header>
  );
}
