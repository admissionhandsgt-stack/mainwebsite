"use client";

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Building2, ChevronLeft, ChevronRight, Loader2, SearchX, Sparkles } from 'lucide-react';
import { usePGColleges } from '@/hooks/usePGColleges';
import { CollegeCard } from '@/components/ui/CollegeCard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const PGCollegesList = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const {
    colleges, allStates, loading, error, filters, activeFilterCount, updateFilters, clearFilters,
  } = usePGColleges();

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-24 bg-[#f8fafc]">
      <div className="container-custom">
        {/* Header - Trust Based */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-4">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Verified Institutions</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 font-heading tracking-tight">
            Top Medical Colleges & <span className="text-blue-600">Deemed Universities</span>
          </h2>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
            Explore institutions based on demand, reputation, and counselling trends.
          </p>
        </div>

        {/* Sticky Filter Bar */}
        <div className="sticky top-[72px] z-30 mb-12">
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-4 rounded-[2rem] shadow-xl shadow-slate-200/50 flex flex-col lg:flex-row items-center gap-4">
            {/* Search */}
            <div className="relative w-full lg:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search by college name..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all font-bold text-slate-800"
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
              />
            </div>

            {/* State Filter */}
            <div className="relative w-full lg:w-64">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select 
                className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-800 cursor-pointer"
                value={filters.state[0] || ''}
                onChange={(e) => updateFilters({ state: e.target.value ? [e.target.value] : [] })}
              >
                <option value="">All States</option>
                {allStates.map(state => <option key={state} value={state}>{state}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* Type Filter */}
            <div className="relative w-full lg:w-64">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select 
                className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-800 cursor-pointer"
                value={filters.college_type[0] || ''}
                onChange={(e) => updateFilters({ college_type: e.target.value ? [e.target.value] : [] })}
              >
                <option value="">All Types</option>
                <option value="Government">Government</option>
                <option value="Private">Private</option>
                <option value="Deemed">Deemed</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* Clear Button */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" onClick={clearFilters} className="text-rose-600 font-black hover:bg-rose-50 h-14 rounded-2xl px-6">
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Results Section - Single Row Horizontal Only */}
        <div className="relative group">
          {/* Navigation Buttons */}
          {!loading && colleges.length > 0 && (
            <>
              <button 
                onClick={() => scroll('left')} 
                className="absolute left-[-20px] top-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-white rounded-full shadow-2xl border border-slate-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={() => scroll('right')} 
                className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-white rounded-full shadow-2xl border border-slate-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Horizontal Scroll Container */}
          <div 
            ref={scrollContainerRef}
            className="flex overflow-x-auto gap-8 pb-12 px-4 snap-x no-scrollbar min-h-[500px]"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[350px] md:w-[420px] h-[550px] bg-slate-100 animate-pulse rounded-[3rem]" />
              ))
            ) : colleges.length > 0 ? (
              colleges.map((college) => (
                <div key={college.id} className="flex-shrink-0 w-[350px] md:w-[420px] snap-start">
                  <CollegeCard
                    collegeName={college.college_name}
                    city={college.city}
                    state={college.state}
                    collegeType={college.college_type}
                    specialties={college.key_specialties}
                    description={college.short_description}
                    imageUrl={college.image_url}
                    yearEstablished={college.year_established}
                    isHighDemand={college.college_type === 'Government' || college.college_name.includes('DY Patil')}
                    isTopChoice={college.total_pg_seats > 100}
                  />
                </div>
              ))
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                <SearchX className="w-20 h-20 text-slate-200 mb-6" />
                <h3 className="text-2xl font-bold text-slate-800 mb-2">No matching institutions found</h3>
                <p className="text-slate-500 font-medium mb-8">Try adjusting your filters or talk to our experts.</p>
                <Button onClick={clearFilters} variant="outline" className="rounded-2xl px-8 h-14 border-blue-200 text-blue-600 font-black">
                  Reset Search
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Trust Signals & Bonus Points */}
        <div className="mt-8 flex flex-col items-center gap-6">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] italic">
            * Admission trends change based on MCC/State notifications. Confirm with experts.
          </p>
          <div className="flex flex-wrap justify-center gap-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                <Sparkles className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Bonus Point</p>
                <p className="text-sm font-bold text-slate-700">Merit-based seat allocation tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">Expert Edge</p>
                <p className="text-sm font-bold text-slate-700">Strategic choice filling support</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
