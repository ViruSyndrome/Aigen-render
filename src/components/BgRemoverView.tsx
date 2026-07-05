"use client";

import React, { useState, useRef } from "react";
import { Upload, RefreshCw, Layers, Download, Sliders, AlertTriangle } from "lucide-react";
import { uploadImage, submitGeneration, checkHistory } from "@/lib/api";
import { GalleryImage } from "@/lib/db";

// Small colour swatch preview for the Chroma picker
function ColorSwatch({ r, g, b }: { r: number; g: number; b: number }) {
  return (
    <div
      className="w-full h-8 rounded-lg border border-white/10 shadow-inner"
      style={{ background: `rgb(${r},${g},${b})` }}
    />
  );
}

interface BgRemoverViewProps {
  onAddHistoryImage: (img: GalleryImage) => void;
  history: GalleryImage[];
}

export default function BgRemoverView({ onAddHistoryImage, history }: BgRemoverViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const [method, setMethod] = useState<"inspyrenet" | "clipseg" | "colormask">("inspyrenet");
  const [threshold, setThreshold] = useState<number>(0.35);
  const [clipsegText, setClipsegText] = useState<string>("background");
  const [bgColorR, setBgColorR] = useState<number>(0);
  const [bgColorG, setBgColorG] = useState<number>(0);
  const [bgColorB, setBgColorB] = useState<number>(0);
  const [bgColorTolerance, setBgColorTolerance] = useState<number>(30);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) loadFile(selected);
  };

  const loadFile = (f: File) => {
    setFile(f);
    setOriginalUrl(URL.createObjectURL(f));
    setResultUrl(null);
    setStatusMessage("");
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) loadFile(droppedFile);
  };

  // Also accept drops from the URL drag (from the generator preview)
  const handleDropUrl = (e: React.DragEvent) => {
    e.preventDefault();
    const url = e.dataTransfer.getData("text/plain");
    if (url && (url.startsWith("http") || url.startsWith("data:"))) {
      fetch(url).then(r => r.blob()).then(blob => {
        const f = new File([blob], "dropped_image.png", { type: blob.type || "image/png" });
        loadFile(f);
      });
    } else {
      handleDrop(e);
    }
  };

  const removeBackground = async () => {
    if (!file) return;
    try {
      setIsProcessing(true);
      setStatusMessage("Uploading image to server...");
      const uploadedName = await uploadImage(file);
      setStatusMessage("Running background removal...");

      const generateParams: any = {
        prompt: "",
        negativePrompt: "",
        cfg: 1.0,
        steps: 1,
        width: 1024,
        height: 1024,
        modelName: "v1-5-pruned-emaonly.safetensors",
        useTransparent: true,
        uploadedImageName: uploadedName,
        denoiseStrength: 0.0,
        bgMethod: method,
        bgThreshold: threshold,
        bgColorR,
        bgColorG,
        bgColorB,
        bgColorTolerance,
        clipsegText,
        clipsegThreshold: threshold,
        rembgNode: "InspyrenetRembgAdvanced",
      };

      const { id } = await submitGeneration(generateParams);
      setStatusMessage("Awaiting result...");
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 120) {
          clearInterval(interval);
          setStatusMessage("Processing timed out");
          setIsProcessing(false);
          return;
        }

        const url = await checkHistory(id);
        if (url) {
          clearInterval(interval);
          setResultUrl(url);
          setStatusMessage("");
          setIsProcessing(false);
          
          // Add to history
          onAddHistoryImage({
            id,
            url,
            prompt: "Background Removal",
            negativePrompt: "",
            cfg: 1,
            steps: 1,
            width: 1024,
            height: 1024,
            modelName: "rembg",
            timestamp: Date.now(),
            stage: "edit",
            isTransparent: true,
            assetType: "sprite"
          });
        }
      }, 2000);
    } catch (e: any) {
      console.error(e);
      setStatusMessage(`Error: ${e.message || "Failed to remove background"}`);
      setIsProcessing(false);
    }
  };

  const isZeroColor = bgColorR === 0 && bgColorG === 0 && bgColorB === 0;

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-5 p-4 md:p-6 min-h-0 overflow-y-auto">
      {/* Settings Panel - Top on mobile, Left on desktop */}
      <div className="w-full md:w-80 flex flex-col gap-4 shrink-0">
        <div className="glass-panel p-5 flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sliders className="w-4 h-4 text-accent-main" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Matting Options</h3>
          </div>

          {/* Method Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#64748b] uppercase">Removal Method</label>
            <select title="Removal Method"
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="input-field"
              disabled={isProcessing}
            >
              <option value="inspyrenet">AI Inspyrenet (Recommended)</option>
              <option value="clipseg">AI CLIPSeg Text Mask</option>
              <option value="colormask">Chroma Color Keying</option>
            </select>
          </div>

          {/* CLIPSeg settings */}
          {method === "clipseg" && (
            <div className="flex flex-col gap-3 animate-fade-in p-3 bg-white/[0.02] rounded-xl border border-white/5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#64748b]">Target Subject to keep</label>
                <input title="Target"
                  type="text"
                  value={clipsegText}
                  onChange={(e) => setClipsegText(e.target.value)}
                  className="input-field"
                  placeholder="e.g. background, character, tree"
                  disabled={isProcessing}
                />
              </div>
            </div>
          )}

          {/* Chroma settings */}
          {method === "colormask" && (
            <div className="flex flex-col gap-3 animate-fade-in p-3 bg-white/[0.02] rounded-xl border border-white/5">
              <p className="text-[10px] text-accent-main leading-tight">Pick the exact color to make transparent.</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-[#64748b]">Red (0-255)</label>
                  <input title="R" type="number" min="0" max="255" value={bgColorR} onChange={e => setBgColorR(Number(e.target.value))} className="input-field px-2" disabled={isProcessing} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-[#64748b]">Green (0-255)</label>
                  <input title="G" type="number" min="0" max="255" value={bgColorG} onChange={e => setBgColorG(Number(e.target.value))} className="input-field px-2" disabled={isProcessing} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] text-[#64748b]">Blue (0-255)</label>
                  <input title="B" type="number" min="0" max="255" value={bgColorB} onChange={e => setBgColorB(Number(e.target.value))} className="input-field px-2" disabled={isProcessing} />
                </div>
              </div>
              <ColorSwatch r={bgColorR} g={bgColorG} b={bgColorB} />
              
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between">
                  <label className="text-[9px] text-[#64748b]">Tolerance</label>
                  <span className="text-[9px] text-white font-mono">{bgColorTolerance}</span>
                </div>
                <input title="Tolerance" type="range" min="0" max="100" value={bgColorTolerance} onChange={e => setBgColorTolerance(Number(e.target.value))} className="w-full accent-accent-main" disabled={isProcessing} />
              </div>
              {isZeroColor && (
                <div className="flex items-start gap-2 text-amber mt-1 bg-amber/10 p-2 rounded border border-amber/20">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <p className="text-[9px] leading-tight">Pure black (0,0,0) might clip shadows. Ensure your background is actually 100% black.</p>
                </div>
              )}
            </div>
          )}

          {/* Threshold (used by inspyrenet & clipseg) */}
          {(method === "inspyrenet" || method === "clipseg") && (
            <div className="flex flex-col gap-1.5 p-3 bg-white/[0.02] rounded-xl border border-white/5">
              <div className="flex justify-between">
                <label className="text-[10px] text-[#64748b]">Mask Threshold</label>
                <span className="text-[10px] text-white font-mono">{threshold.toFixed(2)}</span>
              </div>
              <input title="Threshold"
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-accent-main"
                disabled={isProcessing}
              />
              <p className="text-[9px] text-[#475569] leading-tight mt-1">Higher values remove more background, lower values keep more details.</p>
            </div>
          )}

          <button
            onClick={removeBackground}
            disabled={!file || isProcessing}
            className="btn-primary w-full py-3 mt-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <Layers className="w-4 h-4" /> Remove Background
              </>
            )}
          </button>
          
          {statusMessage && (
            <div className="text-xs text-center text-accent-main animate-pulse-glow py-1 rounded bg-accent-main/10 border border-accent-main/20">
              {statusMessage}
            </div>
          )}
        </div>
        
        {/* Helper text */}
        <div className="glass-panel p-4 opacity-70">
          <h4 className="text-xs font-bold text-white mb-2">Tips</h4>
          <ul className="text-[10px] text-[#94a3b8] flex flex-col gap-2 list-disc pl-3">
            <li><strong>Inspyrenet</strong> is best for general characters, props, and complex shapes.</li>
            <li><strong>Color Keying</strong> works perfectly for flat UI elements or sprites generated on pure green/black backgrounds.</li>
            <li>Adjust threshold if the edges look jagged.</li>
          </ul>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">
        <div 
          className="flex-1 glass-panel flex items-center justify-center p-6 relative overflow-hidden checkerboard min-h-[300px]"
          onDragOver={handleDragOver}
          onDrop={handleDropUrl}
        >
          {resultUrl ? (
            <div className="relative group w-full h-full flex items-center justify-center animate-fade-in">
              <img src={resultUrl} alt="Result" className="max-w-full max-h-full object-contain drop-shadow-2xl" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg backdrop-blur-sm">
                <a 
                  href={resultUrl} 
                  download="bg-removed.png"
                  className="btn-primary"
                >
                  <Download className="w-4 h-4" /> Download Transparent PNG
                </a>
              </div>
            </div>
          ) : originalUrl ? (
            <div className="relative w-full h-full flex items-center justify-center animate-fade-in">
              <img src={originalUrl} alt="Original" className="max-w-full max-h-full object-contain opacity-60 transition-opacity hover:opacity-100" />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center rounded-lg">
                   <div className="w-16 h-16 border-4 border-accent-main/20 border-t-accent-main rounded-full animate-spin"></div>
                   <p className="mt-4 text-accent-main font-bold tracking-wider uppercase text-sm animate-pulse">Removing Background</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-[#64748b]">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                <Upload className="w-8 h-8 text-[#94a3b8]" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-white">Drag & drop image here</p>
                <p className="text-xs mt-1">or click to browse from device</p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="btn-ghost mt-2"
              >
                Select File
              </button>
            </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
