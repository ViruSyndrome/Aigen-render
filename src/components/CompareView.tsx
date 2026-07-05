"use client";

import React, { useState, useRef } from "react";
import { Sliders, LayoutGrid, AlertCircle, Trash2, SplitSquareHorizontal } from "lucide-react";
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
    <div className="flex-1 flex flex-col md:flex-row gap-5 p-4 md:p-6 min-h-0 overflow-y-auto">
      {/* Settings / Selection Column - Top on mobile, Left on desktop */}
      <div className="w-full md:w-80 flex flex-col gap-5 shrink-0">
        
        {/* Controls Panel */}
        <div className="glass-panel p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sliders className="w-4 h-4 text-accent-main" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Compare Controls</h3>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCompareMode("slider")}
              className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-all ${
                compareMode === "slider"
                  ? "bg-accent-dim text-accent-main border-accent-main/30 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                  : "bg-transparent text-[#94a3b8] border-white/5 hover:bg-white/5 hover:text-white"
              }`}
            >
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
              <span>Split Slider</span>
            </button>
            <button
              onClick={() => setCompareMode("grid")}
              className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-all ${
                compareMode === "grid"
                  ? "bg-accent-dim text-accent-main border-accent-main/30 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                  : "bg-transparent text-[#94a3b8] border-white/5 hover:bg-white/5 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
          </div>

          <button
            onClick={clearSelection}
            disabled={!selectedA && !selectedB}
            className="btn-ghost flex items-center justify-center gap-2 w-full mt-2"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Selection
          </button>
        </div>

        {/* Thumbnail Selector */}
        <div className="glass-panel p-5 flex-1 flex flex-col min-h-[250px]">
          <div className="border-b border-white/5 pb-3 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Select Images</h3>
          </div>
          <p className="text-[10px] text-[#64748b] leading-relaxed mb-4">
            Click any two images from your session history to compare them.
          </p>

          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-4 md:grid-cols-3 gap-2">
              {history.length === 0 ? (
                <div className="col-span-full text-center py-8 text-xs text-[#64748b]">
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
                      className={`relative aspect-square rounded-lg overflow-hidden border transition-all cursor-pointer bg-black/40 group ${
                        isSelectedA 
                          ? "border-accent-main ring-2 ring-accent-main/30 scale-95 shadow-[0_0_12px_rgba(0,229,255,0.2)]" 
                          : isSelectedB
                            ? "border-purple ring-2 ring-purple/30 scale-95 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                            : "border-white/5 hover:border-white/20"
                      }`}
                    >
                      <img src={img.url} alt={img.prompt} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      {isSelectedA && (
                        <span className="absolute top-1 left-1 bg-accent-main text-bg-deep text-[10px] font-extrabold w-4 h-4 flex items-center justify-center rounded shadow-lg">
                          A
                        </span>
                      )}
                      {isSelectedB && (
                        <span className="absolute top-1 left-1 bg-purple text-white text-[10px] font-extrabold w-4 h-4 flex items-center justify-center rounded shadow-lg">
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
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col glass-panel overflow-hidden relative min-h-[400px]">
        {!selectedA || !selectedB ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-70 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              <LayoutGrid className="w-6 h-6 text-[#94a3b8]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Select Two Images</p>
              <p className="text-xs text-[#64748b]">
                {selectedA ? "Select one more image (B) from the panel." : "Select image A and image B from the left panel."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative animate-fade-in flex flex-col">
            
            {/* Header info */}
            <div className="absolute top-4 inset-x-4 z-20 flex justify-between gap-4 pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md border border-accent-main/30 px-3 py-1.5 rounded-lg pointer-events-auto max-w-[45%]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-accent-main text-bg-deep text-[10px] font-bold px-1.5 py-0.5 rounded">A</span>
                  <span className="text-xs text-white truncate">{selectedA.modelName || 'Image A'}</span>
                </div>
                <p className="text-[9px] text-[#94a3b8] truncate">{selectedA.prompt}</p>
              </div>
              <div className="bg-black/60 backdrop-blur-md border border-purple/30 px-3 py-1.5 rounded-lg pointer-events-auto max-w-[45%] text-right">
                <div className="flex items-center justify-end gap-2 mb-1">
                  <span className="text-xs text-white truncate">{selectedB.modelName || 'Image B'}</span>
                  <span className="bg-purple text-white text-[10px] font-bold px-1.5 py-0.5 rounded">B</span>
                </div>
                <p className="text-[9px] text-[#94a3b8] truncate">{selectedB.prompt}</p>
              </div>
            </div>

            {compareMode === "slider" ? (
              /* Split Slider Mode */
              <div 
                className="w-full h-full relative overflow-hidden cursor-crosshair checkerboard"
                ref={containerRef}
                onMouseMove={handleSliderMove}
                onTouchMove={handleSliderMove}
              >
                {/* Image A (Bottom) */}
                <img 
                  src={selectedA.url} 
                  alt="A" 
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
                {/* Image B (Top - Clipped) */}
                <div 
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img 
                    src={selectedB.url} 
                    alt="B" 
                    className="absolute inset-0 w-full h-full object-contain max-w-none"
                    style={{ width: containerRef.current?.getBoundingClientRect().width || "100%" }}
                  />
                </div>
                {/* Slider Handle */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none z-10"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-[#0c0f1d]">
                    <div className="w-3 h-3 text-[#0c0f1d] flex items-center justify-between">
                      <div className="w-0.5 h-full bg-[#0c0f1d] rounded-full"></div>
                      <div className="w-0.5 h-full bg-[#0c0f1d] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Side-by-Side Mode */
              <div className="w-full h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10 checkerboard">
                <div className="flex-1 relative">
                  <img src={selectedA.url} alt="A" className="w-full h-full object-contain p-2" />
                </div>
                <div className="flex-1 relative">
                  <img src={selectedB.url} alt="B" className="w-full h-full object-contain p-2" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
