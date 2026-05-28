"use client";

import React, { useState } from "react";
import { mbbsData } from "@/data/mbbs-india";
import { LayoutGrid, ArrowRight, ChevronDown, ChevronUp, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const CounsellingSystem = () => {
  const { counselling } = mbbsData;
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section className="py-12 bg-slate-950 relative overflow-hidden text-white">
      {/* Subtle background elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]" />

      <div className="container-custom relative z-10">
        <div className="max-w-3xl mb-12">
          <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight leading-tight">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">Counselling System</span> Visualized
          </h2>
          <p className="text-base text-blue-100/60 font-medium leading-relaxed md:whitespace-nowrap">
            Understanding seat division is vital. Click on each category to see our recommended <span className="text-teal-400 font-black">Goal Strategy</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {counselling.types.map((item, idx) => {
            const isOpen = expandedId === idx;
            return (
              <div 
                key={idx}
                className={`p-6 rounded-[2rem] border transition-all duration-300 ${
                  isOpen 
                    ? 'bg-white/10 border-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.2)]' 
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                      isOpen ? 'bg-blue-600 text-white border-blue-400' : 'bg-white/5 text-blue-400 border-white/10'
                    }`}>
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <h3 className={`text-lg font-black tracking-tight transition-colors ${isOpen ? 'text-blue-400' : 'text-white'}`}>
                      {item.title}
                    </h3>
                  </div>
                  <button 
                    onClick={() => toggleExpand(idx)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                      isOpen ? 'bg-blue-600 text-white' : 'bg-white/10 text-blue-400 hover:bg-white/20'
                    }`}
                  >
                    {isOpen ? 'Close Strategy' : 'Learn Strategy'}
                    {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                <p className="text-blue-100/60 text-sm font-medium leading-relaxed mt-4">
                  {item.body}
                </p>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-6 p-6 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex gap-4">
                        <Target className="w-5 h-5 text-blue-400 shrink-0" />
                        <div>
                          <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Goal Strategy</p>
                          <p className="text-sm text-blue-50 font-bold leading-relaxed">
                            {item.goalStrategy}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-[10px] text-blue-200/40 font-medium leading-relaxed italic text-center">
          *Disclaimer: {counselling.disclaimer}
        </p>
      </div>
    </section>
  );
};
