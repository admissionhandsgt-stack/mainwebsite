import React from 'react';
import { SectionWrapper } from '@/components/ui/SectionWrapper';
import { Target, AlertTriangle } from 'lucide-react';

export const PGSeatStrategy = () => {
  return (
    <SectionWrapper bgWhite={true}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-black text-center text-slate-900 mb-12">Smart Seat Strategy</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-indigo-50 border border-indigo-100">
            <Target className="w-8 h-8 text-indigo-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-3">Deemed vs State Colleges</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Deciding between a Deemed University (via MCC) and a State Private College requires balancing your rank, budget, and desired branch. Deemed universities often have exceptional infrastructure and no domicile restrictions, making them ideal if you missed State cutoffs but have the budget.
            </p>
          </div>
          
          <div className="p-8 rounded-3xl bg-amber-50 border border-amber-100">
            <AlertTriangle className="w-8 h-8 text-amber-600 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-3">Management Quota Considerations</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Management quota seats are legally available through state counseling authorities. They do NOT mean "direct admission without counseling." You must qualify NEET PG and apply through the official state portal. Relying on unauthorized agents for management seats is highly risky.
            </p>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
};
