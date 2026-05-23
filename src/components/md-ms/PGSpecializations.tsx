"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpecializations } from '@/hooks/useSpecializations';
import { cn } from '@/lib/utils';
import { Loader2, GraduationCap, Scissors, Stethoscope, Microscope, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const categoryMap: Record<string, { label: string, icon: any, color: string }> = {
  clinical: { label: "Clinical", icon: Stethoscope, color: "bg-blue-600" },
  surgical: { label: "Surgical", icon: Scissors, color: "bg-rose-600" },
  non_clinical: { label: "Non-Clinical", icon: Microscope, color: "bg-emerald-600" }
};

const SPECIALIZATION_IMAGES: Record<string, string> = {
  'general-medicine': '/images/pg/general-medicine.png',
  'pediatrics': '/images/pg/pediatrics.png',
  'radiology': '/images/pg/radiology.png',
  'dermatology': '/images/pg/dermatology.png',
  'general-surgery': '/images/pg/general-surgery.png',
  'orthopedics': '/images/pg/orthopedics.png',
  'obgyn': '/images/pg/obgyn.png',
  'psychiatry': '/images/pg/psychiatry.png',
  'ent': '/images/pg/ent.png',
  'pathology': '/images/pg/pathology.png',
  'pulmonology': '/images/pg/pulmonology.png',
  'anesthesiology': '/images/pg/anesthesiology.png',
  'ophthalmology': '/images/pg/ophthalmology.png',
  'emergency-medicine': '/images/pg/emergency-medicine.png',
  'radiation-oncology': '/images/pg/radiation-oncology.png',
  'nuclear-medicine': '/images/pg/nuclear-medicine.png',
  'geriatrics': '/images/pg/geriatrics.png',
  'pmr': '/assets/images/hero/indian_doctors.png',
  'microbiology': '/assets/images/hero/indian_doctors.png',
  'pharmacology': '/assets/images/hero/indian_doctors.png',
  'psm': '/assets/images/hero/indian_doctors.png',
  'forensic': '/assets/images/hero/indian_doctors.png',
  'anatomy': '/assets/images/hero/indian_doctors.png',
  'physiology': '/assets/images/hero/indian_doctors.png',
  'biochemistry': '/assets/images/hero/indian_doctors.png',
  'transfusion-medicine': '/assets/images/hero/indian_doctors.png',
};

export const PGSpecializations = () => {
  const { specializations, loading, error } = useSpecializations();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredSpecs = activeCategory === 'all' 
    ? specializations 
    : specializations.filter(s => s.category === activeCategory);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Specializations...</p>
      </div>
    );
  }

  return (
    <section className="py-12 md:py-24 bg-white overflow-hidden">
      <div className="container-custom">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 md:mb-16 gap-6 md:gap-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 mb-4 md:mb-6 tracking-tight leading-tight">
              MD/MS <span className="text-blue-600">Specializations</span>
            </h2>
            <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed">
              Choose from 25+ specialized medical branches. Get data-driven insights on branch-specific cutoffs and career prospects.
            </p>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2 md:gap-3">
            <button
              onClick={() => setActiveCategory('all')}
              className={cn(
                "px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all",
                activeCategory === 'all' 
                  ? "bg-slate-900 text-white shadow-lg md:shadow-xl shadow-slate-900/20" 
                  : "bg-slate-50 text-slate-400 hover:bg-slate-100"
              )}
            >
              All Branches
            </button>
            {Object.entries(categoryMap).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={cn(
                  "px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  activeCategory === key 
                    ? `${value.color} text-white shadow-lg md:shadow-xl shadow-blue-900/20` 
                    : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                )}
              >
                <value.icon className="w-3 h-3 md:w-4 md:h-4" />
                {value.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredSpecs.map((spec, i) => (
              <motion.div
                key={spec.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: i * 0.02 }}
                className="group relative h-60 md:h-80 rounded-2xl md:rounded-[2.5rem] overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-500"
              >
                <div className="absolute inset-0 bg-slate-100">
                  <img 
                    src={SPECIALIZATION_IMAGES[spec.slug] || spec.image_url || "/assets/images/hero/indian_doctors.png"} 
                    alt={spec.name}
                    loading="lazy"
                    decoding="async" 
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700",
                      (!SPECIALIZATION_IMAGES[spec.slug] && !spec.image_url) && "opacity-40 grayscale blur-sm"
                    )}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-80" />
                
                <Link href={`/specializations/${spec.slug}`} className="absolute inset-0 p-5 md:p-8 flex flex-col justify-end z-10">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <span className={cn(
                      "text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl shadow-lg text-white",
                      categoryMap[spec.category]?.color || "bg-blue-600"
                    )}>
                      {categoryMap[spec.category]?.label || spec.category}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white leading-tight group-hover:text-blue-400 transition-colors">
                    {spec.name}
                  </h3>
                  
                  <div className="mt-4 flex items-center gap-2 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:translate-y-4 md:group-hover:translate-y-0">
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest flex items-center gap-2">
                      <GraduationCap className="w-3 h-3" />
                      View Details
                      <ChevronRight className="w-3 h-3 text-blue-400" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
