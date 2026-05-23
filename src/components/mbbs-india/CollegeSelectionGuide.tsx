"use client";

import React from "react";
import { mbbsData } from "@/data/mbbs-india";
import { ShieldCheck, Target, Zap, Clock, FileSearch, Headphones, ArrowRight } from "lucide-react";
import { CTAButton } from "@/components/CTAButton";
import { motion } from "framer-motion";

const icons = [Target, Zap, ShieldCheck, Clock, FileSearch, Headphones];

const stepColors = [
  { bg: "bg-blue-600", light: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", shadow: "shadow-blue-200" },
  { bg: "bg-indigo-600", light: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-600", shadow: "shadow-indigo-200" },
  { bg: "bg-violet-600", light: "bg-violet-50", border: "border-violet-200", text: "text-violet-600", shadow: "shadow-violet-200" },
  { bg: "bg-teal-600", light: "bg-teal-50", border: "border-teal-200", text: "text-teal-600", shadow: "shadow-teal-200" },
  { bg: "bg-emerald-600", light: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600", shadow: "shadow-emerald-200" },
  { bg: "bg-amber-600", light: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", shadow: "shadow-amber-200" },
];

export const CollegeSelectionGuide = () => {
  const { whatWeDo } = mbbsData;

  return (
    <section className="py-14 bg-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.4) 1px, transparent 0)',
        backgroundSize: '36px 36px'
      }} />

      <div className="container-custom relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-4">
            <Target className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
              Strategic Approach
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight leading-tight">
            {whatWeDo.title.split('Secure')[0]} <span className="text-blue-600">Secure</span> {whatWeDo.title.split('Secure')[1]}
          </h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            {whatWeDo.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {whatWeDo.points.map((point, idx) => {
            const Icon = icons[idx] || Target;
            const color = stepColors[idx] || stepColors[0];
            const isLast = idx === whatWeDo.points.length - 1;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                className="relative group h-full"
              >
                {/* Connector arrow on desktop */}
                {!isLast && (
                  <div className="hidden lg:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-slate-100 border border-slate-200 items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </div>
                )}

                <div className={`relative p-6 rounded-3xl bg-white border-2 ${color.border} group-hover:shadow-xl group-hover:${color.shadow} group-hover:-translate-y-1 transition-all duration-300 h-full flex flex-col gap-4`}>
                  {/* Step number badge */}
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl ${color.bg} flex items-center justify-center shadow-lg ${color.shadow}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className={`text-5xl font-black ${color.text} opacity-10 select-none leading-none`}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className={`inline-block px-2 py-0.5 rounded-full ${color.light} ${color.text} text-[9px] font-black uppercase tracking-widest mb-2`}>
                      Phase {idx + 1}
                    </div>
                    <h3 className="text-base font-black text-slate-900 leading-snug mb-1">
                      {point.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {point.desc}
                    </p>
                  </div>

                  {/* Mobile connector */}
                  {!isLast && (
                    <div className="lg:hidden flex items-center justify-center pt-1">
                      <div className={`w-6 h-6 rounded-full ${color.light} ${color.border} border flex items-center justify-center`}>
                        <ArrowRight className={`w-3 h-3 ${color.text} rotate-90`} />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Integrated CTA - More Compact */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 p-6 rounded-[2rem] bg-blue-600 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-600/10"
        >
          <div className="text-center md:text-left">
            <h3 className="text-xl font-black tracking-tight mb-1">Ready to Secure Your Future?</h3>
            <p className="text-blue-100 text-xs font-bold opacity-80 max-w-lg">
              Professional guidance makes the difference between a random allotment and your dream college.
            </p>
          </div>
          <CTAButton action="counselling" className="bg-white text-blue-900 rounded-xl px-6 py-3.5 text-sm font-black shadow-lg hover:scale-105 transition-transform shrink-0">
            Start Professional Counselling
          </CTAButton>
        </motion.div>
      </div>
    </section>
  );
};
