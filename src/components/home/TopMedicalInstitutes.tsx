"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Users, Building2, Sparkles, Stethoscope } from "lucide-react";

type Category = "Govt" | "Private" | "Deemed";

interface College {
  name: string;
  state: string;
  seats: number;
  image: string;
}

const collegesData: Record<Category, College[]> = {
  Govt: [
    { name: "AIIMS New Delhi", state: "New Delhi", seats: 125, image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800&auto=format&fit=crop" },
    { name: "Maulana Azad Medical College", state: "New Delhi", seats: 250, image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop" },
    { name: "Grant Medical College", state: "Maharashtra", seats: 250, image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800&auto=format&fit=crop" },
    { name: "JIPMER", state: "Puducherry", seats: 200, image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?q=80&w=800&auto=format&fit=crop" },
  ],
  Private: [
    { name: "Christian Medical College", state: "Tamil Nadu", seats: 100, image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?q=80&w=800&auto=format&fit=crop" },
    { name: "St. John's Medical College", state: "Karnataka", seats: 150, image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=800&auto=format&fit=crop" },
    { name: "Kasturba Medical College", state: "Karnataka", seats: 250, image: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?q=80&w=800&auto=format&fit=crop" },
    { name: "Sri Ramachandra Medical College", state: "Tamil Nadu", seats: 250, image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop" },
  ],
  Deemed: [
    { name: "Amrita Institute of Medical Sciences", state: "Kerala", seats: 150, image: "https://images.unsplash.com/photo-1580281658626-ee379f384018?q=80&w=800&auto=format&fit=crop" },
    { name: "SRM Medical College", state: "Tamil Nadu", seats: 250, image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=800&auto=format&fit=crop" },
    { name: "DY Patil Medical College", state: "Maharashtra", seats: 250, image: "https://images.unsplash.com/photo-1568667256549-094345857637?q=80&w=800&auto=format&fit=crop" },
    { name: "Saveetha Medical College", state: "Tamil Nadu", seats: 250, image: "https://images.unsplash.com/photo-1519494140681-8b17d830a3e9?q=80&w=800&auto=format&fit=crop" },
  ]
};

export default function TopMedicalInstitutes() {
  const [activeTab, setActiveTab] = useState<Category>("Govt");

  return (
    <section id="top-medical-institutes" className="compact-padding relative bg-slate-50 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 blur-[100px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-400/10 blur-[100px] rounded-full pointer-events-none -translate-x-1/2 translate-y-1/2" />
      
      <div className="container-custom relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-4 text-[10px] sm:text-xs font-black tracking-widest text-blue-600 uppercase bg-blue-50 border border-blue-100 rounded-full shadow-sm"
          >
            <Sparkles className="w-3 h-3" />
            Top Tier Medical Institutes
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight mb-4"
          >
            Discover India&apos;s <span className="text-blue-600">Finest</span> <br className="hidden sm:block" /> Medical Colleges
          </motion.h2>
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10">
          {(["Govt", "Private", "Deemed"] as Category[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-5 py-2.5 sm:px-6 sm:py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${
                activeTab === tab
                  ? "text-white shadow-lg shadow-blue-500/25"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                  transition={{ type: "spring", duration: 0.5 }}
                />
              )}
              <span className="relative z-10">
                {tab === "Govt" && "Top Government"}
                {tab === "Private" && "Top Private"}
                {tab === "Deemed" && "Top Deemed"}
              </span>
            </button>
          ))}
        </div>

        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <AnimatePresence mode="popLayout">
            {collegesData[activeTab].map((college, idx) => (
              <motion.div
                key={college.name + idx}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="group bg-white rounded-3xl overflow-hidden shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100/60 hover:border-blue-200/60 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-500 flex flex-col relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative h-40 w-full overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${college.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-bold tracking-wider uppercase">
                      <Stethoscope className="w-3 h-3" /> MBBS
                    </div>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-grow relative z-10">
                  <h3 className="text-base font-black text-slate-900 leading-tight mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {college.name}
                  </h3>

                  <div className="mt-auto space-y-2.5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="text-xs font-semibold">{college.state}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-500">
                      <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold">
                        <span className="text-slate-700 font-bold">{college.seats}</span> Seats
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Subtle animated border effect on hover */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
