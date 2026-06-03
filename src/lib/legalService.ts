import { supabase } from "@/integrations/supabase/client";

export interface LegalDocument {
  id: string;
  slug: string;
  title: string;
  content: string;
  last_updated: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface LegalHeading {
  id: string;
  text: string;
  level: number;
}

/**
 * Extract headings from markdown content for TOC generation
 */
export function extractHeadings(markdown: string): LegalHeading[] {
  const lines = markdown.split(/\r?\n/);
  const headings: LegalHeading[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      headings.push({ id, text, level });
    }
  }

  return headings;
}

/**
 * Fetch all published legal documents in display order
 */
export async function getLegalDocuments(): Promise<LegalDocument[]> {
  const slugOrder = ['terms', 'payment', 'data-privacy', 'privacy', 'data-security', 'cookies', 'dpdp', 'contact'];

  const { data, error } = await (supabase as any)
    .from('legal_documents')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching legal documents:', error);
    return [];
  }

  // Sort by predefined slug order
  const sorted = (data || []).sort((a, b) => {
    const aIdx = slugOrder.indexOf(a.slug);
    const bIdx = slugOrder.indexOf(b.slug);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  return sorted as LegalDocument[];
}

/**
 * Fetch a single legal document by slug
 */
export async function getLegalDocument(slug: string): Promise<LegalDocument | null> {
  const { data, error } = await (supabase as any)
    .from('legal_documents')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error) {
    console.error(`Error fetching legal document (${slug}):`, error);
    return null;
  }

  return data as LegalDocument;
}

/**
 * Fetch all legal documents (including unpublished) for admin
 */
export async function getAllLegalDocumentsAdmin(): Promise<LegalDocument[]> {
  const { data, error } = await (supabase as any)
    .from('legal_documents')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching legal documents for admin:', error);
    return [];
  }

  return (data || []) as LegalDocument[];
}

/**
 * Create a new legal document
 */
export async function createLegalDocument(doc: {
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
}): Promise<LegalDocument | null> {
  const { data, error } = await (supabase as any)
    .from('legal_documents')
    .insert({
      ...doc,
      last_updated: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating legal document:', error);
    return null;
  }

  return data as LegalDocument;
}

/**
 * Update an existing legal document
 */
export async function updateLegalDocument(
  id: string,
  updates: Partial<Pick<LegalDocument, 'title' | 'content' | 'is_published' | 'slug'>>
): Promise<LegalDocument | null> {
  const { data, error } = await (supabase as any)
    .from('legal_documents')
    .update({
      ...updates,
      last_updated: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating legal document:', error);
    return null;
  }

  return data as LegalDocument;
}

/**
 * Delete a legal document
 */
export async function deleteLegalDocument(id: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from('legal_documents')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting legal document:', error);
    return false;
  }

  return true;
}
