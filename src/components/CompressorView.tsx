"use client";

import React, { useState, useRef } from "react";
import { Upload, Download, RefreshCw, Sliders, ZoomIn } from "lucide-react";
import { uploadImage, submitGeneration, checkHistory } from "@/lib/api";

const UPSCALER_MODELS = [
  { value: "4x-UltraSharp.pth", label: "4× UltraSharp (Best Detail)" },
  { value: "RealESRGAN_x4plus.pth", label: "4× RealESRGAN (Photorealism)" },
  { value: "4x_NMKD-Siax_200k.pth", label: "4× NMKD-Siax (Anime/Illustration)" },
  { value: "8x_NMKD-Superscale-SP_177000_G.pth", label: "8× Superscale (Max Upscale)" },
];

export default function CompressorView() {
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
        useRedbubble: true,
        upscalerName: upscalerModel,
        upscaleScaleFactor: upscalerModel.startsWith("8x") ? 8.0 : 4.0,
      };

      const { promptId } = await submitGeneration(params);
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 60) {
          clearInterval(interval);
          setUpscaleStatus("Error: timed out.");
          setIsUpscaling(false);
          return;
        }
        const url = await checkHistory(promptId);
        if (url) {
          clearInterval(interval);
          setUpscaleUrl(url);
          setUpscaleStatus("");
          setIsUpscaling(false);
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
    <div className="flex-1 flex gap-5 p-5 min-h-0 overflow-y-auto">
      {/* Settings column */}
      <div className="w-80 flex flex-col gap-4 shrink-0">

        {/* Compression Settings */}
        <div className="glass-panel p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Sliders className="w-4 h-4 text-accent-main" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Compression</h3>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex justify-between items-center text-[10px]">
              <span>Output Quality</span>
              <span className="text-accent-main font-mono">{Math.round(quality * 100)}%</span>
            </label>
            <input type="range" min="0.1" max="1.0" step="0.05" value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value))} disabled={!file} />
            <p className="text-[9px] text-[#475569]">75–85% is the sweet spot. PNG files will be converted to JPEG.</p>
          </div>
          <button onClick={compressImage} disabled={!file || isCompressing}
            className="w-full py-2.5 bg-accent-dim hover:bg-accent-main hover:text-bg-deep text-accent-main text-xs font-semibold rounded-lg border border-accent-main/20 hover:border-transparent transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            {isCompressing
              ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Compressing...</span></>
              : <><RefreshCw className="w-4 h-4" /><span>Compress Image</span></>}
          </button>
        </div>

        {/* AI Upscaler */}
        <div className="glass-panel p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <ZoomIn className="w-4 h-4 text-accent-main" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">AI Upscaler</h3>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px]">Upscale Model</label>
            <select value={upscalerModel} onChange={(e) => setUpscalerModel(e.target.value)}
              className="bg-black/45 text-sm" disabled={!file || isUpscaling}>
              {UPSCALER_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <p className="text-[9px] text-[#475569]">Requires ComfyUI running. Uses the upscale model to 4× or 8× the image resolution.</p>
          </div>
          {upscaleStatus && (
            <div className="text-[10px] text-accent-main flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />{upscaleStatus}
            </div>
          )}
          {upscaleUrl && (
            <a href={upscaleUrl} download={`upscaled_${file?.name}`}
              className="flex items-center gap-1.5 py-1.5 px-2.5 bg-green/10 hover:bg-green text-green hover:text-[#07080f] border border-green/20 hover:border-transparent text-[10px] font-bold rounded-lg transition-all justify-center">
              <Download className="w-3.5 h-3.5" /> Download Upscaled
            </a>
          )}
          <button onClick={runUpscale} disabled={!file || isUpscaling}
            className="w-full py-2.5 bg-white/5 hover:bg-accent-dim hover:text-accent-main text-[#94a3b8] text-xs font-semibold rounded-lg border border-white/8 hover:border-accent-main/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            {isUpscaling
              ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Upscaling...</span></>
              : <><ZoomIn className="w-4 h-4" /><span>Run AI Upscaler</span></>}
          </button>
        </div>

        {/* Image Details */}
        {file && (
          <div className="glass-panel p-4 flex flex-col gap-3.5">
            <div className="border-b border-white/5 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Image Details</h3>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#64748b]">Format:</span>
              <span className="font-semibold text-[#e8edf5]">{file.type.split("/")[1]?.toUpperCase() || "Unknown"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#64748b]">Original Size:</span>
              <span className="font-mono text-[#e8edf5]">{formatSize(originalSize)}</span>
            </div>
            {compressedSize > 0 && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748b]">Compressed:</span>
                  <span className="font-mono text-accent-main font-bold">{formatSize(compressedSize)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-white/5 pt-2">
                  <span className="text-[#64748b]">Reduction:</span>
                  <span className="text-green font-bold bg-green/10 px-2 py-0.5 rounded-full border border-green/20">
                    -{reductionPercent()}% saved
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Workspace */}
      <div className="flex-1 flex flex-col glass-panel overflow-hidden relative min-h-0 bg-black/40">
        {!file ? (
          <div onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/8 hover:border-accent-main/40 m-6 rounded-xl cursor-pointer hover:bg-white/[0.01] transition-all gap-4">
            <Upload className="w-12 h-12 text-[#64748b] animate-bounce" />
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Drag & drop image here</p>
              <p className="text-xs text-[#64748b] mt-1">or click to browse local files</p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          </div>
        ) : (
          <div className="flex-1 flex min-h-0 p-6 gap-6 justify-center items-center">
            {/* Original */}
            <div className="flex-1 flex flex-col h-full min-h-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#64748b] font-bold">Original</span>
                <button onClick={() => { setFile(null); setOriginalUrl(null); setCompressedUrl(null); setUpscaleUrl(null); }}
                  className="text-[9px] text-[#64748b] hover:text-white border border-white/10 hover:border-white/30 px-2 py-0.5 rounded transition-all">
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
                <span className="text-[10px] uppercase tracking-widest text-accent-main font-bold">
                  {upscaleUrl ? "Upscaled Result" : "Compressed Result"}
                </span>
                {(compressedUrl || upscaleUrl) && (
                  <a href={upscaleUrl || compressedUrl!}
                    download={`${upscaleUrl ? "upscaled" : "compressed"}_${file.name}`}
                    className="flex items-center gap-1 py-1 px-2.5 bg-green/10 hover:bg-green text-green hover:text-[#07080f] border border-green/20 hover:border-transparent text-[10px] font-bold rounded-lg transition-all">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                )}
              </div>
              <div className="flex-1 bg-black/60 border border-white/5 rounded-lg overflow-hidden flex items-center justify-center p-2 checkerboard">
                {upscaleUrl || compressedUrl ? (
                  <img src={upscaleUrl || compressedUrl!} alt="Result" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-xs text-[#64748b] text-center">
                    <p>Run Compress or AI Upscale to see result</p>
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
