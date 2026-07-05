"use client";

import React, { useState, useRef } from "react";
import { Upload, Download, RefreshCw, Sliders, ZoomIn } from "lucide-react";
import { uploadImage, submitGeneration, checkHistory } from "@/lib/api";
import { GalleryImage } from "@/lib/db";

const UPSCALER_MODELS = [
  { value: "4x-UltraSharp.pth", label: "4× UltraSharp (Best Detail)" },
  { value: "RealESRGAN_x4plus.pth", label: "4× RealESRGAN (Photorealism)" },
  { value: "4x_NMKD-Siax_200k.pth", label: "4× NMKD-Siax (Anime/Illustration)" },
  { value: "8x_NMKD-Superscale-SP_177000_G.pth", label: "8× Superscale (Max Upscale)" },
];

interface CompressorViewProps {
  onAddHistoryImage: (img: GalleryImage) => void;
  history: GalleryImage[];
}

export default function CompressorView({ onAddHistoryImage, history }: CompressorViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(0.85);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upscaler state
  const [upscalerModel, setUpscalerModel] = useState<string>("4x-UltraSharp.pth");
  const [isUpscaling, setIsUpscaling] = useState<boolean>(false);
  const [upscaleUrl, setUpscaleUrl] = useState<string | null>(null);
  const [upscaleStatus, setUpscaleStatus] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) loadFile(selected);
  };

  const loadFile = (f: File) => {
    setFile(f);
    setOriginalSize(f.size);
    setOriginalUrl(URL.createObjectURL(f));
    setCompressedUrl(null);
    setCompressedSize(0);
    setUpscaleUrl(null);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) loadFile(droppedFile);
  };
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

  const compressImage = () => {
    if (!originalUrl || !file) return;
    setIsCompressing(true);
    const img = new Image();
    img.src = originalUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const mimeType = file.type === "image/png" ? "image/jpeg" : file.type;
      canvas.toBlob(
        (blob) => {
          if (blob) { setCompressedSize(blob.size); setCompressedUrl(URL.createObjectURL(blob)); }
          setIsCompressing(false);
        },
        mimeType,
        quality
      );
    };
  };

  const runUpscale = async () => {
    if (!file) return;
    try {
      setIsUpscaling(true);
      setUpscaleStatus("Uploading image...");
      const uploadedName = await uploadImage(file);
      setUpscaleStatus("Running AI upscaler...");

      const params: any = {
        prompt: "",
        negativePrompt: "",
        cfg: 1.0,
        steps: 1,
        width: 1024,
        height: 1024,
        modelName: "v1-5-pruned-emaonly.safetensors",
        useTransparent: false,
        uploadedImageName: uploadedName,
        denoiseStrength: 0.0,
        useRedbubble: true, // Internal flag to trigger upscaler node
        upscalerName: upscalerModel,
        upscaleScaleFactor: upscalerModel.startsWith("8x") ? 8.0 : 4.0,
      };

      const { id } = await submitGeneration(params);
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 120) {
          clearInterval(interval);
          setUpscaleStatus("Upscale timed out");
          setIsUpscaling(false);
          return;
        }
        const url = await checkHistory(id);
        if (url) {
          clearInterval(interval);
          setUpscaleUrl(url);
          setUpscaleStatus("Upscale complete!");
          setIsUpscaling(false);
          
          onAddHistoryImage({
            id,
            url,
            prompt: `Upscaled with ${upscalerModel}`,
            negativePrompt: "",
            cfg: 1,
            steps: 1,
            width: 1024,
            height: 1024,
            modelName: upscalerModel,
            timestamp: Date.now(),
            stage: "edit",
            isTransparent: false,
            assetType: "texture"
          });
        }
      }, 2000);
    } catch (e: any) {
      setUpscaleStatus(`Error: ${e.message}`);
      setIsUpscaling(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const reductionPercent = () => {
    if (originalSize === 0 || compressedSize === 0) return 0;
    return Math.round(((originalSize - compressedSize) / originalSize) * 100);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-5 p-4 md:p-6 min-h-0 overflow-y-auto">
      {/* Settings column - Top on mobile, Left on desktop */}
      <div className="w-full md:w-80 flex flex-col gap-5 shrink-0">

        {/* Compression Settings */}
        <div className="glass-panel p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Sliders className="w-4 h-4 text-accent-main" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Smart Compression</h3>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex justify-between items-center text-[10px] font-bold text-[#64748b] uppercase">
              <span>Output Quality</span>
              <span className="text-accent-main font-mono">{Math.round(quality * 100)}%</span>
            </label>
            <input 
              type="range" 
              min="0.1" 
              max="1.0" 
              step="0.05" 
              value={quality} 
              onChange={e => setQuality(Number(e.target.value))} 
              className="w-full accent-accent-main" 
              disabled={isCompressing}
            />
            <p className="text-[9px] text-[#475569] leading-tight mt-1">Lower quality reduces file size significantly.</p>
          </div>
          <button 
            onClick={compressImage} 
            disabled={!file || isCompressing} 
            className="btn-primary w-full py-3"
          >
            {isCompressing ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Compressing...</>
            ) : (
              <><Download className="w-4 h-4" /> Compress Asset</>
            )}
          </button>
        </div>

        {/* AI Upscaler Settings */}
        <div className="glass-panel p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <ZoomIn className="w-4 h-4 text-purple" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">AI Upscaler</h3>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Upscaler Model</label>
            <select
              title="Upscaler Model"
              value={upscalerModel}
              onChange={(e) => setUpscalerModel(e.target.value)}
              className="input-field"
              disabled={isUpscaling}
            >
              {UPSCALER_MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={runUpscale} 
            disabled={!file || isUpscaling} 
            className="w-full py-3 bg-purple/10 hover:bg-purple text-purple hover:text-white border border-purple/30 rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)] flex items-center justify-center gap-2"
          >
            {isUpscaling ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Upscaling...</>
            ) : (
              <><ZoomIn className="w-4 h-4" /> Run AI Upscale</>
            )}
          </button>
          {upscaleStatus && (
            <div className="text-xs text-center text-purple animate-pulse py-1 rounded bg-purple/10 border border-purple/20">
              {upscaleStatus}
            </div>
          )}
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">
        
        {/* Upload Zone */}
        {!originalUrl && (
          <div 
            className="flex-1 glass-panel flex flex-col items-center justify-center p-6 border-dashed hover:border-accent-main/40 transition-colors cursor-pointer min-h-[300px]"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDropUrl}
          >
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              <Upload className="w-8 h-8 text-[#94a3b8]" />
            </div>
            <h3 className="font-bold text-white text-lg">Upload Asset</h3>
            <p className="text-xs text-[#64748b] mt-1 mb-4">Drag & drop or click to browse</p>
            <button className="btn-ghost px-6">Select Image</button>
          </div>
        )}

        {/* Preview Split View */}
        {originalUrl && (
          <div className="flex-1 flex flex-col xl:flex-row gap-5 min-h-[400px]">
            {/* Original Box */}
            <div 
              className="flex-1 glass-panel p-4 flex flex-col gap-3 relative"
              onDragOver={handleDragOver}
              onDrop={handleDropUrl}
            >
              <div className="flex justify-between items-center z-10 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 mx-auto w-max mb-2">
                <span className="text-xs font-bold text-white">Original Asset</span>
                <span className="text-xs font-mono text-[#64748b] ml-4 bg-white/5 px-2 py-0.5 rounded">{formatSize(originalSize)}</span>
              </div>
              <div className="flex-1 relative flex items-center justify-center checkerboard rounded-xl border border-white/5 overflow-hidden">
                <img src={originalUrl} alt="Original" className="max-w-full max-h-full object-contain" />
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="btn-ghost text-[10px] w-full mt-2">Upload Different Image</button>
            </div>

            {/* Compressed/Upscaled Box */}
            {(compressedUrl || upscaleUrl || isCompressing || isUpscaling) && (
              <div className="flex-1 glass-panel p-4 flex flex-col gap-3 relative animate-fade-in">
                <div className="flex justify-between items-center z-10 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 mx-auto w-max mb-2">
                  <span className="text-xs font-bold text-accent-main">
                    {upscaleUrl || isUpscaling ? "AI Upscaled" : "Compressed"}
                  </span>
                  {compressedSize > 0 && !upscaleUrl && (
                    <span className="text-xs font-mono text-green ml-4 bg-green/10 border border-green/20 px-2 py-0.5 rounded">
                      {formatSize(compressedSize)} (-{reductionPercent()}%)
                    </span>
                  )}
                </div>
                <div className="flex-1 relative flex items-center justify-center checkerboard rounded-xl border border-white/5 overflow-hidden group">
                  {isCompressing || isUpscaling ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 border-4 border-accent-main/20 border-t-accent-main rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-accent-main tracking-widest uppercase animate-pulse">Processing...</span>
                    </div>
                  ) : compressedUrl || upscaleUrl ? (
                    <>
                      <img src={(upscaleUrl || compressedUrl)!} alt="Result" className="max-w-full max-h-full object-contain" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <a href={(upscaleUrl || compressedUrl)!} download={`asset_${upscaleUrl ? 'upscaled' : 'compressed'}.png`} className="btn-primary shadow-lg">
                          <Download className="w-4 h-4" /> Download
                        </a>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
        
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </div>
    </div>
  );
}
