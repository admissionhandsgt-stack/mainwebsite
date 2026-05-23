
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
        let query = supabase.from('recommended_colleges').select('*');
        if (domain) {
          query = query.eq('domain', domain);
        }
        
        const { data, error } = await query.order('name') as unknown as { data: RecommendedCollege[] | null, error: Error | null };

        if (error) throw error;
        setColleges(data || []);
      } catch (err) {
        console.error('Error fetching recommended colleges:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch colleges'));
      } finally {
        setLoading(false);
      }
    }

    fetchColleges();

    // Subscribe to realtime database changes for recommended colleges
    const channel = supabase
      .channel('public:recommended_colleges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recommended_colleges' }, () => {
        fetchColleges();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [domain]);

  return { colleges, loading, error };
}

export function useDeemedUniversities() {
  const [universities, setUniversities] = useState<DeemedUniversity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUniversities() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('deemed_colleges')
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
  }, []);

  return { universities, loading, error };
}
