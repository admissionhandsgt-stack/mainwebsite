"use client";

import React, { useState } from "react";
import { mbbsData } from "@/data/mbbs-india";
import { CheckCircle2, FileText, ChevronDown, Info, GraduationCap, ShieldCheck, BookOpen, Users, Zap, Target, Map } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const MBBSEligibilityInfo = () => {
  const { eligibility, documents } = mbbsData;
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  const eligIcons = [BookOpen, Target, Users];
  const criteriaTitles = ["Academic Requirement", "NEET Qualification", "Age Limit"];
  
  const insightIcons = [Map, ShieldCheck, Zap, BookOpen, Users];

  return (
    <section className="pt-16 pb-6 md:pt-24 md:pb-8 bg-white dark:bg-slate-955 relative overflow-hidden transition-colors duration-200">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/50 dark:bg-blue-900/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-50/50 dark:bg-indigo-900/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      
      <div className="container-custom relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100/50 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black tracking-widest uppercase mb-4"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Admission Prerequisites
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4"
          >
            Eligibility & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Key Insights</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 dark:text-slate-400 font-medium md:text-lg"
          >
            Everything you need to know before starting your MBBS admission journey.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          {/* LEFT: Eligibility Criteria */}
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  Eligibility Criteria
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Minimum requirements to apply.</p>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              {eligibility.criteria.map((text, idx) => {
                const EligIcon = eligIcons[idx] || CheckCircle2;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-900/60 transition-all duration-300 group flex items-start gap-5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/30 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-slate-400 dark:text-slate-500">
                      <EligIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 dark:text-white mb-1.5">{criteriaTitles[idx] || "Requirement"}</h4>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">{text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Document List CTA */}
            <div className="mt-4">
              <button 
                onClick={() => setIsDocsOpen(!isDocsOpen)}
                className="w-full flex items-center justify-between p-6 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98] group border border-slate-800"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-base">Check Required Documents</span>
                </div>
                <div className={`w-8 h-8 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-300 ${isDocsOpen ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              <AnimatePresence>
                {isDocsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                        {documents.list.map((doc, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-955/20 flex items-center justify-center shrink-0 mt-0.5">
                              <CheckCircle2 className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                            </div>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-350 leading-snug">{doc}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100/50">
                          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-900 font-medium leading-relaxed">
                            <span className="font-bold uppercase tracking-wider mr-2">Note:</span>
                            {documents.disclaimer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT: Admission Insights */}
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  Essential Admission Insights
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Crucial factors deciding your seat.</p>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              {eligibility.usefulInfo?.map((info, idx) => {
                const InsightIcon = insightIcons[idx % insightIcons.length] || Target;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 + 0.1 }}
                    className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900/60 transition-all duration-300 group flex items-start gap-5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-955 flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-955/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-slate-400 dark:text-slate-500">
                      <InsightIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 dark:text-white mb-1.5">{info.title}</h4>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">{info.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Info Banner */}
            <div className="mt-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-4 text-white">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-sm text-white font-medium leading-relaxed pt-0.5">
                Need clarity on domicile, quotas, or category benefits? Our experts have the most updated data to guide you to the right college.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
