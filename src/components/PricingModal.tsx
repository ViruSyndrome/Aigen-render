"use client";

import React, { useState } from "react";
import { X, Check, Loader2, CreditCard } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export default function PricingModal({ onClose }: { onClose: () => void }) {
  const { isSignedIn } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!isSignedIn) {
      setError("Please sign in first to upgrade.");
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      // Replace with your actual Stripe Price ID from the Stripe Dashboard
      const PRICE_ID = "price_placeholder_for_15_usd_monthly";
      
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: PRICE_ID }),
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Checkout failed");
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#0c0f1d] border border-accent-main/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,229,255,0.1)] flex flex-col items-center p-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[#94a3b8] hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-display font-extrabold text-white mb-2">Upgrade to Pro</h2>
        <p className="text-sm text-[#94a3b8] text-center mb-6">
          Get 1,000 weighted credits every month to generate sprites, seamless textures, SFX, and music.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-xl w-full p-6 mb-6">
          <div className="flex justify-center items-end gap-1 mb-4 border-b border-white/10 pb-4">
            <span className="text-4xl font-black text-accent-main">$15</span>
            <span className="text-[#64748b] text-sm font-semibold mb-1">/month</span>
          </div>

          <ul className="flex flex-col gap-3 text-sm text-[#e8edf5]">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green shrink-0 mt-0.5" />
              <span><strong className="text-white">1,000 Credits</strong> per month</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green shrink-0 mt-0.5" />
              <span>Standard 2D Sprites & Textures <span className="text-xs text-[#64748b] ml-1">(1 Credit)</span></span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green shrink-0 mt-0.5" />
              <span>Consistent Characters (ControlNet) <span className="text-xs text-[#64748b] ml-1">(3 Credits)</span></span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green shrink-0 mt-0.5" />
              <span>ElevenLabs Sound Effects (SFX) <span className="text-xs text-[#64748b] ml-1">(5 Credits)</span></span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green shrink-0 mt-0.5" />
              <span>MusicGen Background Tracks <span className="text-xs text-[#64748b] ml-1">(15 Credits)</span></span>
            </li>
          </ul>
        </div>

        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-xs text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full py-3.5 bg-accent-main hover:bg-[#00cce6] disabled:opacity-50 text-bg-deep font-bold rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.25)] transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
          ) : (
            <><CreditCard className="w-5 h-5" /> Subscribe via Stripe</>
          )}
        </button>
        <p className="text-[10px] text-[#64748b] mt-4 text-center">
          Secure payment processing by Stripe. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
