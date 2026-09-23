"use client";

import React, { useState, useEffect } from "react";
import type { PgStep } from '@/lib/pgContent';
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

const SHIPPED_STEPS = [
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
    color: "from-cyan-500 to-teal-500",
    iconColor: "text-cyan-500 dark:text-cyan-400",
    bgColor: "bg-cyan-50/50 dark:bg-cyan-950/20"
  },
  { 
    icon: BarChart3, 
    phase: "Phase 02",
    title: "Score Analysis & Strategy", 
    desc: "We place your rank against every published closing round we hold, and build your list from what the record supports.", 
    bullets: [
      "Rank-based college predictions across all quotas", 
      "Branch recommendations aligned to career goals", 
      "Budget analysis including fees, bonds, and stipends", 
      "Realistic vs aspirational target mapping"
    ],
    color: "from-teal-500 to-teal-500",
    iconColor: "text-teal-500 dark:text-teal-400",
    bgColor: "bg-teal-50/50 dark:bg-teal-950/20"
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
    color: "from-teal-500 to-teal-500",
    iconColor: "text-teal-500 dark:text-teal-400",
    bgColor: "bg-teal-50/50 dark:bg-teal-950/20"
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
    color: "from-teal-500 to-emerald-500",
    iconColor: "text-teal-500 dark:text-teal-400",
    bgColor: "bg-teal-50/50 dark:bg-teal-950/20"
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
    color: "from-emerald-500 to-rose-500",
    iconColor: "text-emerald-500 dark:text-emerald-400",
    bgColor: "bg-emerald-50/50 dark:bg-emerald-950/20"
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

export const PGAdmissionProcess = ({ items: fromCms }: { items?: PgStep[] | null } = {}) => {
  // The CMS supplies the words; everything visual stays with the shipped item
  // at the same position, so a design change is a code change and a copy
  // change is not. Extra CMS rows reuse the last item's styling.
  const steps = (() => {
    const cms = fromCms;
    if (!cms?.length) return SHIPPED_STEPS;
    return cms.map((_, i) => {
      const base = SHIPPED_STEPS[i] ?? SHIPPED_STEPS[SHIPPED_STEPS.length - 1];
      return {
          ...base,
          phase: cms[i].phase ?? base.phase,
          title: cms[i].title ?? base.title,
          desc: cms[i].desc ?? base.desc,
          bullets: cms[i].bullets ?? base.bullets,
      };
    });
  })();

  const [mounted, setMounted] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleStep = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="pt-16 pb-6 md:pt-24 md:pb-10 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 overflow-hidden">
      <div className="container-custom max-w-4xl">
        {/* Header */}
        <motion.div 
          initial={mounted ? { opacity: 0, y: 15 } : false} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          className="text-center mb-12"
        >
          <span className="inline-block text-xs font-black tracking-widest text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-4 py-1.5 rounded-full mb-4">
            THE PG ADMISSION JOURNEY
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            From NEET PG Score to <span className="text-cyan-600 dark:text-cyan-400">College Reporting</span>
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
                    ? "border-cyan-200 dark:border-cyan-900/60 shadow-md shadow-cyan-500/5" 
                    : "border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700"
                } rounded-2xl md:rounded-3xl transition-all duration-300 overflow-hidden`}
              >
                {/* Timeline Connector Node */}
                <div 
                  onClick={() => toggleStep(i)}
                  className={`absolute left-[-25px] md:left-[-41px] top-6 w-5 h-5 md:w-6 md:h-6 rounded-full border-2 bg-white dark:bg-slate-900 flex items-center justify-center cursor-pointer transition-all duration-300 z-10 ${
                    isOpen 
                      ? "border-cyan-600 dark:border-cyan-400 ring-4 ring-cyan-50 dark:ring-cyan-950" 
                      : "border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isOpen ? "bg-cyan-600 dark:bg-cyan-400" : "bg-transparent"}`} />
                </div>

                {/* Step Header */}
                <button
                  onClick={() => toggleStep(i)}
                  className="w-full text-left p-3.5 md:p-6 flex items-center justify-between gap-3 md:gap-4 focus:outline-none"
                >
                  <div className="flex items-center gap-2.5 md:gap-5">
                    {/* Glowing Icon */}
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl ${step.bgColor} flex items-center justify-center ${step.iconColor} shrink-0`}>
                      <Icon className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                    <div>
                      <span className="text-[12px] md:text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        {step.phase}
                      </span>
                      <h3 className="text-sm md:text-lg font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                        {step.title}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Chevron Toggle */}
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180 text-cyan-600 dark:text-cyan-400" : ""}`}>
                    <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
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
                      <div className="px-3.5 pb-3.5 md:px-6 md:pb-6 border-t border-slate-50 dark:border-slate-800/40 pt-3 md:pt-4">
                        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3 md:mb-5 font-medium">
                          {step.desc}
                        </p>
                        
                        {/* Key Milestones Grid */}
                        <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl p-3 md:p-5 border border-slate-100/50 dark:border-slate-800/40">
                          <h4 className="text-[12px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 md:mb-3">
                            Key Activities & Safety Checks
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3.5">
                            {step.bullets.map((bullet, j) => (
                              <div key={j} className="flex items-start gap-2">
                                <div className="w-4.5 h-4.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0 mt-0.5">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <span className="text-[13px] md:text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">
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
