"use client";

import React, { useState, useRef } from "react";
import { Upload, RefreshCw, Layers, Download, Sliders, AlertTriangle } from "lucide-react";
import { uploadImage, submitGeneration, checkHistory } from "@/lib/api";

// Small colour swatch preview for the Chroma picker
function ColorSwatch({ r, g, b }: { r: number; g: number; b: number }) {
  return (
    <div
      className="w-full h-8 rounded-lg border border-white/10 shadow-inner"
      style={{ background: `rgb(${r},${g},${b})` }}
    />
  );
}

export default function BgRemoverView() {
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

      const { promptId } = await submitGeneration(generateParams);
      setStatusMessage("Awaiting result...");
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 60) {
          clearInterval(interval);
          setStatusMessage("Error: Timed out waiting for result.");
          setIsProcessing(false);
          return;
        }
        const url = await checkHistory(promptId);
        if (url) {
          clearInterval(interval);
          setResultUrl(url);
          setIsProcessing(false);
          setStatusMessage("");
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
    <div className="flex-1 flex gap-5 p-5 min-h-0 overflow-y-auto">
      {/* Settings Panel */}
      <div className="w-80 flex flex-col gap-4 shrink-0">
        <div className="glass-panel p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Sliders className="w-4 h-4 text-accent-main" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Matting Options</h3>
          </div>

          {/* Method Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px]">Removal Method</label>
            <select title="Removal Method"
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="bg-black/45 text-sm"
              disabled={isProcessing}
            >
              <option value="inspyrenet">AI Inspyrenet (Recommended)</option>
              <option value="clipseg">AI CLIPSeg Text Mask</option>
              <option value="colormask">Chroma Color Keying</option>
            </select>
          </div>

          {/* Inspyrenet Settings */}
          {method === "inspyrenet" && (
            <div className="flex flex-col gap-1.5">
              <label className="flex justify-between text-[10px]">
                <span>Edge Trim Threshold</span>
                <span className="font-mono text-accent-main">{threshold.toFixed(2)}</span>
              </label>
              <input title="Edge Trim Threshold"
                type="range" min="0.1" max="0.9" step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                disabled={isProcessing}
              />
              <p className="text-[9px] text-[#475569]">
                Higher = trim more edge pixels. Increase if you see a halo around the subject.
              </p>
            </div>
          )}

          {/* CLIPSeg Settings */}
          {method === "clipseg" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px]">Describe What to Remove</label>
                <input
                  type="text"
                  value={clipsegText}
                  onChange={(e) => setClipsegText(e.target.value)}
                  placeholder="e.g. background, floor, table"
                  className="bg-black/45 text-sm"
                  disabled={isProcessing}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="flex justify-between text-[10px]">
                  <span>Sensitivity</span>
                  <span className="font-mono text-accent-main">{threshold.toFixed(2)}</span>
                </label>
                <input title="Sensitivity"
                  type="range" min="0.1" max="0.9" step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  disabled={isProcessing}
                />
              </div>
            </>
          )}

          {/* Chroma Color Keying */}
          {method === "colormask" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="flex justify-between items-center text-[10px]">
                  <span>Target Background Colour</span>
                  <span className="font-mono text-accent-main uppercase">
                    #{bgColorR.toString(16).padStart(2, '0')}{bgColorG.toString(16).padStart(2, '0')}{bgColorB.toString(16).padStart(2, '0')}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={`#${bgColorR.toString(16).padStart(2, '0')}${bgColorG.toString(16).padStart(2, '0')}${bgColorB.toString(16).padStart(2, '0')}`}
                    onChange={(e) => {
                      const hex = e.target.value;
                      setBgColorR(parseInt(hex.slice(1, 3), 16));
                      setBgColorG(parseInt(hex.slice(3, 5), 16));
                      setBgColorB(parseInt(hex.slice(5, 7), 16));
                    }}
                    className="w-full h-10 rounded border border-white/10 cursor-pointer bg-black/20"
                    disabled={isProcessing}
                    title="Click to pick a color, or use the eyedropper"
                  />
                </div>
              </div>

              {/* Zero-colour warning */}
              {isZeroColor && (
                <div className="flex items-start gap-2 p-2.5 bg-yellow-400/5 border border-yellow-400/20 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-yellow-400 leading-relaxed">
                    Pure black selected. Set the color to match your actual background colour (e.g. green screen).
                  </p>
                </div>
              )}

              {/* Tolerance */}
              <div className="flex flex-col gap-1.5">
                <label className="flex justify-between text-[10px]">
                  <span>Colour Tolerance</span>
                  <span className="font-mono text-accent-main">{bgColorTolerance}</span>
                </label>
                <input title="Colour Tolerance"
                  type="range" min="5" max="120" step="1"
                  value={bgColorTolerance}
                  onChange={(e) => setBgColorTolerance(parseInt(e.target.value))}
                  disabled={isProcessing}
                />
                <p className="text-[9px] text-[#475569]">
                  Higher = removes more similar shades. Use 20–50 for solid backgrounds.
                </p>
              </div>
            </>
          )}

          {/* Process Button */}
          <button
            onClick={removeBackground}
            disabled={!file || isProcessing}
            className="w-full py-2.5 bg-accent-dim hover:bg-accent-main hover:text-bg-deep text-accent-main text-xs font-semibold rounded-lg border border-accent-main/20 hover:border-transparent transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /><span>Removing...</span></>
            ) : (
              <><Layers className="w-4 h-4" /><span>Remove Background</span></>
            )}
          </button>
        </div>

        {statusMessage && (
          <div className="glass-panel p-3 border-accent-dim bg-accent-dim/5 text-xs text-accent-main font-semibold flex items-center gap-2 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col glass-panel overflow-hidden relative min-h-0 bg-black/40">
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDropUrl}
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/8 hover:border-accent-main/40 m-6 rounded-xl cursor-pointer hover:bg-white/[0.01] transition-all gap-4"
          >
            <Upload className="w-12 h-12 text-[#64748b] animate-bounce" />
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Drag & drop image here</p>
              <p className="text-xs text-[#64748b] mt-1">or click to browse — also accepts drag from the generator</p>
            </div>
            <input title="Upload Image"
              type="file" ref={fileInputRef} onChange={handleFileChange}
              accept="image/*" className="hidden"
            />
          </div>
        ) : (
          <div className="flex-1 flex min-h-0 p-6 gap-6 justify-center items-center">
            {/* Original */}
            <div className="flex-1 flex flex-col h-full min-h-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#64748b] font-bold">Original Image</span>
                <button
                  onClick={() => { setFile(null); setOriginalUrl(null); setResultUrl(null); }}
                  className="text-[9px] text-[#64748b] hover:text-white border border-white/10 hover:border-white/30 px-2 py-0.5 rounded transition-all"
                >
                  Change
                </button>
              </div>
              <div className="flex-1 bg-black/60 border border-white/5 rounded-lg overflow-hidden flex items-center justify-center p-2 checkerboard">
                <img src={originalUrl!} alt="Original" className="max-w-full max-h-full object-contain" />
              </div>
            </div>

            {/* Result */}
            <div className="flex-1 flex flex-col h-full min-h-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase tracking-widest text-accent-main font-bold">Transparent Result</span>
                {resultUrl && (
                  <a
                    href={resultUrl}
                    download={`nobg_${file.name}`}
                    className="flex items-center gap-1 py-1 px-2.5 bg-green/10 hover:bg-green text-green hover:text-[#07080f] border border-green/20 hover:border-transparent text-[10px] font-bold rounded-lg transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PNG
                  </a>
                )}
              </div>
              <div className="flex-1 bg-black/60 border border-white/5 rounded-lg overflow-hidden flex items-center justify-center p-2 checkerboard">
                {resultUrl ? (
                  <img src={resultUrl} alt="Transparent Result" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-xs text-[#64748b] text-center">
                    <p>Hit &quot;Remove Background&quot; to process</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
