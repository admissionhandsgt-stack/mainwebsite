"use client";

import React, { useState, useEffect } from "react";
import { CTAButton } from "@/components/CTAButton";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Phone, MessageCircle, X } from "lucide-react";

export const StickyDecisionBar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the bar
    const dismissed = localStorage.getItem("sticky_bar_dismissed");
    if (dismissed === "true") {
      setIsDismissed(true);
    }

    const handleScroll = () => {
      if (isDismissed) return;
      // Show after scrolling 800px
      if (window.scrollY > 800) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDismissed]);

  const handleClose = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem("sticky_bar_dismissed", "true");
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] hidden lg:block animate-in fade-in slide-in-from-bottom-5 duration-500 w-[calc(100%-2rem)] max-w-3xl px-4">
      <div className="p-2 bg-slate-900/90 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex items-center justify-between gap-4 pl-8">
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <p className="text-white font-black tracking-tight leading-none mb-1 text-sm">
              Need Direct Answer?
            </p>
            <p className="text-blue-300/60 text-[9px] font-black uppercase tracking-widest">
              Experts Online Now
            </p>
          </div>

          <div className="flex -space-x-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden shadow-sm">
                <div className={`w-full h-full bg-gradient-to-br ${i === 1 ? 'from-blue-400 to-blue-600' : i === 2 ? 'from-emerald-400 to-emerald-600' : 'from-indigo-400 to-indigo-600'}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CTAButton action="call" className="bg-white text-slate-950 rounded-full px-5 py-2.5 h-auto text-[11px] font-black flex items-center gap-1.5 hover:bg-blue-50 transition-colors">
            <Phone className="w-3.5 h-3.5" />
            Book Free Call
          </CTAButton>
          
          <CTAButton action="whatsapp" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-5 py-2.5 h-auto text-[11px] font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
            <WhatsAppIcon size={16} />
            WhatsApp Now
          </CTAButton>
          
          <button 
            onClick={handleClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors ml-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
