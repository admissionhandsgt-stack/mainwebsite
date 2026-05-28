import React from 'react';
import { SectionWrapper } from '@/components/ui/SectionWrapper';
import { Target, AlertTriangle } from 'lucide-react';

export const PGSeatStrategy = () => {
  return (
    <SectionWrapper bgWhite={true}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-black text-center text-slate-900 dark:text-white mb-12">Smart Seat Strategy</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <Target className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Deemed vs State Colleges</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4 font-medium">
              Deciding between a Deemed University (via MCC) and a State Private College requires balancing your rank, budget, and desired branch. Deemed universities often have exceptional infrastructure and no domicile restrictions, making them ideal if you missed State cutoffs but have the budget.
            </p>
          </div>
          
          <div className="p-8 rounded-3xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Management Quota Considerations</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4 font-medium">
              Management quota seats are legally available through state counseling authorities. They do NOT mean "direct admission without counseling." You must qualify NEET PG and apply through the official state portal. Relying on unauthorized agents for management seats is highly risky.
            </p>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
};
