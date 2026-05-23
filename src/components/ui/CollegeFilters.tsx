'use client';

import React, { useState } from 'react';
import { X, SlidersHorizontal, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollegeFiltersProps {
  states: string[];
  selectedStates: string[];
  selectedTypes: string[];
  searchQuery: string;
  activeCount: number;
  onStateChange: (states: string[]) => void;
  onTypeChange: (types: string[]) => void;
  onSearchChange: (search: string) => void;
  onClear: () => void;
  totalCount: number;
}

const COLLEGE_TYPES = [
  { value: 'Government', label: 'Government', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'Private', label: 'Private', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'Deemed', label: 'Deemed', color: 'bg-violet-100 text-violet-700 border-violet-200' },
];

function FilterContent({
  states, selectedStates, selectedTypes, searchQuery,
  onStateChange, onTypeChange, onSearchChange, onClear, activeCount
}: Omit<CollegeFiltersProps, 'totalCount'>) {
  const [stateSearch, setStateSearch] = useState('');
  const [showAllStates, setShowAllStates] = useState(false);

  const filteredStates = states.filter(s =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );
  const visibleStates = showAllStates ? filteredStates : filteredStates.slice(0, 8);

  const toggleState = (state: string) => {
    if (selectedStates.includes(state)) {
      onStateChange(selectedStates.filter(s => s !== state));
    } else {
      onStateChange([...selectedStates, state]);
    }
  };

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypeChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypeChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="College or city..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      {/* College Type */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">College Type</label>
        <div className="space-y-2">
          {COLLEGE_TYPES.map(type => (
            <button
              key={type.value}
              onClick={() => toggleType(type.value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                selectedTypes.includes(type.value)
                  ? type.color + ' shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                selectedTypes.includes(type.value)
                  ? 'border-current bg-current'
                  : 'border-slate-300'
              }`}>
                {selectedTypes.includes(type.value) && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">State / UT</label>
        {states.length > 8 && (
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={stateSearch}
              onChange={(e) => setStateSearch(e.target.value)}
              placeholder="Filter states..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        )}
        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {visibleStates.map(state => (
            <button
              key={state}
              onClick={() => toggleState(state)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                selectedStates.includes(state)
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                selectedStates.includes(state)
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-slate-300'
              }`}>
                {selectedStates.includes(state) && (
                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="truncate">{state}</span>
            </button>
          ))}
        </div>
        {filteredStates.length > 8 && (
          <button
            onClick={() => setShowAllStates(!showAllStates)}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            {showAllStates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showAllStates ? 'Show less' : `Show all ${filteredStates.length} states`}
          </button>
        )}
      </div>

      {/* Clear */}
      {activeCount > 0 && (
        <button
          onClick={onClear}
          className="w-full py-2.5 text-sm font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all"
        >
          Clear all filters ({activeCount})
        </button>
      )}
    </div>
  );
}

// Desktop sidebar
export function DesktopFilters(props: CollegeFiltersProps) {
  return (
    <div className="hidden lg:block w-72 shrink-0">
      <div className="sticky top-24 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Filters</h3>
          {props.activeCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {props.activeCount}
            </span>
          )}
        </div>
        <FilterContent {...props} />
      </div>
    </div>
  );
}

// Mobile bottom sheet
export function MobileFilterButton(props: CollegeFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 z-40 bg-blue-600 text-white w-14 h-14 rounded-full shadow-xl shadow-blue-600/30 flex items-center justify-center hover:bg-blue-700 transition-colors"
      >
        <SlidersHorizontal className="w-5 h-5" />
        {props.activeCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {props.activeCount}
          </span>
        )}
      </button>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[85vh] overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Filters</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto -mt-4 mb-4" />
              <FilterContent {...props} />
              <button
                onClick={() => setOpen(false)}
                className="w-full mt-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Show {props.totalCount} colleges
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
