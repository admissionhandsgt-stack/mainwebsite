"use client";

import React from "react";
import { mbbsData } from "@/data/mbbs-india";
import { motion } from "framer-motion";
import { Calendar, ArrowRight, FileSearch, ClipboardList, BarChart3, MousePointerClick, Trophy, Building2 } from "lucide-react";

const stepIcons = [FileSearch, BarChart3, ClipboardList, MousePointerClick, Trophy, Building2];
const stepColors = [
  { bg: "bg-blue-600", light: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", shadow: "shadow-blue-200" },
  { bg: "bg-indigo-600", light: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-600", shadow: "shadow-indigo-200" },
  { bg: "bg-violet-600", light: "bg-violet-50", border: "border-violet-200", text: "text-violet-600", shadow: "shadow-violet-200" },
  { bg: "bg-teal-600", light: "bg-teal-50", border: "border-teal-200", text: "text-teal-600", shadow: "shadow-teal-200" },
  { bg: "bg-emerald-600", light: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600", shadow: "shadow-emerald-200" },
  { bg: "bg-amber-600", light: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", shadow: "shadow-amber-200" },
];

export const AdmissionProcess = () => {
  const { process } = mbbsData;

  return (
    <section className="pt-4 pb-14 bg-white dark:bg-slate-955 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.4) 1px, transparent 0)',
        backgroundSize: '36px 36px'
      }} />

      <div className="container-custom relative z-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-3">
              Step-by-Step <span className="text-blue-600 dark:text-blue-400">Admission Journey</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xl leading-relaxed">
              We&apos;ve simplified the complex admission cycle into 6 clear steps to keep you ahead of the competition.
            </p>
          </div>

          <div className="shrink-0 flex flex-row lg:flex-col gap-3">
            <div className="px-5 py-4 rounded-2xl bg-blue-600 text-white text-center shadow-xl shadow-blue-600/25">
              <p className="text-3xl font-black leading-none">98%</p>
              <p className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80">Success Rate</p>
            </div>
          </div>
        </div>

        {/* Step Flow */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {process.steps.map((step, idx) => {
            const Icon = stepIcons[idx] || stepIcons[0];
            const color = stepColors[idx] || stepColors[0];
            const isLast = idx === process.steps.length - 1;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                className="relative group"
              >
                {/* Connector arrow on desktop (not for last in row) */}
                {!isLast && (idx + 1) % 3 !== 0 && (
                  <div className="hidden lg:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-200" />
                  </div>
                )}

                <div className={`relative p-6 rounded-3xl bg-white dark:bg-slate-900/60 border-2 ${color.border} dark:border-slate-800/80 group-hover:shadow-xl group-hover:${color.shadow} dark:group-hover:shadow-black/40 group-hover:-translate-y-1 transition-all duration-300 h-full flex flex-col gap-4`}>
                  {/* Step number badge */}
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl ${color.bg} flex items-center justify-center shadow-lg ${color.shadow}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className={`text-5xl font-black ${color.text} opacity-10 dark:opacity-30 select-none leading-none`}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Step label */}
                  <div>
                    <div className={`inline-block px-2 py-0.5 rounded-full ${color.light} dark:bg-slate-800 ${color.text} dark:text-slate-300 text-[9px] font-black uppercase tracking-widest mb-2`}>
                      Step {idx + 1}
                    </div>
                    <p className="text-base font-black text-slate-900 dark:text-white leading-snug">
                      {step}
                    </p>
                  </div>

                  {/* Mobile connector */}
                  {!isLast && (
                    <div className="lg:hidden flex items-center justify-center pt-1">
                      <div className={`w-6 h-6 rounded-full ${color.light} dark:bg-slate-800 ${color.border} dark:border-slate-800 border flex items-center justify-center`}>
                        <ArrowRight className={`w-3 h-3 ${color.text} dark:text-slate-300 rotate-90`} />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
