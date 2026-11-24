/**
 * Who runs a state's NEET PG counselling (2026-11-24). Server only.
 *
 * The admin's "State counselling authorities" row where it covers PG. Where it does not, the body whose own page the
 * state's newest owner-approved PG notice came from (Zyn) — for the states in `FROM_NOTICES` only, each checked: a state's
 * PG counselling is not always on its MBBS board's site. Haryana's row sent PG candidates to UHSR Rohtak's uhsr.ac.in,
 * but dmer.haryana.gov.in links uhsrugcounselling.com for MBBS and DMER Haryana's own portal,
 * hry.online-counselling.co.in, for MD/MS (UHSR Rohtak carries out the document verification there) — so the PG pages
 * linked the wrong site while "haryana neet pg counselling" was the site's most-shown state search.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getStateAuthority, type StateAuthorityInfo } from "@/lib/stateAuthorities";
import { stateKey } from "@/lib/stateNotices";
import { officialLink, portalHome } from "@/lib/zynNotices";

/** The page each state's authority links its PG notices from, as the owner approved them in Zyn — the newest per state. */
export const pgNoticePages = unstable_cache(
  async (): Promise<{ state: string; authority: string; page: string; level: string | null; on: string | null }[]> =>
    (await db.execute(sql`
      SELECT DISTINCT ON (lower(state), coalesce(payload->>'level', '')) state, authority, payload->>'page' AS page,
             payload->>'level' AS level, to_json(approved_at)#>>'{}' AS on
        FROM zyn_notices
       WHERE status = 'published' AND state IS NOT NULL AND authority IS NOT NULL AND payload->>'page' ~ '^https?://'
       ORDER BY lower(state), coalesce(payload->>'level', ''), approved_at DESC NULLS LAST`)) as unknown as {
      state: string;
      authority: string;
      page: string;
      level: string | null;
      on: string | null;
    }[],
  ["authority-pages-v1"],
  { revalidate: 3600, tags: ["alerts"] },
);

/**
 * States whose PG authority is read from their approved notices: a government body on its own counselling page
 * (dmer.haryana.gov.in's portal, jkbopee.gov.in, jceceb.jharkhand.gov.in, trmcc.admissions.nic.in). A state is added
 * here only after its notice source is checked to be the body that allots the seats, not a college posting a notice.
 */
const FROM_NOTICES = new Set(["Haryana", "Jammu and Kashmir", "Jharkhand", "Tripura"].map((s) => stateKey(s)));

/** "DMER Haryana (hry.online-counselling.co.in)" → "DMER Haryana"; "JKBOPEE (J&K and Ladakh) · Jammu and Kashmir" → "JKBOPEE (J&K and Ladakh)". */
export const authorityLabel = (a: string) =>
  a
    .split(" · ")[0]
    .replace(/\s*\([^)]*\.[a-z]{2,}[^)]*\)\s*$/i, "")
    .trim();

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

export async function getPgAuthority(state: string): Promise<StateAuthorityInfo | null> {
  const row = await getStateAuthority(state).catch(() => null);
  if (row?.scope === "UG and PG") return row;
  const key = stateKey(state);
  if (!FROM_NOTICES.has(key)) return null;
  const z = (await pgNoticePages().catch((): Awaited<ReturnType<typeof pgNoticePages>> => [])).find(
    (r) => stateKey(r.state) === key && (r.level ?? "pg") === "pg" && officialLink(r.page),
  );
  if (!z) return null;
  const url = portalHome(z.page);
  const on = z.on ? new Date(z.on) : null;
  return {
    state,
    authority: authorityLabel(z.authority),
    url,
    label: hostOf(url),
    scope: "UG and PG",
    checked: on && !Number.isNaN(on.getTime()) ? on.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }) : "",
  };
}
