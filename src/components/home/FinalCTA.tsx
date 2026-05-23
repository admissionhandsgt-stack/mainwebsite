"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageCircle } from 'lucide-react';
import { useCTA } from '@/hooks/useCTA';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

const FinalCTA = () => {
  const CTA = useCTA();
  return (
    <section className="py-12 md:py-16 relative overflow-hidden bg-slate-900">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[200px] bg-blue-500/20 blur-[100px] pointer-events-none" />

      <div className="container-custom relative z-10 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full max-w-3xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl"
        >
          <div className="text-center md:text-left flex-1">
            <h2 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight">
              Ready to secure your seat?
            </h2>
            <p className="text-xs md:text-sm text-slate-400 font-medium max-w-md">
              Connect instantly with our experts to clear your doubts.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => CTA.whatsapp()}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/20 px-6 py-3.5 rounded-xl font-black text-sm transition-all duration-300 active:scale-95 group"
            >
              <WhatsAppIcon size={18} className="group-hover:scale-110 transition-transform" />
              WhatsApp
            </button>
            <button
              onClick={() => CTA.call()}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 px-6 py-3.5 rounded-xl font-black text-sm transition-all duration-300 active:scale-95 group"
            >
              <Phone size={16} className="group-hover:scale-110 transition-transform" />
              Call Now
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
