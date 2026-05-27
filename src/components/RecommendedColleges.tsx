"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles, MapPin, GraduationCap, ArrowRight, Loader2 } from 'lucide-react';
import { useRecommendedColleges } from '@/hooks/useCollegesData';
import { cn } from "@/lib/utils";

interface RecommendedCollegesProps {
  domain?: 'ug' | 'pg';
}

const RecommendedColleges: React.FC<RecommendedCollegesProps> = ({ domain }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { colleges, loading: isLoading } = useRecommendedColleges(domain);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!isLoading && colleges.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-[#f8fafc] relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -ml-48 -mb-48" />

      <div className="container-custom relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-4">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Top Tier Institutions</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 font-heading tracking-tight">
              Recommended <span className="text-blue-600">Medical Colleges</span>
            </h2>
            <p className="text-lg text-slate-600">
              Handpicked institutions recognized for clinical excellence, state-of-the-art 
              infrastructure, and exceptional academic results.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => scroll('left')}
              className="p-3 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all active:scale-95"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6 text-slate-700" />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="p-3 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all active:scale-95"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6 text-slate-700" />
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            <p className="text-slate-500 font-medium">Loading top colleges...</p>
          </div>
        ) : (
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-6 pb-8 snap-x no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {colleges.map((college, index) => (
              <div 
                key={college.id || index} 
                className="flex-shrink-0 w-[320px] md:w-[380px] group snap-start"
              >
                <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm group-hover:shadow-xl transition-all duration-500 group-hover:-translate-y-2">
                  <div className="relative h-56 overflow-hidden">
                    <img 
                      src={college.image} 
                      alt={college.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60" />
                    <div className="absolute top-4 right-4">
                      <div className="glass-white px-3 py-1.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Accredited
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                        {college.name}
                      </h3>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">{college.location}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/50 border border-blue-100/50">
                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Annual Fees</span>
                        <span className="text-sm font-bold text-blue-900">{college.fees}</span>
                      </div>
                    </div>
                    
                    <Link 
                      href={`/mbbs-india/${college.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-blue-600 transition-all"
                    >
                      View Details
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 flex flex-col items-center gap-6">
          <p className="text-[10px] text-slate-400 text-center max-w-lg italic">
            *Information subject to change based on MCC/State counseling and college notifications. 
            Confirm latest data with AdmissionHands counselor.
          </p>
          <Link 
            href="/mbbs-india" 
            className="group inline-flex items-center gap-2 px-8 py-4 bg-white border border-slate-200 text-slate-900 font-bold rounded-2xl hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm active:scale-95"
          >
            Explore All 600+ Colleges
            <ArrowRight className="h-5 w-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default RecommendedColleges;
