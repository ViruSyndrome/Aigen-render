"use client";

import React, { useState, useEffect } from "react";
import NavSidebar from "./NavSidebar";
import TopBar from "./TopBar";
import GeneratorView from "./GeneratorView";
import BgRemoverView from "./BgRemoverView";
import CompressorView from "./CompressorView";
import CompareView from "./CompareView";
import CanvasView from "./CanvasView";
import AudioStudioView from "./AudioStudioView";
import PricingModal from "./PricingModal";
import {
  getAllImagesFromDB,
  deleteImageFromDB,
  saveImageToDB,
  getUserState,
  saveUserState,
  GalleryImage,
  UserQuota,
} from "@/lib/db";
import { useUser } from "@clerk/nextjs";
import {
  X,
  Copy,
  Download,
  Sliders,
  Check,
  Calendar,
} from "lucide-react";

interface StudioLayoutProps {
  initialMode: "merch" | "asset";
}

export default function StudioLayout({ initialMode }: StudioLayoutProps) {
  const { isSignedIn, user } = useUser();
  const [mode] = useState<"merch" | "asset">(initialMode);
  const [activeTab, setActiveTab] = useState<string>("generator");
  const [history, setHistory] = useState<GalleryImage[]>([]);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);
  const [quotaState, setQuotaState] = useState<UserQuota>({
    id: "quota",
    date: new Date().toDateString(),
    generationsToday: 0,
  });
  const [cloudCredits, setCloudCredits] = useState<number>(5);
  const [showPricing, setShowPricing] = useState(false);

  // Prefill parameter state for GeneratorView
  const [generatorPrefill, setGeneratorPrefill] =
    useState<GalleryImage | null>(null);

  // Modal details view
  const [selectedModalImage, setSelectedModalImage] =
    useState<GalleryImage | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [spriteFrames, setSpriteFrames] = useState<GalleryImage[]>([]);

  const CREDITS_MAX = 50;

  // Load DB data on mount
  useEffect(() => {
    const loadDBData = async () => {
      try {
        const imgs = await getAllImagesFromDB(user?.id);
        setHistory(imgs);
        if (isSignedIn) {
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

    const verifyStatus = async () => {
      try {
        const response = await fetch("/api/status");
        if (response.ok) {
          const data = await response.json();
          setIsBackendOnline(data.online);
        } else {
          setIsBackendOnline(false);
        }
      } catch {
        setIsBackendOnline(false);
      }
    };
    verifyStatus();
    const statusInterval = setInterval(verifyStatus, 30000);
    return () => clearInterval(statusInterval);
  }, []);

  const handleAddHistoryImage = async (img: GalleryImage) => {
    try {
      await saveImageToDB(img);
      setHistory((prev) => [img, ...prev]);
      if (!isSignedIn) {
        const newState = {
          ...quotaState,
          generationsToday: quotaState.generationsToday + 1,
        };
        setQuotaState(newState);
        await saveUserState(newState);
      } else {
        // Refresh cloud credits after generation
        const res = await fetch("/api/user/credits");
        if (res.ok) {
          const data = await res.json();
          setCloudCredits(data.credits || 0);
        }
      }
    } catch (e) {
      console.error("Failed to save image:", e);
    }
  };

  const handleDeleteHistoryImage = async (id: string) => {
    try {
      await deleteImageFromDB(id);
      setHistory((prev) => prev.filter((img) => img.id !== id));
      if (selectedModalImage?.id === id) setSelectedModalImage(null);
    } catch (e) {
      console.error("Failed to delete image:", e);
    }
  };

  const handleSelectHistoryImage = (img: GalleryImage) => {
    setSelectedModalImage(img);
  };

  const handleLoadParamsIntoGenerator = (img: GalleryImage) => {
    setGeneratorPrefill(img);
    setActiveTab("generator");
    setSelectedModalImage(null);
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt || "");
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1500);
  };

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
        return (
          <BgRemoverView
            onAddHistoryImage={handleAddHistoryImage}
            history={history}
          />
        );
      case "compressor":
        return (
          <CompressorView
            onAddHistoryImage={handleAddHistoryImage}
            history={history}
          />
        );
      case "compare":
        return <CompareView history={history} />;
      case "canvas":
        return (
          <CanvasView
            history={history}
            spriteFrames={spriteFrames}
            setSpriteFrames={setSpriteFrames}
          />
        );
      case "audio-studio":
        return <AudioStudioView />;
      default:
        return (
          <div className="flex-1 flex items-center justify-center text-sm text-[#64748b]">
            Select a tool from the sidebar.
          </div>
        );
    }
  };

  return (
    <div className="flex flex-row h-screen w-screen overflow-hidden bg-bg-deep font-sans text-[#e8edf5]">
      {/* Slim Nav Sidebar */}
      <NavSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Bar */}
        <TopBar
          activeTab={activeTab}
          isBackendOnline={isBackendOnline}
          isSignedIn={isSignedIn}
          cloudCredits={cloudCredits}
          creditsUsed={quotaState.generationsToday}
          creditsMax={CREDITS_MAX}
          onUpgradeClick={() => setShowPricing(true)}
        />

        {/* Workspace */}
        <main className="flex-1 min-h-0 flex flex-col relative overflow-hidden pb-14 md:pb-0">
          {renderWorkspace()}
        </main>
      </div>

      {/* Pricing Modal */}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}

      {/* Image Detail Modal */}
      {selectedModalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className="relative w-full max-w-4xl max-h-[85vh] bg-[#0c0f1d]/95 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row backdrop-blur-xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Preview */}
            <div className="flex-1 bg-black/60 flex items-center justify-center p-4 checkerboard relative min-h-[250px] md:min-h-0">
              <img
                src={selectedModalImage.url}
                alt="Preview"
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
              <span className="absolute bottom-3 left-3 text-[10px] bg-black/75 text-accent-main border border-accent-main/20 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                {selectedModalImage.isTransparent ? "Transparent" : "Standard"}
              </span>
            </div>

            {/* Right: Details */}
            <div className="w-full md:w-[340px] border-t md:border-t-0 md:border-l border-white/[0.08] flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Generation Details
                  </h3>
                  <p className="text-[10px] text-[#64748b] mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(selectedModalImage.timestamp).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedModalImage(null)}
                  className="p-1.5 text-[#94a3b8] hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* Prompt */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider">
                    Prompt
                  </span>
                  <div className="relative group bg-black/30 border border-white/5 rounded-lg p-2.5 text-xs text-[#e8edf5] leading-relaxed break-words pr-8">
                    {selectedModalImage.prompt || "(No prompt)"}
                    <button
                      onClick={() =>
                        handleCopyPrompt(selectedModalImage.prompt)
                      }
                      className="absolute right-2 top-2 p-1 bg-black/60 hover:bg-white/10 rounded border border-white/8 text-[#94a3b8] hover:text-white transition-all"
                    >
                      {copiedPrompt ? (
                        <Check className="w-3 h-3 text-green" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Params Grid */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider">
                    Settings
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      {
                        label: "Model",
                        value: selectedModalImage.modelName || "FLUX",
                      },
                      {
                        label: "Size",
                        value: `${selectedModalImage.width}×${selectedModalImage.height}`,
                      },
                      {
                        label: "CFG",
                        value: selectedModalImage.cfg?.toFixed(1) || "1.0",
                      },
                      {
                        label: "Steps",
                        value: selectedModalImage.steps || 4,
                      },
                    ].map((p) => (
                      <div
                        key={p.label}
                        className="bg-white/[0.02] border border-white/5 p-2 rounded-lg"
                      >
                        <span className="text-[9px] text-[#64748b] block mb-0.5">
                          {p.label}
                        </span>
                        <span className="font-mono font-semibold text-white block truncate">
                          {p.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Negative Prompt */}
                {selectedModalImage.negativePrompt && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wider">
                      Negative Prompt
                    </span>
                    <div className="bg-black/20 border border-white/5 rounded-lg p-2.5 text-xs text-[#94a3b8]">
                      {selectedModalImage.negativePrompt}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-white/[0.06] bg-black/30 flex flex-col gap-2">
                <button
                  onClick={() =>
                    handleLoadParamsIntoGenerator(selectedModalImage)
                  }
                  className="btn-primary w-full py-2.5 text-xs"
                >
                  <Sliders className="w-4 h-4" /> Load into Generator
                </button>
                <div className="flex gap-2">
                  <a
                    href={selectedModalImage.url}
                    download={`asset_${selectedModalImage.id}.png`}
                    className="btn-ghost flex-1 py-2 text-xs justify-center"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                  <button
                    onClick={() =>
                      handleDeleteHistoryImage(selectedModalImage.id)
                    }
                    className="btn-ghost py-2 px-3 text-xs text-red border-red/20 hover:bg-red/10 hover:text-red"
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
