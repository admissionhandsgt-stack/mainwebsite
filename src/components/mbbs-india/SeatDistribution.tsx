import React from "react";
import { mbbsData } from "@/data/mbbs-india";
import { Users, MapPin, Info } from "lucide-react";

export const SeatDistribution = () => {
  const { seats } = mbbsData;

  return (
    <section className="compact-padding bg-white dark:bg-slate-955 relative overflow-hidden transition-colors duration-200">
      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Content */}
          <div className="lg:col-span-7">
            <h2 className="text-responsive-h2 text-slate-900 dark:text-white mb-6">
              Seat <span className="text-blue-600 dark:text-blue-400">Distribution</span> & Matrix
            </h2>
            <p className="text-responsive-body text-slate-600 dark:text-slate-400 font-medium mb-8 max-w-2xl">
              India&apos;s medical infrastructure is expanding. Here&apos;s a quick look at the current seat distribution.
            </p>

            <div className="overflow-x-auto -mx-4 px-4 pb-4 sm:mx-0 sm:px-0 sm:pb-0 scrollbar-hide">
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 md:gap-4 min-w-[280px]">
                {seats.distribution.map((item, idx) => (
                  <div key={idx} className="p-2.5 md:p-6 rounded-[1.3rem] md:rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center group hover:bg-white dark:hover:bg-slate-850 hover:shadow-xl transition-all duration-300">
                    <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-100 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 md:mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Users className="w-4 h-4 md:w-6 md:h-6" />
                    </div>
                    <p className="text-base md:text-3xl font-black text-slate-900 dark:text-white leading-none mb-0.5 md:mb-1 tracking-tight">
                      {item.count}
                    </p>
                    <p className="text-[7.5px] md:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-955/20 border border-blue-100 dark:border-blue-900/30 flex gap-3">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-800 dark:text-black font-bold leading-relaxed">
                {seats.disclaimer}
              </p>
            </div>
          </div>

          {/* Right Content - Top States */}
          <div className="lg:col-span-5">
            <div className="p-6 md:p-8 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-3">
                <MapPin className="text-blue-600 dark:text-blue-400 w-6 h-6" />
                Top States by Seats
              </h3>

              <div className="space-y-3">
                {seats.topStates.map((state, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 shadow-sm hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-350">{state}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

