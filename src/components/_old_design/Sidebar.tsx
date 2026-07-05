"use client";

import React from "react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { 
  Sparkles, 
  Trash2, 
  Image as ImageIcon, 
  Layers, 
  Maximize2, 
  History, 
  FolderSync, 
  Sliders, 
  Compass,
  Music
} from "lucide-react";
import { GalleryImage } from "@/lib/db";

interface SidebarProps {
  mode: "merch" | "asset";
  setMode: (mode: "merch" | "asset") => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  history: GalleryImage[];
  onSelectHistoryImage: (img: GalleryImage) => void;
  onDeleteHistoryImage: (id: string) => void;
}

import PricingModal from "./PricingModal";

export default function Sidebar({
  mode,
  setMode,
  activeTab,
  setActiveTab,
  history,
  onSelectHistoryImage,
  onDeleteHistoryImage
}: SidebarProps) {
  const { isSignedIn, user, isLoaded } = useUser();
  const [showPricing, setShowPricing] = React.useState(false);
  const tabs = [
    { id: "generator", label: "AI Generator", icon: Sparkles },
    { id: "bg-remover", label: "BG Remover", icon: Layers },
    { id: "compressor", label: "Compressor", icon: Maximize2 },
    { id: "compare", label: "Compare Mode", icon: Sliders },
    { id: "canvas", label: "Canvas Studio", icon: Compass },
    { id: "audio-studio", label: "Audio Studio", icon: Music },
  ];

  return (
    <aside className="w-80 flex flex-col h-full bg-[#0a0c16]/60 border-r border-[#ffffff]/8 backdrop-blur-xl shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#ffffff]/8 flex flex-col gap-1">
        <h2 className="font-display font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-accent-main bg-clip-text text-transparent">
          Game Asset Studio
        </h2>
        <p className="text-[10px] text-accent-main tracking-[3px] uppercase font-bold">
          AI Generation Pipeline
        </p>
      </div>

      {/* Navigation Tabs */}
      <nav className="p-4 flex flex-col gap-1.5 border-b border-[#ffffff]/8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-white/5 text-white border border-[#ffffff]/12 shadow-md"
                  : "text-[#94a3b8] hover:text-white hover:bg-white/3 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-accent-main" : ""}`} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-[#ffffff]/8 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748b] tracking-wider uppercase flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Asset Library
            </span>
            <span className="text-[10px] bg-white/5 text-[#94a3b8] px-2 py-0.5 rounded-full border border-white/5">
              {history.length} items
            </span>
          </div>
          <select className="bg-black/40 text-[10px] text-[#94a3b8] rounded border border-white/10 p-1.5 w-full focus:outline-none focus:border-accent-main/50">
            <option value="all">All Projects & Assets</option>
            <option value="sprites">Character Sprites</option>
            <option value="textures">Environment Textures</option>
            <option value="audio">Music & SFX</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-wrap gap-2.5 content-start">
          {history.length === 0 ? (
            <div className="w-full text-center py-8 text-xs text-[#64748b]">
              No generations in local cache.
            </div>
          ) : (
            history.map((img) => (
              <div
                key={img.id}
                className="group relative w-[72px] h-[72px] rounded-lg overflow-hidden border border-[#ffffff]/8 hover:border-accent-main transition-all cursor-pointer bg-black/40"
              >
                <img
                  src={img.url}
                  alt={img.prompt}
                  onClick={() => onSelectHistoryImage(img)}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteHistoryImage(img.id);
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/75 rounded text-[#ef4444] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#ef4444] hover:text-white"
                  title="Delete image"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cloud Sync Lead Gen Panel / Auth */}
      <div className="p-4 border-t border-[#ffffff]/8 bg-white/2">
        <div className="flex flex-col gap-2.5">
          {!isLoaded ? null : !isSignedIn ? (
            <>
              <div className="flex items-start gap-3">
                <FolderSync className="w-5 h-5 text-accent-main shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white">Cloud Sync Status</h4>
                  <p className="text-[10px] text-[#94a3b8] leading-relaxed mt-0.5">
                    Your history is currently saved locally. Sign in to cloud sync across devices.
                  </p>
                </div>
              </div>
              <SignInButton mode="modal">
                <button className="w-full py-2 px-3 bg-accent-dim hover:bg-accent-main hover:text-bg-deep border border-accent-main/20 hover:border-transparent text-accent-main text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5">
                  Sign In to Sync
                </button>
              </SignInButton>
            </>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <UserButton />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Pro Account</span>
                  <span className="text-[10px] text-[#94a3b8]">1,000 Credits</span>
                </div>
              </div>
              <button onClick={() => setShowPricing(true)} className="text-[10px] font-bold bg-accent-main text-bg-deep px-2 py-1 rounded hover:bg-white transition-colors">
                Upgrade
              </button>
            </div>
          )}
        </div>
        <div className="mt-4 text-center">
          <p className="text-[9px] text-[#64748b] leading-tight px-2">
            By using this tool, you agree to our <a href="#" className="underline hover:text-white">Terms of Service</a>. 
            You bear sole responsibility for any IP infringement or copyright violations resulting from generated assets.
          </p>
        </div>
      </div>
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </aside>
  );
}
