"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDeemedColleges, type DeemedCollegeFilters } from '@/hooks/useDeemedColleges';
import { DeemedCollegeCard, DeemedCollegeCardSkeleton } from './DeemedCollegeCard';
import { DeemedCollegeFilterBar } from './DeemedCollegeFilterBar';
import { SearchX, ChevronLeft, ChevronRight } from 'lucide-react';

const DEFAULT_FILTERS: DeemedCollegeFilters = {
  search: '',
  state: '',
  intake: '',
  nriSeats: false,
  minoritySeats: false,
  womenOnly: false,
  sortBy: 'default',
};

export function DeemedCollegesListing() {
  const searchParams = useSearchParams();

  const getFiltersFromURL = useCallback((): DeemedCollegeFilters => {
    return {
      search: searchParams.get('q') || '',
      state: searchParams.get('state') || '',
      intake: searchParams.get('intake') || '',
      nriSeats: searchParams.get('nri') === 'true',
      minoritySeats: searchParams.get('minority') === 'true',
      womenOnly: searchParams.get('women') === 'true',
      sortBy: searchParams.get('sort') || 'default',
    };
  }, [searchParams]);

  const [filters, setFilters] = useState<DeemedCollegeFilters>(getFiltersFromURL);
  const debounceRef = useRef<NodeJS.Timeout>();

  const {
    colleges,
    isLoading,
    error,
    page,
    hasMore,
    totalCount,
    states,
    intakeValues,
    fetchColleges,
    fetchFilterOptions,
    loadMore,
  } = useDeemedColleges();

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    setFilters(getFiltersFromURL());
  }, [getFiltersFromURL]);

  useEffect(() => {
    fetchColleges(filters, 1, false);
  }, [filters, fetchColleges]);

  const syncFiltersToURL = useCallback((newFilters: DeemedCollegeFilters) => {
    const params = new URLSearchParams();
    if (newFilters.search) params.set('q', newFilters.search);
    if (newFilters.state) params.set('state', newFilters.state);
    if (newFilters.intake) params.set('intake', newFilters.intake);
    if (newFilters.nriSeats) params.set('nri', 'true');
    if (newFilters.minoritySeats) params.set('minority', 'true');
    if (newFilters.womenOnly) params.set('women', 'true');
    if (newFilters.sortBy && newFilters.sortBy !== 'default') params.set('sort', newFilters.sortBy);
    const paramString = params.toString();
    const newURL = paramString ? `?${paramString}` : window.location.pathname;
    window.history.replaceState(null, '', newURL);
  }, []);

  const handleFilterChange = useCallback((key: keyof DeemedCollegeFilters, value: string | boolean) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      if (key === 'search') {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => syncFiltersToURL(newFilters), 300);
      } else {
        syncFiltersToURL(newFilters);
      }
      return newFilters;
    });
  }, [syncFiltersToURL]);

  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    syncFiltersToURL(DEFAULT_FILTERS);
  }, [syncFiltersToURL]);

  const totalPages = Math.ceil(totalCount / 10);

  const handlePageChange = useCallback((pageNum: number) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    fetchColleges(filters, pageNum, false);
    document.getElementById("deemed-listing")?.scrollIntoView({ behavior: 'smooth' });
  }, [filters, fetchColleges, totalPages]);

  const paginationNumbers = React.useMemo(() => {
    const numbers: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      numbers.push(i);
    }
    return numbers;
  }, [page, totalPages]);

  return (
    <div>
      <DeemedCollegeFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        states={states}
        intakeValues={intakeValues}
        totalCount={totalCount}
      />

      <section className="compact-padding bg-slate-50/50">
        <div className="container-custom">
          {isLoading && colleges.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <DeemedCollegeCardSkeleton key={i} />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
                <SearchX className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Failed to load colleges</h3>
              <p className="text-sm text-slate-500 mb-4">{error}</p>
              <button
                onClick={() => fetchColleges(filters, 1, false)}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && colleges.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <SearchX className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">No colleges found</h3>
              <p className="text-sm text-slate-500 mb-4">Try adjusting your search or filters.</p>
              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {colleges.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {colleges.map((college) => (
                  <DeemedCollegeCard key={college.id} college={college} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex justify-end items-center gap-1.5 flex-wrap">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || isLoading}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center shrink-0"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Page Numbers */}
                  {paginationNumbers.map((pNum) => (
                    <button
                      key={pNum}
                      onClick={() => handlePageChange(pNum)}
                      disabled={isLoading}
                      className={`h-8 min-w-[2rem] px-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                        pNum === page
                          ? 'bg-blue-600 text-white border border-blue-600'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages || isLoading}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center shrink-0"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
