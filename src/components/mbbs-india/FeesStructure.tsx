import React from "react";
import { mbbsData } from "@/data/mbbs-india";
import { IndianRupee, Info } from "lucide-react";

export const FeesStructure = () => {
  const { fees } = mbbsData;

  return (
    <section className="compact-padding bg-slate-50 relative overflow-hidden">
      <div className="container-custom relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h2 className="text-responsive-h2 text-slate-900 mb-2">
            Fee <span className="text-blue-600">Structure</span> Breakdown
          </h2>
          <p className="text-responsive-body text-slate-600 font-medium">
            Understand the financial landscape of medical education in India.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {fees.ranges.map((item, idx) => (
            <div 
              key={idx}
              className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <IndianRupee className="w-6 h-6" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">
                {item.category}
              </p>
              <p className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {item.range}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="p-4 rounded-2xl bg-slate-900 text-white inline-flex items-center gap-3 shadow-lg mb-4">
            <Info className="w-5 h-5 text-blue-400 shrink-0" />
            <h3 className="text-sm font-black uppercase tracking-widest">Fee Transparency</h3>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed font-bold italic max-w-2xl mx-auto">
            {fees.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
};

