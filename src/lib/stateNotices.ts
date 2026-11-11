import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { logError } from "@/lib/logger";

/**
 * A state's latest counselling notices, for its MBBS and MD/MS pages (owner, 2026-11-09: "states ka bhi ho aise jisse
 * hume acha traffic milega"). Every notice is one the alerts bar already carried: the owner-approved Zyn notices
 * (zyn_notices.state) and the site's own feed of the state boards (live_alerts.source, `FEED_STATE`). Newest first, the
 * last 75 days, each linked to the authority's own notice. A notice an admin switched off stays off; one that simply
 * expired from the bar is still history and is listed. Server only.
 */

/** The site's own feed sources (lib/alertFeed.ts ALERT_SOURCES) that belong to one state. */
const FEED_STATE: Record<string, string> = {
  kea: "Karnataka",
  "mh-cet": "Maharashtra",
  tn: "Tamil Nadu",
  "kl-cee": "Kerala",
  gj: "Gujarat",
  wb: "West Bengal",
  br: "Bihar",
  jh: "Jharkhand",
  pb: "Punjab",
  as: "Assam",
  cg: "Chhattisgarh",
  uk: "Uttarakhand",
  hp: "Himachal Pradesh",
  py: "Puducherry",
};

const ALIAS: Record<string, string> = { pondicherry: "puducherry", orissa: "odisha", chattisgarh: "chhattisgarh", jammukashmir: "jammuandkashmir" };
export const stateKey = (s: string) => {
  const k = s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
  return ALIAS[k] ?? k;
};

// What a notice is about, from its own words. A notice that names neither level (a board's "Seat matrix 2026") shows
// on both pages; one that names only the other level does not.
const PG_WORDS = /\b(pg|p\.\s?g\.?|md|ms|m\.d\.|m\.s\.|mds|dnb|post[\s-]?grad\w*|pgmac|pgdac|pget|pgmcc|neet[\s-]*pg|super[\s-]?speciality|broad[\s-]?speciality)\b/i;
const UG_WORDS = /\b(mbbs|bds|ug|u\.g\.|ugmac|under[\s-]?graduate|neet[\s-]*ug)\b/i;
/** Dental PG is NEET MDS, not MD/MS: off the MD/MS page (and, being PG, off the MBBS page). */
const DENTAL_PG = /\b(mds|pgdac)\b|post[\s-]?grad\w*\s+dental|dental\s+(pg|post[\s-]?grad)/i;
/** A state board's other courses — occupational therapy, optometry, nursing, AYUSH… — are not this site's. */
const OTHER_COURSES =
  /occupational\s+therapy|optometry|physiotherap|nursing|pharm|para[\s-]?medical|allied\s+health|\bb\.?\s?sc\b|\bm\.?\s?sc\b|ayush|\bbams\b|\bbhms\b|\bbums\b|\bbsms\b|homoeopath|ayurved|unani|siddha|veterinary|\bbvsc\b/i;
/** "Tamil Nadu: Click here to download allotment order …" — the board's link text, not the notice's name. */
const tidy = (t: string) =>
  t
    .replace(/^([^:]{2,60}:\s*)?(?:[A-Z]{2,5}\s*-\s*)?click\s+here\s+to\s+(?:download|apply\s+for|view|see)\s+/i, "$1")
    .replace(/^([^:]{2,60}:\s*)([a-z])/, (_, a: string, c: string) => a + c.toUpperCase());

export interface StateNotice {
  title: string;
  url: string | null;
  /** ISO date the notice was published (or first seen). */
  on: string;
  authority: string | null;
}

type Row = { title: string; url: string | null; on: string | Date; authority: string | null; state: string | null; level: string | null; source: string | null };

const loadAll = unstable_cache(
  async (): Promise<Row[]> =>
    (await db.execute(sql`
      SELECT a.title, a.link AS url, COALESCE(a.published_at, a.created_at) AS on, z.authority, z.state,
             z.payload->>'level' AS level, a.source
        FROM live_alerts a
        LEFT JOIN zyn_notices z ON z.alert_id = a.id AND z.status = 'published'
       WHERE (z.id IS NOT NULL OR a.source IN (${sql.join(Object.keys(FEED_STATE).map((k) => sql`${k}`), sql`, `)}))
         AND (a.is_active OR (a.expires_at IS NOT NULL AND a.expires_at < now()))
         AND COALESCE(a.published_at, a.created_at) > now() - interval '75 days'
       ORDER BY COALESCE(a.published_at, a.created_at) DESC
       LIMIT 600`)) as unknown as Row[],
  ["state-notices-v1"],
  { revalidate: 900, tags: ["alerts"] },
);

export async function getStateNotices(state: string, level: "pg" | "ug", limit = 6): Promise<StateNotice[]> {
  try {
    const want = stateKey(state);
    const seen = new Set<string>();
    const out: StateNotice[] = [];
    for (const r of await loadAll()) {
      const where = r.state ?? (r.source ? FEED_STATE[r.source] : null);
      if (!where || stateKey(where) !== want) continue;
      if (OTHER_COURSES.test(r.title)) continue;
      // "Post MBBS" DNB and diploma seats are PG: read as such before looking for UG words.
      const words = r.title.replace(/post[\s-]*mbbs/gi, "PG");
      const pg = r.level === "pg" || PG_WORDS.test(words);
      const ug = r.level === "ug" || UG_WORDS.test(words);
      if (level === "pg" ? (ug && !pg) || DENTAL_PG.test(words) : pg && !ug) continue;
      const key = r.url ?? r.title;
      if (seen.has(key)) continue;
      seen.add(key);
      const on = r.on instanceof Date ? r.on.toISOString() : String(r.on);
      out.push({ title: tidy(r.title), url: r.url, on, authority: r.authority });
      if (out.length >= limit) break;
    }
    return out;
  } catch (error) {
    logError(error, { route: "stateNotices" });
    return [];
  }
}

/* ------------------------------------------------ every notice, for /neet-counselling-updates */

/** The national bodies' feed sources (lib/alertFeed.ts) and what to call them. */
const NATIONAL: Record<string, { who: string; level: "pg" | "ug" | null }> = {
  "mcc-pg": { who: "MCC", level: "pg" },
  "mcc-pg-notice": { who: "MCC", level: "pg" },
  "mcc-round": { who: "MCC", level: "pg" },
  "mcc-ss": { who: "MCC", level: "pg" },
  "mcc-ug": { who: "MCC", level: "ug" },
  nbems: { who: "NBEMS", level: "pg" },
  "nta-neet": { who: "NTA", level: "ug" },
};

export interface HubNotice extends StateNotice {
  /** The state, or the national body ("MCC", "NBEMS", "NMC"). */
  where: string;
  state: string | null;
}

const loadHub = unstable_cache(
  async (): Promise<Row[]> =>
    (await db.execute(sql`
      SELECT a.title, a.link AS url, COALESCE(a.published_at, a.created_at) AS on, z.authority, z.state,
             z.payload->>'level' AS level, a.source
        FROM live_alerts a
        LEFT JOIN zyn_notices z ON z.alert_id = a.id AND z.status = 'published'
       WHERE (z.id IS NOT NULL
              OR a.source IN (${sql.join([...Object.keys(FEED_STATE), ...Object.keys(NATIONAL)].map((k) => sql`${k}`), sql`, `)}))
         AND (a.is_active OR (a.expires_at IS NOT NULL AND a.expires_at < now()))
         AND COALESCE(a.published_at, a.created_at) > now() - interval '75 days'
       ORDER BY COALESCE(a.published_at, a.created_at) DESC
       LIMIT 800`)) as unknown as Row[],
  ["hub-notices-v1"],
  { revalidate: 900, tags: ["alerts"] },
);

/**
 * The newest NEET PG or NEET UG notices from MCC, NBEMS, NMC and every state authority we follow — the same notices
 * the alerts bar and the state pages carry, by the same rules (other courses and dental PG left out).
 */
export async function getHubNotices(level: "pg" | "ug", limit = 30): Promise<HubNotice[]> {
  try {
    const seen = new Set<string>();
    const out: HubNotice[] = [];
    for (const r of await loadHub()) {
      if (OTHER_COURSES.test(r.title)) continue;
      const nat = r.source ? NATIONAL[r.source] : undefined;
      const state = r.state ?? (r.source ? FEED_STATE[r.source] ?? null : null);
      const zynNational = !state && r.authority ? r.authority.split(/[\s(·,]/)[0] : null;
      const where = state ?? nat?.who ?? zynNational;
      if (!where) continue;
      const words = r.title.replace(/post[\s-]*mbbs/gi, "PG");
      const pg = r.level === "pg" || nat?.level === "pg" || PG_WORDS.test(words);
      const ug = r.level === "ug" || nat?.level === "ug" || UG_WORDS.test(words);
      if (level === "pg" ? (ug && !pg) || DENTAL_PG.test(words) : pg && !ug) continue;
      // One notice reaches us twice (the board's own feed and Zyn), under one link or one wording.
      const words2 = r.title.replace(/^[^:]{2,60}:\s*/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const key = r.url ?? r.title;
      if (seen.has(key) || seen.has(words2)) continue;
      seen.add(key);
      seen.add(words2);
      const on = r.on instanceof Date ? r.on.toISOString() : String(r.on);
      out.push({ title: tidy(r.title), url: r.url, on, authority: r.authority, where, state });
      if (out.length >= limit) break;
    }
    return out;
  } catch (error) {
    logError(error, { route: "hubNotices" });
    return [];
  }
}
