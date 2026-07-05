"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Loader2,
  Music,
  Volume2,
  Download,
  Sparkles,
  Clock,
  Zap,
  ChevronRight,
  Waves,
} from "lucide-react";
import { checkHistory } from "@/lib/api";

/* ─── Types ─────────────────────────────────────────────── */
type AudioMode = "sfx" | "music";

interface GeneratedAudio {
  id: string;
  prompt: string;
  url: string;
  mode: AudioMode;
  createdAt: number;
}

/* ─── Prompt suggestions ────────────────────────────────── */
const SFX_SUGGESTIONS = [
  "Sword clash",
  "Footsteps on stone",
  "Rain ambience",
  "Magic spell cast",
  "Door creaking",
  "Explosion impact",
  "Coin pickup",
  "Menu click",
];

const MUSIC_SUGGESTIONS = [
  "Victory fanfare",
  "Boss battle intro",
  "Calm village theme",
  "Dark dungeon ambient",
  "8-bit chiptune loop",
  "Epic orchestral march",
  "Peaceful forest ambience",
  "Retro arcade theme",
];

/* ─── Decorative waveform bars ──────────────────────────── */
function WaveformBars({
  playing,
  barCount = 40,
}: {
  playing: boolean;
  barCount?: number;
}) {
  return (
    <div className="flex items-end justify-center gap-[2px] h-16 w-full px-2">
      {Array.from({ length: barCount }).map((_, i) => {
        const baseHeight = 12 + Math.sin(i * 0.6) * 20 + Math.random() * 16;
        return (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: "3px",
              height: `${playing ? baseHeight : 6 + Math.sin(i * 0.4) * 4}px`,
              background: playing
                ? `linear-gradient(to top, var(--accent), var(--accent-hover))`
                : `rgba(255,255,255,0.12)`,
              animation: playing
                ? `waveformPulse ${0.4 + Math.random() * 0.6}s ease-in-out infinite alternate`
                : "none",
              animationDelay: `${i * 30}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ─── Audio card with player ────────────────────────────── */
function AudioPlayerCard({
  audio,
  isCurrent,
}: {
  audio: GeneratedAudio;
  isCurrent: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTime = () => {
      setCurrentTime(el.currentTime);
      setProgressPercent(el.duration ? (el.currentTime / el.duration) * 100 : 0);
    };
    const onLoaded = () => setDuration(el.duration);
    const onEnded = () => setIsPlaying(false);

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("ended", onEnded);
    };
  }, [audio.url]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    el.currentTime = pct * duration;
  };

  return (
    <div
      className={`glass-panel p-4 ${
        isCurrent ? "animate-fade-in ring-1 ring-accent-main/30" : ""
      }`}
    >
      <audio ref={audioRef} src={audio.url} preload="metadata" />

      {/* Mode badge + prompt */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
            audio.mode === "sfx"
              ? "bg-accent-dim text-accent-main"
              : "bg-purple/10 text-purple"
          }`}
        >
          {audio.mode === "sfx" ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <Music className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[var(--text-main)] truncate">
            {audio.prompt}
          </p>
          <p className="text-[11px] text-[var(--text-dim)] mt-0.5">
            {audio.mode === "sfx" ? "Sound Effect" : "Music Track"} ·{" "}
            {formatTime(duration || 0)}
          </p>
        </div>
      </div>

      {/* Waveform visualization */}
      <div className="rounded-lg bg-black/30 p-2 mb-3">
        <WaveformBars playing={isPlaying} barCount={isCurrent ? 48 : 32} />
      </div>

      {/* Progress bar */}
      <div
        className="h-1.5 bg-white/5 rounded-full mb-3 cursor-pointer group"
        onClick={handleSeek}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-main to-accent-hover transition-all duration-100 relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent-main shadow-[0_0_8px_var(--accent-glow)] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-accent-main hover:bg-accent-hover text-bg-deep flex items-center justify-center transition-all shadow-[0_0_16px_var(--accent-glow)] hover:shadow-[0_0_24px_var(--accent-glow)] hover:scale-105 active:scale-95"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <span className="text-[11px] text-[var(--text-muted)] tabular-nums font-medium ml-1">
          {formatTime(currentTime)} / {formatTime(duration || 0)}
        </span>

        <div className="flex-1" />

        <a
          href={audio.url}
          download
          target="_blank"
          rel="noreferrer"
          className="btn-ghost !py-1.5 !px-3 !text-[11px]"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
      </div>
    </div>
  );
}

/* ─── Loading skeleton ──────────────────────────────────── */
function GeneratingSkeleton({ mode }: { mode: AudioMode }) {
  return (
    <div className="glass-panel p-5 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 skeleton rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3.5 w-3/4 rounded" />
          <div className="skeleton h-2.5 w-1/3 rounded" />
        </div>
      </div>

      {/* Animated bars skeleton */}
      <div className="rounded-lg bg-black/30 p-3 mb-4">
        <div className="flex items-end justify-center gap-[3px] h-16">
          {Array.from({ length: 36 }).map((_, i) => (
            <div
              key={i}
              className="skeleton rounded-full"
              style={{
                width: "3px",
                height: `${10 + Math.sin(i * 0.5) * 14 + Math.random() * 12}px`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-accent-main animate-spin" />
        <span className="text-[13px] text-[var(--text-sub)] font-medium">
          {mode === "sfx"
            ? "Synthesizing sound effect…"
            : "Composing music track… this may take up to a minute"}
        </span>
      </div>
    </div>
  );
}

/* ─── Empty state ───────────────────────────────────────── */
function EmptyState({ mode }: { mode: AudioMode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
        {mode === "sfx" ? (
          <Waves className="w-9 h-9 text-[var(--text-dim)]" />
        ) : (
          <Music className="w-9 h-9 text-[var(--text-dim)]" />
        )}
      </div>
      <p className="text-[var(--text-muted)] text-sm font-medium mb-1">
        No audio generated yet
      </p>
      <p className="text-[var(--text-dim)] text-xs max-w-[240px]">
        Describe a {mode === "sfx" ? "sound effect" : "music track"} and hit
        Generate to get started
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ██  MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function AudioStudioView() {
  const [prompt, setPrompt] = useState("");
  const [audioType, setAudioType] = useState<AudioMode>("sfx");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedAudio[]>([]);

  const suggestions = audioType === "sfx" ? SFX_SUGGESTIONS : MUSIC_SUGGESTIONS;

  /* ── Polling for async music jobs ──────────────────────── */
  const pollStatus = useCallback(
    async (jobId: string, jobPrompt: string) => {
      try {
        const url = await checkHistory(jobId);
        if (url) {
          const newAudio: GeneratedAudio = {
            id: jobId,
            prompt: jobPrompt,
            url,
            mode: "music",
            createdAt: Date.now(),
          };
          setHistory((prev) => [newAudio, ...prev]);
          setIsGenerating(false);
        } else {
          // Keep polling every 3s
          setTimeout(() => pollStatus(jobId, jobPrompt), 3000);
        }
      } catch {
        setError("Error checking generation status.");
        setIsGenerating(false);
      }
    },
    []
  );

  /* ── Generate handler ─────────────────────────────────── */
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);

    try {
      const endpoint =
        audioType === "sfx" ? "/api/generate/sfx" : "/api/generate/music";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate audio");

      if (audioType === "sfx") {
        // SFX is synchronous — URL available immediately
        const newAudio: GeneratedAudio = {
          id: data.id || crypto.randomUUID(),
          prompt,
          url: data.url,
          mode: "sfx",
          createdAt: Date.now(),
        };
        setHistory((prev) => [newAudio, ...prev]);
        setIsGenerating(false);
      } else {
        // Music is async — poll via checkHistory
        pollStatus(data.id, prompt);
      }
    } catch (err: any) {
      setError(err.message);
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-deep relative overflow-hidden">
      {/* Waveform keyframe injection */}
      <style jsx global>{`
        @keyframes waveformPulse {
          0% {
            transform: scaleY(0.4);
          }
          100% {
            transform: scaleY(1);
          }
        }
      `}</style>

      {/* ─── Tab Selector ─────────────────────────────────── */}
      <div className="shrink-0 px-4 md:px-6 pt-4 md:pt-5 pb-0">
        <div className="flex gap-2 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] max-w-md">
          <button
            onClick={() => setAudioType("sfx")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-2 ${
              audioType === "sfx"
                ? "bg-accent-dim text-accent-main shadow-[0_0_12px_var(--accent-glow)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-sub)] hover:bg-white/[0.03]"
            }`}
          >
            <Volume2 className="w-4 h-4" />
            Sound Effects
            <span
              className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                audioType === "sfx"
                  ? "bg-accent-main/20 text-accent-main"
                  : "bg-white/5 text-[var(--text-dim)]"
              }`}
            >
              5 CR
            </span>
          </button>
          <button
            onClick={() => setAudioType("music")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-2 ${
              audioType === "music"
                ? "bg-purple/10 text-purple shadow-[0_0_12px_var(--purple-dim)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-sub)] hover:bg-white/[0.03]"
            }`}
          >
            <Music className="w-4 h-4" />
            Music Tracks
            <span
              className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                audioType === "music"
                  ? "bg-purple/20 text-purple"
                  : "bg-white/5 text-[var(--text-dim)]"
              }`}
            >
              15 CR
            </span>
          </button>
        </div>
      </div>

      {/* ─── Split-View Workspace ─────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-5 p-4 md:p-6 overflow-hidden">
        {/* ── LEFT: Input Panel ────────────────────────────── */}
        <div className="w-full md:w-[420px] lg:w-[460px] shrink-0 flex flex-col gap-4">
          {/* Prompt */}
          <div className="glass-panel p-4">
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
              {audioType === "sfx"
                ? "Describe the sound effect"
                : "Describe the music track"}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                audioType === "sfx"
                  ? "E.g., A heavy broadsword striking a wooden shield, cinematic impact…"
                  : "E.g., A fast-paced 8-bit chiptune battle theme with driving bassline…"
              }
              rows={4}
              className="input-field resize-none !text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleGenerate();
                }
              }}
            />

            {/* Suggested prompts */}
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Quick prompts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPrompt(s)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white/[0.04] border border-white/[0.07] text-[var(--text-sub)] hover:text-accent-main hover:border-accent-main/30 hover:bg-accent-dim transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Duration info + Generate */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[12px] text-[var(--text-sub)]">
                <Clock className="w-3.5 h-3.5 text-[var(--text-dim)]" />
                <span>
                  {audioType === "sfx"
                    ? "Generates in ~5 seconds"
                    : "Generates in ~30-60 seconds"}
                </span>
              </div>
              <div
                className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  audioType === "sfx"
                    ? "bg-accent-dim text-accent-main"
                    : "bg-purple/10 text-purple"
                }`}
              >
                <Zap className="w-3 h-3" />
                {audioType === "sfx" ? "5 Credits" : "15 Credits"}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="btn-primary w-full !py-3 !text-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Generate {audioType === "sfx" ? "Sound Effect" : "Music Track"}
                  <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                </>
              )}
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red/10 border border-red/20 text-red rounded-[var(--radius-md)] p-3 text-[13px] animate-fade-in">
              {error}
            </div>
          )}
        </div>

        {/* ── RIGHT: Results Panel ─────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-y-auto pr-1">
          {/* Current generation skeleton */}
          {isGenerating && <GeneratingSkeleton mode={audioType} />}

          {/* Generated audio cards */}
          {history.length > 0 ? (
            <>
              {history.map((audio, idx) => (
                <AudioPlayerCard
                  key={audio.id}
                  audio={audio}
                  isCurrent={idx === 0 && !isGenerating}
                />
              ))}
            </>
          ) : (
            !isGenerating && <EmptyState mode={audioType} />
          )}
        </div>
      </div>
    </div>
  );
}
