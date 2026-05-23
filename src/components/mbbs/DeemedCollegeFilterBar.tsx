"use client";
import React from 'react';
import { Search, X } from 'lucide-react';
import type { DeemedCollegeFilters } from '@/hooks/useDeemedColleges';

interface FilterBarProps {
  filters: DeemedCollegeFilters;
  onFilterChange: (key: keyof DeemedCollegeFilters, value: string | boolean) => void;
  onReset: () => void;
  states: string[];
  intakeValues: number[];
  totalCount: number;
}

export function DeemedCollegeFilterBar({
  filters,
  onFilterChange,
  onReset,
  states,
  intakeValues,
  totalCount,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.search ||
    filters.state ||
    filters.intake ||
    filters.nriSeats ||
    filters.minoritySeats ||
    filters.womenOnly ||
    filters.sortBy !== 'default';

  return (
    <div className="sticky top-[112px] z-[30] bg-white/95 backdrop-blur-lg border-b border-slate-100 shadow-sm">
      <div className="container-custom py-3 md:py-4">
        {/* Search */}
        <div className="mb-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search college, university, or city..."
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.state}
            onChange={(e) => onFilterChange('state', e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all appearance-none cursor-pointer min-w-[90px]"
          >
            <option value="">All</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={filters.intake}
            onChange={(e) => onFilterChange('intake', e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all appearance-none cursor-pointer min-w-[90px]"
          >
            <option value="">Seats</option>
            {intakeValues.map((v) => (
              <option key={v} value={v.toString()}>{v} seats</option>
            ))}
          </select>

          <button
            onClick={() => onFilterChange('nriSeats', !filters.nriSeats)}
            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
              filters.nriSeats
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            NRI Seats
          </button>

          <button
            onClick={() => onFilterChange('minoritySeats', !filters.minoritySeats)}
            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
              filters.minoritySeats
                ? 'bg-violet-50 border-violet-300 text-violet-700'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            Minority
          </button>

          <button
            onClick={() => onFilterChange('womenOnly', !filters.womenOnly)}
            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
              filters.womenOnly
                ? 'bg-pink-50 border-pink-300 text-pink-700'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            Women Only
          </button>

          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange('sortBy', e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all appearance-none cursor-pointer min-w-[120px] ml-auto"
          >
            <option value="default">Default Order</option>
            <option value="name_asc">Name A-Z</option>
            <option value="intake_high">Seats: High → Low</option>
            <option value="intake_low">Seats: Low → High</option>
            <option value="state_asc">State A-Z</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-all"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Count */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-blue-700 text-xs font-black">{totalCount}</span>
          <span className="text-blue-600 text-[10px] font-bold uppercase tracking-wider">Colleges found</span>
        </div>
      </div>
    </div>
  );
}
