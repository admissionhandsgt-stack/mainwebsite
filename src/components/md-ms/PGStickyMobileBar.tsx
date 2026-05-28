'use client';
import React, { useState, useEffect } from 'react';
import { Phone, MessageSquare, Calendar } from 'lucide-react';
import { useCTA } from '@/hooks/useCTA';

export const PGStickyMobileBar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const cta = useCTA();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToForm = () => {
    const element = document.getElementById('pg-intake-form');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-950/90 backdrop-blur-lg border-t border-white/10 px-4 py-3 flex items-center justify-between gap-2.5 shadow-2xl transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      {/* 1. Quick Call */}
      <button
        onClick={cta.call}
        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 border border-white/10 text-white rounded-xl py-2.5 text-xs font-black active:scale-[0.97] transition-all cursor-pointer"
      >
        <Phone className="w-3.5 h-3.5 text-blue-400" />
        <span>Call Expert</span>
      </button>

      {/* 2. Quick WhatsApp */}
      <button
        onClick={() => cta.whatsapp("Hi, I want to discuss MD/MS admission options for NEET PG 2026.")}
        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 border border-white/10 text-white rounded-xl py-2.5 text-xs font-black active:scale-[0.97] transition-all cursor-pointer"
      >
        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
        <span>WhatsApp</span>
      </button>

      {/* 3. Request Callback Strategy */}
      <button
        onClick={handleScrollToForm}
        className="flex-[1.3] flex items-center justify-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-2.5 text-xs font-black shadow-md shadow-blue-500/10 active:scale-[0.97] transition-all cursor-pointer"
      >
        <Calendar className="w-3.5 h-3.5 shrink-0" />
        <span>Intake Strategy</span>
      </button>
    </div>
  );
};
export default PGStickyMobileBar;
