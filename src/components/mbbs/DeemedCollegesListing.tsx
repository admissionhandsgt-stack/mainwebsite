"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDeemedColleges, type DeemedCollegeFilters } from '@/hooks/useDeemedColleges';
import { DeemedCollegeCard, DeemedCollegeCardSkeleton } from './DeemedCollegeCard';
import { DeemedCollegeFilterBar } from './DeemedCollegeFilterBar';
import { SearchX, ArrowDown } from 'lucide-react';

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

  const handleLoadMore = useCallback(() => {
    loadMore(filters);
  }, [loadMore, filters]);

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {colleges.map((college) => (
                  <DeemedCollegeCard key={college.id} college={college} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Loading...' : (
                      <>Load More Colleges <ArrowDown className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              )}

              {!hasMore && colleges.length > 0 && (
                <div className="mt-8 text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Showing all {totalCount} colleges
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
