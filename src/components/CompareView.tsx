"use client";

import React, { useState, useRef } from "react";
import { Sliders, LayoutGrid, AlertCircle } from "lucide-react";
import { GalleryImage } from "@/lib/db";

interface CompareViewProps {
  history: GalleryImage[];
}

export default function CompareView({ history }: CompareViewProps) {
  const [selectedA, setSelectedA] = useState<GalleryImage | null>(null);
  const [selectedB, setSelectedB] = useState<GalleryImage | null>(null);
  const [compareMode, setCompareMode] = useState<"slider" | "grid">("slider");
  const [sliderPos, setSliderPos] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    let clientX = 0;
    
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, pos)));
  };

  const selectImage = (img: GalleryImage) => {
    if (!selectedA) {
      setSelectedA(img);
    } else if (!selectedB && img.id !== selectedA.id) {
      setSelectedB(img);
    } else {
      // Rotate A and B
      setSelectedA(selectedB);
      setSelectedB(img);
    }
  };

  const clearSelection = () => {
    setSelectedA(null);
    setSelectedB(null);
  };

  return (
    <div className="flex-1 flex gap-5 p-5 min-h-0 overflow-y-auto">
      {/* Selection Column */}
      <div className="w-80 flex flex-col gap-4 shrink-0">
        <div className="glass-panel p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Sliders className="w-4 h-4 text-accent-main" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Compare Controls</h3>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCompareMode("slider")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                compareMode === "slider"
                  ? "bg-accent-dim text-accent-main border-accent-main/30 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                  : "bg-transparent text-[#94a3b8] border-white/5 hover:border-white/18 hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 rotate-90" />
              <span>Split Slider</span>
            </button>
            <button
              onClick={() => setCompareMode("grid")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                compareMode === "grid"
                  ? "bg-accent-dim text-accent-main border-accent-main/30 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                  : "bg-transparent text-[#94a3b8] border-white/5 hover:border-white/18 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
          </div>

          <button
            onClick={clearSelection}
            disabled={!selectedA && !selectedB}
            className="w-full py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg border border-white/8 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear Selection
          </button>
        </div>

        {/* Thumbnail Selector */}
        <div className="glass-panel p-4 flex-1 flex flex-col min-h-0">
          <div className="border-b border-white/5 pb-2 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Select Images to Compare</h3>
          </div>
          <p className="text-[10px] text-[#64748b] leading-relaxed mb-3">
            Click any two images from your session history below to load them into the comparison view.
          </p>

          <div className="flex-1 overflow-y-auto flex flex-wrap gap-2.5 content-start">
            {history.length === 0 ? (
              <div className="w-full text-center py-8 text-xs text-[#64748b]">
                No history images found.
              </div>
            ) : (
              history.map((img) => {
                const isSelectedA = selectedA?.id === img.id;
                const isSelectedB = selectedB?.id === img.id;
                return (
                  <div
                    key={img.id}
                    onClick={() => selectImage(img)}
                    className={`relative w-[72px] h-[72px] rounded-lg overflow-hidden border transition-all cursor-pointer bg-black/40 ${
                      isSelectedA 
                        ? "border-accent-main ring-2 ring-accent-main/30 scale-95 shadow-[0_0_12px_rgba(0,229,255,0.2)]" 
                        : isSelectedB
                          ? "border-pink ring-2 ring-pink/30 scale-95 shadow-[0_0_12px_rgba(255,45,120,0.2)]"
                          : "border-white/8 hover:border-white/30"
                    }`}
                  >
                    <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                    {isSelectedA && (
                      <span className="absolute top-1 left-1 bg-accent-main text-bg-deep text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow">
                        A
                      </span>
                    )}
                    {isSelectedB && (
                      <span className="absolute top-1 left-1 bg-pink text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow">
                        B
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col glass-panel overflow-hidden relative min-h-0 bg-black/40 items-center justify-center p-6">
        {!selectedA || !selectedB ? (
          <div className="empty-state">
            <AlertCircle className="w-12 h-12 text-[#64748b]" />
            <div>
              <p className="text-sm font-semibold text-white">Compare Mode Incomplete</p>
              <p className="text-xs text-[#64748b] mt-1">
                Please select {!selectedA ? "Image A" : "Image B"} from the sidebar list.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col min-h-0">
            {/* Info headers */}
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex-1 bg-accent-dim/10 border border-accent-main/15 p-2.5 rounded-lg text-xs">
                <span className="font-bold text-accent-main uppercase tracking-wider text-[10px] block mb-1.5">Image A</span>
                <p className="text-[#e8edf5] text-[11px] leading-snug mb-2 line-clamp-2">{selectedA.prompt}</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedA.modelName && <span className="bg-accent-main/10 border border-accent-main/20 text-accent-main text-[9px] px-1.5 py-0.5 rounded font-mono" title={selectedA.modelName}>{selectedA.modelName.replace(".safetensors","").split(/[-_]/)[0]}</span>}
                  {selectedA.steps && <span className="bg-white/5 border border-white/8 text-[#94a3b8] text-[9px] px-1.5 py-0.5 rounded font-mono">{selectedA.steps} steps</span>}
                  {selectedA.cfg && <span className="bg-white/5 border border-white/8 text-[#94a3b8] text-[9px] px-1.5 py-0.5 rounded font-mono">CFG {selectedA.cfg.toFixed(1)}</span>}
                  {selectedA.width && <span className="bg-white/5 border border-white/8 text-[#94a3b8] text-[9px] px-1.5 py-0.5 rounded font-mono">{selectedA.width}&times;{selectedA.height}</span>}
                </div>
              </div>
              <div className="flex-1 bg-pink/5 border border-pink/15 p-2.5 rounded-lg text-xs">
                <span className="font-bold text-pink uppercase tracking-wider text-[10px] block mb-1.5">Image B</span>
                <p className="text-[#e8edf5] text-[11px] leading-snug mb-2 line-clamp-2">{selectedB.prompt}</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedB.modelName && <span className="bg-pink/10 border border-pink/20 text-pink text-[9px] px-1.5 py-0.5 rounded font-mono" title={selectedB.modelName}>{selectedB.modelName.replace(".safetensors","").split(/[-_]/)[0]}</span>}
                  {selectedB.steps && <span className="bg-white/5 border border-white/8 text-[#94a3b8] text-[9px] px-1.5 py-0.5 rounded font-mono">{selectedB.steps} steps</span>}
                  {selectedB.cfg && <span className="bg-white/5 border border-white/8 text-[#94a3b8] text-[9px] px-1.5 py-0.5 rounded font-mono">CFG {selectedB.cfg.toFixed(1)}</span>}
                  {selectedB.width && <span className="bg-white/5 border border-white/8 text-[#94a3b8] text-[9px] px-1.5 py-0.5 rounded font-mono">{selectedB.width}&times;{selectedB.height}</span>}
                </div>
              </div>
            </div>

            {/* View Container */}
            <div className="flex-1 min-h-0 bg-black/60 border border-white/5 rounded-xl overflow-hidden relative checkerboard">
              {compareMode === "slider" ? (
                <div
                  ref={containerRef}
                  onMouseMove={handleSliderMove}
                  onTouchMove={handleSliderMove}
                  className="w-full h-full relative cursor-ew-resize select-none overflow-hidden flex items-center justify-center"
                >
                  {/* Image B (Underneath / Right side) */}
                  <img
                    src={selectedB.url}
                    alt="Image B"
                    className="absolute max-w-full max-h-full object-contain pointer-events-none"
                  />

                  {/* Image A (On Top / Left side cropped) */}
                  <div
                    className="absolute top-0 left-0 bottom-0 overflow-hidden flex items-center justify-center"
                    style={{ 
                      width: `${sliderPos}%`,
                      // The child image must match the parent size to avoid scaling mismatches
                      // We center it absolutely
                    }}
                  >
                    <div 
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ width: containerRef.current?.getBoundingClientRect().width || "100%" }}
                    >
                      <img
                        src={selectedA.url}
                        alt="Image A"
                        className="max-w-full max-h-full object-contain pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Divider Line & Handle */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-accent-main z-10 shadow-[0_0_10px_var(--accent-glow)]"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-accent-main hover:bg-accent-hover text-bg-deep rounded-full flex items-center justify-center shadow-lg border border-white/20 transition-transform hover:scale-110">
                      <Sliders className="w-3.5 h-3.5 rotate-90" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex p-4 gap-4 justify-center items-center">
                  <div className="flex-1 h-full flex items-center justify-center relative border border-white/5 rounded-lg overflow-hidden bg-black/30 p-1">
                    <span className="absolute top-2 left-2 bg-accent-main text-bg-deep text-[10px] font-extrabold px-2 py-0.5 rounded shadow z-10">
                      IMAGE A
                    </span>
                    <img src={selectedA.url} alt="Image A" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-1 h-full flex items-center justify-center relative border border-white/5 rounded-lg overflow-hidden bg-black/30 p-1">
                    <span className="absolute top-2 left-2 bg-pink text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow z-10">
                      IMAGE B
                    </span>
                    <img src={selectedB.url} alt="Image B" className="max-w-full max-h-full object-contain" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
