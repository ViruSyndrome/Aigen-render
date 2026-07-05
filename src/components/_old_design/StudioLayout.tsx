"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import GeneratorView from "./GeneratorView";
import BgRemoverView from "./BgRemoverView";
import CompressorView from "./CompressorView";
import CompareView from "./CompareView";
import CanvasView from "./CanvasView";
import AudioStudioView from "./AudioStudioView";
import { 
  getAllImagesFromDB, 
  deleteImageFromDB, 
  saveImageToDB, 
  getUserState, 
  saveUserState, 
  GalleryImage,
  UserQuota 
} from "@/lib/db";
import { checkServerStatus } from "@/lib/api";
import { 
  X, 
  Copy, 
  Download, 
  Sliders, 
  Check, 
  Calendar, 
  Tag 
} from "lucide-react";

interface StudioLayoutProps {
  initialMode: "merch" | "asset";
}

  import { useUser } from "@clerk/nextjs";

export default function StudioLayout({ initialMode }: StudioLayoutProps) {
  const { isSignedIn, user } = useUser();
  const [mode, setMode] = useState<"merch" | "asset">(initialMode);
  const [activeTab, setActiveTab] = useState<string>("generator");
  const [history, setHistory] = useState<GalleryImage[]>([]);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [backendMode, setBackendMode] = useState<string>("local");
  const [quotaState, setQuotaState] = useState<UserQuota>({
    id: "quota",
    date: new Date().toDateString(),
    generationsToday: 0
  });
  const [cloudCredits, setCloudCredits] = useState<number>(5);
  
  // Prefill parameter state for GeneratorView
  const [generatorPrefill, setGeneratorPrefill] = useState<GalleryImage | null>(null);

  // Modal details view
  const [selectedModalImage, setSelectedModalImage] = useState<GalleryImage | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [spriteFrames, setSpriteFrames] = useState<GalleryImage[]>([]);

  // Constants
  const CREDITS_MAX = 50;

  // Load IndexedDB states on mount
  useEffect(() => {
    const loadDBData = async () => {
      try {
        const imgs = await getAllImagesFromDB(user?.id);
        setHistory(imgs);
        
        if (isSignedIn) {
          // Fetch real cloud credits
          const res = await fetch("/api/user/credits");
          if (res.ok) {
            const data = await res.json();
            setCloudCredits(data.credits || 0);
          }
        } else {
          const quota = await getUserState();
          setQuotaState(quota);
        }
      } catch (e) {
        console.error("Failed to load DB data:", e);
      }
    };
    loadDBData();

    // Check status immediately and then poll
    const verifyStatus = async () => {
      try {
        const response = await fetch("/api/status");
        if (response.ok) {
          const data = await response.json();
          setIsBackendOnline(data.online);
          setBackendMode(data.mode);
        } else {
          setIsBackendOnline(false);
        }
      } catch {
        setIsBackendOnline(false);
      }
    };
    verifyStatus();
    const interval = setInterval(verifyStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync mode if changed at tab level or sidebar
  const handleModeChange = (newMode: "merch" | "asset") => {
    setMode(newMode);
  };

  // Add a newly generated image to history list
  const handleAddHistoryImage = async (newImg: GalleryImage) => {
    try {
      const saved = await saveImageToDB(newImg);
      
      // Update quota count
      const updatedQuota = {
        ...quotaState,
        generationsToday: quotaState.generationsToday + 1
      };
      await saveUserState(updatedQuota);
      setQuotaState(updatedQuota);

      // Add to state list
      setHistory((prev) => [saved, ...prev]);
    } catch (e) {
      console.error("Failed to save generated image to database:", e);
      setHistory((prev) => [newImg, ...prev]);
    }
  };

  // Delete image from history list
  const handleDeleteHistoryImage = async (id: string) => {
    try {
      await deleteImageFromDB(id);
      setHistory((prev) => prev.filter((img) => img.id !== id));
      if (selectedModalImage?.id === id) {
        setSelectedModalImage(null);
      }
    } catch (e) {
      console.error("Failed to delete image from database:", e);
    }
  };

  // Handle history item select (open detailed modal)
  const handleSelectHistoryImage = (img: GalleryImage) => {
    setSelectedModalImage(img);
  };

  // Handle copying prompt to clipboard
  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Load modal image parameters into generator
  const handleLoadParamsIntoGenerator = (img: GalleryImage) => {
    setGeneratorPrefill(img);
    setActiveTab("generator");
    setSelectedModalImage(null);
  };

  const handleSendToSpriteSheet = (img: GalleryImage) => {
    if (img.spriteGroupId) {
      // Send entire batch
      const group = history.filter((h) => h.spriteGroupId === img.spriteGroupId);
      setSpriteFrames((prev) => {
        const existingIds = new Set(prev.map(p => p.id));
        const newGroup = group.filter(g => !existingIds.has(g.id));
        return [...prev, ...newGroup];
      });
    } else {
      setSpriteFrames((prev) => prev.some((p) => p.id === img.id) ? prev : [...prev, img]);
    }
    setActiveTab("canvas");
    setSelectedModalImage(null);
  };

  // Render core workspace tab
  const renderWorkspace = () => {
    switch (activeTab) {
      case "generator":
        return (
          <GeneratorView
            mode={mode}
            onAddHistoryImage={handleAddHistoryImage}
            isBackendOnline={isBackendOnline}
            initialParams={generatorPrefill}
            onClearInitialParams={() => setGeneratorPrefill(null)}
          />
        );
      case "bg-remover":
        return <BgRemoverView />;
      case "compressor":
        return <CompressorView />;
      case "compare":
        return <CompareView history={history} />;
      case "canvas":
        return <CanvasView history={history} spriteFrames={spriteFrames} setSpriteFrames={setSpriteFrames} />;
      case "audio-studio":
        return <AudioStudioView />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-sm text-[#64748b]">
            Select workspace from the sidebar.
          </div>
        );
    }
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-bg-deep font-sans text-[#e8edf5]">
      {/* Sidebar navigation */}
      <Sidebar
        mode={mode}
        setMode={handleModeChange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        history={history}
        onSelectHistoryImage={handleSelectHistoryImage}
        onDeleteHistoryImage={handleDeleteHistoryImage}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header bar */}
        <Header
          mode={mode}
          activeTab={activeTab}
          isBackendOnline={isBackendOnline}
          backendMode={backendMode}
          creditsUsed={quotaState.generationsToday}
          creditsMax={CREDITS_MAX}
          isSignedIn={isSignedIn}
          cloudCredits={cloudCredits}
        />

        {/* View Workspace panel */}
        <main className="flex-1 min-h-0 flex flex-col relative">
          {renderWorkspace()}
        </main>
      </div>

      {/* Beautiful Glassmorphism Detail Modal */}
      {selectedModalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all">
          <div 
            className="relative w-full max-w-4xl max-h-[85vh] bg-[#0c0f1d]/90 border border-[#ffffff]/12 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row backdrop-blur-xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Column - Full Preview */}
            <div className="flex-1 bg-black/60 flex items-center justify-center p-4 checkerboard relative min-h-[300px] md:min-h-0">
              <img 
                src={selectedModalImage.url} 
                alt="Detailed view" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
              />
              <span className="absolute bottom-4 left-4 text-[10px] bg-black/75 text-accent-main border border-accent-main/20 px-2 py-0.5 rounded font-extrabold uppercase tracking-wide">
                {selectedModalImage.isTransparent ? "Transparent matting" : "Standard output"}
              </span>
            </div>

            {/* Right Column - Parameters Details */}
            <div className="w-full md:w-[360px] border-t md:border-t-0 md:border-l border-[#ffffff]/12 flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="p-4 border-b border-[#ffffff]/8 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Generation Specs</h3>
                  <p className="text-[10px] text-[#64748b] mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(selectedModalImage.timestamp).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedModalImage(null)}
                  aria-label="Close details"
                  className="p-1 text-[#94a3b8] hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Params body Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* Prompt block */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider">Prompt</span>
                  <div className="relative group bg-black/40 border border-white/5 rounded-lg p-2.5 text-xs text-[#e8edf5] leading-relaxed break-words pr-8">
                    {selectedModalImage.prompt || "(No prompt text provided)"}
                    <button 
                      onClick={() => handleCopyPrompt(selectedModalImage.prompt)}
                      className="absolute right-2 top-2 p-1 bg-black/80 hover:bg-white/10 rounded border border-white/8 hover:border-white/18 text-[#94a3b8] hover:text-white transition-all"
                      title="Copy prompt text"
                    >
                      {copiedPrompt ? <Check className="w-3 h-3 text-green" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Parameters list */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider">Settings Used</span>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/2 border border-white/5 p-2 rounded-lg">
                      <span className="text-[9px] text-[#64748b] block mb-0.5">Model</span>
                      <span className="font-semibold text-white truncate block">{selectedModalImage.modelName || "FLUX.1 Schnell"}</span>
                    </div>
                    <div className="bg-white/2 border border-white/5 p-2 rounded-lg">
                      <span className="text-[9px] text-[#64748b] block mb-0.5">Dimensions</span>
                      <span className="font-mono font-semibold text-white block">{selectedModalImage.width}x{selectedModalImage.height}</span>
                    </div>
                    <div className="bg-white/2 border border-white/5 p-2 rounded-lg">
                      <span className="text-[9px] text-[#64748b] block mb-0.5">CFG Scale</span>
                      <span className="font-mono font-semibold text-white block">{selectedModalImage.cfg?.toFixed(1) || "1.0"}</span>
                    </div>
                    <div className="bg-white/2 border border-white/5 p-2 rounded-lg">
                      <span className="text-[9px] text-[#64748b] block mb-0.5">Sampling Steps</span>
                      <span className="font-mono font-semibold text-white block">{selectedModalImage.steps || 4}</span>
                    </div>
                  </div>
                </div>

                {/* Negative Prompt */}
                {selectedModalImage.negativePrompt && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider">Negative Prompt</span>
                    <div className="bg-black/30 border border-white/5 rounded-lg p-2.5 text-xs text-[#94a3b8]">
                      {selectedModalImage.negativePrompt}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer CTA Actions */}
              <div className="p-4 border-t border-[#ffffff]/8 bg-black/40 flex flex-col gap-2">
                <button
                  onClick={() => handleLoadParamsIntoGenerator(selectedModalImage)}
                  className="w-full py-2.5 bg-accent-dim hover:bg-accent-main hover:text-bg-deep text-accent-main text-xs font-semibold rounded-xl border border-accent-main/25 hover:border-transparent transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Sliders className="w-4 h-4" /> Load Settings to Generator
                </button>
                <div className="flex gap-2">
                  <a
                    href={selectedModalImage.url}
                    download={`aigen_render_${selectedModalImage.id}.png`}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/8 hover:border-white/18 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-center"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                  <button
                    onClick={() => handleDeleteHistoryImage(selectedModalImage.id)}
                    className="py-2 px-3 bg-red/10 hover:bg-[#ef4444] text-[#ef4444] hover:text-white border border-red/20 hover:border-transparent text-xs font-bold rounded-xl transition-all"
                    title="Delete image forever"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
