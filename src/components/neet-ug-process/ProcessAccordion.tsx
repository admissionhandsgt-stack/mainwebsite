"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2, Info } from 'lucide-react';

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
  steps: Step[];
}

const phases: Phase[] = [
  {
    title: "Phase 1: Before Exam",
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
  const [openId, setOpenId] = useState<number | null>(1);

  return (
    <div className="space-y-8">
      {phases.map((phase, phaseIdx) => (
        <div key={phaseIdx} className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 border-l-4 border-primary pl-4 py-1 bg-slate-50">
            {phase.title}
          </h3>
          <div className="space-y-3">
            {phase.steps.map((step) => (
              <div 
                key={step.id} 
                className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
                  openId === step.id ? 'border-primary/30 shadow-lg shadow-primary/5 bg-white' : 'border-slate-100 bg-white hover:border-slate-200'
                }`}
              >
                <button
                  onClick={() => setOpenId(openId === step.id ? null : step.id)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-4">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                      openId === step.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                    }`}>
                      {step.id}
                    </span>
                    <h4 className={`font-bold transition-colors ${openId === step.id ? 'text-primary' : 'text-slate-800'}`}>
                      {step.title}
                    </h4>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${openId === step.id ? 'rotate-180 text-primary' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {openId === step.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-6 pt-0 space-y-4">
                        <p className="text-slate-600 text-sm leading-relaxed">
                          {step.description}
                        </p>
                        
                        {step.list && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {step.list.map((item, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                {item}
                              </div>
                            ))}
                          </div>
                        )}

                        {step.rounds && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {step.rounds.map((round, i) => (
                              <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-900 mb-1">{round.name}</p>
                                <p className="text-[11px] text-slate-500">{round.description}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <Info className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Admission Hands Support</p>
                            <p className="text-sm text-slate-700 font-medium">{step.support}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProcessAccordion;
