/**
 * PG college pages kept out of Google's index (2026-11-11, owner: "Thinnest DNB pages… noindexed and dropped from the
 * sitemap — yes go ahead"). Search Console listed 1,197 pages as "Discovered – currently not indexed": Google spends
 * ~800 requests a day on the site, 88% of them re-fetching indexed pages, and 434 of the first 1,000 waiting were
 * DNB-only hospital pages whose text was ~75% the template's own. So the thinnest — a hospital whose every course is a
 * National Board one (DNB, DrNB, FNB, NBE diploma), with ONE course and at most TWO seat options — is `noindex, follow`
 * and out of the sitemap, so the crawl goes to the pages with more to say. The page still renders, is still linked from
 * its state page and still passes its links on. 556 of 1,536 DNB-only pages on the day.
 *
 * One test, read by the page's generateMetadata and by lib/sitemapData.ts, so the two never disagree.
 * Server only.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export const getThinDnbSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const r = (await db.execute(sql`
      SELECT i.slug
        FROM institutes i
        JOIN seat_options so ON so.institute_id = i.id
        JOIN courses c ON c.id = so.course_id
       WHERE i.level = 'pg' AND i.is_active AND i.slug IS NOT NULL
       GROUP BY i.id, i.slug
      HAVING bool_and(c.name ~* '^(DNB|DrNB|FNB|Diploma|PG Diploma)')
         AND COUNT(DISTINCT so.course_id) = 1
         AND COUNT(*) <= 2`)) as unknown as { slug: string }[];
    return r.map((x) => x.slug);
  },
  ["thin-dnb-slugs-v1"],
  { revalidate: 86_400, tags: ["seat-data"] },
);

export async function isThinDnb(slug: string): Promise<boolean> {
  return (await getThinDnbSlugs().catch((): string[] => [])).includes(slug);
}
