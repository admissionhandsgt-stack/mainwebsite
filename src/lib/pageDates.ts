/**
 * The date each page's data last changed, by path — the same date the sitemap sends Google as lastmod
 * (lib/sitemapData.ts), so the "Updated" line a visitor reads and the date search engines are told never disagree.
 * A page with no lastmod (a static page) has no date.
 */
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { sitemapGroups } from "@/lib/sitemapData";

export const getPageDates = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const groups = await sitemapGroups();
    const out: Record<string, string> = {};
    for (const list of Object.values(groups))
      for (const e of list) {
        if (!e.lastModified) continue;
        const path = decodeURIComponent(new URL(e.url).pathname);
        out[path] = String(e.lastModified).slice(0, 10);
      }
    return out;
  },
  ["page-dates-v1"],
  { revalidate: 3600, tags: ["sitemap"] },
);

/** The current request's path, as the middleware passes it (`x-ah-path`). */
export const currentPath = () => headers().get("x-ah-path") ?? null;

/** "2026-11-09" → "9 Nov 2026". */
export const readableDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
