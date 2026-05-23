"use client";
import React, { useState, useEffect } from 'react';
import { Search, Filter, X, MapPin, Tag } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface FilterBarProps {
  states: string[];
  branches: string[];
  onFilterChange: (filters: { search: string; state: string; branch: string }) => void;
}

export const FilterBar = ({ states, branches, onFilterChange }: FilterBarProps) => {
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  
  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({ search, state: selectedState, branch: selectedBranch });
    }, 300);
    return () => clearTimeout(handler);
  }, [search, selectedState, selectedBranch, onFilterChange]);

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedState(val);
    if(val) trackEvent('filter_used', { type: 'state', value: val });
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBranch(val);
    if(val) trackEvent('filter_used', { type: 'branch', value: val });
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedState('');
    setSelectedBranch('');
    onFilterChange({ search: '', state: '', branch: '' });
  };

  const activeFilterCount = (search ? 1 : 0) + (selectedState ? 1 : 0) + (selectedBranch ? 1 : 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-[80px] z-30 mb-8 transition-all duration-300">
      <div className="flex flex-col md:flex-row gap-4">
        
        {/* Search Input */}
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all sm:text-sm"
            placeholder="Search colleges..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* State Filter */}
        <div className="relative md:w-48 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-4 w-4 text-slate-400" />
          </div>
          <select
            className="block w-full pl-10 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-colors"
            value={selectedState}
            onChange={handleStateChange}
          >
            <option value="">All States</option>
            {states.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Branch Filter */}
        <div className="relative md:w-56 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Tag className="h-4 w-4 text-slate-400" />
          </div>
          <select
            className="block w-full pl-10 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none transition-colors"
            value={selectedBranch}
            onChange={handleBranchChange}
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3" /> Active:
          </span>
          
          {selectedState && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
              State: {selectedState}
              <button onClick={() => setSelectedState('')} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          
          {selectedBranch && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
              Branch: {selectedBranch}
              <button onClick={() => setSelectedBranch('')} className="hover:text-purple-900"><X className="w-3 h-3" /></button>
            </span>
          )}

          {search && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              Search: "{search}"
              <button onClick={() => setSearch('')} className="hover:text-slate-900"><X className="w-3 h-3" /></button>
            </span>
          )}

          <button 
            onClick={clearFilters}
            className="text-xs text-slate-500 hover:text-slate-900 font-medium ml-2 underline decoration-slate-300 underline-offset-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
