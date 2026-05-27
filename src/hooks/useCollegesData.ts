
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RecommendedCollege, DeemedUniversity } from '@/types/colleges';

export function useRecommendedColleges(domain?: 'ug' | 'pg') {
  const [colleges, setColleges] = useState<RecommendedCollege[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchColleges() {
      try {
        setLoading(true);
        // Determine table based on domain ('ug' by default or if unspecified)
        const tableName = domain === 'pg' ? 'pg_recommended_colleges' : 'ug_recommended_colleges';
        
        const { data, error } = await supabase
          .from(tableName as any)
          .select('*')
          .order('display_order', { ascending: true, nullsFirst: false })
          .order('college_name');

        if (error) throw error;
        
        // Map new schema to the expected frontend structure
        const mappedData = (data || []).map((item: any) => ({
          id: String(item.id),
          name: item.college_name,
          image: item.image_url || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800',
          location: item.city ? `${item.city}, ${item.state}` : item.state,
          fees: "Contact us", // Can be added to DB later if needed
          seats: item.intake || 0,
          domain: domain || 'ug',
          created_at: item.created_at,
          updated_at: item.updated_at
        }));

        setColleges(mappedData);
      } catch (err) {
        console.error('Error fetching recommended colleges:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch colleges'));
      } finally {
        setLoading(false);
      }
    }

    fetchColleges();

  }, [domain]);

  return { colleges, loading, error };
}

export function useDeemedUniversities(domain?: 'ug' | 'pg') {
  const [universities, setUniversities] = useState<DeemedUniversity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUniversities() {
      try {
        setLoading(true);
        const tableName = domain === 'pg' ? 'pg_deemed_colleges' : 'deemed_colleges';
        const { data, error } = await supabase
          .from(tableName as any)
          .select('*')
          .order('college_name') as any;

        if (error) throw error;
        
        const mappedData = (data || []).map((item: any) => ({
          id: String(item.id),
          name: item.college_name,
          image_url: item.image_url || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800',
          location: item.city ? `${item.city}, ${item.state}` : item.state,
          seats: item.intake || 0,
          created_at: item.created_at,
          updated_at: item.updated_at
        }));

        setUniversities(mappedData);
      } catch (err) {
        console.error('Error fetching deemed colleges:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch colleges'));
        toast.error('Failed to load deemed colleges');
      } finally {
        setLoading(false);
      }
    }

    fetchUniversities();
  }, [domain]);

  return { universities, loading, error };
}
