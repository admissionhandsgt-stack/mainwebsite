import { useState, useCallback } from 'react';

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

const PAGE_SIZE = 10;

// Use type assertion once at module level to avoid `as any` everywhere

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
      const params = new URLSearchParams({
        source: 'deemed',
        page: String(pageNum),
        perPage: String(PAGE_SIZE),
        sortBy: filters.sortBy ?? 'default',
      });
      if (filters.search) params.set('search', filters.search);
      if (filters.state) params.set('state', filters.state);
      if (filters.intake) params.set('intake', filters.intake);
      if (filters.nriSeats) params.set('nriSeats', 'true');
      if (filters.minoritySeats) params.set('minoritySeats', 'true');
      if (filters.womenOnly) params.set('womenOnly', 'true');

      const res = await fetch(`/api/content/college-list?${params}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = await res.json();

      const mapped: DeemedCollege[] = (json.data ?? []).map((item: Record<string, unknown>) => ({
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

      setColleges((prev) => (append ? [...prev, ...mapped] : mapped));

      const total = json.total ?? 0;
      setTotalCount(total);
      setHasMore((pageNum - 1) * PAGE_SIZE + mapped.length < total);
      setPage(pageNum);
    } catch (err) {
      console.error('[useDeemedColleges]', err);
      setError('Could not load colleges. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** State and intake options come back with the first page of results. */
  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/content/college-list?source=deemed&perPage=1');
      if (!res.ok) return;
      const json = await res.json();
      setStates((json.states ?? []).filter(Boolean).sort());
      setIntakeValues((json.intakes ?? []).filter(Boolean).sort((a: number, b: number) => a - b));
    } catch (err) {
      console.error('[useDeemedColleges] filter options', err);
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
