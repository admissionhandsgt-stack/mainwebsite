"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle2, Info, ArrowRight } from 'lucide-react';

import { UG_PHASES, type UgPhase } from '@/lib/ugProcessSteps';

/**
 * The 15 steps of the NEET UG journey, by phase. The steps are the admin's
 * `ug_process_steps` collection (Admin → Content → Sections & lists); the
 * shipped list in lib/ugProcessSteps.ts is the fallback.
 */
const ProcessAccordion = ({ phases = UG_PHASES }: { phases?: UgPhase[] }) => {
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [openStepId, setOpenStepId] = useState<number | null>(phases[0].steps[0].id);

  const activePhase = phases[activePhaseIndex];

  return (
    <div className="bg-white dark:bg-slate-950 rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col md:flex-row">
      {/* Sidebar Tabs for Phases */}
      <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-900 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-2.5 sm:p-5">
        <h2 className="text-[12px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 md:mb-4 px-2">Admission Phases</h2>
        <div className="flex flex-row md:flex-col gap-1.5 md:gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {phases.map((phase, idx) => {
            const isActive = activePhaseIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => {
                  setActivePhaseIndex(idx);
                  setOpenStepId(phases[idx].steps[0].id);
                }}
                className={`flex items-center justify-between text-left px-2.5 py-1.5 md:px-4 md:py-3.5 rounded-lg md:rounded-xl font-black text-xs md:text-sm transition-all whitespace-nowrap md:whitespace-normal shrink-0 ${
                  isActive 
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20' 
                    : 'bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 md:gap-3">
                  <span className={`flex items-center justify-center w-4 h-4 md:w-6 md:h-6 rounded-full text-[12px] md:text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
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
      <div className="w-full md:w-2/3 p-3 sm:p-5 bg-white dark:bg-slate-950 min-h-[250px] md:min-h-[300px]">
        <div className="mb-3 md:mb-4">
          <div className="inline-flex px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-300 font-black uppercase tracking-wider text-[12px] md:text-[10px] rounded-full mb-1">
            Phase {activePhaseIndex + 1}
          </div>
          <h2 className="text-base md:text-xl font-black text-slate-900 dark:text-white">{activePhase.title}</h2>
        </div>

        <div className="space-y-1.5 md:space-y-2">
          <AnimatePresence mode="popLayout">
            {activePhase.steps.map((step) => {
              const isOpen = openStepId === step.id;
              
              return (
                <motion.div 
                  key={step.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`border rounded-xl md:rounded-2xl transition-all duration-305 overflow-hidden ${
                    isOpen 
                      ? 'border-cyan-200 dark:border-cyan-900/50 shadow-lg shadow-cyan-900/5 bg-slate-50 dark:bg-slate-900/40' 
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-cyan-200 dark:hover:border-slate-850 hover:shadow-md'
                  }`}
                >
                  <button
                    onClick={() => setOpenStepId(isOpen ? null : step.id)}
                    className="w-full px-2.5 py-2.5 md:px-4 md:py-3.5 flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className={`flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-full text-[13px] md:text-xs font-black transition-all shadow-sm ${
                        isOpen ? 'bg-cyan-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-cyan-100 group-hover:text-cyan-700 dark:group-hover:bg-cyan-900/30'
                      }`}>
                        {step.id}
                      </span>
                      <h3 className={`text-xs md:text-sm font-bold transition-colors ${isOpen ? 'text-cyan-900 dark:text-cyan-200 font-extrabold' : 'text-slate-800 dark:text-slate-300'}`}>
                        {step.title}
                      </h3>
                    </div>
                    <div className={`flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full transition-colors ${isOpen ? 'bg-cyan-100 dark:bg-cyan-900/40' : 'bg-slate-50 dark:bg-slate-905 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-900/20'}`}>
                      <ChevronDown className={`h-3 w-3 md:h-4 md:w-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-cyan-500 dark:group-hover:text-cyan-400'}`} />
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="px-2.5 pb-2.5 pt-0 space-y-2 md:px-4 md:pb-4 md:space-y-3">
                          <p className="text-slate-600 dark:text-slate-400 text-[13px] md:text-xs font-medium leading-relaxed pl-1.5 md:pl-9">
                            {step.description}
                          </p>
                          
                          {step.list && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pl-1.5 md:pl-9">
                              {step.list.map((item, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[13px] md:text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 py-1 px-2 md:py-1.5 md:px-2.5 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
                                  <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-500 shrink-0" />
                                  {item}
                                </div>
                              ))}
                            </div>
                          )}

                          {step.rounds && (
                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-1.5 pl-1.5 md:pl-9">
                              {step.rounds.map((round, i) => (
                                <div key={i} className="p-1.5 md:p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                                  <p className="text-[12px] md:text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-0.5 md:mb-1">{round.name}</p>
                                  <p className="text-[13px] md:text-xs font-medium text-slate-500 dark:text-slate-400 leading-tight">{round.description}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="ml-1.5 md:ml-9 p-2 md:p-3 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-950/20 dark:to-teal-950/20 rounded-lg border border-cyan-100/50 dark:border-cyan-900/30 flex gap-2 shadow-inner">
                            <div className="flex-shrink-0 mt-0.5">
                              <Info className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-0.5">Admission Hands Support</p>
                              <p className="text-[13px] md:text-xs text-slate-700 dark:text-slate-300 font-medium leading-tight">{step.support}</p>
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
