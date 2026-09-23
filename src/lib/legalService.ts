import {
  getLegalDocuments as dbGetAll,
  getLegalDocument as dbGetOne,
} from '@/lib/content';

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
 * Published documents, in display order.
 */
export async function getLegalDocuments(): Promise<LegalDocument[]> {
  const docs = await dbGetAll();
  return docs.map((d) => ({
    id: d.slug,
    slug: d.slug,
    title: d.title,
    content: d.content,
    last_updated: d.lastUpdated ?? '',
    is_published: true,
  })) as LegalDocument[];
}

export async function getLegalDocument(slug: string): Promise<LegalDocument | null> {
  const d = await dbGetOne(slug);
  if (!d) return null;
  return {
    id: d.slug,
    slug: d.slug,
    title: d.title,
    content: d.content,
    last_updated: d.lastUpdated ?? '',
    is_published: true,
  } as LegalDocument;
}

/**
 * Admin listing. Goes through the admin API so unpublished drafts are only
 * readable behind authentication, never from the public content layer.
 */
export async function getAllLegalDocumentsAdmin(): Promise<LegalDocument[]> {
  const res = await fetch('/api/admin/legal');
  if (!res.ok) return [];
  const { data } = await res.json();
  return (data ?? []) as LegalDocument[];
}

export async function createLegalDocument(doc: {
  slug: string;
  title: string;
  content: string;
  is_published?: boolean;
}): Promise<boolean> {
  const res = await fetch('/api/admin/legal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });
  return res.ok;
}

export async function updateLegalDocument(
  id: string,
  patch: Partial<{ slug: string; title: string; content: string; is_published: boolean }>,
): Promise<boolean> {
  const res = await fetch(`/api/admin/legal/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return res.ok;
}

export async function deleteLegalDocument(id: string): Promise<boolean> {
  const res = await fetch(`/api/admin/legal/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return res.ok;
}
