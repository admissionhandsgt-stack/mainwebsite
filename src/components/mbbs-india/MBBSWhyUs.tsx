import React from "react";
import Image from "next/image";
import { mbbsData } from "@/data/mbbs-india";
import { ShieldCheck, TrendingUp, Search, UserCheck, Heart } from "lucide-react";
import { BackendImage } from "@/components/ui/BackendImage";

const icons = [TrendingUp, Search, Heart, UserCheck];

export const MBBSWhyUs = () => {
  const { whyUs } = mbbsData;

  return (
    <section className="py-12 bg-white dark:bg-slate-955 relative overflow-hidden transition-colors duration-200">
      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-tight">
                Why Students Trust <br/> <span className="text-blue-600 dark:text-blue-400">Admission Hands</span>
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Professional medical counselling with zero compromises on quality and transparency.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {whyUs.points.map((item, idx) => {
                const Icon = icons[idx] || ShieldCheck;
                return (
                  <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group transition-all">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-slate-200 dark:border-slate-800 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-450 font-bold uppercase tracking-widest mt-1">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-10 bg-blue-600/5 rounded-full blur-[100px] -z-10" />
            
            {/* Trust Stats Box - With Doctors Background */}
            <div className="glass rounded-[3rem] p-8 md:p-12 border border-white dark:border-slate-800 shadow-2xl space-y-8 bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl relative overflow-hidden">
              {/* Background Image of Doctors */}
              <div className="absolute inset-0 z-0">
                <BackendImage 
                  mediaKey="mbbs_doctors_stats"
                  fallbackSrc="/assets/images/misc/indian-doctors-stats.avif"
                  alt="Professional Doctors"
                  fill
                  className="object-cover opacity-20 grayscale-[0.5]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent dark:from-slate-900 dark:via-slate-900/40" />
              </div>

              <div className="text-center relative z-10">
                <p className="text-6xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">100%</p>
                <p className="text-base font-black text-slate-900 dark:text-white uppercase tracking-widest">Transparency</p>
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="text-center p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-100 dark:border-slate-800 shadow-sm">
                  <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">2100+</p>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mt-1">Admits</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-100 dark:border-slate-800 shadow-sm">
                  <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">12+</p>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mt-1">Years Exp</p>
                </div>
              </div>

              <div className="flex -space-x-2 justify-center relative z-10">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 shadow-sm overflow-hidden relative">
                     <BackendImage 
                      mediaKey="mbbs_doctors_image"
                      fallbackSrc="/assets/images/hero/indian_doctors.avif"
                      alt="Doctor"
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-blue-600 dark:bg-blue-650 text-white flex items-center justify-center font-black text-[10px] shadow-sm z-10">
                  +1k
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
