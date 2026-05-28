"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  GraduationCap, 
  BarChart3, 
  ClipboardList, 
  ListChecks, 
  Trophy, 
  FileCheck, 
  Building2, 
  CheckCircle2,
  ChevronDown
} from "lucide-react";

const steps = [
  { 
    icon: GraduationCap, 
    phase: "Phase 01",
    title: "NEET PG Examination", 
    desc: "Conducted by NBE. Eligibility requires MBBS degree, completed internship, and NMC registration.", 
    bullets: [
      "Qualifying cutoff: 50th percentile for General/EWS", 
      "Computer-based exam with 200 MCQs", 
      "Results typically within 2-3 weeks", 
      "Score valid for one counselling cycle"
    ],
    color: "from-blue-500 to-indigo-500",
    iconColor: "text-blue-500 dark:text-blue-400",
    bgColor: "bg-blue-50/50 dark:bg-blue-950/20"
  },
  { 
    icon: BarChart3, 
    phase: "Phase 02",
    title: "Score Analysis & Strategy", 
    desc: "We analyze your rank against 5-year cutoff trends to build your personalized admission blueprint.", 
    bullets: [
      "Rank-based college predictions across all quotas", 
      "Branch recommendations aligned to career goals", 
      "Budget analysis including fees, bonds, and stipends", 
      "Realistic vs aspirational target mapping"
    ],
    color: "from-indigo-500 to-violet-500",
    iconColor: "text-indigo-500 dark:text-indigo-400",
    bgColor: "bg-indigo-50/50 dark:bg-indigo-950/20"
  },
  { 
    icon: ClipboardList, 
    phase: "Phase 03",
    title: "Registration & Documentation", 
    desc: "MCC and State portals require separate registrations with specific document formats.", 
    bullets: [
      "Dual registration: AIQ (MCC) + State counselling", 
      "Security deposit management", 
      "Document pre-audit against state-specific norms", 
      "Deadline tracking across all portals"
    ],
    color: "from-violet-500 to-purple-500",
    iconColor: "text-violet-500 dark:text-violet-400",
    bgColor: "bg-violet-50/50 dark:bg-violet-950/20"
  },
  { 
    icon: ListChecks, 
    phase: "Phase 04",
    title: "Strategic Choice Filling", 
    desc: "Choice order is the single most important decision in PG counselling. We optimize every preference.", 
    bullets: [
      "Optimized preference list balancing aspiration & safety", 
      "Branch-college combination analysis", 
      "Round-wise strategy for different rounds", 
      "Live support during choice filling windows"
    ],
    color: "from-purple-500 to-pink-500",
    iconColor: "text-purple-500 dark:text-purple-400",
    bgColor: "bg-purple-50/50 dark:bg-purple-950/20"
  },
  { 
    icon: Trophy, 
    phase: "Phase 05",
    title: "Seat Allotment Decisions", 
    desc: "Results are released round-by-round. Each round requires strategic decisions to secure or upgrade.", 
    bullets: [
      "Real-time allotment analysis", 
      "Join vs Float vs Resign decision support", 
      "Upgrade probability for next rounds", 
      "Parallel AIQ + State allotment management"
    ],
    color: "from-pink-500 to-rose-500",
    iconColor: "text-pink-500 dark:text-pink-400",
    bgColor: "bg-pink-50/50 dark:bg-pink-950/20"
  },
  { 
    icon: FileCheck, 
    phase: "Phase 06",
    title: "Document Verification", 
    desc: "Physical document verification at allotted college with zero-error compliance.", 
    bullets: [
      "Complete document checklist preparation", 
      "Certificate authenticity verification", 
      "Backup copies and attestation management", 
      "Last-mile logistics support"
    ],
    color: "from-rose-500 to-orange-500",
    iconColor: "text-rose-500 dark:text-rose-400",
    bgColor: "bg-rose-50/50 dark:bg-rose-950/20"
  },
  { 
    icon: Building2, 
    phase: "Phase 07",
    title: "College Reporting", 
    desc: "From allotment letter to physically walking into your college — we ensure zero last-mile failures.", 
    bullets: [
      "Allotment letter verification", 
      "Fee payment guidance and receipt management", 
      "Hostel and anti-ragging compliance", 
      "Onboarding support at new institution"
    ],
    color: "from-orange-500 to-amber-500",
    iconColor: "text-orange-500 dark:text-orange-400",
    bgColor: "bg-orange-50/50 dark:bg-orange-950/20"
  },
];

export const PGAdmissionProcess = () => {
  const [mounted, setMounted] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleStep = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 overflow-hidden">
      <div className="container-custom max-w-4xl">
        {/* Header */}
        <motion.div 
          initial={mounted ? { opacity: 0, y: 15 } : false} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          className="text-center mb-12"
        >
          <span className="inline-block text-xs font-black tracking-widest text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-4 py-1.5 rounded-full mb-4">
            THE PG ADMISSION JOURNEY
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            From NEET PG Score to <span className="text-blue-600 dark:text-blue-400">College Reporting</span>
          </h2>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-3 max-w-2xl mx-auto font-medium">
            Explore the seven critical phases that decide your PG seat. We manage timelines, documentation, and strategy at every single step.
          </p>
        </motion.div>

        {/* Timeline Interactive Accordion */}
        <div className="relative pl-4 md:pl-8 border-l border-slate-200 dark:border-slate-800 space-y-4">
          {steps.map((step, i) => {
            const isOpen = openIndex === i;
            const Icon = step.icon;

            return (
              <div 
                key={i} 
                className={`relative group bg-white dark:bg-slate-900 border ${
                  isOpen 
                    ? "border-blue-200 dark:border-blue-900/60 shadow-md shadow-blue-500/5" 
                    : "border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700"
                } rounded-2xl md:rounded-3xl transition-all duration-300 overflow-hidden`}
              >
                {/* Timeline Connector Node */}
                <div 
                  onClick={() => toggleStep(i)}
                  className={`absolute left-[-25px] md:left-[-41px] top-6 w-5 h-5 md:w-6 md:h-6 rounded-full border-2 bg-white dark:bg-slate-900 flex items-center justify-center cursor-pointer transition-all duration-300 z-10 ${
                    isOpen 
                      ? "border-blue-600 dark:border-blue-400 ring-4 ring-blue-50 dark:ring-blue-950" 
                      : "border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isOpen ? "bg-blue-600 dark:bg-blue-400" : "bg-transparent"}`} />
                </div>

                {/* Step Header */}
                <button
                  onClick={() => toggleStep(i)}
                  className="w-full text-left p-5 md:p-6 flex items-center justify-between gap-4 focus:outline-none"
                >
                  <div className="flex items-center gap-3 md:gap-5">
                    {/* Glowing Icon */}
                    <div className={`w-10 h-10 rounded-xl ${step.bgColor} flex items-center justify-center ${step.iconColor} shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        {step.phase}
                      </span>
                      <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                        {step.title}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Chevron Toggle */}
                  <div className={`w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Step Details (Accordion Body) */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="px-5 pb-5 md:px-6 md:pb-6 border-t border-slate-50 dark:border-slate-800/40 pt-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5 font-medium">
                          {step.desc}
                        </p>
                        
                        {/* Key Milestones Grid */}
                        <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl p-4 md:p-5 border border-slate-100/50 dark:border-slate-800/40">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                            Key Activities & Safety Checks
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {step.bullets.map((bullet, j) => (
                              <div key={j} className="flex items-start gap-2.5">
                                <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0 mt-0.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-350 leading-snug">
                                  {bullet}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
