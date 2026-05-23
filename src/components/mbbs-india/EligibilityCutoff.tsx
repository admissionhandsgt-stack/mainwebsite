"use client";

import React, { useState } from "react";
import { mbbsData } from "@/data/mbbs-india";
import { CheckCircle2, FileText, ChevronDown, ChevronUp, Info, GraduationCap, ShieldCheck, BookOpen, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const MBBSEligibilityInfo = () => {
  const { eligibility, documents } = mbbsData;
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  return (
    <section className="compact-padding bg-slate-50 relative overflow-hidden">
      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Eligibility Criteria */}
          <div className="space-y-6">
            <h2 className="text-responsive-h2 text-slate-900">
              MBBS <span className="text-blue-600">Eligibility</span> Criteria
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {eligibility.criteria.map((text, idx) => {
                const EligIcons = [ShieldCheck, BookOpen, Users];
                const EligIcon = EligIcons[idx] || CheckCircle2;
                return (
                  <div key={idx} className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all h-full">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-[60px] group-hover:bg-emerald-500/10 transition-all" />
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <EligIcon className="w-6 h-6" />
                      </div>
                      <p className="text-slate-900 text-base font-black leading-snug">{text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expanded Document List */}
            <div className="pt-4">
              <button 
                onClick={() => setIsDocsOpen(!isDocsOpen)}
                className="w-full flex items-center justify-between p-6 bg-slate-900 text-white rounded-[2rem] font-black text-base md:text-lg shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-400" />
                  Check Document List
                </div>
                {isDocsOpen ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              </button>

              <AnimatePresence>
                {isDocsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 p-6 md:p-8 bg-white rounded-[2rem] border border-slate-200 shadow-inner grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {documents.list.map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-3 text-sm font-black text-slate-600">
                          <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          <span className="leading-snug">{doc}</span>
                        </div>
                      ))}
                      <div className="sm:col-span-2 pt-4 border-t border-slate-100 mt-2">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider italic flex gap-2">
                          <Info className="w-4 h-4 shrink-0" />
                          {documents.disclaimer}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Useful Information Side (Replacement for Cutoffs) */}
          <div className="space-y-6">
            <h2 className="text-responsive-h2 text-slate-900">
              Essential <span className="text-blue-600">Admission Insights</span>
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {eligibility.usefulInfo?.map((info, idx) => (
                <div key={idx} className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all h-full">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-[60px] group-hover:bg-blue-500/10 transition-all" />
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{info.title}</h3>
                  </div>
                  <p className="text-responsive-body text-slate-500 font-medium">
                    {info.desc}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="p-6 rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-600/20 text-center lg:text-left">
              <p className="text-sm font-black leading-relaxed">
                Need more clarity on domicile or quotas? Our experts have the most updated data to guide you.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

