/**
 * Medical colleges in a city — `/medical-colleges/<city>` (2026-11-11; owner: "bnao jo nhi bana hai", the city-pages
 * spec of the same day). One page per city, never one per city × intent: PG fees, MD/MS seats, stipend, bond, the
 * branches taught, MBBS colleges and DNB hospitals of that city, all from data the state pages already print.
 *
 * Which cities: a college is in a city by lib/cityKey.ts. A city with 3+ MD/MS colleges has a page; it is indexed with
 * 5+ MD/MS colleges of which 3+ publish a yearly fee (Tier A) and `noindex, follow` otherwise (Tier B); fewer than 3 is
 * a 404. DNB-only hospitals are listed apart and never counted as colleges (the twin-entry rule). No rank anywhere.
 * Server only.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { BEST, FAMILY_SQL, KEEP, type Family, type Ownership } from "@/lib/pgFeeMatrix";
import { seatFamily } from "@/lib/pgSeatData";
import { branchSlug } from "@/lib/branchSlug";
import { collegeName } from "@/lib/collegeName";
import { CITIES, cityOf, type City } from "@/lib/cityKey";

const rows = <T,>(r: unknown) => r as unknown as T[];
const median = (v: number[]) => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const pct = (v: number[], p: number) => {
  const s = [...v].sort((a, b) => a - b);
  const x = (s.length - 1) * p;
  const lo = Math.floor(x);
  const hi = Math.ceil(x);
  return Math.round(s[lo] + (s[hi] - s[lo]) * (x - lo));
};

/** Three MD/MS colleges for a page; five, three of them with a yearly fee, for Google. */
export const CITY_MIN_COLLEGES = 3;
export const CITY_INDEX_COLLEGES = 5;
export const CITY_INDEX_FEES = 3;

export interface CityCollege {
  id: number;
  slug: string;
  short: string;
  name: string;
  /** NMC's management type where NMC lists the college; our ownership otherwise. A curated deemed beats NMC's "Private". */
  type: "Government" | "Private" | "Deemed" | "Trust" | "Society";
  founded: number | null;
  mdmsSeats: number | null;
  mbbsSeats: number | null;
  /** The college's yearly PG fee per kind of seat, lowest and highest branch. */
  fees: Partial<Record<Family, { lo: number; hi: number; branches: number; official: boolean }>>;
  stipendY1: number | null;
  bondYears: number | null;
  bondPenalty: number | null;
  mccSeats: number;
}
export interface CityIndexEntry {
  slug: string;
  name: string;
  state: string;
  stateSlug: string;
  mdms: number;
  mbbs: number;
  feeColleges: number;
  indexable: boolean;
}

interface PgRow {
  id: number;
  slug: string;
  name: string;
  city: string | null;
  state: string;
  state_slug: string;
  ownership: string;
  mdms: boolean;
  dnb: boolean;
}
interface UgRow {
  id: number;
  slug: string;
  name: string;
  state: string;
  mgmt: string | null;
  seats: number | null;
}

/** Every PG and MBBS institute placed in a city, read once a day. */
const loadPlaced = unstable_cache(
  async () => {
    const [pg, ug, fees] = await Promise.all([
      db.execute(sql`
        SELECT i.id, i.slug, i.name, i.city, st.name AS state, st.slug AS state_slug, i.ownership::text AS ownership,
               EXISTS (SELECT 1 FROM seat_options so JOIN courses co ON co.id = so.course_id
                        WHERE so.institute_id = i.id AND co.name ~ '^(MD|MS) ') AS mdms,
               EXISTS (SELECT 1 FROM seat_options so JOIN courses co ON co.id = so.course_id
                        WHERE so.institute_id = i.id AND co.name ~* '^(DNB|DrNB|FNB|Diploma)') AS dnb
          FROM institutes i JOIN states st ON st.id = i.state_id
         WHERE i.level = 'pg' AND i.is_active AND i.slug IS NOT NULL`),
      db.execute(sql`
        SELECT i.id, i.slug, i.name, st.name AS state, MAX(nc.management_type) AS mgmt, SUM(nc.approved_seat)::int AS seats
          FROM institutes i
          JOIN states st ON st.id = i.state_id
          JOIN nmc_institutes ni ON ni.institute_id = i.id
          JOIN nmc_courses nc ON nc.college_code = ni.college_code AND nc.course_type = 'M.B.B.S.'
         WHERE i.level = 'ug' AND i.is_active AND i.slug IS NOT NULL
         GROUP BY i.id, i.slug, i.name, st.name`),
      db.execute(sql`
        SELECT DISTINCT b.institute_id
          FROM ${BEST} b
          JOIN institutes i ON i.id = b.institute_id AND i.level = 'pg'
          JOIN courses c ON c.id = b.course_id
          LEFT JOIN quotas q ON q.id = b.quota_id
         WHERE ${KEEP} AND b.fee_inr > 0`),
    ]);
    const withFee = new Set(rows<{ institute_id: number }>(fees).map((r) => Number(r.institute_id)));
    const placedPg = rows<PgRow>(pg)
      .map((r) => ({ ...r, id: Number(r.id), city: cityOf(r.name, r.city, r.state)?.slug ?? null, fee: withFee.has(Number(r.id)) }))
      .filter((r) => r.city);
    const placedUg = rows<UgRow>(ug)
      .map((r) => ({ ...r, id: Number(r.id), seats: r.seats == null ? null : Number(r.seats), city: cityOf(r.name, null, r.state)?.slug ?? null }))
      .filter((r) => r.city);
    return { pg: placedPg, ug: placedUg };
  },
  ["city-placed-v1"],
  { revalidate: 86_400, tags: ["seat-data", "nmc"] },
);

export const getCityIndex = unstable_cache(
  async (): Promise<CityIndexEntry[]> => {
    const { pg, ug } = await loadPlaced();
    const out: CityIndexEntry[] = [];
    for (const c of CITIES) {
      const mine = pg.filter((r) => r.city === c.slug && r.mdms);
      if (mine.length < CITY_MIN_COLLEGES) continue;
      const feeColleges = mine.filter((r) => r.fee).length;
      out.push({
        slug: c.slug,
        name: c.name,
        state: c.state,
        stateSlug: mine[0].state_slug,
        mdms: mine.length,
        mbbs: ug.filter((r) => r.city === c.slug).length,
        feeColleges,
        indexable: mine.length >= CITY_INDEX_COLLEGES && feeColleges >= CITY_INDEX_FEES,
      });
    }
    return out.sort((a, b) => b.mdms - a.mdms || a.name.localeCompare(b.name));
  },
  ["city-index-v1"],
  { revalidate: 86_400, tags: ["seat-data", "nmc"] },
);

/** The city page a search or another page should link to — an indexable city's only. */
export async function cityPagePath(slug: string): Promise<string | null> {
  const c = (await getCityIndex().catch((): CityIndexEntry[] => [])).find((x) => x.slug === slug);
  return c?.indexable ? `/medical-colleges/${c.slug}` : null;
}

export interface CityBand {
  own: Ownership;
  family: Family;
  colleges: number;
  median: number;
  p10: number | null;
  p90: number | null;
}
export interface CityPage {
  city: City;
  entry: CityIndexEntry;
  colleges: CityCollege[];
  dnb: { slug: string; short: string }[];
  mbbs: { slug: string; short: string; type: string | null; seats: number | null }[];
  bands: CityBand[];
  stipend: { colleges: number; median: number | null; govtMedian: number | null; otherMedian: number | null } | null;
  bond: { govt: number; bonded: number; years: number | null; penaltyMedian: number | null } | null;
  mcc: { year: number | null; byMatrix: { matrix: string; seats: number; colleges: number }[] };
  branches: { course: string; slug: string; colleges: number }[];
  nmcSeats: number;
  govt: number;
  nearby: CityIndexEntry[];
  updated: string | null;
}

const FAMILIES: Family[] = ["state", "aiq", "management", "nri"];

async function build(slug: string): Promise<CityPage | null> {
  const city = CITIES.find((c) => c.slug === slug);
  const index = await getCityIndex();
  const entry = index.find((c) => c.slug === slug);
  if (!city || !entry) return null;
  const { pg, ug } = await loadPlaced();
  const mine = pg.filter((r) => r.city === slug && r.mdms);
  const ids = mine.map((r) => r.id);
  if (!ids.length) return null;
  const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `);

  const [nmc, fees, stipend, terms, mcc, branches, updated] = await Promise.all([
    db.execute(sql`
      SELECT ni.institute_id, MAX(nc.management_type) AS mgmt,
             MIN(nc.inception_year) FILTER (WHERE nc.course_type = 'M.B.B.S.') AS mbbs_since, MIN(nc.inception_year) AS since,
             SUM(nc.approved_seat) FILTER (WHERE nc.course_type IN ('MD', 'MS'))::int AS mdms_seats,
             SUM(nc.approved_seat) FILTER (WHERE nc.course_type = 'M.B.B.S.')::int AS mbbs_seats
        FROM nmc_institutes ni JOIN nmc_courses nc ON nc.college_code = ni.college_code
       WHERE ni.institute_id IN (${idList}) GROUP BY ni.institute_id`),
    db.execute(sql`
      SELECT b.institute_id, ${FAMILY_SQL} AS family, array_agg(b.fee_inr::bigint) AS fees,
             COUNT(DISTINCT b.course_id)::int AS branches, bool_and(b.official) AS official
        FROM ${BEST} b
        JOIN institutes i ON i.id = b.institute_id AND i.level = 'pg'
        JOIN courses c ON c.id = b.course_id
        LEFT JOIN quotas q ON q.id = b.quota_id
       WHERE ${KEEP} AND b.fee_inr > 0 AND b.institute_id IN (${idList})
       GROUP BY b.institute_id, 2`),
    db.execute(sql`
      SELECT DISTINCT ON (f.institute_id) f.institute_id, f.stipend_y1_inr AS y1
        FROM fees f
       WHERE f.level = 'pg' AND f.stipend_y1_inr > 0 AND f.stipend_periodicity = 'per_month' AND f.institute_id IN (${idList})
       ORDER BY f.institute_id, f.year DESC NULLS LAST, f.stipend_y1_inr DESC`),
    db.execute(sql`
      SELECT t.institute_id, t.institute_type, t.seat_type, t.degree, t.bond_years, t.bond_unknown, t.bond_penalty_inr
        FROM pg_seat_terms t WHERE t.institute_id IN (${idList})`),
    db.execute(sql`
      SELECT m.year, m.seat_matrix, m.institute_id, SUM(m.total_seats)::int AS seats
        FROM mcc_seat_matrix m
       WHERE m.institute_id IN (${idList}) AND m.year = (SELECT MAX(year) FROM mcc_seat_matrix)
       GROUP BY m.year, m.seat_matrix, m.institute_id`),
    db.execute(sql`
      SELECT c.name AS course, COUNT(DISTINCT so.institute_id)::int AS colleges
        FROM seat_options so JOIN courses c ON c.id = so.course_id
       WHERE so.institute_id IN (${idList}) AND c.name ~ '^(MD|MS) '
       GROUP BY c.name ORDER BY 2 DESC, 1`),
    db.execute(sql`
      SELECT to_char(MAX(GREATEST(COALESCE(i.updated_at, 'epoch'), COALESCE(f.u, 'epoch'))) AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS d
        FROM institutes i
        LEFT JOIN (SELECT institute_id, MAX(updated_at) AS u FROM fees WHERE institute_id IN (${idList}) GROUP BY institute_id) f ON f.institute_id = i.id
       WHERE i.id IN (${idList})`),
  ]);

  const nmcBy = new Map(rows<Record<string, unknown>>(nmc).map((r) => [Number(r.institute_id), r]));
  const feeBy = new Map<number, CityCollege["fees"]>();
  const feeMed = new Map<string, number[]>(); // `${own}:${family}` → one median per college
  for (const r of rows<Record<string, unknown>>(fees)) {
    const id = Number(r.institute_id);
    const fam = r.family as Family;
    // A figure under a tenth of the same college's median on that kind of seat is a listing slip (₹40,000 for a
    // management seat whose other branches cost ₹40 lakh): it never sets the college's lowest fee.
    const all = (r.fees as (number | string)[]).map(Number).filter((v) => v > 0);
    const med = median(all);
    if (!med) continue;
    const kept = all.filter((v) => v >= med / 10);
    const m = feeBy.get(id) ?? {};
    m[fam] = { lo: Math.min(...kept), hi: Math.max(...kept), branches: Number(r.branches), official: Boolean(r.official) };
    feeBy.set(id, m);
    const own = mine.find((x) => x.id === id)?.ownership as Ownership | undefined;
    if (own) feeMed.set(`${own}:${fam}`, [...(feeMed.get(`${own}:${fam}`) ?? []), med]);
  }
  const stipendBy = new Map(rows<{ institute_id: number; y1: number }>(stipend).map((r) => [Number(r.institute_id), Number(r.y1)]));
  const termsBy = new Map<number, { govt: boolean; years: number[]; penalties: number[] }>();
  for (const t of rows<Record<string, unknown>>(terms)) {
    const fam = seatFamily(String(t.seat_type ?? ""), (t.degree as string | null) ?? null);
    if (fam !== "state" && fam !== "aiq") continue;
    const id = Number(t.institute_id);
    const e = termsBy.get(id) ?? { govt: /^government institute$|afms/i.test(String(t.institute_type ?? "")), years: [], penalties: [] };
    if (!t.bond_unknown && t.bond_years != null) e.years.push(Number(t.bond_years));
    if (t.bond_penalty_inr != null && Number(t.bond_penalty_inr) > 0) e.penalties.push(Number(t.bond_penalty_inr));
    termsBy.set(id, e);
  }
  const mccRows = rows<{ year: number; seat_matrix: string; institute_id: number; seats: number }>(mcc);
  const mccBy = new Map<number, number>();
  for (const r of mccRows) mccBy.set(Number(r.institute_id), (mccBy.get(Number(r.institute_id)) ?? 0) + Number(r.seats));

  const typeOf = (r: PgRow, mgmt: string | null): CityCollege["type"] => {
    if (r.ownership === "deemed") return "Deemed";
    if (/govern/i.test(mgmt ?? "") || r.ownership === "government") return "Government";
    if (/trust/i.test(mgmt ?? "")) return "Trust";
    if (/society/i.test(mgmt ?? "")) return "Society";
    return "Private";
  };
  const modeOf = (v: number[]) => {
    const c = new Map<number, number>();
    for (const x of v) c.set(x, (c.get(x) ?? 0) + 1);
    return [...c].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? null;
  };
  const colleges: CityCollege[] = mine
    .map((r) => {
      const nm = nmcBy.get(r.id);
      const t = termsBy.get(r.id);
      return {
        id: r.id,
        slug: r.slug,
        short: collegeName(r.name).short,
        name: r.name,
        type: typeOf(r, (nm?.mgmt as string | null) ?? null),
        founded: nm ? (nm.mbbs_since != null ? Number(nm.mbbs_since) : nm.since != null ? Number(nm.since) : null) : null,
        mdmsSeats: nm?.mdms_seats != null ? Number(nm.mdms_seats) : null,
        mbbsSeats: nm?.mbbs_seats != null ? Number(nm.mbbs_seats) : null,
        fees: feeBy.get(r.id) ?? {},
        stipendY1: stipendBy.get(r.id) ?? null,
        bondYears: t ? modeOf(t.years) : null,
        bondPenalty: t ? median(t.penalties) : null,
        mccSeats: mccBy.get(r.id) ?? 0,
      };
    })
    .sort((a, b) => (a.type === "Government" ? 0 : 1) - (b.type === "Government" ? 0 : 1) || a.short.localeCompare(b.short));

  const bands: CityBand[] = [];
  for (const own of ["government", "private", "deemed"] as Ownership[])
    for (const fam of FAMILIES) {
      const v = feeMed.get(`${own}:${fam}`) ?? [];
      if (v.length < 3) continue;
      bands.push({ own, family: fam, colleges: v.length, median: median(v)!, p10: v.length >= 5 ? pct(v, 0.1) : null, p90: v.length >= 5 ? pct(v, 0.9) : null });
    }

  const stipendList = colleges.filter((c) => c.stipendY1);
  const govtStipend = stipendList.filter((c) => c.type === "Government").map((c) => c.stipendY1!);
  const otherStipend = stipendList.filter((c) => c.type !== "Government").map((c) => c.stipendY1!);
  const govtTerms = [...termsBy.entries()].filter(([, t]) => t.govt);
  const bondedGovt = govtTerms.filter(([, t]) => (modeOf(t.years) ?? 0) > 0);

  const byMatrix = new Map<string, { seats: number; colleges: Set<number> }>();
  for (const r of mccRows) {
    const e = byMatrix.get(r.seat_matrix) ?? { seats: 0, colleges: new Set<number>() };
    e.seats += Number(r.seats);
    e.colleges.add(Number(r.institute_id));
    byMatrix.set(r.seat_matrix, e);
  }

  return {
    city,
    entry,
    colleges,
    dnb: pg
      .filter((r) => r.city === slug && !r.mdms && r.dnb)
      .map((r) => ({ slug: r.slug, short: collegeName(r.name).short }))
      .sort((a, b) => a.short.localeCompare(b.short)),
    mbbs: ug
      .filter((r) => r.city === slug)
      .map((r) => ({ slug: r.slug, short: collegeName(r.name).short, type: r.mgmt, seats: r.seats }))
      .sort((a, b) => (b.seats ?? 0) - (a.seats ?? 0) || a.short.localeCompare(b.short)),
    bands,
    stipend: stipendList.length
      ? {
          colleges: stipendList.length,
          median: stipendList.length >= 3 ? median(stipendList.map((c) => c.stipendY1!)) : null,
          govtMedian: govtStipend.length >= 3 ? median(govtStipend) : null,
          otherMedian: otherStipend.length >= 3 ? median(otherStipend) : null,
        }
      : null,
    bond: govtTerms.length
      ? {
          govt: govtTerms.length,
          bonded: bondedGovt.length,
          years: modeOf(bondedGovt.map(([, t]) => modeOf(t.years)!).filter(Boolean)),
          penaltyMedian: bondedGovt.length >= 3 ? median(bondedGovt.map(([, t]) => median(t.penalties)).filter((v): v is number => v != null)) : null,
        }
      : null,
    mcc: {
      year: mccRows[0]?.year ?? null,
      byMatrix: [...byMatrix].map(([matrix, e]) => ({ matrix, seats: e.seats, colleges: e.colleges.size })).sort((a, b) => b.seats - a.seats),
    },
    branches: rows<{ course: string; colleges: number }>(branches).map((r) => ({ course: r.course, slug: branchSlug(r.course), colleges: Number(r.colleges) })),
    nmcSeats: colleges.reduce((s, c) => s + (c.mdmsSeats ?? 0), 0),
    govt: colleges.filter((c) => c.type === "Government").length,
    nearby: index.filter((c) => c.state === city.state && c.slug !== slug && c.indexable).slice(0, 4),
    updated: rows<{ d: string | null }>(updated)[0]?.d ?? null,
  };
}

export const getCityPage = unstable_cache(build, ["city-page-v1"], { revalidate: 86_400, tags: ["seat-data", "seat-terms", "mcc", "nmc"] });
