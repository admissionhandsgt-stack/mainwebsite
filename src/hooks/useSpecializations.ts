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
  { id: 1, name: 'General Medicine', slug: 'general-medicine', category: 'clinical', tags: [], image_url: 'https://images.unsplash.com/photo-1576091160550-2173dad99901?q=80&w=800' },
  { id: 2, name: 'Pediatrics', slug: 'pediatrics', category: 'clinical', tags: [], image_url: 'https://images.unsplash.com/photo-1502740479091-635887520276?q=80&w=800' },
  { id: 3, name: 'Radio-diagnosis', slug: 'radiology', category: 'clinical', tags: [], image_url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=800' },
  { id: 4, name: 'Dermatology', slug: 'dermatology', category: 'clinical', tags: [], image_url: 'https://images.unsplash.com/photo-1584515933487-779824d29309?q=80&w=800' },
  { id: 5, name: 'General Surgery', slug: 'general-surgery', category: 'surgical', tags: [], image_url: 'https://images.unsplash.com/photo-1551076805-e1869043e560?q=80&w=800' },
  { id: 6, name: 'Orthopedics', slug: 'orthopedics', category: 'surgical', tags: [], image_url: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=800' },
  { id: 7, name: 'Obstetrics & Gynae', slug: 'obgyn', category: 'surgical', tags: [], image_url: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?q=80&w=800' },
  { id: 8, name: 'Psychiatry', slug: 'psychiatry', category: 'clinical', tags: [], image_url: 'https://images.unsplash.com/photo-1527613426406-0925c483f9ab?q=80&w=800' },
  { id: 9, name: 'E.N.T.', slug: 'ent', category: 'surgical', tags: [], image_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=800' },
  { id: 10, name: 'Pathology', slug: 'pathology', category: 'non_clinical', tags: [], image_url: 'https://images.unsplash.com/photo-1579154235602-3c3755f949c8?q=80&w=800' },
  { id: 11, name: 'Pulmonary Medicine', slug: 'pulmonology', category: 'clinical', tags: [], image_url: '' },
  { id: 12, name: 'Anesthesiology', slug: 'anesthesiology', category: 'clinical', tags: [], image_url: '' },
  { id: 13, name: 'Radiation Oncology', slug: 'radiation-oncology', category: 'clinical', tags: [], image_url: '' },
  { id: 14, name: 'Emergency Medicine', slug: 'emergency-medicine', category: 'clinical', tags: [], image_url: '' },
  { id: 15, name: 'Nuclear Medicine', slug: 'nuclear-medicine', category: 'clinical', tags: [], image_url: '' },
  { id: 16, name: 'Geriatrics', slug: 'geriatrics', category: 'clinical', tags: [], image_url: '' },
  { id: 17, name: 'Physical Med & Rehab', slug: 'pmr', category: 'clinical', tags: [], image_url: '' },
  { id: 18, name: 'Ophthalmology', slug: 'ophthalmology', category: 'surgical', tags: [], image_url: '' },
  { id: 19, name: 'Microbiology', slug: 'microbiology', category: 'non_clinical', tags: [], image_url: '' },
  { id: 20, name: 'Pharmacology', slug: 'pharmacology', category: 'non_clinical', tags: [], image_url: '' },
  { id: 21, name: 'Community Medicine', slug: 'psm', category: 'non_clinical', tags: [], image_url: '' },
  { id: 22, name: 'Forensic Medicine', slug: 'forensic', category: 'non_clinical', tags: [], image_url: '' },
  { id: 23, name: 'Anatomy', slug: 'anatomy', category: 'non_clinical', tags: [], image_url: '' },
  { id: 24, name: 'Physiology', slug: 'physiology', category: 'non_clinical', tags: [], image_url: '' },
  { id: 25, name: 'Biochemistry', slug: 'biochemistry', category: 'non_clinical', tags: [], image_url: '' },
  { id: 26, name: 'Transfusion Medicine', slug: 'transfusion-medicine', category: 'non_clinical', tags: [], image_url: '' }
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
