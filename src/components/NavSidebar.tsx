"use client";

import React, { useState } from "react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import {
  Sparkles,
  Layers,
  Maximize2,
  Sliders,
  Compass,
  Music,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Zap,
  CreditCard,
} from "lucide-react";
import PricingModal from "./PricingModal";

interface NavSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const NAV_ITEMS = [
  { id: "generator", label: "AI Generator", icon: Sparkles, accent: true },
  { id: "audio-studio", label: "Audio Studio", icon: Music },
  { id: "bg-remover", label: "BG Remover", icon: Layers },
  { id: "compressor", label: "Upscaler", icon: Maximize2 },
  { id: "compare", label: "Compare", icon: Sliders },
  { id: "canvas", label: "Canvas", icon: Compass },
];

export default function NavSidebar({ activeTab, setActiveTab }: NavSidebarProps) {
  const { isSignedIn, user, isLoaded } = useUser();
  const [expanded, setExpanded] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  return (
    <>
      {/* ── Desktop Sidebar ──────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col h-full border-r border-white/[0.06] bg-[#08091299] backdrop-blur-xl shrink-0 transition-all duration-300 ease-in-out z-30 ${
          expanded ? "w-[220px]" : "w-16"
        }`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-white/[0.06] shrink-0 gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-main to-purple flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-bg-deep" />
          </div>
          <div
            className={`flex flex-col transition-all duration-200 overflow-hidden whitespace-nowrap ${
              expanded ? "opacity-100 w-auto" : "opacity-0 w-0"
            }`}
          >
            <span className="font-display font-bold text-sm text-white leading-tight">
              Game Asset
            </span>
            <span className="text-[9px] text-accent-main font-bold tracking-[2px] uppercase">
              Studio
            </span>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-1 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 overflow-hidden whitespace-nowrap group ${
                  isActive
                    ? "bg-accent-dim text-accent-main"
                    : "text-[#64748b] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent-main rounded-r-full" />
                )}
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    isActive ? "text-accent-main" : "group-hover:text-white"
                  }`}
                />
                <span
                  className={`transition-all duration-200 ${
                    expanded ? "opacity-100" : "opacity-0 w-0"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom: Auth & Upgrade */}
        <div className="border-t border-white/[0.06] p-2 flex flex-col gap-2 shrink-0">
          {!isLoaded ? null : !isSignedIn ? (
            <SignInButton mode="modal">
              <button
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-[#64748b] hover:text-accent-main hover:bg-accent-dim transition-all overflow-hidden whitespace-nowrap"
                title="Sign In"
              >
                <CreditCard className="w-[18px] h-[18px] shrink-0" />
                <span
                  className={`transition-all duration-200 ${
                    expanded ? "opacity-100" : "opacity-0 w-0"
                  }`}
                >
                  Sign In
                </span>
              </button>
            </SignInButton>
          ) : (
            <div className="flex items-center gap-3 px-2 py-1.5 overflow-hidden">
              <UserButton
                appearance={{
                  elements: { avatarBox: "w-8 h-8" },
                }}
              />
              <div
                className={`flex flex-col transition-all duration-200 overflow-hidden ${
                  expanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                }`}
              >
                <span className="text-xs font-semibold text-white truncate whitespace-nowrap">
                  {user?.firstName || "Pro"}
                </span>
                <button
                  onClick={() => setShowPricing(true)}
                  className="text-[10px] text-accent-main font-bold hover:underline text-left whitespace-nowrap"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Expand indicator */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="absolute top-1/2 -right-3 w-6 h-6 bg-bg-panel border border-white/10 rounded-full flex items-center justify-center text-[#64748b] hover:text-white hover:border-white/20 transition-all opacity-0 group-hover:opacity-100 z-40 hidden"
        >
          {expanded ? (
            <ChevronLeft className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
      </aside>

      {/* ── Mobile Bottom Tab Bar ────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080910]/95 backdrop-blur-xl border-t border-white/[0.06] flex items-center justify-around px-2 py-1.5 safe-area-bottom">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all ${
                isActive ? "text-accent-main" : "text-[#475569]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-semibold">{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </nav>

      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </>
  );
}
