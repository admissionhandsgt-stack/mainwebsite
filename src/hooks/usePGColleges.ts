'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

const PAGE_SIZE = 20;

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
      const { data } = await (supabase
        .from('pg_colleges') as any)
        .select('state')
        .eq('is_active', true)
        .order('state');

      if (data) {
        const unique = Array.from(new Set(data.map((r: any) => r.state))) as string[];
        setAllStates(unique);
      }
    }
    fetchStates();
  }, []);

  // Build and execute query
  const fetchColleges = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      let query = (supabase.from('pg_colleges') as any)
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('state')
        .order('total_pg_seats', { ascending: false });

      if (filters.state.length > 0) {
        query = query.in('state', filters.state);
      }
      if (filters.college_type.length > 0) {
        query = query.in('college_type', filters.college_type);
      }
      if (filters.search.trim()) {
        query = query.or(`college_name.ilike.%${filters.search.trim()}%,city.ilike.%${filters.search.trim()}%`);
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error: queryError, count } = await query;

      if (queryError) {
        setError(queryError.message);
        return;
      }

      if (append) {
        setColleges(prev => [...prev, ...(data || [])]);
      } else {
        setColleges(data || []);
      }

      setTotalCount(count || 0);
      setHasMore((data?.length || 0) === PAGE_SIZE);
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

  const updateFilters = useCallback((newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ state: [], college_type: [], search: '' });
  }, []);

  const activeFilterCount = useMemo(() => {
    return filters.state.length + filters.college_type.length + (filters.search ? 1 : 0);
  }, [filters]);

  return {
    colleges,
    allStates,
    loading,
    loadingMore,
    error,
    hasMore,
    totalCount,
    filters,
    activeFilterCount,
    loadMore,
    updateFilters,
    clearFilters,
  };
}
