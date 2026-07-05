"use client";

import React, { useState } from "react";
import { Play, Square, Loader2, Music, Volume2 } from "lucide-react";

export default function AudioStudioView() {
  const [prompt, setPrompt] = useState("");
  const [audioType, setAudioType] = useState<"sfx" | "music">("sfx");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);

    try {
      const endpoint = audioType === "sfx" ? "/api/generate/sfx" : "/api/generate/music";
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to generate audio");
      
      // For SFX (synchronous)
      if (audioType === "sfx") {
        setAudioUrl(data.url);
        setIsGenerating(false);
      } else {
        // For Music (async polling via webhook)
        const jobId = data.id;
        pollStatus(jobId);
      }
    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
    }
  };

  const pollStatus = async (jobId: string) => {
    try {
      const res = await fetch(`/api/status?id=${jobId}`);
      const data = await res.json();
      
      if (data.status === "completed") {
        setAudioUrl(data.url);
        setIsGenerating(false);
      } else if (data.status === "failed" || data.status === "canceled") {
        setError("Generation failed on the server.");
        setIsGenerating(false);
      } else {
        // Continue polling every 2 seconds
        setTimeout(() => pollStatus(jobId), 2000);
      }
    } catch (err: any) {
      setError("Error checking status.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0c16] relative overflow-hidden">
      <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full">
        
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-display font-bold text-white mb-2 flex items-center gap-2">
            <Music className="w-5 h-5 text-accent-main" /> Audio Studio (Music & SFX)
          </h2>
          <p className="text-sm text-[#94a3b8]">
            Generate game-ready sound effects using ElevenLabs, or background music loops using MusicGen.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setAudioType("sfx")}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm border transition-all flex justify-center items-center gap-2 ${
                audioType === "sfx"
                  ? "bg-accent-dim text-accent-main border-accent-main/30"
                  : "bg-transparent text-[#94a3b8] border-[#ffffff]/10 hover:text-white"
              }`}
            >
              <Volume2 className="w-4 h-4" /> Sound Effect (SFX)
              <span className="text-[10px] ml-1 opacity-70">(5 Credits)</span>
            </button>
            <button
              onClick={() => setAudioType("music")}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm border transition-all flex justify-center items-center gap-2 ${
                audioType === "music"
                  ? "bg-accent-dim text-accent-main border-accent-main/30"
                  : "bg-transparent text-[#94a3b8] border-[#ffffff]/10 hover:text-white"
              }`}
            >
              <Music className="w-4 h-4" /> Background Music (BGM)
              <span className="text-[10px] ml-1 opacity-70">(15 Credits)</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">
              {audioType === "sfx" ? "Describe the sound effect" : "Describe the music track"}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                audioType === "sfx" 
                  ? "E.g., A heavy broadsword striking a wooden shield, cinematic impact." 
                  : "E.g., A fast-paced 8-bit chiptune battle theme with a driving bassline."
              }
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-accent-main/50 resize-none h-24"
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="py-2.5 px-6 bg-accent-main hover:bg-[#00cce6] disabled:opacity-50 disabled:cursor-not-allowed text-bg-deep font-bold text-sm rounded-lg shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-bg-deep" /> Generate Audio
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Area */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 border border-white/5 rounded-xl bg-black/30 flex flex-col items-center justify-center relative p-8">
          {audioUrl ? (
            <div className="w-full max-w-md flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
              <div className="w-32 h-32 rounded-full bg-accent-dim/30 border-4 border-accent-main flex items-center justify-center shadow-[0_0_30px_rgba(0,229,255,0.15)] animate-pulse">
                {audioType === "sfx" ? <Volume2 className="w-12 h-12 text-accent-main" /> : <Music className="w-12 h-12 text-accent-main" />}
              </div>
              <audio 
                src={audioUrl} 
                controls 
                autoPlay 
                className="w-full"
                controlsList="nodownload" 
              />
              <div className="flex gap-3 w-full">
                <a 
                  href={audioUrl} 
                  download 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm rounded-lg border border-white/10 text-center transition-all"
                >
                  Download .mp3
                </a>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center gap-4 text-[#94a3b8]">
              <Loader2 className="w-8 h-8 animate-spin text-accent-main" />
              <p className="text-sm font-medium">
                {audioType === "sfx" ? "Synthesizing sound effect..." : "Composing background music... this takes up to a minute."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-[#64748b]">
              {audioType === "sfx" ? <Volume2 className="w-10 h-10 opacity-30" /> : <Music className="w-10 h-10 opacity-30" />}
              <p className="text-sm">Generated audio will appear here</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
