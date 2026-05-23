import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DeemedCollege {
  id: number;
  slug: string;
  college_name: string;
  state: string;
  city: string | null;
  university_name: string | null;
  established_year: number | null;
  intake: number | null;
  nri_seats: number | null;
  minority_seats: number | null;
  has_nri_seats: boolean;
  has_minority_seats: boolean;
  is_women_only: boolean;
  display_order: number;
  is_active: boolean;
  source_type: string;
  image_url: string | null;
}

export interface DeemedCollegeFilters {
  search: string;
  state: string;
  intake: string;
  nriSeats: boolean;
  minoritySeats: boolean;
  womenOnly: boolean;
  sortBy: string;
}

const PAGE_SIZE = 12;

// Use type assertion once at module level to avoid `as any` everywhere
const db = supabase as ReturnType<typeof supabase['from']> & { from: (table: string) => ReturnType<typeof supabase['from']> };

export function useDeemedColleges() {
  const [colleges, setColleges] = useState<DeemedCollege[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [states, setStates] = useState<string[]>([]);
  const [intakeValues, setIntakeValues] = useState<number[]>([]);

  const fetchColleges = useCallback(async (
    filters: DeemedCollegeFilters,
    pageNum: number = 1,
    append: boolean = false
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      let query = (supabase as any)
        .from('deemed_colleges')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .eq('source_type', 'deemed_mbbs');

      // Search
      if (filters.search) {
        query = query.or(
          `college_name.ilike.%${filters.search}%,university_name.ilike.%${filters.search}%,city.ilike.%${filters.search}%`
        );
      }

      // Filters
      if (filters.state) query = query.eq('state', filters.state);
      if (filters.intake) query = query.eq('intake', parseInt(filters.intake));
      if (filters.nriSeats) query = query.eq('has_nri_seats', true);
      if (filters.minoritySeats) query = query.eq('has_minority_seats', true);
      if (filters.womenOnly) query = query.eq('is_women_only', true);

      // Sorting
      switch (filters.sortBy) {
        case 'name_asc':
          query = query.order('college_name', { ascending: true });
          break;
        case 'intake_high':
          query = query.order('intake', { ascending: false, nullsFirst: false });
          break;
        case 'intake_low':
          query = query.order('intake', { ascending: true, nullsFirst: false });
          break;
        case 'state_asc':
          query = query.order('state', { ascending: true });
          break;
        default:
          query = query.order('display_order', { ascending: true });
      }

      // Pagination
      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        setError(`Failed to fetch colleges: ${fetchError.message}`);
        console.error('[useDeemedColleges]', fetchError);
        setIsLoading(false);
        return;
      }

      const mapped: DeemedCollege[] = (data ?? []).map((item: Record<string, unknown>) => ({
        id: item.id as number,
        slug: (item.slug as string) ?? '',
        college_name: (item.college_name as string) ?? '',
        state: (item.state as string) ?? '',
        city: (item.city as string) ?? null,
        university_name: (item.university_name as string) ?? null,
        established_year: (item.established_year as number) ?? null,
        intake: (item.intake as number) ?? null,
        nri_seats: (item.nri_seats as number) ?? null,
        minority_seats: (item.minority_seats as number) ?? null,
        has_nri_seats: (item.has_nri_seats as boolean) ?? false,
        has_minority_seats: (item.has_minority_seats as boolean) ?? false,
        is_women_only: (item.is_women_only as boolean) ?? false,
        display_order: (item.display_order as number) ?? 0,
        is_active: (item.is_active as boolean) ?? true,
        source_type: (item.source_type as string) ?? 'deemed_mbbs',
        image_url: (item.image_url as string) ?? null,
      }));

      if (append) {
        setColleges(prev => [...prev, ...mapped]);
      } else {
        setColleges(mapped);
      }

      const total = count ?? 0;
      setTotalCount(total);
      setHasMore(from + mapped.length < total);
      setPage(pageNum);
      setIsLoading(false);
    } catch (err) {
      console.error('[useDeemedColleges] Exception:', err);
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const { data: stateData } = await (supabase as any)
        .from('deemed_colleges')
        .select('state')
        .eq('is_active', true)
        .eq('source_type', 'deemed_mbbs')
        .not('state', 'is', null);

      if (stateData) {
        const unique = Array.from(
          new Set((stateData as Array<{ state: string }>).map(r => r.state).filter(Boolean))
        ) as string[];
        setStates(unique.sort());
      }

      const { data: intakeData } = await (supabase as any)
        .from('deemed_colleges')
        .select('intake')
        .eq('is_active', true)
        .eq('source_type', 'deemed_mbbs')
        .not('intake', 'is', null);

      if (intakeData) {
        const unique = Array.from(
          new Set((intakeData as Array<{ intake: number }>).map(r => r.intake).filter(Boolean))
        ) as number[];
        setIntakeValues(unique.sort((a, b) => a - b));
      }
    } catch (err) {
      console.error('[useDeemedColleges] Filter options error:', err);
    }
  }, []);

  const loadMore = useCallback((filters: DeemedCollegeFilters) => {
    fetchColleges(filters, page + 1, true);
  }, [page, fetchColleges]);

  return {
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
  };
}
