import React from 'react';
import { SectionWrapper } from '@/components/ui/SectionWrapper';
import { TrendingUp } from 'lucide-react';

export const PGCutoffInsights = () => {
  return (
    <SectionWrapper bgWhite={false}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-8">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          <h2 className="text-3xl font-black text-slate-900">Cutoff Insights</h2>
        </div>
        
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-slate-600 mb-6 leading-relaxed">
            MD/MS cutoffs fluctuate significantly based on paper difficulty, total seats, and branch demand. While we don't provide exact predictions, understanding general trends is crucial:
          </p>
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-1">Top Clinical Branches</h4>
              <p className="text-sm text-slate-500">(Radiology, Medicine, Dermatology)<br/>Typically require top ranks (&lt;5k AIQ) for Govt. seats.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-1">Surgical Branches</h4>
              <p className="text-sm text-slate-500">(General Surgery, Orthopedics)<br/>Highly competitive, requiring &lt;15k AIQ generally.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-1">Deemed Universities</h4>
              <p className="text-sm text-slate-500">Accessible at lower ranks, provided the candidate qualifies NEET PG, but involve higher fee structures.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h4 className="font-bold text-slate-800 mb-1">Management Quota</h4>
              <p className="text-sm text-slate-500">State private colleges offer management seats for qualifying ranks, subject to state-specific rules.</p>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
};
