import React from "react";
import { mbbsData } from "@/data/mbbs-india";
import { Clock, BookOpen, GraduationCap, Building2, LayoutGrid } from "lucide-react";

const icons = [Clock, BookOpen, GraduationCap, Building2, LayoutGrid];

export const QuickOverview = () => {
  const { overview } = mbbsData;

  return (
    <section className="pt-2 md:pt-4 pb-8 md:pb-12 bg-white relative overflow-hidden border-b border-slate-50">
      <div className="container-custom relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          {overview.items.map((item, idx) => {
            const Icon = icons[idx] || LayoutGrid;
            return (
              <div 
                key={idx}
                className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col items-center text-center group hover:bg-white hover:shadow-xl transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  {item.label}
                </p>
                <p className="text-2xl font-black text-slate-900 leading-none mb-1">
                  {item.value}
                </p>
                <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-wide">
                  {item.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

