import React from "react";
import { mbbsData } from "@/data/mbbs-india";
import { Users, MapPin, Info } from "lucide-react";

export const SeatDistribution = () => {
  const { seats } = mbbsData;

  return (
    <section className="compact-padding bg-white relative overflow-hidden">
      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Content */}
          <div className="lg:col-span-7">
            <h2 className="text-responsive-h2 text-slate-900 mb-6">
              Seat <span className="text-blue-600">Distribution</span> & Matrix
            </h2>
            <p className="text-responsive-body text-slate-600 font-medium mb-8 max-w-2xl">
              India&apos;s medical infrastructure is expanding. Here&apos;s a quick look at the current seat distribution.
            </p>

            <div className="overflow-x-auto -mx-4 px-4 pb-4 sm:mx-0 sm:px-0 sm:pb-0 scrollbar-hide">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-[280px]">
                {seats.distribution.map((item, idx) => (
                  <div key={idx} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-xl transition-all duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 leading-none mb-1 tracking-tight">
                      {item.count}
                    </p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 flex gap-4">
              <Info className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-[11px] text-blue-800 font-bold leading-relaxed">
                {seats.disclaimer}
              </p>
            </div>
          </div>

          {/* Right Content - Top States */}
          <div className="lg:col-span-5">
            <div className="p-6 md:p-8 rounded-[2.5rem] bg-slate-50 border border-slate-200 shadow-sm relative overflow-hidden group">
              <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight flex items-center gap-3">
                <MapPin className="text-blue-600 w-6 h-6" />
                Top States by Seats
              </h3>

              <div className="space-y-3">
                {seats.topStates.map((state, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <span className="text-lg font-black text-slate-800">{state}</span>
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

