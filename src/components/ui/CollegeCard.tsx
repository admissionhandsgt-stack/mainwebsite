'use client';

import React from 'react';
import Image from 'next/image';
import { MapPin, GraduationCap, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface CollegeCardProps {
  collegeName: string;
  city: string;
  state: string;
  collegeType?: string; 
  specialties?: string[];
  description: string | null;
  imageUrl?: string | null;
  yearEstablished?: number | null;
  universityBody?: string;
  offersMbbs?: boolean;
  // CRO Tags
  isHighDemand?: boolean;
  isTopChoice?: boolean;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  Government: { 
    bg: 'bg-emerald-55/80 dark:bg-emerald-950/30', 
    text: 'text-emerald-700 dark:text-emerald-400', 
    dot: 'bg-emerald-550',
    border: 'border-emerald-100 dark:border-emerald-900/30'
  },
  Private: { 
    bg: 'bg-amber-55/80 dark:bg-amber-950/30', 
    text: 'text-amber-700 dark:text-amber-400', 
    dot: 'bg-amber-550',
    border: 'border-amber-100 dark:border-amber-900/30'
  },
  Deemed: { 
    bg: 'bg-violet-55/80 dark:bg-violet-950/30', 
    text: 'text-violet-700 dark:text-violet-400', 
    dot: 'bg-violet-550',
    border: 'border-violet-100 dark:border-violet-900/30'
  },
};

export function CollegeCard({
  collegeName, city, state, collegeType, specialties, description, imageUrl, yearEstablished,
  universityBody, isHighDemand, isTopChoice
}: CollegeCardProps) {
  const style = collegeType ? (TYPE_STYLES[collegeType] || TYPE_STYLES.Private) : TYPE_STYLES.Deemed;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm dark:shadow-none hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-200 dark:hover:border-blue-900/60 transition-all duration-300 overflow-hidden flex flex-col h-[270px] relative"
    >
      {/* Premium Top Hover Glow Border Accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

      {/* Image Section (Increased to 70% Height) */}
      <div className="relative h-[70%] overflow-hidden shrink-0">
        <Image
          src={imageUrl || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1000&auto=format&fit=crop'}
          alt={collegeName}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMjQwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDcwZTFlIi8+PC9zdmc+"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-40" />
        
        {/* CRO Badges on Image */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
          {isHighDemand && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-600/90 text-[7px] font-black text-white uppercase tracking-wider shadow-sm backdrop-blur-xs">
              <TrendingUp className="w-2 h-2" />
              High Demand
            </span>
          )}
          {isTopChoice && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-600/90 text-[7px] font-black text-white uppercase tracking-wider shadow-sm backdrop-blur-xs">
              <Sparkles className="w-2 h-2" />
              Top Choice
            </span>
          )}
        </div>

        {/* Type Badge on Image */}
        {collegeType && (
          <div className="absolute top-1.5 right-1.5">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black backdrop-blur-md bg-white/90 dark:bg-slate-900/90 ${style.text} shadow-sm border ${style.border}`}>
              <span className={`w-1 h-1 rounded-full ${style.dot}`} />
              {collegeType}
            </span>
          </div>
        )}
      </div>

      {/* Content Area (30% Height - Extremely Compact & Clean) */}
      <div className="p-2 h-[30%] flex flex-col justify-between">
        {/* College Name */}
        <h3 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {collegeName}
        </h3>

        {/* Location and Highlighted Est. Year */}
        <div className="flex items-center justify-between gap-1.5">
          {/* Location */}
          <div className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400 text-[8.5px] font-bold tracking-tight truncate max-w-[70%]">
            <MapPin className="w-2.5 h-2.5 shrink-0 text-blue-500/70" />
            <span className="truncate">{city}, {state}</span>
          </div>

          {/* Highlighted ESTD Year */}
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-550/10 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[7.5px] font-black border border-blue-200/40 dark:border-blue-900/30 whitespace-nowrap shadow-xs">
            Est. {yearEstablished || 'N/A'}
          </span>
        </div>

        {/* Affiliation Bar */}
        {universityBody && (
          <div className="text-[7.5px] text-slate-400 dark:text-slate-500 font-bold border-t border-slate-50 dark:border-slate-800/40 pt-1 flex items-center justify-between">
            <span className="uppercase tracking-wider">Affiliation</span>
            <span className="text-blue-600 dark:text-blue-400 font-extrabold truncate max-w-[75%]">{universityBody}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
