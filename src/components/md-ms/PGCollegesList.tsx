"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Building2, SearchX, GraduationCap, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePGColleges } from '@/hooks/usePGColleges';
import { CollegeCard } from '@/components/ui/CollegeCard';
import { Button } from '@/components/ui/button';

export const PGCollegesList = () => {
  const {
    colleges, 
    allStates, 
    loading, 
    filters, 
    activeFilterCount, 
    totalPages,
    currentPage,
    goToPage,
    nextPage,
    prevPage,
    updateFilters, 
    clearFilters,
  } = usePGColleges();

  const typePills = ['All', 'Government', 'Private', 'Deemed'];

  // Helper to generate page range with ellipses if needed
  const getPageNumbers = () => {
    const range: (number | string)[] = [];
    const delta = 1; // number of pages to show before and after current page
    
    for (let i = 0; i < totalPages; i++) {
      if (
        i === 0 || 
        i === totalPages - 1 || 
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      } else if (range[range.length - 1] !== '...') {
        range.push('...');
      }
    }
    return range;
  };

  return (
    <section className="pt-4 pb-2 md:pt-5 md:pb-3 bg-slate-50 dark:bg-slate-950">
      <div className="container-custom max-w-7xl">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 text-[9px] font-black tracking-widest uppercase mb-1">
            <GraduationCap className="w-2.5 h-2.5" /> Verified Institutions
          </div>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
            Top PG Medical Colleges & <span className="text-blue-600 dark:text-blue-400">Deemed Universities</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold max-w-2xl mx-auto">
            Explore institutions based on demand, reputation, and counselling trends across India.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-3 mb-4">
          <div className="flex flex-col md:flex-row items-stretch gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by college name..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all font-bold text-xs text-slate-800 dark:text-slate-200"
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
              />
            </div>

            {/* State Filter */}
            <div className="relative w-full md:w-48">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <select
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                value={filters.state[0] || ''}
                onChange={(e) => updateFilters({ state: e.target.value ? [e.target.value] : [] })}
              >
                <option value="" className="dark:bg-slate-900">All States</option>
                {allStates.map(state => <option key={state} value={state} className="dark:bg-slate-900">{state}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-3 h-3 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* Clear */}
            {activeFilterCount > 0 && (
              <Button variant="ghost" onClick={clearFilters} className="text-rose-600 font-black hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg px-3 py-1 text-xs">
                Clear
              </Button>
            )}
          </div>

          {/* Type Pills */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {typePills.map((type) => {
              const isActive = type === 'All' ? filters.college_type.length === 0 : filters.college_type[0] === type;
              return (
                <button
                  key={type}
                  onClick={() => updateFilters({ college_type: type === 'All' ? [] : [type] })}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Grid (Modified to 4 columns on desktop with gap-3) */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 bg-white dark:bg-slate-900 animate-pulse rounded-xl border border-slate-100 dark:border-slate-800" />
            ))}
          </div>
        ) : colleges.length > 0 ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
            >
              {colleges.map((college, i) => (
                <motion.div
                  key={college.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i % 4) * 0.04 }}
                >
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
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination & Trust Items Parallel Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/40">
              {/* Trust Indicators */}
              <div className="flex flex-col sm:flex-row items-center gap-3.5 text-center sm:text-left">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Merit-based seat allocation tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Strategic choice filling support</span>
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    onClick={prevPage}
                    disabled={currentPage === 0}
                    className="w-7 h-7 p-0 rounded-lg border-slate-200 dark:border-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-350"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  
                  {getPageNumbers().map((pageNumber, idx) => {
                    if (pageNumber === '...') {
                      return (
                        <span key={idx} className="w-7 h-7 flex items-center justify-center text-slate-400 font-bold select-none text-[10px]">
                          ...
                        </span>
                      );
                    }
                    
                    const pageIndex = pageNumber as number;
                    const isActive = pageIndex === currentPage;
                    
                    return (
                      <Button
                        key={idx}
                        variant={isActive ? 'default' : 'outline'}
                        onClick={() => goToPage(pageIndex)}
                        className={`w-7 h-7 p-0 rounded-lg font-bold text-[10px] ${
                          isActive 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {pageIndex + 1}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    onClick={nextPage}
                    disabled={currentPage === totalPages - 1}
                    className="w-7 h-7 p-0 rounded-lg border-slate-200 dark:border-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-350"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <SearchX className="w-14 h-14 text-slate-200 dark:text-slate-800 mb-4" />
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">No matching institutions found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-6">Try adjusting your filters or talk to our experts.</p>
            <Button onClick={clearFilters} variant="outline" className="rounded-xl px-6 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800">
              Reset Search
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
