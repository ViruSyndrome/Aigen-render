"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Sparkles, Settings, Layers, Image as ImageIcon,
  RefreshCw, Download, ChevronDown, ChevronUp, Info,
  ZoomIn, ZoomOut, Maximize, Cuboid, Zap, X
} from "lucide-react";
import JSZip from "jszip";
import { uploadImage, submitGeneration, checkHistory, interruptGeneration } from "@/lib/api";
import { GalleryImage } from "@/lib/db";

interface GeneratorViewProps {
  mode: "merch" | "asset";
  onAddHistoryImage: (img: GalleryImage) => void;
  isBackendOnline: boolean;
  initialParams?: GalleryImage | null;
  onClearInitialParams?: () => void;
}

// ─── Model Config Map ─────────────────────────────────────────────────────────
interface ModelConfig {
  label: string;
  stepsDefault: number;
  stepsMin: number;
  stepsMax: number;
  cfgDefault: number;
  cfgMin: number;
  cfgMax: number;
  sampler: string;
  scheduler: string;
  note: string;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  "black-forest-labs/flux-schnell": {
    label: "Flux Schnell (Fast Cloud)",
    stepsDefault: 4, stepsMin: 1, stepsMax: 8,
    cfgDefault: 1.0, cfgMin: 1.0, cfgMax: 2.0,
    sampler: "euler", scheduler: "simple",
    note: "High-speed cloud model for rapid iteration"
  },
  "black-forest-labs/flux-dev": {
    label: "Flux Dev (Max Quality Cloud)",
    stepsDefault: 20, stepsMin: 10, stepsMax: 50,
    cfgDefault: 3.5, cfgMin: 1.0, cfgMax: 7.0,
    sampler: "euler", scheduler: "simple",
    note: "Slower but highest quality cloud generation"
  },
  "stability-ai/sdxl": {
    label: "SDXL 1.0 (Cloud Standard)",
    stepsDefault: 30, stepsMin: 15, stepsMax: 60,
    cfgDefault: 7.0, cfgMin: 3.0, cfgMax: 15.0,
    sampler: "dpmpp_2m", scheduler: "karras",
    note: "Standard versatile model for most asset types"
  },
  "stability-ai/stable-diffusion-3": {
    label: "Stable Diffusion 3 (Cloud Next-Gen)",
    stepsDefault: 28, stepsMin: 15, stepsMax: 50,
    cfgDefault: 7.0, cfgMin: 3.0, cfgMax: 12.0,
    sampler: "euler_ancestral", scheduler: "karras",
    note: "Excellent prompt adherence and typography"
  }
};

// ─── Preset Config ────────────────────────────────────────────────────────────
interface Preset {
  label: string;
  icon: string;
  description: string;
  model: string;
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
  width: number;
  height: number;
  prompt: string;
  negativePrompt: string;
  useTransparent: boolean;
  mockupType?: "tshirt" | null;
}

const ASSET_PRESETS: Preset[] = [
  {
    label: "Isometric RPG Prop",
    icon: "🎮",
    description: "Low-poly isometric game object icon",
    model: "FLUX.1-schnell-dev-merged-fp8.safetensors",
    steps: 4, cfg: 1.0, sampler: "euler", scheduler: "simple",
    width: 1024, height: 1024,
    prompt: "Isometric 3D game asset icon, a magical glowing wooden treasure chest with gold lock, shimmering blue gemstone inlay and magical runes, 45-degree isometric angle, low-poly stylized game art, soft rim lighting, isolated on pure white background, game-ready icon",
    negativePrompt: "realistic, photograph, blurry, flat 2d, dark background, messy, extra objects, text",
    useTransparent: false,
  },
  {
    label: "Fantasy Weapon",
    icon: "⚔️",
    description: "Detailed game weapon or item icon",
    model: "stability-ai/sdxl",
    steps: 30, cfg: 7.0, sampler: "dpmpp_2m", scheduler: "karras",
    width: 1024, height: 1024,
    prompt: "Fantasy game legendary broadsword weapon icon, ornate silver blade with glowing purple runes etched into steel, filigree gold handle with dragon motif crossguard, pristine side profile silhouette, high-detail AAA game item icon, soft studio lighting, isolated on deep black background",
    negativePrompt: "blurry, low quality, realistic photograph, cluttered background, multiple weapons, perspective distortion",
    useTransparent: false,
  },
  {
    label: "Seamless Texture",
    icon: "🧱",
    description: "Tileable PBR-ready game environment texture",
    model: "black-forest-labs/flux-dev",
    steps: 20, cfg: 3.5, sampler: "euler", scheduler: "simple",
    width: 1024, height: 1024,
    prompt: "Seamless tileable PBR game texture, ancient cracked mossy stone cobblestone floor, overhead orthographic top-down view, physically-based material detail, high-frequency surface detail, uniform flat lighting no shadows, seamlessly repeatable in all directions",
    negativePrompt: "perspective, angled view, shadows, single stones, gaps, border, frame, 3D render",
    useTransparent: false,
  },
  {
    label: "UI Icon / Button",
    icon: "🛡️",
    description: "Fantasy or sci-fi interface icon asset",
    model: "black-forest-labs/flux-schnell",
    steps: 4, cfg: 1.0, sampler: "euler", scheduler: "simple",
    width: 1024, height: 1024,
    prompt: "Mobile RPG game UI icon, polished fantasy shield with ornate golden baroque border, glowing cyan crystalline gem in center, metallic silver frame, flat front-facing orthographic view, glossy premium finish, isolated on transparent, game interface asset",
    negativePrompt: "photograph, dark background, blurry, cluttered, realistic, 3d scene, environment",
    useTransparent: false,
  },
];

// ─── Tooltip Component ────────────────────────────────────────────────────────
function Tooltip({ text, children, position = 'top', className = 'relative group inline-block' }: { text: string; children: React.ReactNode, position?: 'top'|'bottom'|'left'|'right', className?: string }) {
  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  };

  return (
    <div className={className}>
      {children}
      <div className={`absolute ${positions[position]} w-max max-w-[220px] px-3 py-2 bg-black/90 backdrop-blur-xl border border-accent-main/20 rounded-lg text-[11px] font-medium text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-200 ease-out z-[100] text-center leading-relaxed`}>
        {text}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GeneratorView({
  onAddHistoryImage,
  isBackendOnline,
  initialParams,
  onClearInitialParams
}: GeneratorViewProps) {

  const [prompt, setPrompt] = useState<string>("");
  const [negativePrompt, setNegativePrompt] = useState<string>("blurry, low quality, distorted, extra limbs, bad hands");
  const [model, setModel] = useState<string>("FLUX.1-schnell-dev-merged-fp8.safetensors");
  const [lora, setLora] = useState<string>("none");
  const [loraStrength, setLoraStrength] = useState<number>(0.85);
  const [steps, setSteps] = useState<number>(4);
  const [cfg, setCfg] = useState<number>(1.0);
  const [width, setWidth] = useState<number>(1024);
  const [height, setHeight] = useState<number>(1024);
  const [sampler, setSampler] = useState<string>("euler");
  const [scheduler, setScheduler] = useState<string>("simple");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Asset Type structural helpers
  const [assetType, setAssetType] = useState<"sprite" | "texture" | "icon" | "background" | "ui" | null>(null);
  const [artStyle, setArtStyle] = useState<string>("");
  const [viewAngle, setViewAngle] = useState<string>("");
  
  // Settings layout control for mobile
  const [showSettingsMobile, setShowSettingsMobile] = useState<boolean>(false);

  const handleAssetTypeChange = (type: "sprite" | "texture" | "icon" | "background" | "ui") => {
    setAssetType(type);
    if (type === "sprite") {
      setWidth(512); setHeight(1024); setUseTransparent(true); setUseTiling(false);
    } else if (type === "texture") {
      setWidth(512); setHeight(512); setUseTransparent(false); setUseTiling(true);
    } else if (type === "icon" || type === "ui") {
      setWidth(512); setHeight(512); setUseTransparent(true); setUseTiling(false);
    } else if (type === "background") {
      setWidth(1024); setHeight(576); setUseTransparent(false); setUseTiling(false);
    }
  };

  // Rembg & Post-Process
  const [useTransparent, setUseTransparent] = useState<boolean>(false);
  const [bgThreshold, setBgThreshold] = useState<number>(0.35);
  const [bgMethod, setBgMethod] = useState<"inspyrenet" | "clipseg" | "colormask">("inspyrenet");

  // Seamless Tiling
  const [useTiling, setUseTiling] = useState<boolean>(false);

  // Reference Image
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [denoise, setDenoise] = useState<number>(0.5);

  // Runtime
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [currentResultUrl, setCurrentResultUrl] = useState<string | null>(null);
  const [generatingProgress, setGeneratingProgress] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyModelDefaults = useCallback((modelKey: string) => {
    const cfg = MODEL_CONFIGS[modelKey];
    if (cfg) {
      setSteps(cfg.stepsDefault);
      setCfg(cfg.cfgDefault);
      setSampler(cfg.sampler);
      setScheduler(cfg.scheduler);
    }
  }, []);

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    applyModelDefaults(newModel);
  };

  const applyPreset = (preset: Preset) => {
    setPrompt(preset.prompt);
    setNegativePrompt(preset.negativePrompt);
    setModel(preset.model);
    setSteps(preset.steps);
    setCfg(preset.cfg);
    setSampler(preset.sampler);
    setScheduler(preset.scheduler);
    setWidth(preset.width);
    setHeight(preset.height);
    setUseTransparent(preset.useTransparent);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentModelConfig = MODEL_CONFIGS[model];

  useEffect(() => {
    if (initialParams) {
      setPrompt(initialParams.prompt || "");
      setNegativePrompt(initialParams.negativePrompt || "blurry, low quality");
      setModel(initialParams.modelName || "FLUX.1-schnell-dev-merged-fp8.safetensors");
      setSteps(initialParams.steps || 4);
      setCfg(initialParams.cfg || 1.0);
      setWidth(initialParams.width || 1024);
      setHeight(initialParams.height || 1024);
      setUseTransparent(!!initialParams.isTransparent);
      setCurrentResultUrl(initialParams.url);
      if (onClearInitialParams) onClearInitialParams();
    }
  }, [initialParams, onClearInitialParams]);

  const handleRefFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setReferenceFile(file); setReferenceUrl(URL.createObjectURL(file)); }
  };

  const clearReferenceImage = () => {
    setReferenceFile(null); setReferenceUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(z + 0.25, 5));
    } else {
      setZoom((z) => Math.max(z - 0.25, 0.5));
    }
  };

  const runGeneration = async () => {
    try {
      setIsGenerating(true);
      setStatusMessage("Starting generation...");
      setGeneratingProgress(10);
      setCurrentResultUrl(null); // Clear previous result

      let uploadedImageName = "";
      if (referenceFile) {
        setStatusMessage("Uploading reference image...");
        uploadedImageName = await uploadImage(referenceFile);
        setGeneratingProgress(30);
      }

      setStatusMessage("Submitting to backend...");
      
      // Build final prompt from structural pieces + user prompt
      const structuralTags = [];
      if (artStyle) structuralTags.push(artStyle);
      if (viewAngle) structuralTags.push(viewAngle);
      if (useTiling) structuralTags.push("seamless repeatable tiling texture");
      
      const prefix = structuralTags.length > 0 ? `${structuralTags.join(", ")}, ` : "";
      const finalPrompt = prefix + prompt;

      const params: any = {
        prompt: finalPrompt,
        negativePrompt,
        cfg, steps, width, height,
        modelName: model,
        loraName: lora, loraStrength,
        useTransparent,
        uploadedImageName: uploadedImageName || undefined,
        denoiseStrength: referenceFile ? denoise : 1.0,
        bgThreshold, bgMethod, rembgNode: "InspyrenetRembgAdvanced",
        samplerName: sampler, schedulerName: scheduler, useTiling,
      };

      const result = await submitGeneration(params);
      setGeneratingProgress(50);
      setStatusMessage("Rendering...");

      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        setGeneratingProgress(Math.min(95, 50 + attempts * 2));

        if (attempts > 120) {
          clearInterval(interval);
          throw new Error("Generation timed out.");
        }

        const url = await checkHistory(result.id);
        if (url) {
          clearInterval(interval);
          setCurrentResultUrl(url);
          setGeneratingProgress(100);
          setIsGenerating(false);
          setStatusMessage("");
          onAddHistoryImage({
            id: Date.now().toString(), url,
            prompt: finalPrompt, negativePrompt, cfg, steps, width, height,
            modelName: model, timestamp: Date.now(),
            stage: "generate" as const, isTransparent: useTransparent, assetType: assetType || undefined,
          });
        }
      }, 2000);

    } catch (e: any) {
      console.error(e);
      if (e.message === "QUOTA_EXCEEDED") {
        setStatusMessage("Error: Daily quota exceeded.");
      } else {
        setStatusMessage(`Error: ${e.message || "Failed to generate image"}`);
      }
      setIsGenerating(false);
      setGeneratingProgress(0);
    }
  };

  const generatePBRMapsZip = async () => {
    if (!currentResultUrl) return;
    setStatusMessage("Generating Normal and Depth maps...");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentResultUrl;
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const w = canvas.width; const h = canvas.height;
      
      const normalCanvas = document.createElement("canvas");
      normalCanvas.width = w; normalCanvas.height = h;
      const nCtx = normalCanvas.getContext("2d")!;
      const normalData = nCtx.createImageData(w, h);
      
      const getLum = (x: number, y: number) => {
        const px = (Math.max(0, Math.min(w - 1, x)) + Math.max(0, Math.min(h - 1, y)) * w) * 4;
        return (data[px] * 0.299 + data[px+1] * 0.587 + data[px+2] * 0.114) / 255.0;
      };
      
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (x + y * w) * 4;
          const tl = getLum(x-1,y-1), t = getLum(x,y-1), tr = getLum(x+1,y-1);
          const l = getLum(x-1,y), r = getLum(x+1,y);
          const bl = getLum(x-1,y+1), b = getLum(x,y+1), br = getLum(x+1,y+1);
          const dx = (tr + 2*r + br) - (tl + 2*l + bl);
          const dy = (bl + 2*b + br) - (tl + 2*t + tr);
          const dz = 0.5;
          const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
          normalData.data[idx]   = Math.round((dx/len + 1) * 127.5);
          normalData.data[idx+1] = Math.round((dy/len + 1) * 127.5);
          normalData.data[idx+2] = Math.round((dz/len + 1) * 255);
          normalData.data[idx+3] = data[idx+3];
        }
      }
      nCtx.putImageData(normalData, 0, 0);
      
      const depthCanvas = document.createElement("canvas");
      depthCanvas.width = w; depthCanvas.height = h;
      const dCtx = depthCanvas.getContext("2d")!;
      const depthData = dCtx.createImageData(w, h);
      for (let i = 0; i < data.length; i += 4) {
        const lum = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
        const dv = 255 - lum;
        depthData.data[i] = dv; depthData.data[i+1] = dv; depthData.data[i+2] = dv;
        depthData.data[i+3] = data[i+3];
      }
      dCtx.putImageData(depthData, 0, 0);
      
      const zip = new JSZip();
      const getBlob = (c: HTMLCanvasElement) => new Promise<Blob>(res => c.toBlob(b => res(b!), "image/png"));
      zip.file("material_albedo.png", await getBlob(canvas));
      zip.file("material_normal.png", await getBlob(normalCanvas));
      zip.file("material_height_depth.png", await getBlob(depthCanvas));
      const content = await zip.generateAsync({ type: "blob" });
      
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `pbr_material_${Date.now()}.zip`;
      link.click();
      setStatusMessage("");
    };
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      
      {/* ── Center: Workspace (Prompt + Canvas) ────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto p-4 md:p-6 gap-4 md:gap-6 bg-gradient-to-b from-bg-deep to-[#040508]">
        
        {/* PROMPT HERO AREA */}
        <div className="glass-panel p-4 md:p-6 border border-white/10 shadow-2xl relative z-10 animate-fade-in">
          {/* Structural Helpers */}
          <div className="flex flex-wrap gap-2 md:gap-3 mb-4">
            <Tooltip text="Select the type of asset you want to generate. This optimizes the prompt automatically." position="top" className="relative group">
              <select
                value={assetType || ""}
                onChange={(e) => handleAssetTypeChange(e.target.value as any)}
                className="bg-white/5 border border-white/10 text-white text-xs font-semibold py-1.5 px-3 rounded-md outline-none focus:border-accent-main transition-colors w-full"
              >
                <option value="">⚙️ Select Asset Type</option>
                <option value="sprite">🎮 Game Sprite (Isometric)</option>
                <option value="icon">🛡️ UI Icon / Item</option>
                <option value="texture">🧱 Tileable Texture</option>
                <option value="background">🖼️ Scene Background</option>
              </select>
            </Tooltip>
            
            <Tooltip text="Choose an art style to automatically append to your prompt." position="top" className="relative group">
              <select
                value={artStyle}
                onChange={(e) => setArtStyle(e.target.value)}
                className="bg-white/5 border border-white/10 text-white text-xs py-1.5 px-3 rounded-md outline-none focus:border-accent-main transition-colors w-full"
              >
                <option value="">Art Style (Optional)</option>
                <option value="pixel art">Pixel Art</option>
                <option value="low poly 3d">Low Poly 3D</option>
                <option value="hand drawn illustration">Hand Drawn</option>
                <option value="realistic PBR">Realistic PBR</option>
                <option value="anime style">Anime / Cel Shaded</option>
              </select>
            </Tooltip>
            
            <Tooltip text="Select the camera view angle for your asset." position="top" className="relative group hidden md:block">
              <select
                value={viewAngle}
                onChange={(e) => setViewAngle(e.target.value)}
                className="bg-white/5 border border-white/10 text-white text-xs py-1.5 px-3 rounded-md outline-none focus:border-accent-main transition-colors w-full"
              >
                <option value="">View Angle</option>
                <option value="front orthographic view">Front Orthographic</option>
                <option value="top down orthographic view">Top Down</option>
                <option value="isometric 45 degree angle view">Isometric</option>
                <option value="side profile view">Side Profile</option>
              </select>
            </Tooltip>
          </div>

          {/* Prompt Box */}
          <div className="relative">
                }
              }}
            />
            
            {/* Generate Button / Progress */}
            <div className="absolute bottom-3 right-3 left-3 flex justify-between items-center">
              <div className="text-[10px] text-[#64748b] flex items-center gap-1 hidden md:flex">
                <Zap className="w-3 h-3 text-accent-main" /> {assetType === 'texture' ? '15 Credits' : '10 Credits'}
              </div>
              
              <div className="flex-1 md:flex-none flex justify-end">
                {isGenerating ? (
                  <button
                    onClick={interruptGeneration}
                    className="btn-ghost text-red border-red/20 bg-red/5 hover:bg-red/10 h-9 px-4"
                  >
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </button>
                ) : (
                  <button
                    onClick={runGeneration}
                    disabled={!prompt}
                    className="btn-primary w-full md:w-auto h-9 px-6 rounded-lg text-sm shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                  >
                    <Sparkles className="w-4 h-4" /> Generate
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Progress Bar & Error State */}
          {isGenerating && (
            <div className="mt-4 animate-fade-in">
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-accent-main to-purple transition-all duration-300 ease-out shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                  style={{ width: `${generatingProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-accent-main font-bold mt-2 uppercase tracking-wide flex justify-between">
                <span>{statusMessage}</span>
                <span>{Math.round(generatingProgress)}%</span>
              </p>
            </div>
          )}
          {!isGenerating && statusMessage.startsWith("Error:") && (
            <div className="mt-4 bg-red/10 border border-red/20 text-red rounded-lg p-3 text-[13px] animate-fade-in">
              {statusMessage}
            </div>
          )}
        </div>

        {/* RESULT CANVAS */}
        <div className="flex-1 flex flex-col min-h-[300px] relative">
          
          {!currentResultUrl && !isGenerating ? (
            /* Empty State / Presets */
            <div className="flex-1 flex flex-col justify-center gap-6 py-8">
              <h2 className="text-xl md:text-2xl font-display font-bold text-center text-white">Start creating game assets</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
                {ASSET_PRESETS.map((preset, idx) => (
                  <Tooltip key={idx} text={preset.description} position="bottom" className="relative group w-full h-full">
                    <button
                      onClick={() => applyPreset(preset)}
                      className="glass-panel w-full h-full p-5 flex flex-col items-start text-left hover:-translate-y-1 transition-all duration-300 group-hover:border-accent-main/30 group"
                    >
                      <span className="text-3xl mb-3 drop-shadow-md group-hover:scale-110 transition-transform">{preset.icon}</span>
                      <h3 className="text-sm font-bold text-white mb-1">{preset.label}</h3>
                      <p className="text-xs text-[#64748b] leading-relaxed">{preset.description}</p>
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
          ) : (
            /* Result View */
            <div 
              className={`flex-1 glass-panel flex flex-col items-center justify-center p-4 relative overflow-hidden transition-all duration-500 ${useTransparent ? 'checkerboard' : 'bg-black'}`}
              onWheel={handleWheel}
            >
              {/* Toolbar overlay */}
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                <button onClick={() => setZoom(1)} className="p-2 bg-black/60 hover:bg-black border border-white/10 rounded-lg text-white transition-all backdrop-blur-md" title="Reset Zoom">
                  <Maximize className="w-4 h-4" />
                </button>
                {currentResultUrl && (
                  <a href={currentResultUrl} download={`asset_${Date.now()}.png`} className="p-2 bg-accent-main/20 hover:bg-accent-main text-accent-main hover:text-black border border-accent-main/30 rounded-lg transition-all backdrop-blur-md" title="Download">
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>

              {isGenerating && !currentResultUrl ? (
                /* Skeleton Loader */
                <div className="w-full h-full max-w-2xl max-h-[80%] skeleton rounded-xl shadow-2xl flex items-center justify-center border border-white/5">
                  <div className="w-16 h-16 border-4 border-accent-main/20 border-t-accent-main rounded-full animate-spin"></div>
                </div>
              ) : currentResultUrl ? (
                /* Image Output */
                <div 
                  className="relative transition-transform duration-200 ease-out shadow-2xl"
                  style={{ transform: `scale(${zoom})` }}
                >
                  <img 
                    src={currentResultUrl} 
                    alt="Generated Asset" 
                    className="max-w-full max-h-[70vh] object-contain rounded-xl"
                  />
                  {/* Tiling preview hint */}
                  {useTiling && (
                    <div className="absolute -inset-8 -z-10 opacity-30" 
                      style={{ 
                        backgroundImage: `url(${currentResultUrl})`,
                        backgroundSize: '33.33%',
                        filter: 'blur(2px)'
                      }} 
                    />
                  )}
                </div>
              ) : null}

              {/* Extra Tools for current result */}
              {currentResultUrl && !isGenerating && (
                <div className="absolute bottom-4 left-4 z-20 flex gap-2 animate-slide-up">
                  {assetType === 'texture' || useTiling ? (
                    <button onClick={generatePBRMapsZip} className="btn-primary text-xs h-8 px-3 shadow-lg">
                      <Cuboid className="w-3.5 h-3.5" /> Generate PBR Maps
                    </button>
                  ) : !useTransparent ? (
                    <div className="text-[10px] text-amber bg-black/60 px-2 py-1 rounded backdrop-blur-md border border-amber/20">
                      Use Background Remover tool to extract sprite.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Settings Toggle ─────────────────────────────────── */}
      <button 
        onClick={() => setShowSettingsMobile(!showSettingsMobile)}
        className="md:hidden flex items-center justify-center gap-2 p-3 bg-bg-panel border-t border-white/5 text-xs font-bold text-white uppercase tracking-wider"
      >
        <Settings className="w-4 h-4 text-accent-main" />
        {showSettingsMobile ? "Hide Settings" : "Show Settings"}
        {showSettingsMobile ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* ── Right Panel: Settings Drawer ──────────────────────────── */}
      <div className={`
        ${showSettingsMobile ? "flex" : "hidden md:flex"} 
        flex-col w-full md:w-[320px] lg:w-[340px] shrink-0 border-l border-white/[0.06] bg-[#0c0f1d]/80 backdrop-blur-xl h-full overflow-y-auto p-4 z-30 transition-all
      `}>
        <div className="flex items-center gap-2 mb-5">
          <Settings className="w-4 h-4 text-accent-main" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Generation Settings</h3>
        </div>

        <div className="flex flex-col gap-5">
          {/* Model Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider flex items-center justify-between">
              AI Model
              <Tooltip text="Select the AI model for generation. Schnell is faster, Dev is higher quality." position="left">
                <Info className="w-3.5 h-3.5 text-[#64748b] hover:text-accent-main cursor-help transition-colors" />
              </Tooltip>
            </label>
            <select
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="input-field bg-black/40 text-xs font-medium"
            >
              {Object.entries(MODEL_CONFIGS).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <p className="text-[9px] text-accent-main/80 leading-tight mt-1 px-1">{currentModelConfig?.note}</p>
          </div>

          {/* Dimensions */}
          <div className="flex flex-col gap-1.5 border-t border-white/5 pt-4">
            <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Dimensions</label>
            <div className="grid grid-cols-2 gap-2">
              <input title="Width in pixels" type="number" value={width} onChange={e => setWidth(Number(e.target.value))} className="input-field font-mono text-center" />
              <input title="Height in pixels" type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="input-field font-mono text-center" />
            </div>
            <div className="flex gap-1 mt-1">
              {[[1024,1024, "1:1"], [512,1024, "1:2"], [1024,576, "16:9"]].map(([w, h, label]) => (
                <button
                  key={String(label)}
                  title={`Set aspect ratio to ${label}`}
                  onClick={() => { setWidth(w as number); setHeight(h as number); }}
                  className={`flex-1 py-1 rounded text-[9px] font-bold border transition-colors ${width === w && height === h ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-[#64748b] border-white/5 hover:bg-white/5'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Image */}
          <div className="flex flex-col gap-1.5 border-t border-white/5 pt-4">
            <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider flex justify-between">
              Reference Image <span className="text-[9px] text-accent-main bg-accent-main/10 px-1.5 rounded">Img2Img</span>
            </label>
            {!referenceUrl ? (
              <div title="Upload a sketch or reference image to guide the generation (ControlNet)" className="border border-dashed border-white/10 hover:border-accent-main/40 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-black/20 group" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="w-5 h-5 text-[#64748b] group-hover:text-accent-main mb-2" />
                <span className="text-[10px] text-[#94a3b8]">Upload sketch or reference</span>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black group">
                <img src={referenceUrl} alt="Ref" className="w-full h-24 object-cover opacity-70" />
                <button onClick={clearReferenceImage} className="absolute top-1 right-1 p-1 bg-red/80 text-white rounded hover:bg-red transition-colors backdrop-blur-md">
                  <X className="w-3 h-3" />
                </button>
                <div title="How much the AI should modify the reference image. Lower is closer to original." className="absolute bottom-0 inset-x-0 p-2 bg-black/60 backdrop-blur-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-white font-bold">Influence</span>
                    <span className="text-[9px] font-mono text-accent-main">{Math.round(denoise * 100)}%</span>
                  </div>
                  <input type="range" min="0.1" max="1.0" step="0.05" value={denoise} onChange={e => setDenoise(Number(e.target.value))} className="w-full accent-accent-main h-1" />
                </div>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleRefFileChange} className="hidden" accept="image/*" />
          </div>

          {/* Output Toggles */}
          <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
            <Tooltip text="Automatically removes the background so you can drag-and-drop the sprite directly." position="left" className="relative group">
              <label className="flex items-center gap-2 cursor-pointer group p-2 bg-black/20 border border-white/5 rounded-lg hover:border-white/10">
                <input type="checkbox" checked={useTransparent} onChange={e => setUseTransparent(e.target.checked)} className="accent-accent-main" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-white group-hover:text-accent-main transition-colors">Transparent Background</span>
                  <span className="text-[9px] text-[#64748b]">Auto-removes background via Inspyrenet</span>
                </div>
              </label>
            </Tooltip>
            <Tooltip text="Makes the texture seamlessly repeatable in all directions, perfect for game environments." position="left" className="relative group">
              <label className="flex items-center gap-2 cursor-pointer group p-2 bg-black/20 border border-white/5 rounded-lg hover:border-white/10">
                <input type="checkbox" checked={useTiling} onChange={e => setUseTiling(e.target.checked)} className="accent-accent-main" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-white group-hover:text-accent-main transition-colors">Seamless Tiling</span>
                  <span className="text-[9px] text-[#64748b]">Generates repeatable PBR textures</span>
                </div>
              </label>
            </Tooltip>
          </div>

          {/* Advanced Accordion */}
          <div className="border-t border-white/5 pt-4">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex justify-between items-center w-full text-[10px] font-bold text-[#64748b] hover:text-white uppercase tracking-wider transition-colors"
            >
              Advanced Settings
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            
            {showAdvanced && (
              <div className="flex flex-col gap-4 mt-4 animate-slide-up">
                {/* Steps */}
                <div className="flex flex-col gap-1" title="Number of generation steps. More steps yield higher quality but take longer.">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#94a3b8]">Sampling Steps</span>
                    <span className="font-mono text-accent-main">{steps}</span>
                  </div>
                  <input type="range" min={currentModelConfig?.stepsMin || 1} max={currentModelConfig?.stepsMax || 50} value={steps} onChange={e => setSteps(Number(e.target.value))} className="w-full accent-accent-main h-1" />
                </div>
                
                {/* CFG */}
                <div className="flex flex-col gap-1" title="How closely the AI should follow your prompt. Higher values restrict creativity.">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#94a3b8]">CFG Scale (Prompt Weight)</span>
                    <span className="font-mono text-accent-main">{cfg.toFixed(1)}</span>
                  </div>
                  <input type="range" min={currentModelConfig?.cfgMin || 1} max={currentModelConfig?.cfgMax || 15} step="0.5" value={cfg} onChange={e => setCfg(Number(e.target.value))} className="w-full accent-accent-main h-1" />
                </div>

                {/* Negative Prompt */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-[#94a3b8]">Negative Prompt</span>
                  <textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} className="input-field text-[11px] h-16 resize-none" />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
