"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2, Info, ArrowRight } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
  support: string;
  list?: string[];
  rounds?: { name: string; description: string }[];
}

interface Phase {
  title: string;
  shortTitle: string;
  steps: Step[];
}

const phases: Phase[] = [
  {
    title: "Phase 1: Before Exam",
    shortTitle: "Before Exam",
    steps: [
      {
        id: 1,
        title: "Check Eligibility Before Applying",
        description: "Verify your eligibility based on age, qualifying marks, and category-specific requirements as per NTA guidelines.",
        support: "Clarifies eligibility based on category and documents. Prevents mistakes in category selection."
      },
      {
        id: 2,
        title: "Fill NEET UG Application Form",
        description: "Register on the official NTA website and fill in personal, academic, and contact details carefully.",
        support: "Accurate form filling guidance. Prevents document and detail errors."
      },
      {
        id: 3,
        title: "Use Correction Window Carefully",
        description: "Utilize the one-time opportunity provided by NTA to correct errors in your application form.",
        support: "Identifies critical corrections. Ensures consistency with counselling data."
      },
      {
        id: 4,
        title: "Download Admit Card & Appear for Exam",
        description: "Download the hall ticket and follow all instructions for the exam day.",
        support: "Pre-exam checklist and document readiness."
      }
    ]
  },
  {
    title: "Phase 2: After Result",
    shortTitle: "After Result",
    steps: [
      {
        id: 5,
        title: "Result, Rank & Score Analysis",
        description: "Once results are out, analyze your All India Rank (AIR) and Category Rank.",
        support: "Rank-based college feasibility and budget vs college mapping."
      },
      {
        id: 6,
        title: "Decide Counselling Routes",
        description: "Understand various quotas like AIQ (15%), State Quota (85%), Deemed Universities, and Central Universities.",
        support: "Multi-counselling strategy. Identifies all eligible routes."
      },
      {
        id: 7,
        title: "Register for Counselling",
        description: "Submit registration fees and security deposits on MCC or respective State portals.",
        support: "Step-by-step registration help and fee/deposit guidance."
      }
    ]
  },
  {
    title: "Phase 3: Counselling Process",
    shortTitle: "Counselling",
    steps: [
      {
        id: 8,
        title: "Understand Counselling Rules & Schedule",
        description: "Each round has specific rules regarding exit, forfeiture of security deposit, and upgrades.",
        support: "Explains exit rules, upgrade rules, and refunds."
      },
      {
        id: 9,
        title: "Review Seat Matrix",
        description: "Analyze the available seats in colleges based on your category and rank.",
        support: "Filters colleges by rank, category, and budget."
      },
      {
        id: 10,
        title: "Choice Filling & Locking",
        description: "List colleges in order of preference. Strategic ordering is key to getting the best possible seat.",
        support: "Strategic preference ordering. Avoids common mistakes."
      },
      {
        id: 11,
        title: "Seat Allotment Result",
        description: "Check which college has been assigned to you based on your choices and rank.",
        support: "Accept vs upgrade decisions."
      },
      {
        id: 12,
        title: "Reporting to College",
        description: "Visit the allotted college with original documents and complete admission formalities.",
        support: "Reporting guidance and fee clarification."
      }
    ]
  },
  {
    title: "Phase 4: Final Admission",
    shortTitle: "Final Admission",
    steps: [
      {
        id: 13,
        title: "Documents Required",
        description: "Ensure you have all necessary documents in original and photocopies.",
        list: [
          "NEET Admit Card",
          "Scorecard",
          "10th & 12th Marksheet",
          "ID Proof",
          "Category Certificate",
          "Allotment Letter"
        ],
        support: "Ensures document readiness."
      },
      {
        id: 14,
        title: "Counselling Rounds Strategy",
        description: "Strategic planning for each round to maximize your chances.",
        rounds: [
          { name: "Round 1", description: "The first opportunity to secure a seat." },
          { name: "Round 2", description: "Often sees shifts in cut-offs." },
          { name: "Mop-up Round", description: "For remaining vacant seats." },
          { name: "Stray Vacancy", description: "Final round for college-level admissions." }
        ],
        support: "Round-wise strategy and risk vs opportunity planning."
      },
      {
        id: 15,
        title: "Final Admission & Joining",
        description: "Complete the final joining formalities and start your medical journey.",
        support: "End-to-end guidance till joining."
      }
    ]
  }
];

const ProcessAccordion = () => {
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [openStepId, setOpenStepId] = useState<number | null>(phases[0].steps[0].id);

  const activePhase = phases[activePhaseIndex];

  return (
    <div className="bg-white dark:bg-slate-950 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col md:flex-row">
      {/* Sidebar Tabs for Phases */}
      <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-900 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-3 sm:p-5">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4 px-2">Admission Phases</h3>
        <div className="flex flex-row md:flex-col gap-3 overflow-x-auto pb-3 md:pb-0 hide-scrollbar">
          {phases.map((phase, idx) => {
            const isActive = activePhaseIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => {
                  setActivePhaseIndex(idx);
                  setOpenStepId(phases[idx].steps[0].id);
                }}
                className={`flex items-center justify-between text-left px-4 py-3.5 rounded-xl font-black transition-all whitespace-nowrap md:whitespace-normal shrink-0 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                    : 'bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                    {idx + 1}
                  </span>
                  {phase.shortTitle}
                </div>
                {isActive && <ArrowRight className="w-4 h-4 hidden md:block opacity-50" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accordion Steps for Active Phase */}
      <div className="w-full md:w-2/3 p-4 sm:p-5 bg-white dark:bg-slate-950 min-h-[300px]">
        <div className="mb-4">
          <div className="inline-flex px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-black uppercase tracking-wider text-[10px] rounded-full mb-1.5">
            Phase {activePhaseIndex + 1}
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">{activePhase.title}</h2>
        </div>

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {activePhase.steps.map((step) => {
              const isOpen = openStepId === step.id;
              
              return (
                <motion.div 
                  key={step.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
                    isOpen 
                      ? 'border-blue-200 dark:border-blue-900/50 shadow-lg shadow-blue-900/5 bg-slate-50 dark:bg-slate-900/40' 
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-blue-200 dark:hover:border-slate-850 hover:shadow-md'
                  }`}
                >
                  <button
                    onClick={() => setOpenStepId(isOpen ? null : step.id)}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black transition-all shadow-sm ${
                        isOpen ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-700 dark:group-hover:bg-blue-900/30'
                      }`}>
                        {step.id}
                      </span>
                      <h4 className={`text-sm font-bold transition-colors ${isOpen ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-300'}`}>
                        {step.title}
                      </h4>
                    </div>
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors ${isOpen ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-50 dark:bg-slate-905 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'}`}>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400'}`} />
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-4 pb-4 pt-0 space-y-3">
                          <p className="text-slate-600 dark:text-slate-400 text-xs font-medium leading-relaxed pl-9">
                            {step.description}
                          </p>
                          
                          {step.list && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-9">
                              {step.list.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 py-1.5 px-2.5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                  {item}
                                </div>
                              ))}
                            </div>
                          )}

                          {step.rounds && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9">
                              {step.rounds.map((round, i) => (
                                <div key={i} className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-1">{round.name}</p>
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{round.description}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="ml-9 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-100/50 dark:border-blue-900/30 flex gap-2.5 shadow-inner">
                            <div className="flex-shrink-0 mt-0.5">
                              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">Admission Hands Support</p>
                              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{step.support}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ProcessAccordion;
