import { supabase } from '@/integrations/supabase/client';

export interface PgBranch {
  id: string;
  branch_name: string;
  short_description: string | null;
  icon_url: string | null;
  category: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export async function getPgBranches(): Promise<PgBranch[]> {
  const { data } = await (supabase as any)
    .from('pg_branches')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  return (data as PgBranch[]) || [];
}

export async function createPgBranch(branch: Partial<PgBranch>) {
  return (supabase as any).from('pg_branches').insert(branch).select().single();
}

export async function updatePgBranch(id: string, updates: Partial<PgBranch>) {
  return (supabase as any).from('pg_branches').update(updates).eq('id', id).select().single();
}

export async function deletePgBranch(id: string) {
  return (supabase as any).from('pg_branches').delete().eq('id', id);
}
