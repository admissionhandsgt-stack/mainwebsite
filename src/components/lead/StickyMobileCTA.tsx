"use client";
import React from 'react';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';
import { PhoneCall } from 'lucide-react';

export const StickyMobileCTA = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] md:hidden">
      <Link
        href="/contact"
        onClick={() => trackEvent('cta_click', { location: 'sticky_mobile' })}
        className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-transform"
      >
        <PhoneCall className="w-5 h-5" />
        <span>Get PG Counseling</span>
      </Link>
    </div>
  );
};
