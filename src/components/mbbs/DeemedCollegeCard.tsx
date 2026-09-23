"use client";
import React from 'react';
import { MapPin, Building2, Users, Phone } from 'lucide-react';
import { useCTA } from '@/hooks/useCTA';
import Image from 'next/image';
import type { DeemedCollege } from '@/hooks/useDeemedColleges';
import { DEFAULT_COLLEGE_IMAGE } from '@/constants/defaultImages';

interface DeemedCollegeCardProps {
  college: DeemedCollege;
}

export function DeemedCollegeCard({ college }: DeemedCollegeCardProps) {
  const CTA = useCTA();
  const displayImage = college.image_url || DEFAULT_COLLEGE_IMAGE;

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-cyan-200 dark:hover:border-cyan-900 hover:shadow-xl dark:hover:shadow-black/20 transition-all duration-300 overflow-hidden flex flex-col relative">
      {/* College Image — fixed 160px height consistent with CollegeCard */}
      <div className="relative w-full h-[160px] overflow-hidden shrink-0">
        <Image
          src={displayImage}
          alt={college.college_name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMjQwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDcwZTFlIi8+PC9zdmc+"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-40" />
      </div>

      {/* Content Area — flex-1 so it grows to fill remaining space */}
      <div className="p-3 flex flex-col flex-1 gap-1 min-h-0">
        <div className="space-y-1 min-w-0">
          {/* College Name */}
          <h3 className="text-xs md:text-sm font-black text-slate-900 dark:text-slate-100 leading-tight group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors line-clamp-2" title={college.college_name}>
            {college.college_name}
          </h3>

          {/* University & Location */}
          <div className="flex flex-col gap-0.5">
            {college.university_name && (
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Building2 className="w-3 h-3 shrink-0 text-cyan-500/70" />
                <span className="text-[9px] font-bold truncate">{college.university_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <MapPin className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500" />
              <span className="text-[9px] font-bold uppercase tracking-wide truncate">
                {[college.city, college.state].filter(Boolean).join(', ') || 'India'}
              </span>
            </div>
          </div>
        </div>

        {/* Intake and Badges Container */}
        <div className="space-y-1.5 mt-1">
          {college.intake != null && (
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Users className="w-3 h-3 shrink-0 text-emerald-500" />
              <span className="text-[9px] font-bold">{college.intake} Seats</span>
              {college.nri_seats != null && (
                <span className="text-[8px] text-amber-600 dark:text-amber-400 font-bold ml-0.5">({college.nri_seats} NRI)</span>
              )}
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1">
            {college.has_nri_seats && (
              <span className="px-1 py-0.2 rounded text-[7px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/30">
                NRI
              </span>
            )}
            {college.has_minority_seats && (
              <span className="px-1 py-0.2 rounded text-[7px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 border border-teal-200/40 dark:border-teal-900/30">
                Minority
              </span>
            )}
            {college.is_women_only && (
              <span className="px-1 py-0.2 rounded text-[7px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-900/30">
                Women Only
              </span>
            )}
          </div>
        </div>
 
        {/* CTA — No detail page link */}
        <div className="flex gap-1.5 pt-2 border-t border-slate-50 dark:border-slate-800/60 mt-auto shrink-0">
          <button
            onClick={() => CTA.whatsapp(`Hi, I need guidance for admission in ${college.college_name}`)}
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
    </div>
  );
}

export function DeemedCollegeCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-pulse">
      <div className="h-[160px] bg-slate-200 dark:bg-slate-800" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
        <div className="h-3 bg-slate-100 dark:bg-slate-850 rounded w-1/2" />
        <div className="h-3 bg-slate-100 dark:bg-slate-850 rounded w-2/3" />
        <div className="h-5 w-12 bg-slate-100 dark:bg-slate-850 rounded" />
        <div className="flex gap-1.5 pt-2 border-t border-slate-50 dark:border-slate-800/60 mt-1">
          <div className="flex-1 h-7 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-7 w-12 bg-slate-100 dark:bg-slate-850 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

