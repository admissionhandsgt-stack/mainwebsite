/**
 * Content resolvers for the MD/MS page sections.
 *
 * Unlike the MBBS page, each PG section keeps its own array in its own
 * component. These helpers turn a CMS collection into the shape that section
 * already expects, leaving the styling metadata (gradients, colour classes) in
 * code — an editor changes words, not the design.
 *
 * Every resolver returns `null` when its collection is empty, and the
 * component then renders the array it shipped with.
 */

import { getBlocks, type ContentBlock } from "@/lib/content";

const str = (v: unknown) => String(v ?? "").trim();

/**
 * A nested list stored as one value per line.
 *
 * A textarea with one item per line is something an editor can actually use;
 * a nested list editor is not worth building for four bullet points.
 */
export const lines = (v: unknown): string[] =>
  str(v)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** `Label: value` per line, for the two-column fact tables. */
export const pairs = (v: unknown): { label: string; value: string }[] =>
  lines(v).map((l) => {
    const i = l.indexOf(":");
    return i === -1
      ? { label: l, value: "" }
      : { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
  });

async function collection<T>(
  slug: string,
  map: (b: ContentBlock) => T,
): Promise<T[] | null> {
  const blocks = await getBlocks(slug);
  return blocks.length ? blocks.map(map) : null;
}

export interface PgCard {
  title: string;
  desc: string;
  highlight?: string;
}

export interface PgStep {
  phase: string;
  title: string;
  desc: string;
  bullets: string[];
}

export interface PgQuota {
  title: string;
  percentage: string;
  bullets: string[];
}

export interface PgQuotaFacts {
  title: string;
  items: { label: string; value: string }[];
}

export interface PgDocument {
  name: string;
  note: string;
}

/** Everything the MD/MS page can take from the CMS, fetched in one round trip. */
export async function getPgContent() {
  const [whyUs, overview, steps, quotas, cutoffQuotas, documents] = await Promise.all([
    collection<PgCard>("pg_why_us", (b) => ({
      title: str(b.title),
      desc: str(b.body),
      highlight: str(b.subtitle),
    })),
    collection<PgCard>("pg_overview", (b) => ({
      title: str(b.title),
      desc: str(b.body),
    })),
    collection<PgStep>("pg_steps", (b) => ({
      phase: str(b.subtitle),
      title: str(b.title),
      desc: str(b.body),
      bullets: lines(b.data?.bullets),
    })),
    collection<PgQuota>("pg_quotas", (b) => ({
      title: str(b.title),
      percentage: str(b.subtitle),
      bullets: lines(b.data?.bullets),
    })),
    collection<PgQuotaFacts>("pg_cutoff_quotas", (b) => ({
      title: str(b.title),
      items: pairs(b.data?.facts),
    })),
    collection<PgDocument>("pg_documents", (b) => ({
      name: str(b.title),
      note: str(b.body),
    })),
  ]);

  return { whyUs, overview, steps, quotas, cutoffQuotas, documents };
}

export type PgContent = Awaited<ReturnType<typeof getPgContent>>;
