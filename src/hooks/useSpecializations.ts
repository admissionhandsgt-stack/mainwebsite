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

const FALLBACK_SPECIALIZATIONS: Specialization[] = [
  { id: 1, name: 'General Medicine', slug: 'general-medicine', category: 'clinical', tags: [], image_url: '' },
  { id: 5, name: 'General Surgery', slug: 'general-surgery', category: 'surgical', tags: [], image_url: '' },
  { id: 10, name: 'Pathology', slug: 'pathology', category: 'non_clinical', tags: [], image_url: '' },
];

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
          console.warn("Supabase Query Error, falling back to static specializations:", queryError);
          setSpecializations(FALLBACK_SPECIALIZATIONS);
          setLoading(false);
          return;
        }

        setSpecializations(data && data.length > 0 ? data : FALLBACK_SPECIALIZATIONS);
      } catch (err: any) {
        console.warn("Error fetching specializations, falling back:", err);
        setSpecializations(FALLBACK_SPECIALIZATIONS);
      } finally {
        setLoading(false);
      }
    }

    fetchSpecializations();
  }, []);

  return { specializations, loading, error };
}
