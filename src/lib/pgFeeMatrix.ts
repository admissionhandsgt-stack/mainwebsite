/**
 * The NEET PG fee matrix (2026-11-09, owner: "updated neet pg fees with college name, city name, state name,
 * government colleges, private colleges, deemed universities … is tarike ke searches bhi hamari website par aaye").
 * Every MD/MS college in a state, each quota it lists a fee for, the cheapest and the dearest branch on that quota.
 *
 * **One row is one college on one quota.** A range runs only across that quota's branches and names both ends
 * ("₹6,40,000 MD Anatomy – ₹27,00,000 MD Radio-diagnosis"); quotas are never pooled, so a government-quota fee and
 * a management fee at the same college are never one range (the rule of 2026-09-25). Two quotas whose fees match
 * on every branch are one row with both labels, as on the college pages' fee table.
 *
 * **Which fee.** Per college × branch × quota, an official row (`fee_source`: the college's or the authority's
 * 2026-27 notice) wins over the counselling listing, even when the official row is blank (no seat / no tuition). A
 * whole-course or period-not-stated figure is never a year's fee and is left out, as in seat_options (0046).
 * DNB and NBE-diploma seats are left out: NBEMS publishes no 2026 amount and the listing's flat ₹1,25,000 is not a
 * college's fee. A fee of 0 is "not published".
 *
 * Official figures are printed exactly; a listing figure is an approximate bracket with * (owner, 2026-11-05).
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getPgStates } from "@/lib/pgStateQueries";
import { collegeName } from "@/lib/collegeName";

const rows = <T,>(r: unknown) => r as unknown as T[];
const num = (v: unknown) => (v == null ? null : Number(v));

export type Ownership = "government" | "private" | "deemed";
export type Family = "state" | "aiq" | "management" | "nri";

/** Which kind of seat a quota label is, for ordering and the summaries. A label counts only when it says so. */
export const familyOf = (label: string | null): Family => {
  const l = label ?? "";
  if (/\bNRI\b/i.test(l)) return "nri";
  // "Institutional Preference" is a merit quota for a university's own graduates (Gujarat's government colleges charge
  // it the government fee); Karnataka's "Institutional Quota" and Telangana's "C Cat-Institutional" are management seats.
  if (/institutional preference/i.test(l)) return "state";
  if (/manag|mgmt|^MNG$|^MM$|institutional|\bMQ\d|\b[BC] Cat\b|\bpaid\b/i.test(l)) return "management";
  if (/^AIQ$|^All India Quota/i.test(l)) return "aiq";
  return "state";
};
export const FAMILY_LABEL: Record<Family, string> = {
  state: "State / government quota",
  aiq: "All India Quota",
  management: "Management / paid seats",
  nri: "NRI quota",
};
const FAMILY_ORDER: Family[] = ["state", "aiq", "management", "nri"];

/** Best fee per college × branch × quota (official first, blank official rows kept so they win), yearly only. */
export const BEST = sql`(
  SELECT DISTINCT ON (f.institute_id, f.course_id, f.quota_id)
         f.institute_id, f.course_id, f.quota_id, f.fee_inr, f.fee_usd, f.fee_currency, f.fee_periodicity,
         (f.fee_source IS NOT NULL) AS official, f.updated_at
    FROM fees f
   WHERE f.level = 'pg'
   ORDER BY f.institute_id, f.course_id, f.quota_id, (f.fee_source IS NOT NULL) DESC, f.year DESC NULLS LAST, f.id DESC
)`;
export const KEEP = sql`(b.fee_inr > 0 OR (b.fee_currency = 'USD' AND b.fee_usd > 0))
  AND COALESCE(b.fee_periodicity, 'per year') IN ('per year', 'first year')
  AND COALESCE(q.label, '') !~* '(DNB|NBE)'
  AND c.name !~* '^(DNB|DrNB|FNB|NBE)'
  AND i.ownership IN ('government', 'private', 'deemed')`;
export const FAMILY_SQL = sql`CASE
  WHEN COALESCE(q.label, '') ~* '\\mNRI\\M' THEN 'nri'
  WHEN COALESCE(q.label, '') ~* 'institutional preference' THEN 'state'
  WHEN COALESCE(q.label, '') ~* '(manag|mgmt|^MNG$|^MM$|institutional|\\mMQ[0-9]|\\m[BC] Cat\\M|\\mpaid\\M)' THEN 'management'
  WHEN COALESCE(q.label, '') ~* '^(AIQ$|All India Quota)' THEN 'aiq'
  ELSE 'state' END`;

export interface FeeEnd {
  inr: number;
  usd: number | null;
  course: string;
}
export interface MatrixRow {
  /** The quota labels as the counselling prints them, joined when every branch's fee matches. */
  quotas: string[];
  family: Family;
  low: FeeEnd;
  high: FeeEnd;
  branches: number;
  /** Every figure on the row from a 2026-27 notice. */
  official: boolean;
  /** The notice gives the first year's fee. */
  firstYear: boolean;
  /** The college charges these seats in dollars. */
  usd: boolean;
}
export interface MatrixCollege {
  slug: string;
  name: string;
  short: string;
  place: string | null;
  ownership: Ownership;
  rows: MatrixRow[];
  official: boolean;
}
export interface Band {
  colleges: number;
  median: number | null;
  p10: number | null;
  p90: number | null;
}
export interface StateFeeMatrix {
  state: string;
  slug: string;
  colleges: MatrixCollege[];
  counts: Record<Ownership, number>;
  officialColleges: number;
  /** One figure per college (the median of its branches on that kind of seat), then the state's spread. */
  bands: Record<Ownership, Partial<Record<Family, Band>>>;
  cities: { city: string; colleges: number }[];
  /** The cheapest and dearest seat of each kind in the state, named — for the FAQs. */
  extremes: Partial<Record<`${Ownership}_${Family}`, { low: Seat; high: Seat }>>;
  updated: string | null;
}
export interface Seat {
  college: string;
  slug: string;
  course: string;
  quota: string;
  inr: number;
  usd: number | null;
  official: boolean;
}

const median = (v: number[]) => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const pct = (v: number[], p: number) => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const x = (s.length - 1) * p;
  const lo = Math.floor(x);
  const hi = Math.ceil(x);
  return Math.round(s[lo] + (s[hi] - s[lo]) * (x - lo));
};

interface Raw {
  slug: string;
  name: string;
  ownership: Ownership;
  course: string;
  quota: string | null;
  fee_inr: number | null;
  fee_usd: number | null;
  fee_currency: string | null;
  fee_periodicity: string | null;
  official: boolean;
  updated: string | null;
}

async function build(stateName: string, slug: string): Promise<StateFeeMatrix | null> {
  const raw = rows<Raw>(
    await db.execute(sql`
      SELECT i.slug, i.name, i.ownership, c.name AS course, q.label AS quota,
             b.fee_inr, b.fee_usd, b.fee_currency, b.fee_periodicity, b.official,
             to_char(b.updated_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS updated
        FROM ${BEST} b
        JOIN institutes i ON i.id = b.institute_id AND i.level = 'pg' AND i.is_active
        JOIN states st ON st.id = i.state_id AND st.name = ${stateName}
        JOIN courses c ON c.id = b.course_id
        LEFT JOIN quotas q ON q.id = b.quota_id
       WHERE ${KEEP}`),
  );
  if (!raw.length) return null;

  const byCollege = new Map<string, { name: string; ownership: Ownership; quotas: Map<string, Raw[]> }>();
  let updated: string | null = null;
  for (const r of raw) {
    const c = byCollege.get(r.slug) ?? { name: r.name, ownership: r.ownership, quotas: new Map() };
    const key = r.quota ?? "Quota not stated";
    c.quotas.set(key, [...(c.quotas.get(key) ?? []), r]);
    byCollege.set(r.slug, c);
    if (r.updated && (!updated || r.updated > updated)) updated = r.updated;
  }

  const colleges: MatrixCollege[] = [];
  for (const [cslug, c] of byCollege) {
    // Quotas whose fee is the same on every branch are one row ("Karnataka Govt Quota - Open / Inservice").
    const groups = new Map<string, { quotas: string[]; list: Raw[] }>();
    for (const [quota, list] of c.quotas) {
      const sig = list
        .map((x) => `${x.course}:${Number(x.fee_inr ?? 0)}:${Number(x.fee_usd ?? 0)}`)
        .sort()
        .join("|");
      const g = groups.get(`${familyOf(quota)}#${sig}`) ?? { quotas: [], list };
      g.quotas.push(quota);
      groups.set(`${familyOf(quota)}#${sig}`, g);
    }
    const out: MatrixRow[] = [];
    for (const g of groups.values()) {
      const usd = g.list.every((x) => x.fee_currency === "USD" && Number(x.fee_usd) > 0);
      const value = (x: Raw) => (usd ? Number(x.fee_usd) : Number(x.fee_inr));
      const sorted = [...g.list].sort((a, b) => value(a) - value(b) || a.course.localeCompare(b.course));
      const end = (x: Raw): FeeEnd => ({ inr: Number(x.fee_inr ?? 0), usd: num(x.fee_usd), course: x.course });
      out.push({
        quotas: g.quotas.sort(),
        family: familyOf(g.quotas[0]),
        low: end(sorted[0]),
        high: end(sorted[sorted.length - 1]),
        branches: new Set(g.list.map((x) => x.course)).size,
        official: g.list.every((x) => x.official),
        firstYear: g.list.some((x) => x.fee_periodicity === "first year"),
        usd,
      });
    }
    out.sort((a, b) => FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family) || a.low.inr - b.low.inr);
    const n = collegeName(c.name);
    colleges.push({
      slug: cslug,
      name: c.name,
      short: n.short,
      place: n.place,
      ownership: c.ownership,
      rows: out,
      official: out.some((r) => r.official),
    });
  }
  colleges.sort((a, b) => a.short.localeCompare(b.short));

  const counts: Record<Ownership, number> = { government: 0, private: 0, deemed: 0 };
  for (const c of colleges) counts[c.ownership]++;

  // One figure per college per kind of seat: the median of its branches there, so a college with 30 branches
  // does not outweigh one with 3.
  const bands = { government: {}, private: {}, deemed: {} } as StateFeeMatrix["bands"];
  for (const own of ["government", "private", "deemed"] as Ownership[]) {
    for (const fam of FAMILY_ORDER) {
      const per: number[] = [];
      for (const c of colleges.filter((x) => x.ownership === own)) {
        const fees = raw
          .filter((r) => r.slug === c.slug && familyOf(r.quota) === fam && Number(r.fee_inr) > 0)
          .map((r) => Number(r.fee_inr));
        const m = median(fees);
        if (m) per.push(m);
      }
      if (per.length)
        bands[own][fam] = {
          colleges: per.length,
          median: median(per),
          p10: per.length >= 5 ? pct(per, 0.1) : null,
          p90: per.length >= 5 ? pct(per, 0.9) : null,
        };
    }
  }

  // The cheapest and dearest seat of each kind, named in full (college, branch, quota) — never pooled.
  const extremes: StateFeeMatrix["extremes"] = {};
  // A management or NRI fee below the same college's state-quota fee for the same branch is a listing slip (SDM's
  // ₹25,000 "Institutional Quota" Anatomy seat beside a state seat at several times that): never named as the cheapest.
  const stateFee = new Map<string, number>();
  for (const r of raw)
    if (familyOf(r.quota) === "state" && Number(r.fee_inr) > 0) {
      const k = `${r.slug}|${r.course}`;
      stateFee.set(k, Math.min(stateFee.get(k) ?? Infinity, Number(r.fee_inr)));
    }
  // …and, as in the state fee document's †, a fee under a tenth of the same college's middle on that kind of seat
  // (Parul's ₹1,000 management seat among ₹30-lakh ones).
  const famFees = new Map<string, number[]>();
  for (const r of raw)
    if (Number(r.fee_inr) > 0) {
      const k = `${r.slug}|${familyOf(r.quota)}`;
      famFees.set(k, [...(famFees.get(k) ?? []), Number(r.fee_inr)]);
    }
  const slip = (r: Raw) => {
    const f = familyOf(r.quota);
    const fee = Number(r.fee_inr);
    if (fee < (median(famFees.get(`${r.slug}|${f}`) ?? []) ?? 0) / 10) return true;
    return (f === "management" || f === "nri") && fee < (stateFee.get(`${r.slug}|${r.course}`) ?? 0);
  };
  for (const own of ["government", "private", "deemed"] as Ownership[]) {
    for (const fam of FAMILY_ORDER) {
      const seats = raw.filter((r) => r.ownership === own && familyOf(r.quota) === fam && Number(r.fee_inr) > 0 && !slip(r));
      if (seats.length < 3) continue;
      const s = [...seats].sort((a, b) => Number(a.fee_inr) - Number(b.fee_inr));
      const seat = (x: Raw): Seat => ({
        college: collegeName(x.name).short,
        slug: x.slug,
        course: x.course,
        quota: x.quota ?? "quota not stated",
        inr: Number(x.fee_inr),
        usd: x.fee_currency === "USD" ? num(x.fee_usd) : null,
        official: x.official,
      });
      extremes[`${own}_${fam}`] = { low: seat(s[0]), high: seat(s[s.length - 1]) };
    }
  }

  const cityCount = new Map<string, number>();
  for (const c of colleges) if (c.place) cityCount.set(c.place, (cityCount.get(c.place) ?? 0) + 1);
  const cities = [...cityCount.entries()]
    .map(([city, n]) => ({ city, colleges: n }))
    .sort((a, b) => b.colleges - a.colleges || a.city.localeCompare(b.city));

  return {
    state: stateName,
    slug,
    colleges,
    counts,
    officialColleges: colleges.filter((c) => c.official).length,
    bands,
    cities,
    extremes,
    updated,
  };
}

/** A state needs this many colleges with a yearly fee for a page of its own. */
export const MIN_FEE_COLLEGES = 3;

export const getStateFeeMatrix = unstable_cache(
  async (slug: string): Promise<StateFeeMatrix | null> => {
    const state = (await getPgStates()).find((s) => s.slug === slug);
    if (!state) return null;
    const m = await build(state.name, state.slug);
    return m && m.colleges.length >= MIN_FEE_COLLEGES ? m : null;
  },
  ["pg-fee-matrix-v1"],
  { revalidate: 86400, tags: ["seat-data"] },
);

export interface FeeStateSummary {
  state: string;
  slug: string;
  colleges: number;
  government: number;
  private: number;
  deemed: number;
  official: number;
  govtState: number | null;
  privateState: number | null;
  privateManagement: number | null;
  deemedPaid: number | null;
  nri: number | null;
  updated: string | null;
}

const PER_COLLEGE = sql`
  WITH b AS (
    SELECT b.*, i.ownership, i.state_id, ${FAMILY_SQL} AS family
      FROM ${BEST} b
      JOIN institutes i ON i.id = b.institute_id AND i.level = 'pg' AND i.is_active
      JOIN courses c ON c.id = b.course_id
      LEFT JOIN quotas q ON q.id = b.quota_id
     WHERE ${KEEP}),
  per AS (
    SELECT state_id, institute_id, ownership, family,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY fee_inr) FILTER (WHERE fee_inr > 0) AS fee,
           bool_or(official) AS official, MAX(updated_at) AS updated_at
      FROM b GROUP BY 1, 2, 3, 4)`;
const MEDIANS = sql`
  COUNT(DISTINCT per.institute_id)::int AS colleges,
  COUNT(DISTINCT per.institute_id) FILTER (WHERE ownership = 'government')::int AS government,
  COUNT(DISTINCT per.institute_id) FILTER (WHERE ownership = 'private')::int AS private,
  COUNT(DISTINCT per.institute_id) FILTER (WHERE ownership = 'deemed')::int AS deemed,
  COUNT(DISTINCT per.institute_id) FILTER (WHERE official)::int AS official,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY fee) FILTER (WHERE ownership = 'government' AND family = 'state') AS govt_state,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY fee) FILTER (WHERE ownership = 'private' AND family = 'state') AS private_state,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY fee) FILTER (WHERE ownership = 'private' AND family = 'management') AS private_mgmt,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY fee) FILTER (WHERE ownership = 'deemed' AND family = 'management') AS deemed_paid,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY fee) FILTER (WHERE family = 'nri') AS nri,
  to_char(MAX(per.updated_at) AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS updated`;

export interface FeeSummary {
  colleges: number;
  government: number;
  private: number;
  deemed: number;
  official: number;
  govtState: number | null;
  privateState: number | null;
  privateManagement: number | null;
  deemedPaid: number | null;
  nri: number | null;
  updated: string | null;
}
export interface FeeStateSummary extends FeeSummary {
  state: string;
  slug: string;
}

const summary = (x: Record<string, unknown>): FeeSummary => {
  const n = (v: unknown) => (v == null ? null : Math.round(Number(v)));
  return {
    colleges: Number(x.colleges),
    government: Number(x.government),
    private: Number(x.private),
    deemed: Number(x.deemed),
    official: Number(x.official),
    govtState: n(x.govt_state),
    privateState: n(x.private_state),
    privateManagement: n(x.private_mgmt),
    deemedPaid: n(x.deemed_paid),
    nri: n(x.nri),
    updated: (x.updated as string) ?? null,
  };
};

/**
 * Every state, summarised in SQL (the hub, the sitemap, the links): one figure per college — the median of its
 * branches on that kind of seat — then the median across colleges. The whole country the same way.
 */
export const getFeeStates = unstable_cache(
  async (): Promise<{ states: FeeStateSummary[]; national: FeeSummary }> => {
    const [byState, all, pgStates] = await Promise.all([
      db.execute(sql`${PER_COLLEGE}
        SELECT st.name AS state, st.slug, ${MEDIANS}
          FROM per JOIN states st ON st.id = per.state_id
         GROUP BY st.name, st.slug
        HAVING COUNT(DISTINCT per.institute_id) >= ${MIN_FEE_COLLEGES}
         ORDER BY colleges DESC, st.name`),
      db.execute(sql`${PER_COLLEGE} SELECT ${MEDIANS} FROM per`),
      getPgStates(),
    ]);
    const pg = new Set(pgStates.map((s) => s.slug));
    return {
      states: rows<Record<string, unknown>>(byState)
        .filter((x) => pg.has(String(x.slug)))
        .map((x) => ({ state: String(x.state), slug: String(x.slug), ...summary(x) })),
      national: summary(rows<Record<string, unknown>>(all)[0] ?? {}),
    };
  },
  ["pg-fee-states-v1"],
  { revalidate: 86400, tags: ["seat-data"] },
);
