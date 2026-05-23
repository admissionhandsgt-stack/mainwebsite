'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Specialization {
  id: number;
  name: string;
  slug: string;
  category: string;
  tags: string[];
  image_url: string;
}

export function useSpecializations() {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSpecializations() {
      try {
        const { data, error: queryError } = await (supabase as any)
          .from('specializations')
          .select('*')
          .order('name');

        if (queryError) {
          console.error("Supabase Query Error:", queryError);
          setError(queryError.message);
          return;
        }

        setSpecializations(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch specializations');
      } finally {
        setLoading(false);
      }
    }

    fetchSpecializations();
  }, []);

  return { specializations, loading, error };
}
