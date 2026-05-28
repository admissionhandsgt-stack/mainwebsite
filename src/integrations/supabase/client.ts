import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("Missing Supabase environment variables. Please check your .env.local file.");
}

export const supabase = createClient<Database>(
  SUPABASE_URL || '', 
  SUPABASE_PUBLISHABLE_KEY || '',
  {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: (url, options) => {
        console.log('[SUPABASE FETCH]', url);
        return fetch(url, {
          ...options,
          cache: 'no-store',
        });
      },
    },
  }
);