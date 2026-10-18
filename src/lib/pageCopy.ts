import { cache } from "react";
import { getMediaAsset, getSettings } from "@/lib/content";
import { PAGE_COPY, type CopyFields, type CopyKey } from "@/lib/pageCopyDefaults";

/**
 * Words and pictures for a page, driven from the admin (owner's rule,
 * 2026-10-18: "sab admin dashboard se drive ho").
 *
 * - **Copy** lives in `site_settings` as `<key>.<field>`, edited in Admin →
 *   Content → Text & numbers, one group per page. The registry and the shipped
 *   defaults are lib/pageCopyDefaults.ts; `scripts/seed_page_copy.mjs` creates
 *   the rows. A blank value falls back to the default, so a page always reads
 *   properly. Template pages (state, branch, college) take `{tokens}` such as
 *   `{state}` or `{year}`, filled with the page's live figures, so one row
 *   serves every state.
 * - **Hero photographs** are `media_assets` rows (Admin → Media), looked up by
 *   key, most specific first — e.g. `page.pg_state.kerala.hero`, then
 *   `page.pg_state.hero`. No row, or no image, and the hero is composed from
 *   light and line instead: never a stock picture standing in for a real place.
 *
 * Server only.
 */

/** One settings read per request, however many components ask. */
export const settingsForRequest = cache(getSettings);

export type CopyTokens = Record<string, string | number | null | undefined>;

const fill = (text: string, tokens: CopyTokens) =>
  text
    .replace(/\{(\w+)\}/g, (whole, key: string) => (key in tokens ? String(tokens[key] ?? "") : whole))
    .replace(/\s{2,}/g, " ")
    .trim();

export async function pageCopy<K extends CopyKey>(key: K, tokens: CopyTokens = {}): Promise<CopyFields<K>> {
  const s = await settingsForRequest();
  const fields = PAGE_COPY[key].fields as Record<string, { value: string }>;
  const out: Record<string, string> = {};
  for (const [field, def] of Object.entries(fields)) {
    const fromAdmin = (s[`${key}.${field}`] ?? "").trim();
    out[field] = fill(fromAdmin || def.value, tokens);
  }
  return out as CopyFields<K>;
}

export interface HeroImage {
  url: string;
  alt: string;
  subject: string | null;
  attribution: string | null;
  license: string | null;
}

/** The first of these media keys that has an active image. */
export async function pageHeroImage(...keys: string[]): Promise<HeroImage | undefined> {
  for (const key of keys) {
    const a = await getMediaAsset(key);
    if (a?.imageUrl && a.imageUrl !== "none") {
      return {
        url: a.imageUrl,
        alt: a.altText ?? "",
        subject: a.subject ?? null,
        attribution: a.attribution ?? null,
        license: a.license ?? null,
      };
    }
  }
  return undefined;
}
