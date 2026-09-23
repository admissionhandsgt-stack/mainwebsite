'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface PGCollege {
  id: string;
  college_name: string;
  city: string;
  state: string;
  college_type: string;
  ownership: string | null;
  year_established: number | null;
  total_pg_seats: number;
  key_specialties: string[];
  short_description: string | null;
  image_url: string | null;
}

interface Filters {
  state: string[];
  college_type: string[];
  search: string;
}

const PAGE_SIZE = 8; // Modified to 8 (2 rows of 4 cards)

export function usePGColleges() {
  const [colleges, setColleges] = useState<PGCollege[]>([]);
  const [allStates, setAllStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ state: [], college_type: [], search: '' });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch unique states for filter options
  useEffect(() => {
    async function fetchStates() {
      try {
        const res = await fetch('/api/content/college-list?source=pg&perPage=1');
        if (!res.ok) return;
        const json = await res.json();
        setAllStates((json.states ?? []).filter(Boolean));
      } catch (e) {
        console.error('[usePGColleges] states', e);
      }
    }
    fetchStates();
  }, []);

  // Build and execute query
  const fetchColleges = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 0 && !append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        source: 'pg',
        page: String(pageNum + 1), // the API pages from 1, this hook from 0
        perPage: String(PAGE_SIZE),
      });
      if (filters.state.length > 0) params.set('state', filters.state.join(','));
      if (filters.college_type.length > 0) params.set('collegeType', filters.college_type.join(','));
      if (filters.search.trim()) params.set('search', filters.search.trim());

      const res = await fetch(`/api/content/college-list?${params}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = await res.json();
      const data = (json.data ?? []) as PGCollege[];

      setColleges(prev => (append ? [...prev, ...data] : data));
      setTotalCount(json.total ?? 0);
      setHasMore(data.length === PAGE_SIZE);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch colleges');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  // Re-fetch when filters change
  useEffect(() => {
    setPage(0);
    fetchColleges(0, false);
  }, [fetchColleges]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchColleges(nextPage, true);
  }, [page, fetchColleges]);

  const goToPage = useCallback((pageNum: number) => {
    setPage(pageNum);
    fetchColleges(pageNum, false);
  }, [fetchColleges]);

  const nextPage = useCallback(() => {
    const maxPage = Math.ceil(totalCount / PAGE_SIZE) - 1;
    if (page < maxPage) {
      goToPage(page + 1);
    }
  }, [page, totalCount, goToPage]);

  const prevPage = useCallback(() => {
    if (page > 0) {
      goToPage(page - 1);
    }
  }, [page, goToPage]);

  const updateFilters = useCallback((newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ state: [], college_type: [], search: '' });
  }, []);

  const activeFilterCount = useMemo(() => {
    return filters.state.length + filters.college_type.length + (filters.search ? 1 : 0);
  }, [filters]);

  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / PAGE_SIZE);
  }, [totalCount]);

  return {
    colleges,
    allStates,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    totalPages,
    currentPage: page,
    filters,
    activeFilterCount,
    loadMore,
    goToPage,
    nextPage,
    prevPage,
    updateFilters,
    clearFilters,
  };
}
