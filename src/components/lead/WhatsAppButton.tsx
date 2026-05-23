"use client";
import React from 'react';
import { trackEvent } from '@/lib/analytics';
import { CONTACT_INFO } from '@/lib/constants';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

export const WhatsAppButton = () => {
  const handleClick = () => {
    trackEvent('whatsapp_click', { location: 'floating_button' });
    // Slight delay to ensure tracking fires before navigation
    setTimeout(() => {
      window.open(`https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent("Hi, I'm interested in MD/MS counselling")}`, '_blank');
    }, 150);
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-6 z-50 md:bottom-8 md:right-8 group"
      aria-label="Chat on WhatsApp"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20" />
        <div className="bg-[#25D366] text-white p-3.5 rounded-full shadow-xl hover:scale-110 transition-transform flex items-center justify-center relative z-10">
          <WhatsAppIcon size={28} />
        </div>
        
        {/* Tooltip */}
        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap hidden md:block">
          Chat with us
          <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45" />
        </div>
      </div>
    </button>
  );
};
