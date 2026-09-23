'use client';

import React from 'react';
import Image from 'next/image';
import { MapPin, TrendingUp, Users, Sparkles, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { DEFAULT_COLLEGE_IMAGE } from '@/constants/defaultImages';
import { useCTA } from '@/hooks/useCTA';

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
  seats?: number | null;
  // CRO Tags
  isHighDemand?: boolean;
  isTopChoice?: boolean;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  Government: {
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    border: 'border-emerald-100 dark:border-emerald-900/30',
  },
  Private: {
    bg: 'bg-amber-50/80 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    border: 'border-amber-100 dark:border-amber-900/30',
  },
  Deemed: {
    bg: 'bg-teal-50/80 dark:bg-teal-950/30',
    text: 'text-teal-700 dark:text-teal-400',
    dot: 'bg-teal-500',
    border: 'border-teal-100 dark:border-teal-900/30',
  },
};

export function CollegeCard({
  collegeName, city, state, collegeType, imageUrl,
  yearEstablished, universityBody, seats, isHighDemand, isTopChoice,
}: CollegeCardProps) {
  const CTA = useCTA();
  const style = collegeType ? (TYPE_STYLES[collegeType] || TYPE_STYLES.Private) : TYPE_STYLES.Deemed;
  const displayImage = imageUrl || DEFAULT_COLLEGE_IMAGE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm dark:shadow-none hover:shadow-lg hover:shadow-cyan-500/5 hover:border-cyan-200 dark:hover:border-cyan-900/60 transition-all duration-300 overflow-hidden flex flex-col relative"
    >
      {/* Top hover accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

      {/* Image — fixed 160px height, always consistent */}
      <div className="relative h-[160px] w-full overflow-hidden shrink-0">
        <Image
          src={displayImage}
          alt={collegeName}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMjQwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDcwZTFlIi8+PC9zdmc+"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

        {/* CRO Badges */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
          {isHighDemand && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-600/90 text-[7px] font-black text-white uppercase tracking-wider shadow-sm backdrop-blur-sm">
              <TrendingUp className="w-2.5 h-2.5" /> High Demand
            </span>
          )}
          {isTopChoice && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-600/90 text-[7px] font-black text-white uppercase tracking-wider shadow-sm backdrop-blur-sm">
              <Sparkles className="w-2.5 h-2.5" /> Top Choice
            </span>
          )}
        </div>

        {/* Type Badge */}
        {collegeType && (
          <div className="absolute top-1.5 right-1.5">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black backdrop-blur-md bg-white/90 dark:bg-slate-900/90 ${style.text} shadow-sm border ${style.border}`}>
              <span className={`w-1 h-1 rounded-full ${style.dot}`} />
              {collegeType}
            </span>
          </div>
        )}
      </div>

      {/* Content — flex-1 so it grows naturally, no fixed height */}
      <div className="p-3 flex flex-col flex-1 gap-1.5 min-h-0">
        {/* College Name */}
        <h3 className="text-[13px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight line-clamp-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
          {collegeName}
        </h3>

        {/* Location + Year row */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[8.5px] font-bold tracking-tight min-w-0">
            <MapPin className="w-3 h-3 shrink-0 text-cyan-500/70" />
            <span className="truncate">{city ? `${city}, ` : ''}{state}</span>
          </div>
          {yearEstablished && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-cyan-50/80 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 text-[7.5px] font-black border border-cyan-200/40 dark:border-cyan-900/30 whitespace-nowrap shrink-0">
              Est. {yearEstablished}
            </span>
          )}
        </div>

        {/* Seats (if available) */}
        {seats != null && (
          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/40 pt-1">
            <Users className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>Seats: <strong className="text-slate-900 dark:text-white font-extrabold">{seats}</strong></span>
          </div>
        )}

        {/* Affiliation */}
        {universityBody && (
          <div className="text-[7.5px] text-slate-400 dark:text-slate-500 font-bold border-t border-slate-50 dark:border-slate-800/40 pt-1 flex items-center justify-between">
            <span className="uppercase tracking-wider shrink-0">Affiliation</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-extrabold truncate max-w-[70%] text-right ml-1">{universityBody}</span>
          </div>
        )}

        {/* CTA — pushed to bottom */}
        <div className="flex gap-1.5 mt-auto pt-1.5 border-t border-slate-50 dark:border-slate-800/60">
          <button
            onClick={() => CTA.whatsapp(`Hi, I need guidance for admission in ${collegeName}`)}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black bg-slate-900 dark:bg-slate-800 text-white hover:bg-cyan-600 dark:hover:bg-cyan-600 transition-all active:scale-95 shadow-sm"
          >
            Get Guidance
          </button>
          <button
            onClick={CTA.call}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-900 hover:text-cyan-700 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 transition-all active:scale-95"
          >
            <Phone className="w-2.5 h-2.5" /> Call
          </button>
        </div>
      </div>
    </motion.div>
  );
}
