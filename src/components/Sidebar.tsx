"use client";

import React from "react";
import { 
  Sparkles, 
  Trash2, 
  Image as ImageIcon, 
  Layers, 
  Maximize2, 
  History, 
  FolderSync, 
  Sliders, 
  Compass
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

export default function Sidebar({
  mode,
  setMode,
  activeTab,
  setActiveTab,
  history,
  onSelectHistoryImage,
  onDeleteHistoryImage
}: SidebarProps) {
  const tabs = [
    { id: "generator", label: "AI Generator", icon: Sparkles },
    { id: "bg-remover", label: "BG Remover", icon: Layers },
    { id: "compressor", label: "Compressor", icon: Maximize2 },
    { id: "compare", label: "Compare Mode", icon: Sliders },
    { id: "canvas", label: "Canvas Studio", icon: Compass },
  ];

  return (
    <aside className="w-80 flex flex-col h-full bg-[#0a0c16]/60 border-r border-[#ffffff]/8 backdrop-blur-xl shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#ffffff]/8 flex flex-col gap-1">
        <h2 className="font-display font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-accent-main bg-clip-text text-transparent">
          AIGen Render
        </h2>
        <p className="text-[10px] text-accent-main tracking-[3px] uppercase font-bold">
          {mode === "merch" ? "Merch Creative Studio" : "Game Asset Creator"}
        </p>
      </div>

      {/* App Selector Mode */}
      <div className="p-4 border-b border-[#ffffff]/8 flex gap-2">
        <button
          onClick={() => setMode("merch")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold tracking-wide border transition-all ${
            mode === "merch"
              ? "bg-accent-dim text-accent-main border-accent-main/30 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
              : "bg-transparent text-[#94a3b8] border-[#ffffff]/8 hover:border-[#ffffff]/18 hover:text-white"
          }`}
        >
          Merch Mode
        </button>
        <button
          onClick={() => setMode("asset")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold tracking-wide border transition-all ${
            mode === "asset"
              ? "bg-accent-dim text-accent-main border-accent-main/30 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
              : "bg-transparent text-[#94a3b8] border-[#ffffff]/8 hover:border-[#ffffff]/18 hover:text-white"
          }`}
        >
          Asset Mode
        </button>
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
        <div className="p-4 border-b border-[#ffffff]/8 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#64748b] tracking-wider uppercase flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> History List
          </span>
          <span className="text-[10px] bg-white/5 text-[#94a3b8] px-2 py-0.5 rounded-full border border-white/5">
            {history.length} items
          </span>
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

      {/* Cloud Sync Lead Gen Panel */}
      <div className="p-4 border-t border-[#ffffff]/8 bg-white/2">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start gap-3">
            <FolderSync className="w-5 h-5 text-accent-main shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-white">Cloud Sync Status</h4>
              <p className="text-[10px] text-[#94a3b8] leading-relaxed mt-0.5">
                Your history is currently saved locally. Sign in to cloud sync across devices.
              </p>
            </div>
          </div>
          <button 
            onClick={() => alert("SaaS Cloud Authentication is a premium feature. Stripe billing integration is coming soon!")}
            className="w-full py-2 px-3 bg-accent-dim hover:bg-accent-main hover:text-bg-deep border border-accent-main/20 hover:border-transparent text-accent-main text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
          >
            Sign In to Sync
          </button>
        </div>
      </div>
    </aside>
  );
}
