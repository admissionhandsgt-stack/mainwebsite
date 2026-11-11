import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/**
 * Which states have a built fee PDF (lead_pdfs, migration 0061) — read by the pages' button and the PDF page. A state
 * without one shows no button. Cached ten minutes; scripts/pdf/build_fee_pdfs.ts adds rows. Server only.
 */
export const getFeePdfStates = unstable_cache(
  async (): Promise<{ slug: string; state: string; date: string | null }[]> => {
    try {
      return (await db.execute(sql`
        SELECT DISTINCT ON (slug) slug, state, to_char(data_date, 'DD Mon YYYY') AS date
          FROM lead_pdfs WHERE active ORDER BY slug, created_at DESC`)) as unknown as { slug: string; state: string; date: string | null }[];
    } catch {
      // Before migration 0061 the table does not exist: no buttons.
      return [];
    }
  },
  ["fee-pdf-states-v1"],
  { revalidate: 600, tags: ["fee-pdfs"] },
);

export async function hasFeePdf(state: string): Promise<boolean> {
  return (await getFeePdfStates()).some((s) => s.state === state);
}
