"use client";
import React from 'react';
import { MapPin, Building2, Users, Phone } from 'lucide-react';
import { useCTA } from '@/hooks/useCTA';
import Image from 'next/image';
import type { DeemedCollege } from '@/hooks/useDeemedColleges';

interface DeemedCollegeCardProps {
  college: DeemedCollege;
}

export function DeemedCollegeCard({ college }: DeemedCollegeCardProps) {
  const CTA = useCTA();

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 hover:shadow-xl dark:hover:shadow-black/20 transition-all duration-300 overflow-hidden flex flex-col">
      {/* College Image or Gradient Bar */}
      {college.image_url ? (
        <div className="relative w-full h-32 md:h-36 overflow-hidden">
          <Image
            src={college.image_url}
            alt={college.college_name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
          />
        </div>
      ) : (
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-teal-500" />
      )}

      <div className="p-3 md:p-3.5 flex flex-col flex-grow">
        {/* College Name */}
        <h3 className="text-xs md:text-sm font-black text-slate-900 dark:text-slate-100 leading-snug mb-1.5 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors line-clamp-2 min-h-[2.5rem]">
          {college.college_name}
        </h3>

        {/* University */}
        {college.university_name && (
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mb-1.5">
            <Building2 className="w-3 h-3 shrink-0 text-blue-500" />
            <span className="text-[10px] font-bold truncate">{college.university_name}</span>
          </div>
        )}

        {/* Location */}
        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 mb-2">
          <MapPin className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500" />
          <span className="text-[10px] font-bold uppercase tracking-wide truncate">
            {[college.city, college.state].filter(Boolean).join(', ') || 'India'}
          </span>
        </div>

        {/* Intake */}
        {college.intake != null && (
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 mb-2">
            <Users className="w-3 h-3 shrink-0 text-emerald-500" />
            <span className="text-[10px] font-bold">{college.intake} Seats</span>
            {college.nri_seats != null && (
              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold ml-0.5">({college.nri_seats} NRI)</span>
            )}
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mb-3">
          {college.has_nri_seats && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-450 border border-amber-200 dark:border-amber-900/30">
              NRI
            </span>
          )}
          {college.has_minority_seats && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-violet-50 dark:bg-violet-955/20 text-violet-700 dark:text-violet-450 border border-violet-200 dark:border-violet-900/30">
              Minority
            </span>
          )}
          {college.is_women_only && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-pink-50 dark:bg-pink-955/20 text-pink-700 dark:text-pink-450 border border-pink-200 dark:border-pink-900/30">
              Women Only
            </span>
          )}
        </div>

        {/* CTA — No detail page link */}
        <div className="mt-auto flex gap-1.5 pt-2 border-t border-slate-50 dark:border-slate-800/60">
          <button
            onClick={() => CTA.whatsapp(`Hi, I need guidance for admission in ${college.college_name}`)}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] font-black bg-slate-900 dark:bg-slate-800 text-white hover:bg-blue-600 dark:hover:bg-blue-600 transition-all active:scale-95 shadow-sm"
          >
            Get Guidance
          </button>
          <button
            onClick={CTA.call}
            className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-black border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:border-blue-300 dark:hover:border-blue-900 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-955/20 transition-all active:scale-95"
          >
            <Phone className="w-3 h-3" /> Call
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeemedCollegeCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-pulse">
      <div className="h-1.5 bg-slate-200 dark:bg-slate-800" />
      <div className="p-3 md:p-3.5">
        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2.5" />
        <div className="h-3 bg-slate-100 dark:bg-slate-850 rounded w-1/2 mb-2" />
        <div className="h-3 bg-slate-100 dark:bg-slate-850 rounded w-2/3 mb-2" />
        <div className="h-3 bg-slate-100 dark:bg-slate-850 rounded w-1/3 mb-2.5" />
        <div className="flex gap-1 mb-3">
          <div className="h-5 w-12 bg-slate-100 dark:bg-slate-850 rounded" />
        </div>
        <div className="flex gap-1.5 pt-2 border-t border-slate-50 dark:border-slate-800/60">
          <div className="flex-1 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-8 w-16 bg-slate-100 dark:bg-slate-850 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
