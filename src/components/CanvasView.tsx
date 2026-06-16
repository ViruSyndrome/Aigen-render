"use client";

import React, { useState, useRef, useEffect } from "react";
import { Compass, Brush, Eraser, Trash2, Download, Grid, Plus, X } from "lucide-react";
import { GalleryImage } from "@/lib/db";

interface CanvasViewProps {
  history: GalleryImage[];
  spriteFrames: GalleryImage[];
  setSpriteFrames: React.Dispatch<React.SetStateAction<GalleryImage[]>>;
}

export default function CanvasView({ history, spriteFrames, setSpriteFrames }: CanvasViewProps) {
  const [subTab, setSubTab] = useState<"draw" | "sprites">("draw");

  // --- DRAWING PAD STATE ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#00e5ff");
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");

  // --- SPRITE SHEET STATE ---

  const [columns, setColumns] = useState<number>(4);
  const spriteCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize drawing canvas
  useEffect(() => {
    if (subTab === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Clear with transparent/black
        ctx.fillStyle = "rgba(0, 0, 0, 0)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [subTab]);

  // Drawing pad handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = tool === "eraser" ? "rgba(0,0,0,1)" : color;
    ctx.lineWidth = brushSize;
    
    // For eraser we use destination-out to erase transparently
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
    }

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const downloadDrawing = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `sketch_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const url = e.dataTransfer.getData("text/plain");
    if (url && canvasRef.current) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.globalCompositeOperation = "source-over";
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = url;
    }
  };

  // Sprite Sheet compiler handlers
  const addFrame = (img: GalleryImage) => {
    setSpriteFrames([...spriteFrames, img]);
  };

  const removeFrame = (index: number) => {
    const updated = [...spriteFrames];
    updated.splice(index, 1);
    setSpriteFrames(updated);
  };

  const compileSpriteSheet = () => {
    if (spriteFrames.length === 0 || !spriteCanvasRef.current) return;
    const canvas = spriteCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // We assume all frames are equal square dimensions (e.g. 512x512)
    // We will load the images asynchronously and draw them in a grid.
    const frameSize = 256;
    const cols = columns;
    const rows = Math.ceil(spriteFrames.length / cols);

    canvas.width = cols * frameSize;
    canvas.height = rows * frameSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let loadedCount = 0;
    spriteFrames.forEach((frame, idx) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = frame.url;
      img.onload = () => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        ctx.drawImage(img, col * frameSize, row * frameSize, frameSize, frameSize);
        
        loadedCount++;
        if (loadedCount === spriteFrames.length) {
          // Download directly
          const link = document.createElement("a");
          link.download = `spritesheet_${Date.now()}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        }
      };
    });
  };

  return (
    <div className="flex-1 flex gap-5 p-5 min-h-0 overflow-y-auto">
      {/* Settings Column */}
      <div className="w-80 flex flex-col gap-4 shrink-0">
        <div className="glass-panel p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Compass className="w-4 h-4 text-accent-main" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Canvas Toolset</h3>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSubTab("draw")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                subTab === "draw"
                  ? "bg-accent-dim text-accent-main border-accent-main/30 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                  : "bg-transparent text-[#94a3b8] border-white/5 hover:border-white/18 hover:text-white"
              }`}
            >
              <Brush className="w-3.5 h-3.5" />
              <span>Sketchpad</span>
            </button>
            <button
              onClick={() => setSubTab("sprites")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                subTab === "sprites"
                  ? "bg-accent-dim text-accent-main border-accent-main/30 shadow-[0_0_12px_rgba(0,229,255,0.15)]"
                  : "bg-transparent text-[#94a3b8] border-white/5 hover:border-white/18 hover:text-white"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Stitcher</span>
            </button>
          </div>
        </div>

        {/* Dynamic Tool Settings */}
        {subTab === "draw" ? (
          <div className="glass-panel p-4 flex flex-col gap-4">
            <div className="border-b border-white/5 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Brush controls</h3>
            </div>

            {/* Brush Tool Toggles */}
            <div className="flex gap-2">
              <button
                onClick={() => setTool("brush")}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-medium border flex items-center justify-center gap-1 transition-all ${
                  tool === "brush" ? "bg-accent-dim text-accent-main border-accent-main/20" : "bg-transparent text-[#94a3b8] border-white/5"
                }`}
              >
                <Brush className="w-3 h-3" /> Brush
              </button>
              <button
                onClick={() => setTool("eraser")}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-medium border flex items-center justify-center gap-1 transition-all ${
                  tool === "eraser" ? "bg-accent-dim text-accent-main border-accent-main/20" : "bg-transparent text-[#94a3b8] border-white/5"
                }`}
              >
                <Eraser className="w-3 h-3" /> Eraser
              </button>
            </div>

            {/* Color picker */}
            {tool === "brush" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px]">Brush Color</label>
                <div className="flex items-center gap-2">
                  <input title="Upload Image"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-8"
                  />
                  <span className="text-xs font-mono font-bold text-white uppercase">{color}</span>
                </div>
              </div>
            )}

            {/* Size slider */}
            <div className="flex flex-col gap-1.5">
              <label className="flex justify-between text-[10px]">
                <span>Brush Size</span>
                <span className="font-mono text-accent-main">{brushSize}px</span>
              </label>
              <input title="Input Value"
                type="range"
                min="1"
                max="50"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <button
                onClick={downloadDrawing}
                className="w-full py-2 bg-green/10 hover:bg-green text-green hover:text-[#07080f] text-xs font-bold rounded-lg border border-green/20 hover:border-transparent transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export Sketch
              </button>
              <button
                onClick={clearCanvas}
                className="w-full py-2 bg-red/10 hover:bg-red text-red hover:text-white text-xs font-bold rounded-lg border border-red/20 hover:border-transparent transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Sketch
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-4 flex flex-col gap-4">
            <div className="border-b border-white/5 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Compiler controls</h3>
            </div>

            {/* Columns selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px]">Grid Columns</label>
              <select title="Blend Mode"
                value={columns}
                onChange={(e) => setColumns(parseInt(e.target.value))}
                className="bg-black/45 text-sm"
              >
                <option value="2">2 Columns</option>
                <option value="3">3 Columns</option>
                <option value="4">4 Columns</option>
                <option value="6">6 Columns</option>
                <option value="8">8 Columns</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <button
                onClick={compileSpriteSheet}
                disabled={spriteFrames.length === 0}
                className="w-full py-2.5 bg-accent-dim hover:bg-accent-main hover:text-bg-deep text-accent-main text-xs font-semibold rounded-lg border border-accent-main/20 hover:border-transparent transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Grid className="w-4 h-4" /> Stitch & Export
              </button>
              <button
                onClick={() => setSpriteFrames([])}
                disabled={spriteFrames.length === 0}
                className="w-full py-2 bg-red/10 hover:bg-red text-red hover:text-white text-xs font-bold rounded-lg border border-red/20 hover:border-transparent transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Frames
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col glass-panel overflow-hidden relative min-h-0 bg-black/40">
        {subTab === "draw" ? (
          <div className="flex-1 flex items-center justify-center p-6 relative">
            <span className="absolute top-4 left-6 text-[10px] uppercase tracking-widest text-[#64748b] font-bold">Drawing Canvas (Sketchpad)</span>
            <div 
              className="border border-white/12 rounded-xl bg-black/60 shadow-lg overflow-hidden checkerboard relative flex max-w-full max-h-[80%] items-center justify-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleCanvasDrop}
            >
              <canvas
                ref={canvasRef}
                width={512}
                height={512}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="max-w-[700px] max-h-full w-auto h-auto object-contain cursor-crosshair block"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex min-h-0">
            {/* Sprite Grid Workspace */}
            <div className="flex-1 flex flex-col p-6 min-w-0">
              <span className="text-[10px] uppercase tracking-widest text-[#64748b] font-bold mb-3">Stitched Sprite Grid Layout</span>
              
              <div className="flex-1 bg-black/60 border border-white/5 rounded-xl p-4 overflow-auto checkerboard flex items-center justify-center content-start">
                {spriteFrames.length === 0 ? (
                  <div className="text-xs text-[#64748b]">Select and add frames from the history panel on the right.</div>
                ) : (
                  <div 
                    className="grid gap-1 border border-white/12 p-2 bg-black/40 rounded-lg shadow-md"
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                  >
                    {spriteFrames.map((frame, index) => (
                      <div key={index} className="relative w-24 h-24 border border-white/5 rounded overflow-hidden group">
                        <img src={frame.url} alt="Sprite" className="w-full h-full object-cover" />
                        <button title="Action"
                          onClick={() => removeFrame(index)}
                          className="absolute top-1 right-1 p-0.5 bg-black/70 hover:bg-[#ef4444] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] px-1 rounded font-bold">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Hidden canvas for compiling and exporting */}
              <canvas ref={spriteCanvasRef} className="hidden" />
            </div>

            {/* History Selector Column (Right) */}
            <div className="w-64 border-l border-white/8 bg-black/25 flex flex-col min-h-0">
              <div className="p-4 border-b border-white/5">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Frames Library</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-wrap gap-2.5 content-start justify-center">
                {history.length === 0 ? (
                  <div className="text-xs text-[#64748b] text-center mt-4">No frames found.</div>
                ) : (
                  history.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => addFrame(img)}
                      className="group relative w-16 h-16 rounded-md overflow-hidden border border-white/8 hover:border-accent-main cursor-pointer bg-black/40 hover:scale-[1.03] transition-all"
                    >
                      <img src={img.url} alt="Frame" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Plus className="w-5 h-5 text-accent-main" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
