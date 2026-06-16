"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Sparkles, Settings, HelpCircle, Layers, Layout, Image as ImageIcon,
  RefreshCw, Download, Play, Square, FileArchive, ChevronDown, ChevronUp, Info,
  ZoomIn, ZoomOut, Maximize
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
  "FLUX.1-schnell-dev-merged-fp8.safetensors": {
    label: "FLUX.1 Schnell+Dev Merged (Fast · Text-Clean)",
    stepsDefault: 4, stepsMin: 1, stepsMax: 8,
    cfgDefault: 1.0, cfgMin: 1.0, cfgMax: 2.0,
    sampler: "euler", scheduler: "simple",
    note: "Distilled model — keep CFG at 1.0 and steps 4–8 for best results"
  },
  "flux1-dev-fp8.safetensors": {
    label: "FLUX.1 Dev FP8 (High Detail)",
    stepsDefault: 20, stepsMin: 10, stepsMax: 50,
    cfgDefault: 3.5, cfgMin: 1.0, cfgMax: 7.0,
    sampler: "euler", scheduler: "simple",
    note: "Slower but highest quality. Good for detailed artwork"
  },
  "juggernautXL_ragnarokBy.safetensors": {
    label: "Juggernaut XL Ragnarok (Photorealism)",
    stepsDefault: 30, stepsMin: 15, stepsMax: 60,
    cfgDefault: 7.0, cfgMin: 3.0, cfgMax: 15.0,
    sampler: "dpmpp_2m", scheduler: "karras",
    note: "SDXL-based. High CFG gives strong prompt adherence"
  },
  "retromix.safetensors": {
    label: "RetroMix (Retro / Illustration)",
    stepsDefault: 28, stepsMin: 15, stepsMax: 50,
    cfgDefault: 7.0, cfgMin: 3.0, cfgMax: 12.0,
    sampler: "euler_ancestral", scheduler: "karras",
    note: "SD 1.5-based fine-tune for illustration and retro art"
  },
  "sd3.5_large_fp8_scaled.safetensors": {
    label: "Stable Diffusion 3.5 Large FP8",
    stepsDefault: 28, stepsMin: 15, stepsMax: 50,
    cfgDefault: 4.5, cfgMin: 1.0, cfgMax: 10.0,
    sampler: "euler", scheduler: "simple",
    note: "SD 3.5 architecture. Balanced quality and speed"
  },
  "v1-5-pruned-emaonly.safetensors": {
    label: "SD 1.5 Classic (Lightweight)",
    stepsDefault: 25, stepsMin: 15, stepsMax: 50,
    cfgDefault: 7.0, cfgMin: 3.0, cfgMax: 12.0,
    sampler: "euler_ancestral", scheduler: "karras",
    note: "Original SD 1.5. Fast, wide LoRA support"
  },
  "Sana_1600M_1024px.safetensors": {
    label: "Sana 1600M Ultra-Fast (Direct API)",
    stepsDefault: 20, stepsMin: 5, stepsMax: 40,
    cfgDefault: 4.5, cfgMin: 1.0, cfgMax: 8.0,
    sampler: "euler", scheduler: "simple",
    note: "Runs via separate Sana server (port 8189) — must launch launch_sana.ps1 separately"
  },
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

const MERCH_PRESETS: Preset[] = [
  {
    label: "T-Shirt Print Graphic",
    icon: "👕",
    description: "Bold print-ready graphic for DTG / screen printing",
    model: "FLUX.1-schnell-dev-merged-fp8.safetensors",
    steps: 4, cfg: 1.0, sampler: "euler", scheduler: "simple",
    width: 1024, height: 1024,
    prompt: "Bold vintage distressed t-shirt graphic print, a fierce eagle with spread wings and lightning bolts, heavy screenprint texture, aged ink, retro Americana style, vector-clean outlines, high contrast, isolated graphic element, DTG print ready, no background fill, no border",
    negativePrompt: "photograph, realistic skin, blurry, watermark, text overlay, extra colors, muddy lines, busy background, noise, gradients",
    useTransparent: true,
    mockupType: "tshirt",
  },
  {
    label: "Cute Pop Sticker",
    icon: "✨",
    description: "Die-cut sticker with white outline, glossy finish",
    model: "FLUX.1-schnell-dev-merged-fp8.safetensors",
    steps: 4, cfg: 1.0, sampler: "euler", scheduler: "simple",
    width: 1024, height: 1024,
    prompt: "Cute kawaii die-cut sticker of a chubby smiling boba tea cup wearing tiny sunglasses, sparkles and stars around it, thick clean white outline border, glossy finish, bold flat colors, chibi anime illustration style, isolated on pure white, no shadow, no texture",
    negativePrompt: "realistic, photograph, blurry, dark background, harsh shadows, complex background, messy lines, watermark",
    useTransparent: true,
    mockupType: null,
  },
  {
    label: "Seamless Pattern",
    icon: "🔲",
    description: "Dense tileable repeat pattern for fabric & print",
    model: "flux1-dev-fp8.safetensors",
    steps: 20, cfg: 3.5, sampler: "euler", scheduler: "simple",
    width: 1024, height: 1024,
    prompt: "Seamless tileable surface pattern of tropical monstera leaves and hibiscus flowers, dense fill no gaps, bold flat vector illustration, vivid saturated colors, repeat tile texture, textile print ready, no border, no frame, pattern continues to edges",
    negativePrompt: "border, frame, white space, isolated items, single object, photograph, blurry, dark, realistic",
    useTransparent: false,
    mockupType: null,
  },
  {
    label: "Logo / Mascot Badge",
    icon: "🏆",
    description: "Esports-style mascot emblem or brand logo",
    model: "juggernautXL_ragnarokBy.safetensors",
    steps: 30, cfg: 7.0, sampler: "dpmpp_2m", scheduler: "karras",
    width: 1024, height: 1024,
    prompt: "Modern esports mascot logo badge of a fierce armored wolf head, symmetrical design, bold vector outlines, metallic gold gradient shading, dark navy and gold color palette, circular emblem frame with banner ribbon, clean isolated on solid black background, high contrast",
    negativePrompt: "photograph, blurry, watermark, messy brushwork, realistic fur texture, multiple animals, photorealistic, asymmetric",
    useTransparent: true,
    mockupType: null,
  },
  {
    label: "Poster / Wall Art",
    icon: "🖼️",
    description: "Retro travel poster or decorative wall art",
    model: "flux1-dev-fp8.safetensors",
    steps: 20, cfg: 3.5, sampler: "euler", scheduler: "simple",
    width: 832, height: 1216,
    prompt: "Retro 1970s travel poster of Kyoto Japan at golden hour, iconic red torii gates pathway through autumn maple forest, rich warm orange and deep purple gradient sky, art deco inspired flat illustration, bold geometric composition, limited 5-color palette, WPA poster style",
    negativePrompt: "photograph, realistic, modern, cluttered, text errors, busy composition, dark, gloomy",
    useTransparent: false,
    mockupType: null,
  },
];

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
    mockupType: null,
  },
  {
    label: "Fantasy Weapon Icon",
    icon: "⚔️",
    description: "Detailed game weapon or item icon",
    model: "juggernautXL_ragnarokBy.safetensors",
    steps: 30, cfg: 7.0, sampler: "dpmpp_2m", scheduler: "karras",
    width: 1024, height: 1024,
    prompt: "Fantasy game legendary broadsword weapon icon, ornate silver blade with glowing purple runes etched into steel, filigree gold handle with dragon motif crossguard, pristine side profile silhouette, high-detail AAA game item icon, soft studio lighting, isolated on deep black background",
    negativePrompt: "blurry, low quality, realistic photograph, cluttered background, multiple weapons, perspective distortion",
    useTransparent: false,
    mockupType: null,
  },
  {
    label: "Seamless Ground Texture",
    icon: "🧱",
    description: "Tileable PBR-ready game environment texture",
    model: "flux1-dev-fp8.safetensors",
    steps: 20, cfg: 3.5, sampler: "euler", scheduler: "simple",
    width: 1024, height: 1024,
    prompt: "Seamless tileable PBR game texture, ancient cracked mossy stone cobblestone floor, overhead orthographic top-down view, physically-based material detail, high-frequency surface detail, uniform flat lighting no shadows, seamlessly repeatable in all directions",
    negativePrompt: "perspective, angled view, shadows, single stones, gaps, border, frame, 3D render",
    useTransparent: false,
    mockupType: null,
  },
  {
    label: "UI Icon / Button",
    icon: "🛡️",
    description: "Fantasy or sci-fi interface icon asset",
    model: "FLUX.1-schnell-dev-merged-fp8.safetensors",
    steps: 4, cfg: 1.0, sampler: "euler", scheduler: "simple",
    width: 1024, height: 1024,
    prompt: "Mobile RPG game UI icon, polished fantasy shield with ornate golden baroque border, glowing cyan crystalline gem in center, metallic silver frame, flat front-facing orthographic view, glossy premium finish, isolated on transparent, game interface asset",
    negativePrompt: "photograph, dark background, blurry, cluttered, realistic, 3d scene, environment",
    useTransparent: false,
    mockupType: null,
  },
];

// ─── T-Shirt Mockup Config ────────────────────────────────────────────────────
const TSHIRT_MOCKUPS: Record<string, { src: string; blendMode: string; label: string; swatch: string }> = {
  white: { src: "/tshirt_white.png", blendMode: "multiply",  label: "White", swatch: "#f5f5f5" },
  black: { src: "/tshirt_black.png", blendMode: "screen",    label: "Black", swatch: "#1a1a1a" },
  grey:  { src: "/tshirt_grey.png",  blendMode: "multiply",  label: "Grey",  swatch: "#888888" },
};

// ─── Tooltip Component ────────────────────────────────────────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group inline-flex items-center">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-2.5 py-1.5 bg-[#0d1117] border border-white/10 rounded-lg text-[10px] text-[#94a3b8] shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 text-center leading-relaxed">
        {text}
      </span>
    </span>
  );
}

// ─── Label with Tooltip ───────────────────────────────────────────────────────
function LabelTip({ label, value, tip }: { label: string; value?: React.ReactNode; tip: string }) {
  return (
    <label className="flex justify-between items-center text-[10px]">
      <span className="flex items-center gap-1">
        {label}
        <Tooltip text={tip}>
          <Info className="w-3 h-3 text-[#475569] cursor-help" />
        </Tooltip>
      </span>
      {value !== undefined && <span className="font-mono text-accent-main">{value}</span>}
    </label>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GeneratorView({
  mode,
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

  // Asset Type
  const [assetType, setAssetType] = useState<"sprite" | "texture" | "icon" | "background" | "ui" | null>(null);
  const [lockedSeed, setLockedSeed] = useState<number | null>(null);

  const handleAssetTypeChange = (type: "sprite" | "texture" | "icon" | "background" | "ui") => {
    setAssetType(type);
    if (type === "sprite") {
      setWidth(512); setHeight(1024); setUseTransparent(true); setUseTiling(false);
      setPrompt(prev => prev ? prev + ", isometric RPG character sprite" : "isometric RPG character sprite");
    } else if (type === "texture") {
      setWidth(512); setHeight(512); setUseTransparent(false); setUseTiling(true);
      setPrompt(prev => prev ? prev + ", seamless tileable texture" : "seamless tileable texture");
    } else if (type === "icon") {
      setWidth(256); setHeight(256); setUseTransparent(true); setUseTiling(false);
      setPrompt(prev => prev ? prev + ", flat ui icon, front facing" : "flat ui icon, front facing");
    } else if (type === "background") {
      setWidth(1024); setHeight(576); setUseTransparent(false); setUseTiling(false);
    } else if (type === "ui") {
      setWidth(512); setHeight(512); setUseTransparent(true); setUseTiling(false);
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

    // T-shirt mockup
  const [activeMockup, setActiveMockup] = useState<boolean>(false);
  const [merchType, setMerchType] = useState<"tshirt" | "hoodie" | "mug">("tshirt");
  const [merchSide, setMerchSide] = useState<"front" | "back">("front");
  const [tshirtColor, setTshirtColor] = useState<"white" | "black" | "grey">("white");

  // Runtime
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [currentResultUrl, setCurrentResultUrl] = useState<string | null>(null);
  const [generatingProgress, setGeneratingProgress] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-apply model defaults when model changes
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

  // Apply a full preset config
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
    setActiveMockup(preset.mockupType ? true : false);
    setActiveMockup(false); // Reset to raw view until image is generated
  };

  const currentModelConfig = MODEL_CONFIGS[model];

  // Sync with initialParams from history
  useEffect(() => {
    if (initialParams) {
      setPrompt(initialParams.prompt || "");
      setNegativePrompt(initialParams.negativePrompt || "blurry, low quality, distorted, extra limbs, bad hands");
      setModel(initialParams.modelName || "FLUX.1-schnell-dev-merged-fp8.safetensors");
      setLora(initialParams.loraName || "none");
      setLoraStrength(initialParams.loraStrength ?? 0.85);
      setSteps(initialParams.steps || 4);
      setCfg(initialParams.cfg || 1.0);
      setWidth(initialParams.width || 1024);
      setHeight(initialParams.height || 1024);
      setUseTransparent(!!initialParams.isTransparent);
      setCurrentResultUrl(initialParams.url);
      if (onClearInitialParams) onClearInitialParams();
    }
  }, [initialParams, onClearInitialParams]);

  const handleDimensionPreset = (w: number, h: number) => { setWidth(w); setHeight(h); };

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

  // Core generation pipeline
  const runBatchGeneration = async () => {
    try {
      setIsGenerating(true);
      setStatusMessage("Starting batch generation (4 views)...");
      setGeneratingProgress(10);
      setActiveMockup(false);

      const directions = ["front view", "back view", "left side view", "right side view"];
      const spriteGroupId = Date.now().toString();
      
      let completed = 0;
      
      for (const direction of directions) {
        setStatusMessage(`Generating ${direction}...`);
        
        const finalPrompt = `${prompt}, ${direction}`;
        const params: any = {
          prompt: finalPrompt,
          negativePrompt,
          cfg, steps, width, height,
          modelName: model,
          loraName: lora, loraStrength,
          useTransparent,
          denoiseStrength: 1.0,
          bgThreshold, bgMethod, rembgNode: "InspyrenetRembgAdvanced",
          samplerName: sampler, schedulerName: scheduler, useTiling, seed: lockedSeed || undefined
        };

        const result = await submitGeneration(params);
        
        // Wait for generation to complete
        if (!result.promptId.startsWith("sana_immediate:")) {
           let attempts = 0;
           let found = false;
           while (attempts < 120 && !found) {
             attempts++;
             await new Promise(r => setTimeout(r, 2000));
             const url = await checkHistory(result.promptId);
             if (url) {
               onAddHistoryImage({
                 id: Date.now().toString() + Math.random().toString(), url,
                 prompt: finalPrompt, negativePrompt, cfg, steps, width, height,
                 modelName: model, timestamp: Date.now(),
                 stage: "generate" as const, isTransparent: useTransparent,
                 assetType: assetType || undefined,
                 spriteGroupId, tags: [direction.replace(' view', '')]
               });
               found = true;
               setCurrentResultUrl(url); // show latest
             }
           }
        } else {
           const dataUrl = result.promptId.replace("sana_immediate:", "");
           onAddHistoryImage({
             id: Date.now().toString() + Math.random().toString(), url: dataUrl,
             prompt: finalPrompt, negativePrompt, cfg, steps, width, height,
             modelName: model, timestamp: Date.now(),
             stage: "generate" as const, isTransparent: useTransparent,
             assetType: assetType || undefined,
             spriteGroupId, tags: [direction.replace(' view', '')]
           });
           setCurrentResultUrl(dataUrl);
        }
        
        completed++;
        setGeneratingProgress(10 + (completed / 4) * 90);
      }
      
      setStatusMessage("");
      setIsGenerating(false);

    } catch (e: any) {
      console.error(e);
      if (e.message === "QUOTA_EXCEEDED") {
        setStatusMessage("Error: Daily quota exceeded.");
      } else {
        setStatusMessage(`Error: ${e.message || "Failed to generate batch"}`);
      }
      setIsGenerating(false);
      setGeneratingProgress(0);
    }
  };

  const runGeneration = async () => {
    try {
      setIsGenerating(true);
      setStatusMessage("Starting generation request...");
      setGeneratingProgress(10);
      setActiveMockup(false);

      let uploadedImageName = "";
      if (referenceFile) {
        setStatusMessage("Uploading reference image...");
        uploadedImageName = await uploadImage(referenceFile);
        setGeneratingProgress(30);
      }

      setStatusMessage("Submitting to backend...");
      const finalPrompt = prompt + (useTiling ? ", seamless repeatable tiling texture, repeating patterns" : "");

      const params: any = {
        prompt: finalPrompt,
        negativePrompt,
        cfg,
        steps,
        width,
        height,
        modelName: model,
        loraName: lora,
        loraStrength,
        useTransparent,
        uploadedImageName: uploadedImageName || undefined,
        denoiseStrength: referenceFile ? denoise : 1.0,
        bgThreshold,
        bgMethod,
        rembgNode: "InspyrenetRembgAdvanced",
        samplerName: sampler,
        schedulerName: scheduler,
        useTiling, seed: lockedSeed || undefined,
      };

      const result = await submitGeneration(params);
      setGeneratingProgress(50);

      // SANA IMMEDIATE: the result is a base64 data URL embedded in the promptId
      if (result.promptId.startsWith("sana_immediate:")) {
        const dataUrl = result.promptId.replace("sana_immediate:", "");
        setCurrentResultUrl(dataUrl);
        setGeneratingProgress(100);
        setIsGenerating(false);
        setStatusMessage("");
        /* activeMockup replaced by activeMockup */
        onAddHistoryImage({
          id: Date.now().toString(), url: dataUrl,
          prompt: finalPrompt, negativePrompt, cfg, steps, width, height,
          modelName: model, timestamp: Date.now(),
          stage: "generate" as const, isTransparent: useTransparent, assetType: assetType || undefined,
        });
        return;
      }

      if (result.promptId.startsWith("mock_")) {
        setStatusMessage("Simulating generation in Cloud mode...");
      } else {
        setStatusMessage("Running AI rendering model...");
      }

      // Poll ComfyUI history endpoint
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        setGeneratingProgress(Math.min(95, 50 + attempts * 2));

        if (attempts > 120) { // 4 minute timeout
          clearInterval(interval);
          throw new Error("AI generation timed out. The queue may be busy — try again.");
        }

        const url = await checkHistory(result.promptId);
        if (url) {
          clearInterval(interval);
          setCurrentResultUrl(url);
          setGeneratingProgress(100);
          setIsGenerating(false);
          setStatusMessage("");
          /* activeMockup replaced by activeMockup */
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
        setStatusMessage("Error: Daily quota exceeded. Please try again tomorrow or run in local mode.");
      } else {
        setStatusMessage(`Error: ${e.message || "Failed to generate image"}`);
      }
      setIsGenerating(false);
      setGeneratingProgress(0);
    }
  };

  const handleInterrupt = async () => {
    await interruptGeneration();
    setIsGenerating(false);
    setStatusMessage("Generation canceled.");
    setGeneratingProgress(0);
  };

  // PBR Maps ZIP export
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

  const presets = mode === "merch" ? MERCH_PRESETS : ASSET_PRESETS;
  const activeMockupConfig = TSHIRT_MOCKUPS[tshirtColor];

  return (
    <div className="flex-1 flex gap-5 p-5 min-h-0 overflow-y-auto">
      {/* ── Left Panel: Settings ─────────────────────────────────────── */}
      <div className="w-80 flex flex-col gap-4 shrink-0 overflow-y-auto pr-1">

        {/* Tool Presets */}
        <div className="glass-panel p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Layout className="w-4 h-4 text-accent-main" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Tool Presets</h3>
            <Tooltip text="Presets configure the model, steps, CFG, dimensions, and a production-quality prompt all at once.">
              <Info className="w-3.5 h-3.5 text-[#475569] ml-auto cursor-help" />
            </Tooltip>
          </div>
          <div className="flex flex-col gap-2">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => applyPreset(preset)}
                className="w-full text-left p-3 bg-white/2 hover:bg-white/5 rounded-lg border border-white/5 hover:border-accent-main/20 transition-all duration-200 group"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base leading-none">{preset.icon}</span>
                  <span className="text-xs font-bold text-white group-hover:text-accent-main transition-colors">{preset.label}</span>
                </div>
                <p className="text-[10px] text-[#64748b] pl-6">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Generation Config */}
        <div className="glass-panel p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Settings className="w-4 h-4 text-accent-main" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Generation Config</h3>
          </div>

          {/* Model Selector */}
          <div className="flex flex-col gap-1.5">
            <LabelTip label="AI Rendering Model" tip="Each model has different optimal step counts and CFG values — these will auto-adjust when you change models." />
            <select title="Select Model"
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="bg-black/45 text-sm"
              disabled={isGenerating}
            >
              {Object.entries(MODEL_CONFIGS).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            {currentModelConfig && (
              <p className="text-[9px] text-[#475569] leading-relaxed">{currentModelConfig.note}</p>
            )}
          </div>

          {/* Dimensions */}
          <div className="flex flex-col gap-1.5">
            <LabelTip label="Image Dimensions" tip="Square 1:1 is best for icons and stickers. Portrait 2:3 for posters. Landscape for banners." />
            <div className="flex gap-2">
              <button onClick={() => handleDimensionPreset(1024, 1024)}
                className={`flex-1 py-1.5 rounded border text-center text-xs font-bold transition-all ${width === 1024 && height === 1024 ? "bg-accent-dim text-accent-main border-accent-main/20" : "bg-transparent text-[#94a3b8] border-white/5"}`}
              >1:1</button>
              <button onClick={() => handleDimensionPreset(832, 1216)}
                className={`flex-1 py-1.5 rounded border text-center text-xs font-bold transition-all ${width === 832 && height === 1216 ? "bg-accent-dim text-accent-main border-accent-main/20" : "bg-transparent text-[#94a3b8] border-white/5"}`}
              >2:3</button>
              <button onClick={() => handleDimensionPreset(1216, 832)}
                className={`flex-1 py-1.5 rounded border text-center text-xs font-bold transition-all ${width === 1216 && height === 832 ? "bg-accent-dim text-accent-main border-accent-main/20" : "bg-transparent text-[#94a3b8] border-white/5"}`}
              >3:2</button>
            </div>
          </div>

          {/* Steps Slider */}
          <div className="flex flex-col gap-1.5">
            <LabelTip
              label="Sampling Steps"
              value={steps}
              tip={`More steps = more detail but slower. Range for this model: ${currentModelConfig?.stepsMin}–${currentModelConfig?.stepsMax}`}
            />
            <input title="Prompt Input" type="range"
              min={currentModelConfig?.stepsMin ?? 1}
              max={currentModelConfig?.stepsMax ?? 50}
              value={steps}
              onChange={(e) => setSteps(parseInt(e.target.value))}
            />
          </div>

          {/* CFG Slider */}
          <div className="flex flex-col gap-1.5">
            <LabelTip
              label="CFG Scale"
              value={cfg.toFixed(1)}
              tip={`How strictly to follow the prompt. Higher = more literal. FLUX distilled models need 1.0. Range: ${currentModelConfig?.cfgMin}–${currentModelConfig?.cfgMax}`}
            />
            <input title="Negative Prompt Input" type="range"
              min={currentModelConfig?.cfgMin ?? 1.0}
              max={currentModelConfig?.cfgMax ?? 15.0}
              step="0.5"
              value={cfg}
              onChange={(e) => setCfg(parseFloat(e.target.value))}
            />
          </div>

          {/* Reference Image */}
          <div className="flex flex-col gap-2">
            <LabelTip label="Image-to-Image Reference" tip="Upload an image to use as a starting point. Adjust Denoise Strength to control how much the output differs from your reference." />
            {!referenceUrl ? (
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border border-dashed border-white/12 hover:border-accent-main/40 rounded-lg flex flex-col items-center justify-center gap-1.5 bg-black/20 text-[#64748b] hover:text-[#94a3b8] transition-all">
                <ImageIcon className="w-6 h-6" />
                <span className="text-[10px] font-semibold">Load Reference Image</span>
              </button>
            ) : (
              <div className="relative border border-white/8 rounded-lg overflow-hidden h-24 bg-black/40 group">
                <img src={referenceUrl} alt="Reference" className="w-full h-full object-contain p-1" />
                <button onClick={clearReferenceImage}
                  className="absolute top-1 right-1 p-1 bg-black/85 hover:bg-red text-white text-[10px] font-bold rounded shadow transition-colors">
                  Clear
                </button>
              </div>
            )}
            <input title="Width" type="file" ref={fileInputRef} onChange={handleRefFileChange} accept="image/*" className="hidden" />
            {referenceUrl && (
              <div className="flex flex-col gap-1.5">
                <LabelTip label="Denoise Strength" value={denoise.toFixed(2)} tip="0.1 = barely changes reference. 0.9 = nearly ignores it. 0.4–0.6 is good for style transfer." />
                <input title="Height" type="range" min="0.1" max="0.95" step="0.05" value={denoise} onChange={(e) => setDenoise(parseFloat(e.target.value))} />
              </div>
            )}
          </div>
        </div>

        {/* Feature Modifiers */}
        <div className="glass-panel p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Layers className="w-4 h-4 text-accent-main" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Feature Modifiers</h3>
          </div>

          <div className="flex flex-col gap-3">
            {/* Transparent BG */}
            <label className="checkbox-label">
              <input type="checkbox" checked={useTransparent} onChange={(e) => setUseTransparent(e.target.checked)} />
              <span className="flex items-center gap-1.5">
                Transparent Background
                <Tooltip text="Removes the background using AI matting (InspyrenetRembg). Best for stickers, icons, and print graphics.">
                  <Info className="w-3 h-3 text-[#475569] cursor-help" />
                </Tooltip>
              </span>
            </label>
            {useTransparent && (
              <div className="flex flex-col gap-2 pl-5 border-l border-white/8">
                <div className="flex flex-col gap-1">
                  <LabelTip label="Matting Method" tip="Inspyrenet is the best general-purpose AI matte. CLIPSeg lets you specify what to remove by text." />
                  <select title="LoRA" value={bgMethod} onChange={(e) => setBgMethod(e.target.value as any)} className="bg-black/45 text-[11px] p-1 h-7 rounded">
                    <option value="inspyrenet">AI Inspyrenet (Best)</option>
                    <option value="clipseg">CLIPSeg Text Mask</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <LabelTip label="Fringe Trim" value={bgThreshold.toFixed(2)} tip="Higher values trim more edge pixels. Increase if you see a white halo around the subject." />
                  <input title="LoRA Strength" type="range" min="0.1" max="0.8" step="0.05" value={bgThreshold} onChange={(e) => setBgThreshold(parseFloat(e.target.value))} className="h-2" />
                </div>
              </div>
            )}

            {/* Seamless Tiling (Asset mode) */}
            {mode === "asset" && (
              <label className="checkbox-label">
                <input type="checkbox" checked={useTiling} onChange={(e) => setUseTiling(e.target.checked)} />
                <span className="flex items-center gap-1.5">
                  Seamless Repeatable Texture
                  <Tooltip text="Uses asymmetric tiling node to make the output tile seamlessly in all directions. Perfect for game textures.">
                    <Info className="w-3 h-3 text-[#475569] cursor-help" />
                  </Tooltip>
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Negative Prompt */}
        <div className="glass-panel p-4 flex flex-col gap-2">
          <LabelTip label="Negative Prompt" tip="Describe what you DON'T want in the image. Presets auto-fill this for you." />
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            className="w-full bg-black/40 border border-white/8 focus:border-accent-main rounded-lg py-2 px-3 text-[11px] text-[#94a3b8] resize-none h-16 outline-none transition-all"
            placeholder="Things to avoid in the output..."
          />
        </div>

        {/* Advanced Settings */}
        <div className="glass-panel p-4 flex flex-col gap-2.5">
          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-left text-xs font-bold text-[#94a3b8] hover:text-white uppercase tracking-wider flex items-center justify-between">
            <span>Advanced Sampler Settings</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showAdvanced && (
            <div className="flex flex-col gap-4 mt-3 pt-3 border-t border-white/5">
              <div className="flex flex-col gap-1.5">
                <LabelTip label="Sampler" tip="Euler is fast and reliable. DPM++ 2M Karras produces very sharp details. Ancestral adds variation." />
                <select title="Upscale Model" value={sampler} onChange={(e) => setSampler(e.target.value)} className="bg-black/45 text-sm">
                  <option value="euler">euler</option>
                  <option value="euler_ancestral">euler_ancestral</option>
                  <option value="dpmpp_2m">dpmpp_2m</option>
                  <option value="dpmpp_2m_sde">dpmpp_2m_sde</option>
                  <option value="heun">heun</option>
                  <option value="lcm">lcm</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <LabelTip label="Scheduler" tip="Karras gives sharper results at fewer steps. Simple is best for FLUX models." />
                <select title="Background Removal Node" value={scheduler} onChange={(e) => setScheduler(e.target.value)} className="bg-black/45 text-sm">
                  <option value="simple">simple</option>
                  <option value="normal">normal</option>
                  <option value="karras">karras</option>
                  <option value="exponential">exponential</option>
                  <option value="sgm_uniform">sgm_uniform</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel: Preview ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col glass-panel overflow-hidden relative min-h-0 bg-black/40">

        {/* Top toolbar when image is ready */}
        {currentResultUrl && !isGenerating && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 bg-black/20 shrink-0">
            {activeMockup && (
              <>
                <button
                  onClick={() => setActiveMockup(!activeMockup)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeMockup ? "bg-accent-dim text-accent-main border-accent-main/20" : "bg-white/3 text-[#94a3b8] border-white/8 hover:border-white/20"}`}
                >
                  {activeMockup ? "👕 Mockup" : "🖼️ Raw Output"}
                </button>
                <div className="flex items-center gap-1.5 border-l border-white/8 pl-3">
                  <span className="text-[10px] text-[#64748b]">Shirt:</span>
                  {(Object.entries(TSHIRT_MOCKUPS) as [string, typeof TSHIRT_MOCKUPS[string]][]).map(([key, val]) => (
                    <button key={key}
                      onClick={() => setTshirtColor(key as any)}
                      title={val.label}
                      className={`w-6 h-6 rounded-full border-2 transition-all shadow ${tshirtColor === key ? "border-accent-main scale-125 ring-1 ring-accent-main/40" : "border-white/20 hover:border-white/60"}`}
                      style={{ background: val.swatch }}
                    />
                  ))}
                </div>
              </>
            )}
            <div className="ml-auto flex gap-2">
              <a href={currentResultUrl} download={`aigen_${Date.now()}.png`}
                className="p-2 bg-green/20 hover:bg-green text-green hover:text-[#07080f] border border-green/30 hover:border-transparent rounded-lg transition-all shadow-md flex items-center gap-1.5 text-xs font-bold"
                title="Download Image">
                <Download className="w-4 h-4" /> Download
              </a>
              {mode === "asset" && (
                <button onClick={generatePBRMapsZip}
                  className="p-2 bg-accent-dim hover:bg-accent-main hover:text-bg-deep border border-accent-main/20 hover:border-transparent text-accent-main rounded-lg transition-all shadow-md flex items-center gap-1.5 text-xs font-bold"
                  title="Export PBR Material Maps (.zip)">
                  <FileArchive className="w-4 h-4" /> Export PBR
                </button>
              )}
            </div>
          </div>
        )}

        {/* Central Workspace */}
        <div className="flex-1 flex items-center justify-center p-6 relative min-h-0">
          {!currentResultUrl && !isGenerating ? (
            <div className="empty-state">
              <Sparkles className="w-12 h-12 text-[#64748b]" />
              <div>
                <p className="text-sm font-semibold text-white">Pick a preset or write a prompt</p>
                <p className="text-xs text-[#64748b] mt-1">Presets configure the model and all settings automatically</p>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="spinner" />
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-semibold text-white">Generating Artwork...</p>
                <p className="text-[11px] text-accent-main font-mono max-w-sm overflow-hidden text-ellipsis whitespace-nowrap">{statusMessage}</p>
              </div>
              <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-to-r from-accent-main to-accent-hover transition-all duration-500 shadow-[0_0_8px_var(--accent-glow)]"
                  style={{ width: `${generatingProgress}%` }} />
              </div>
            </div>
          ) : activeMockup && activeMockup ? (
            /* T-Shirt Mockup View — real photo template + CSS blend mode */
            <div 
              className="relative flex items-center justify-center w-full h-full p-4 overflow-hidden bg-[#050505] group"
              onWheel={handleWheel}
            >
              <div 
                className="relative flex max-w-[420px] max-h-full shrink-0 transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              >
                {/* Real T-shirt photo */}
                <img
                  src={activeMockupConfig.src}
                  alt="T-shirt mockup"
                  className="max-w-full max-h-full object-contain select-none block"
                  draggable={false}
                />
                {/* Design overlay — positioned over chest area */}
                <div
                  className="absolute top-0 left-0 w-full h-full flex items-start justify-center pointer-events-none"
                  style={{ paddingTop: "22%" }}
                >
                  <img
                    src={currentResultUrl!}
                    alt="Design"
                    className="object-contain"
                    style={{
                      width: "38%",
                      maxHeight: "42%",
                      mixBlendMode: activeMockupConfig.blendMode as any,
                    }}
                  />
                </div>
              </div>
              {/* Zoom Controls Overlay */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="p-1.5 hover:bg-white/10 rounded text-white" title="Zoom Out">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button onClick={() => setZoom(1)} className="px-2 text-[10px] font-mono text-white font-bold hover:bg-white/10 rounded" title="Reset Zoom">
                  {Math.round(zoom * 100)}%
                </button>
                <button onClick={() => setZoom(z => Math.min(z + 0.25, 5))} className="p-1.5 hover:bg-white/10 rounded text-white" title="Zoom In">
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Raw Output View */
            <div 
              className="max-w-full max-h-full flex items-center justify-center relative checkerboard rounded-lg p-2 overflow-hidden shadow-2xl group"
              onWheel={handleWheel}
            >
              <img
                src={currentResultUrl!}
                alt="Generated Output"
                className="max-w-full max-h-full object-contain rounded-md transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                draggable={true}
                onDragStart={(e) => {
                  if (currentResultUrl) {
                    e.dataTransfer.setData("text/plain", currentResultUrl);
                  }
                }}
              />
              {/* Zoom Controls Overlay */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="p-1.5 hover:bg-white/10 rounded text-white" title="Zoom Out">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button onClick={() => setZoom(1)} className="px-2 text-[10px] font-mono text-white font-bold hover:bg-white/10 rounded" title="Reset Zoom">
                  {Math.round(zoom * 100)}%
                </button>
                <button onClick={() => setZoom(z => Math.min(z + 0.25, 5))} className="p-1.5 hover:bg-white/10 rounded text-white" title="Zoom In">
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Prompt Bar */}
        <div className="p-4 border-t border-[#ffffff]/8 bg-[#0a0c16]/50 backdrop-blur-md flex items-center gap-4">
          <div className="flex-1 relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === "merch"
                ? "Describe your merch design... or click a preset above to auto-fill →"
                : "Describe your game asset or texture... or click a preset above →"}
              className="w-full bg-black/40 border border-white/8 focus:border-accent-main rounded-xl py-3 px-4 pr-12 text-sm text-white resize-none h-14 outline-none transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (prompt && !isGenerating) runGeneration();
                }
              }}
            />
          </div>
          {isGenerating ? (
            <button onClick={handleInterrupt}
              className="py-3 px-6 bg-[#ef4444] hover:bg-[#ef4444]/90 text-white font-bold rounded-xl transition-all shadow-md text-sm uppercase tracking-wide flex items-center gap-1.5 shrink-0 cursor-pointer">
              <Square className="w-4 h-4" /> Stop
            </button>
          ) : (
            <>
              {assetType === "sprite" && (
                <button onClick={runBatchGeneration} disabled={!prompt || !isBackendOnline}
                  className="py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white disabled:opacity-45 disabled:cursor-not-allowed font-bold rounded-xl transition-all shadow-lg text-sm uppercase flex items-center gap-1.5 shrink-0 cursor-pointer">
                  <Layers className="w-4 h-4 fill-white" /> Generate 4 Views
                </button>
              )}
              
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => setLockedSeed(lockedSeed ? null : Math.floor(Math.random() * 4294967295))}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-bold border transition-all ${
                    lockedSeed
                      ? "bg-purple-500/20 text-purple-400 border-purple-500/50"
                      : "bg-black/40 text-[#64748b] border-white/10 hover:text-white"
                  }`}
                  title="Locking the seed ensures visual consistency across generations">
                  {lockedSeed ? "🔒 Style Locked" : "🔓 Lock Style (Seed)"}
                </button>
              </div>
              <button onClick={runGeneration} disabled={!prompt || !isBackendOnline}
                className="py-3 px-6 bg-gradient-to-r from-accent-main to-[#0099ff] hover:from-accent-hover hover:to-[#33aaff] text-bg-deep disabled:opacity-45 disabled:cursor-not-allowed font-bold rounded-xl transition-all shadow-lg hover:shadow-[0_0_15px_rgba(0,229,255,0.3)] text-sm uppercase tracking-wide flex items-center gap-1.5 shrink-0 cursor-pointer">
                <Play className="w-4 h-4 fill-bg-deep" /> Generate
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
