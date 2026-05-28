import React from "react";
import { mbbsData } from "@/data/mbbs-india";
import { Clock, BookOpen, GraduationCap, Building2, LayoutGrid } from "lucide-react";

const icons = [Clock, BookOpen, GraduationCap, Building2, LayoutGrid];

export const QuickOverview = () => {
  const { overview } = mbbsData;

  return (
    <section className="pt-2 md:pt-4 pb-8 md:pb-12 bg-white dark:bg-slate-955 relative overflow-hidden border-b border-slate-50 dark:border-slate-900 transition-colors duration-200">
      <div className="container-custom relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4">
          {overview.items.map((item, idx) => {
            const Icon = icons[idx] || LayoutGrid;
            return (
              <div 
                key={idx}
                className="p-2.5 md:p-6 rounded-[0.9rem] md:rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center group hover:bg-white dark:hover:bg-slate-850 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-[28px] h-[28px] md:w-12 md:h-12 rounded-[0.6rem] md:rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-2 md:mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-3.5 h-3.5 md:w-6 md:h-6" />
                </div>
                <p className="text-[8px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">
                  {item.label}
                </p>
                <p className="text-sm md:text-2xl font-black text-slate-900 dark:text-white leading-none mb-0.5 md:mb-1">
                  {item.value}
                </p>
                <p className="text-[8px] md:text-[10px] font-black text-blue-600/60 dark:text-blue-400/80 uppercase tracking-wide">
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

