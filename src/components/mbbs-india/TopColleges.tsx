import React from "react";
import { mbbsData } from "@/data/mbbs-india";
import { Star, Building2, MapPin, Search } from "lucide-react";
import Image from "next/image";

export const TopColleges = () => {
  const { topColleges } = mbbsData;

  return (
    <section className="py-12 bg-slate-50 dark:bg-slate-955 relative overflow-hidden transition-colors duration-200">
      <div className="container-custom relative z-10">
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">
              Top Tier <span className="text-blue-600 dark:text-blue-400">Medical Institutions</span>
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              These institutions represent the pinnacle of medical excellence in India. Secure your place with the right strategy.
            </p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm group">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
            Explore 700+ Colleges
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topColleges.map((college, idx) => (
            <div 
              key={idx}
              className="group rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-blue-100 dark:hover:border-blue-900/60 transition-all duration-500 overflow-hidden flex flex-col"
            >
              {/* College Image */}
              <div className="relative h-48 overflow-hidden">
                <Image 
                  src={college.image} 
                  alt={college.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                <div className="absolute top-4 right-4 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <div className="absolute bottom-4 left-6">
                  <p className="text-white font-black text-xl tracking-tight">{college.name}</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  {college.location}, India
                </div>

                <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Counselling Target</p>
                    <p className="text-sm font-black text-blue-600 dark:text-blue-400">{college.rank}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
