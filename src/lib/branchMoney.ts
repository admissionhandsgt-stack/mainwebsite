/**
 * What a branch costs and pays, as searched (2026-11-11; owner: "'md radiology fees' searches ye sirf ek branch ka nhi
 * karna aise har branch ka karna hai fir usko city + state + college ke sath jodke branches fees, stipend, bond ye sab bhi
 * cover karna hai"). For every MD/MS branch in lib/huntBranch.ts's word list, three answers — fees, stipend, bond — each
 * read four ways: India, a state, a city (lib/cityKey.ts), one college. Builders for lib/huntAnswers.ts.
 *
 * Rules kept here, as on the pages:
 *  - **One figure is one seat** (2026-09-25): a fee is named with its quota, never pooled across quotas; a spread is the
 *    middle 80% of one figure per college on one kind of seat, over three or more colleges.
 *  - **Which fee**: the college's (or the authority's) 2026-27 notice wins over the counselling listing; whole-course and
 *    period-not-stated figures and DNB/NBE seats are left out (lib/pgFeeMatrix.ts's BEST and KEEP). A listing figure is
 *    "about"; a notice's is printed as it is.
 *  - **Stipend, bond and seat-leaving terms** are pg_seat_terms — a compilation as listed for the counselling, never
 *    official — so every answer that quotes one says so in its source line.
 *  - No rank of any kind. Server only.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import type { Draft } from "@/lib/huntAnswers";
import { BRANCH_WORDS, type BranchWord } from "@/lib/huntBranch";
import { BEST, KEEP, familyOf, type Family, type Ownership } from "@/lib/pgFeeMatrix";
import { seatFamily, type SeatFamily } from "@/lib/pgSeatData";
import { getBranchStateCombos, SEARCH_NAME } from "@/lib/branchStateQueries";
import { branchSlug } from "@/lib/branchSlug";
import { collegeName } from "@/lib/collegeName";
import { cityOf, type City } from "@/lib/cityKey";
import { cityPagePath, getCityPage } from "@/lib/cityQueries";

const rows = <T,>(r: unknown) => r as unknown as T[];
const n = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString("en-IN"));
const inr = (v: number | null | undefined) => {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1e7) return `₹${+(v / 1e7).toFixed(2)} crore`;
  if (v >= 1e5) return `₹${+(v / 1e5).toFixed(2)} lakh`;
  return `₹${n(v)}`;
};
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
const mode = (v: number[]) => {
  const c = new Map<number, number>();
  for (const x of v) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? null;
};
/** Three or more colleges behind a spread, as everywhere on the site. */
const MIN = 3;
const TERMS_CAVEAT =
  "stipend, bond and seat-leaving terms as listed for the 2026 counselling, not an official notice — confirm with the college or the state's notice before you pay a fee or sign a bond";
const FEE_SOURCE =
  "each college's own 2026-27 fee notice where it has published one, else the fee listed for the 2026 counselling; one figure per college on each kind of seat; whole-course figures and DNB seats are left out";

/* -------------------------------------------------------------------- the data --- */

export interface FeeSeat {
  slug: string;
  short: string;
  place: string | null;
  city: string | null;
  state: string | null;
  ownership: Ownership;
  course: string;
  quota: string;
  family: Family;
  inr: number;
  usd: number | null;
  official: boolean;
  firstYear: boolean;
}
export interface TermSeat {
  slug: string;
  short: string;
  place: string | null;
  city: string | null;
  state: string | null;
  govt: boolean;
  family: SeatFamily;
  seatType: string;
  y1: number | null;
  y2: number | null;
  y3: number | null;
  bondYears: number | null;
  bondPenalty: number | null;
  exitPenalty: number | null;
}
export interface BranchMoney {
  /** The course name our pages use for the branch (its page is /md-ms-india/branches/<slug>). */
  course: string;
  fees: FeeSeat[];
  terms: TermSeat[];
}

/** Postgres's word boundary is \y, not \b. */
const pgRegex = (r: RegExp) => r.source.replace(/\\b/g, "\\y");

const load = unstable_cache(
  async (name: string): Promise<BranchMoney | null> => {
    const bw = BRANCH_WORDS.find((b) => b.name === name);
    if (!bw) return null;
    const courseRows = rows<{ id: number; name: string; seats: number }>(
      await db.execute(sql`
        SELECT c.id, c.name, COUNT(so.*)::int AS seats
          FROM courses c LEFT JOIN seat_options so ON so.course_id = c.id
         WHERE c.level = 'pg' AND c.name ~ '^(MD|MS) ' AND c.name ~* ${pgRegex(bw.course)}
         GROUP BY c.id, c.name`),
    );
    if (!courseRows.length) return null;
    const ids = courseRows.map((c) => Number(c.id));
    const course = [...courseRows].sort((a, b) => b.seats - a.seats || a.name.length - b.name.length)[0].name;
    const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `);

    const [fees, terms] = await Promise.all([
      db.execute(sql`
        SELECT i.slug, i.name, i.city, st.name AS state, i.ownership::text AS ownership, c.name AS course, q.label AS quota,
               b.fee_inr, b.fee_usd, b.fee_currency, b.fee_periodicity, b.official
          FROM ${BEST} b
          JOIN institutes i ON i.id = b.institute_id AND i.level = 'pg' AND i.is_active
          LEFT JOIN states st ON st.id = i.state_id
          JOIN courses c ON c.id = b.course_id AND c.id IN (${idList})
          LEFT JOIN quotas q ON q.id = b.quota_id
         WHERE ${KEEP}`),
      db.execute(sql`
        SELECT i.slug, i.name, i.city, COALESCE(st.name, t.state) AS state, t.institute_type, t.seat_type, t.degree,
               t.stipend_y1, t.stipend_y2, t.stipend_y3, t.bond_years, t.bond_unknown, t.bond_penalty_inr,
               t.seat_leaving_penalty_inr
          FROM pg_seat_terms t
          JOIN institutes i ON i.id = t.institute_id AND i.level = 'pg' AND i.is_active AND i.slug IS NOT NULL
          LEFT JOIN states st ON st.id = i.state_id
         WHERE t.course_id IN (${idList})`),
    ]);

    const feeSeats: FeeSeat[] = rows<Record<string, unknown>>(fees).map((r) => {
      const nm = collegeName(String(r.name));
      const usd = r.fee_currency === "USD" && Number(r.fee_usd) > 0 ? Number(r.fee_usd) : null;
      return {
        slug: String(r.slug),
        short: nm.short,
        place: nm.place,
        city: cityOf(String(r.name), r.city as string | null, r.state as string | null)?.slug ?? null,
        state: (r.state as string | null) ?? null,
        ownership: r.ownership as Ownership,
        course: String(r.course),
        quota: (r.quota as string | null) ?? "quota not stated",
        family: familyOf((r.quota as string | null) ?? null),
        inr: Number(r.fee_inr ?? 0),
        usd,
        official: Boolean(r.official),
        firstYear: r.fee_periodicity === "first year",
      };
    });
    const termSeats: TermSeat[] = rows<Record<string, unknown>>(terms)
      .map((r) => {
        const nm = collegeName(String(r.name));
        const num = (v: unknown) => (v == null || Number(v) <= 0 ? null : Number(v));
        return {
          slug: String(r.slug),
          short: nm.short,
          place: nm.place,
          city: cityOf(String(r.name), r.city as string | null, r.state as string | null)?.slug ?? null,
          state: (r.state as string | null) ?? null,
          govt: /^government institute$|afms/i.test(String(r.institute_type ?? "")),
          family: seatFamily(String(r.seat_type ?? ""), (r.degree as string | null) ?? null),
          seatType: String(r.seat_type ?? ""),
          y1: num(r.stipend_y1),
          y2: num(r.stipend_y2),
          y3: num(r.stipend_y3),
          bondYears: r.bond_unknown ? null : r.bond_years == null ? null : Number(r.bond_years),
          bondPenalty: num(r.bond_penalty_inr),
          exitPenalty: num(r.seat_leaving_penalty_inr),
        };
      })
      .filter((t) => t.family !== "dnb");
    return { course, fees: feeSeats, terms: termSeats };
  },
  ["branch-money-v1"],
  { revalidate: 86_400, tags: ["seat-data", "seat-terms"] },
);

export const getBranchMoney = (bw: BranchWord) => load(bw.name);

/* -------------------------------------------------------------------- the scope --- */

export type MoneyScope =
  | { kind: "india" }
  | { kind: "state"; state: { name: string; slug: string } }
  | { kind: "city"; city: City; page: string | null }
  | { kind: "college"; slug: string; label: string };

const inScope = <T extends { slug: string; state: string | null; city: string | null }>(list: T[], s: MoneyScope) =>
  s.kind === "india"
    ? list
    : s.kind === "state"
      ? list.filter((x) => x.state === s.state.name)
      : s.kind === "city"
        ? list.filter((x) => x.city === s.city.slug)
        : list.filter((x) => x.slug === s.slug);

const where = (s: MoneyScope) =>
  s.kind === "india" ? "India" : s.kind === "state" ? s.state.name : s.kind === "city" ? s.city.name : s.label;
const placeOf = (x: { short: string; place: string | null }) =>
  x.place && !x.short.toLowerCase().includes(x.place.toLowerCase()) ? `${x.short}, ${x.place}` : x.short;

async function pageFor(m: BranchMoney, s: MoneyScope, want: "fees" | "stipend" | "bond"): Promise<string> {
  const branchPage = `/md-ms-india/branches/${branchSlug(m.course)}`;
  if (s.kind === "college") return `/md-ms-india/colleges/${s.slug}${want === "fees" ? "" : "#seat-terms"}`;
  if (s.kind === "city") return s.page ?? branchPage;
  if (s.kind === "state") {
    const combo = (await getBranchStateCombos().catch((): Awaited<ReturnType<typeof getBranchStateCombos>> => [])).find(
      (c) => c.course === m.course && c.stateSlug === s.state.slug,
    );
    if (combo) return `/md-ms-india/branches/${combo.courseSlug}/${combo.stateSlug}`;
    return want === "fees" ? `/md-ms-india/fees/${s.state.slug}` : want === "stipend" ? `/md-ms-india/stipend/${s.state.slug}` : "/md-ms-india/bond";
  }
  return want === "bond" ? "/md-ms-india/bond" : branchPage;
}
const kindFor = (base: string, m: BranchMoney, s: MoneyScope) =>
  s.kind === "india"
    ? `${base}:${branchSlug(m.course)}`
    : `${base}-${s.kind}:${branchSlug(m.course)}:${s.kind === "state" ? s.state.slug : s.kind === "city" ? s.city.slug : s.slug}`;

/* --------------------------------------------------------------------- fees --- */

const OWN_LABEL: Record<Ownership, string> = { government: "Government colleges", private: "Private colleges", deemed: "Deemed universities" };
const FAM_LABEL: Record<Family, string> = { state: "state-quota seats", aiq: "All India Quota seats", management: "management / paid seats", nri: "NRI seats" };

const feeText = (x: FeeSeat) =>
  x.usd ? `US$ ${n(x.usd)} a year${x.inr ? ` (≈ ${inr(x.inr)})` : ""}` : `${x.official ? "" : "about "}${inr(x.inr)} ${x.firstYear ? "in year 1" : "a year"}`;

/** One figure per college (its median on that kind of seat), then the spread across colleges. */
function band(list: FeeSeat[]): { colleges: number; median: number; p10: number | null; p90: number | null } | null {
  const per = new Map<string, number[]>();
  for (const x of list) if (x.inr > 0) per.set(x.slug, [...(per.get(x.slug) ?? []), x.inr]);
  const v = [...per.values()].map((xs) => median(xs)!).filter(Boolean);
  if (v.length < MIN) return null;
  return { colleges: v.length, median: median(v)!, p10: v.length >= 5 ? pct(v, 0.1) : null, p90: v.length >= 5 ? pct(v, 0.9) : null };
}
const bandText = (b: NonNullable<ReturnType<typeof band>>) =>
  `${inr(b.median)} a year in the middle${b.p10 != null && b.p90 != null && b.p10 !== b.p90 ? `, most between ${inr(b.p10)} and ${inr(b.p90)}` : ""} (${n(b.colleges)} colleges)`;

/** A college's fees for the branch, quota by quota — each quota its own figure; quotas charging the same share a line. */
function collegeFeeLine(list: FeeSeat[]): string {
  const known = list.some((x) => x.quota !== "quota not stated");
  const byFee = new Map<string, { x: FeeSeat; quotas: string[] }>();
  for (const x of list) {
    if (known && x.quota === "quota not stated") continue;
    const k = `${x.family === "aiq" ? "state" : x.family}:${x.inr}:${x.usd ?? 0}`;
    const e = byFee.get(k) ?? { x, quotas: [] };
    if (!e.quotas.includes(x.quota)) e.quotas.push(x.quota);
    byFee.set(k, e);
  }
  const order: Family[] = ["state", "aiq", "management", "nri"];
  return [...byFee.values()]
    .sort((a, b) => order.indexOf(a.x.family) - order.indexOf(b.x.family) || a.x.inr - b.x.inr)
    .slice(0, 4)
    .map((e) => `${e.quotas.slice(0, 3).join(" / ")} ${feeText(e.x)}`)
    .join("; ");
}

async function feesDraft(bw: BranchWord, m: BranchMoney, s: MoneyScope): Promise<Draft | null> {
  // A management or NRI figure below the same college's state-quota fee for the same branch is a listing slip
  // (₹40,000 "management" beside a ₹13 lakh state seat): it is left out rather than quoted as the cheapest seat.
  const stateFee = new Map<string, number>();
  for (const x of m.fees) if (x.family === "state" && x.inr > 0) stateFee.set(x.slug, Math.min(stateFee.get(x.slug) ?? Infinity, x.inr));
  // …and one under a tenth of the branch's middle for that kind of college and seat across India (a ₹1,000 slip).
  const groups = new Map<string, number[]>();
  for (const x of m.fees) if (x.inr > 0) groups.set(`${x.ownership}|${x.family}`, [...(groups.get(`${x.ownership}|${x.family}`) ?? []), x.inr]);
  const floor = new Map([...groups].map(([k, v]) => [k, (median(v) ?? 0) / 10]));
  const list = inScope(m.fees, s).filter(
    (x) => !((x.family === "management" || x.family === "nri") && x.inr < (stateFee.get(x.slug) ?? 0)) && x.inr >= (floor.get(`${x.ownership}|${x.family}`) ?? 0),
  );
  if (!list.length) return null;
  const B = SEARCH_NAME[m.course] ?? m.course;
  const page = await pageFor(m, s, "fees");
  const anyOfficial = list.some((x) => x.official);
  const terms = inScope(m.terms, s);
  const stipendY1 = median(
    [...new Map(terms.filter((t) => t.y1 && (t.family === "state" || t.family === "aiq")).map((t) => [t.slug, t.y1!])).values()],
  );

  if (s.kind === "college") {
    const lowest = [...list].sort((a, b) => a.inr - b.inr)[0];
    const t = terms.find((x) => x.family === "state") ?? terms.find((x) => x.family === "aiq") ?? terms[0];
    const points = [...new Set(list.map((x) => x.quota))]
      .map((q) => list.filter((x) => x.quota === q).sort((a, b) => a.inr - b.inr)[0])
      .sort((a, b) => a.inr - b.inr)
      .slice(0, 6)
      .map((x) => `${x.quota}: ${feeText(x)}${x.official ? " — the college's 2026-27 notice" : ", as listed for the counselling"}.`);
    if (t?.y1) points.push(`Stipend, year 1: ${inr(t.y1)} a month${t.y2 ? `; year 2: ${inr(t.y2)}` : ""}${t.y3 ? `; year 3: ${inr(t.y3)}` : ""} (as listed).`);
    return {
      page,
      kind: kindFor("branch-fees", m, s),
      lead: `${B} at ${s.label} costs ${feeText(lowest)} on a ${lowest.quota} seat${points.length > 1 ? "; other quotas cost more" : ""}.`,
      pointsTitle: "Quota by quota:",
      points,
      checks: [
        ...(t?.bondYears ? [`Service bond: ${t.bondYears} year${t.bondYears === 1 ? "" : "s"}${t.bondPenalty ? `, ${inr(t.bondPenalty)} to break it` : ""}.`] : []),
        ...(t?.exitPenalty ? [`Leaving the seat after joining: ${inr(t.exitPenalty)}.`] : []),
        "Whether the figure is the whole year's fee, and what hostel, mess and the caution deposit add.",
      ],
      source: `${anyOfficial ? "the college's own 2026-27 fee notice" : "the fee listed for the 2026 counselling"}${t ? `; ${TERMS_CAVEAT}` : ""}.`,
      what: `fee, stipend and seat table for ${s.label}`,
      predictor: true,
    };
  }

  const bands: { own: Ownership; fam: Family; b: NonNullable<ReturnType<typeof band>> }[] = [];
  for (const own of ["government", "private", "deemed"] as Ownership[])
    for (const fam of ["state", "aiq", "management", "nri"] as Family[]) {
      // A government college's figures are its state and All India seats'.
      if (own === "government" && (fam === "nri" || fam === "management")) continue;
      const b = band(list.filter((x) => x.ownership === own && x.family === fam));
      if (b) bands.push({ own, fam, b });
    }
  const colleges = [...new Set(list.map((x) => x.slug))];
  // A city or a state with few colleges: each college on its own line (a fee is public; one row is one seat).
  const each =
    s.kind !== "india" && colleges.length <= 8
      ? colleges.map((slug) => {
          const mine = list.filter((x) => x.slug === slug);
          return `${placeOf(mine[0])} (${mine[0].ownership}): ${collegeFeeLine(mine)}.`;
        })
      : [];
  if (!bands.length && !each.length) return null;

  const pick = (own: Ownership, fam: Family) => bands.find((x) => x.own === own && x.fam === fam)?.b;
  const leadParts = [
    pick("government", "state") ? `government colleges charge ${inr(pick("government", "state")!.median)} a year in the middle on state-quota seats` : null,
    pick("private", "management") ? `private colleges ${inr(pick("private", "management")!.median)} on management seats` : null,
    pick("deemed", "management") ? `deemed universities ${inr(pick("deemed", "management")!.median)} on paid seats` : null,
  ].filter(Boolean);
  const where_ = where(s);
  const lead = leadParts.length
    ? `${B} fees in ${where_}, 2026-27: ${leadParts.join("; ")}.`
    : `${B} fees in ${where_}, 2026-27, college by college — ${colleges.length === 1 ? "1 college publishes" : `${colleges.length} colleges publish`} a yearly fee for it.`;

  // The cheapest and dearest management / paid seat, named in full — over three or more seats.
  const paid = list.filter((x) => x.family === "management" && x.ownership !== "government" && x.inr > 0).sort((a, b) => a.inr - b.inr);
  const ends =
    paid.length >= MIN && paid[0].slug !== paid[paid.length - 1].slug
      ? [`Lowest management or paid seat: ${feeText(paid[0])} at ${placeOf(paid[0])} (${paid[0].quota}); highest: ${feeText(paid[paid.length - 1])} at ${placeOf(paid[paid.length - 1])} (${paid[paid.length - 1].quota}).`]
      : [];
  return {
    page,
    kind: kindFor("branch-fees", m, s),
    lead,
    pointsTitle: each.length ? "College by college:" : "By kind of college and seat:",
    points: [
      ...bands.map((x) => `${OWN_LABEL[x.own]}, ${FAM_LABEL[x.fam]}: ${bandText(x.b)}.`),
      ...ends,
      ...each,
      ...(stipendY1 ? [`Stipend for ${B} residents: ${inr(stipendY1)} a month in year 1 in the middle (as listed).`] : []),
    ],
    checks: [
      "Your quota: a management or NRI seat at the same college costs several times its state-quota seat.",
      "Whether the figure is a year's fee or the first year's, and what hostel, mess and the caution deposit add.",
      "The service bond and the seat-leaving penalty on that seat before you pay.",
    ],
    source: `${FEE_SOURCE}${stipendY1 ? `; ${TERMS_CAVEAT}` : ""}.`,
    what: s.kind === "india" ? `${B} page (seats, cut off and fees by quota)` : `fee table for ${where_}`,
    predictor: true,
  };
}

/* ------------------------------------------------------------------ stipend --- */

/** One stipend per college for the branch: its state or All India seat's, else any. */
function stipendByCollege(terms: TermSeat[]): TermSeat[] {
  const by = new Map<string, TermSeat>();
  const rank = (t: TermSeat) => (t.family === "state" ? 0 : t.family === "aiq" ? 1 : 2);
  for (const t of terms) {
    if (!t.y1) continue;
    const prev = by.get(t.slug);
    if (!prev || rank(t) < rank(prev)) by.set(t.slug, t);
  }
  return [...by.values()];
}

async function stipendDraft(bw: BranchWord, m: BranchMoney, s: MoneyScope): Promise<Draft | null> {
  const per = stipendByCollege(inScope(m.terms, s));
  if (!per.length) return null;
  const B = SEARCH_NAME[m.course] ?? m.course;
  const page = await pageFor(m, s, "stipend");
  const kind = kindFor("branch-stipend", m, s);

  if (s.kind === "college") {
    const t = per[0];
    return {
      page,
      kind,
      lead: `A first-year ${B} resident at ${s.label} is paid ${inr(t.y1)} a month${t.y2 ? `, ${inr(t.y2)} in year 2` : ""}${t.y3 ? ` and ${inr(t.y3)} in year 3` : ""} (as listed for the ${t.seatType || "counselling"}).`,
      checks: [
        ...(t.bondYears ? [`Service bond: ${t.bondYears} year${t.bondYears === 1 ? "" : "s"}${t.bondPenalty ? `, ${inr(t.bondPenalty)} to break it` : ""}.`] : []),
        "Whether the stipend is paid from the first month, and what is deducted from it (income tax is deducted at source).",
      ],
      source: `${TERMS_CAVEAT}.`,
      what: `fee, stipend and bond table for ${s.label}`,
    };
  }

  const y1 = per.map((t) => t.y1!);
  const govt = per.filter((t) => t.govt).map((t) => t.y1!);
  const other = per.filter((t) => !t.govt).map((t) => t.y1!);
  const top = [...per].sort((a, b) => b.y1! - a.y1!).slice(0, 3);
  const y2 = per.map((t) => t.y2).filter((v): v is number => v != null);
  const y3 = per.map((t) => t.y3).filter((v): v is number => v != null);
  const points: string[] = [];
  if (y2.length >= MIN) points.push(`Year 2: ${inr(median(y2))} a month in the middle${y3.length >= MIN ? `; year 3: ${inr(median(y3))}` : ""}.`);
  if (s.kind === "india") {
    const byState = new Map<string, number[]>();
    for (const t of per) if (t.state) byState.set(t.state, [...(byState.get(t.state) ?? []), t.y1!]);
    const states = [...byState]
      .filter(([, v]) => v.length >= MIN)
      .map(([st, v]) => ({ st, m: median(v)!, c: v.length }))
      .sort((a, b) => b.m - a.m);
    if (states.length >= 2)
      points.push(`Highest by state (median): ${states.slice(0, 3).map((x) => `${x.st} ${inr(x.m)}`).join(", ")}; lowest: ${states[states.length - 1].st} ${inr(states[states.length - 1].m)}.`);
  }
  if (s.kind === "city" || (s.kind === "state" && per.length <= 8)) {
    for (const t of [...per].sort((a, b) => b.y1! - a.y1!).slice(0, 8)) points.push(`${placeOf(t)}${t.govt ? " (government)" : ""}: ${inr(t.y1)} a month in year 1.`);
  } else if (top.length) {
    points.push(`Highest listed: ${top.map((t) => `${placeOf(t)} ${inr(t.y1)}`).join(", ")}.`);
  }
  const lead =
    per.length >= MIN
      ? `${B} stipend in ${where(s)}: ${inr(median(y1))} a month in the first year in the middle, across ${n(per.length)} colleges${govt.length >= MIN ? `; government colleges ${inr(median(govt))}` : ""}${other.length >= MIN ? `, private and deemed ${inr(median(other))}` : ""}.`
      : `${B} stipend in ${where(s)}, college by college (first year, a month):`;
  return {
    page,
    kind,
    lead,
    pointsTitle: "How it runs:",
    points,
    checks: ["Whether the state binds you to a service bond after the course, and what breaking it costs.", "Income tax is deducted at source, so the amount credited is lower."],
    source: `${TERMS_CAVEAT}.`,
    what: s.kind === "india" ? "state-wise and college-wise stipend table" : `stipend table for ${where(s)}`,
  };
}

/* --------------------------------------------------------------------- bond --- */

async function bondDraft(bw: BranchWord, m: BranchMoney, s: MoneyScope): Promise<Draft | null> {
  const terms = inScope(m.terms, s);
  if (!terms.length) return null;
  const B = SEARCH_NAME[m.course] ?? m.course;
  const page = await pageFor(m, s, "bond");
  const kind = kindFor("branch-bond", m, s);
  // One row per college: its government (state or All India) seat's terms.
  const byCollege = new Map<string, TermSeat>();
  for (const t of terms) {
    const prev = byCollege.get(t.slug);
    const better = (x: TermSeat) => (x.family === "state" ? 0 : x.family === "aiq" ? 1 : 2);
    if (!prev || better(t) < better(prev)) byCollege.set(t.slug, t);
  }
  const all = [...byCollege.values()];

  if (s.kind === "college") {
    const t = all[0];
    return {
      page,
      kind,
      lead:
        t.bondYears
          ? `${B} at ${s.label}: a ${t.bondYears}-year service bond is listed${t.bondPenalty ? `, and breaking it costs ${inr(t.bondPenalty)}` : ""}.`
          : t.bondYears === 0
            ? `${B} at ${s.label}: no service bond is listed for the ${t.seatType || "main"} seat.`
            : `${B} at ${s.label}: the listing does not state a service bond.`,
      points: [
        ...(t.exitPenalty ? [`Leaving the seat after joining: ${inr(t.exitPenalty)}.`] : []),
        ...(t.y1 ? [`Stipend, year 1: ${inr(t.y1)} a month.`] : []),
      ],
      checks: ["The bond and penalty in the state's own counselling notice for your year — they change.", "Whether the college keeps your original certificates until the course ends."],
      source: `${TERMS_CAVEAT}.`,
      what: `seat terms for ${s.label}`,
    };
  }

  const govt = all.filter((t) => t.govt);
  const bonded = govt.filter((t) => t.bondYears && t.bondYears > 0);
  const penalties = bonded.map((t) => t.bondPenalty).filter((v): v is number => v != null);
  const exits = all.map((t) => t.exitPenalty).filter((v): v is number => v != null);
  const privateBonded = all.filter((t) => !t.govt && t.bondYears && t.bondYears > 0).length;
  const privateAll = all.filter((t) => !t.govt).length;
  if (govt.length < MIN && s.kind === "india") return null;
  const points: string[] = [];
  if (penalties.length >= MIN) points.push(`Bond penalty at government colleges: ${inr(median(penalties))} in the middle (${penalties.length} colleges).`);
  if (exits.length >= MIN) points.push(`Leaving the seat after joining: ${inr(median(exits))} in the middle, where a college lists a penalty (${exits.length} colleges).`);
  if (privateAll) points.push(`Private and deemed colleges: ${privateBonded} of ${privateAll} list a bond for ${B}.`);
  if (s.kind === "india") {
    const byState = new Map<string, { all: number; bonded: number }>();
    for (const t of govt) {
      if (!t.state) continue;
      const e = byState.get(t.state) ?? { all: 0, bonded: 0 };
      e.all++;
      if (t.bondYears && t.bondYears > 0) e.bonded++;
      byState.set(t.state, e);
    }
    const none = [...byState].filter(([, e]) => e.all >= 2 && e.bonded === 0).map(([st]) => st);
    if (none.length) points.push(`No government college lists a bond for ${B} in ${none.slice(0, 6).join(", ")}.`);
  } else if (all.length <= 8) {
    for (const t of all)
      points.push(`${placeOf(t)}${t.govt ? " (government)" : ""}: ${t.bondYears ? `${t.bondYears}-year bond${t.bondPenalty ? `, ${inr(t.bondPenalty)} to break it` : ""}` : t.bondYears === 0 ? "no bond listed" : "bond not stated"}.`);
  }
  const years = mode(bonded.map((t) => t.bondYears!));
  const lead = govt.length
    ? `${B} in ${where(s)}: ${bonded.length} of ${govt.length} government colleges list a service bond${years ? `, usually ${years} year${years === 1 ? "" : "s"}` : ""}${penalties.length >= MIN ? `; breaking it costs ${inr(median(penalties))} in the middle` : ""}.`
    : `${B} in ${where(s)}: ${privateBonded} of ${privateAll} private and deemed colleges list a service bond.`;
  return {
    page,
    kind,
    lead,
    points,
    checks: [
      "The bond and penalty in the state's own counselling notice for your year — they change.",
      "Whether the bond is a paid government posting or a penalty only.",
      "Whether the college keeps your original certificates.",
    ],
    source: `${TERMS_CAVEAT}.`,
    what: "state-wise bond and penalty table",
  };
}

/* ------------------------------------------------------- a city, no branch --- */

/**
 * "pg fees in pune", "pg stipend in bangalore", "pg bond in lucknow" — a city's own figures from its page
 * (lib/cityQueries.ts), only for a city with an indexed page; never one college's figures under the city's name.
 */
export async function cityMoneyDraft(want: "fees" | "stipend" | "bond", city: City): Promise<Draft | null> {
  const page = await cityPagePath(city.slug);
  if (!page) return null;
  const p = await getCityPage(city.slug).catch(() => null);
  if (!p) return null;
  const others = p.colleges.length - p.govt;
  const count = `${p.colleges.length} MD/MS colleges in ${city.name}: ${p.govt} government, ${others} private or deemed.`;
  if (want === "fees") {
    const pick = (own: Ownership, fam: Family) => p.bands.find((b) => b.own === own && b.family === fam);
    const parts = [
      pick("government", "state") ? `government colleges ${inr(pick("government", "state")!.median)} a year in the middle on state-quota seats` : null,
      pick("private", "state") ? `private colleges ${inr(pick("private", "state")!.median)} on state-quota seats` : null,
      pick("private", "management") ? `${inr(pick("private", "management")!.median)} on management seats` : null,
      pick("deemed", "management") ? `deemed universities ${inr(pick("deemed", "management")!.median)} on paid seats` : null,
    ].filter(Boolean);
    if (!parts.length) return null;
    return {
      page,
      kind: `city-fees:${city.slug}`,
      lead: `PG fees in ${city.name}, 2026-27: ${parts.join("; ")} — one figure per college, across its branches.`,
      pointsTitle: "By kind of college and seat:",
      points: [
        ...p.bands.map((b) => `${OWN_LABEL[b.own]}, ${FAM_LABEL[b.family]}: ${inr(b.median)} a year in the middle${b.p10 != null && b.p90 != null && b.p10 !== b.p90 ? `, most between ${inr(b.p10)} and ${inr(b.p90)}` : ""} (${b.colleges} colleges).`),
        count,
      ],
      checks: ["The branch: a clinical branch costs far more than a pre-clinical one at the same college.", "Your quota, and what hostel, mess and the caution deposit add.", "The bond and the seat-leaving penalty before you pay."],
      source: `${FEE_SOURCE}.`,
      what: `college-by-college table for ${city.name}`,
      predictor: true,
    };
  }
  if (want === "stipend") {
    if (!p.stipend?.median) return null;
    const top = [...p.colleges].filter((c) => c.stipendY1).sort((a, b) => b.stipendY1! - a.stipendY1!).slice(0, 4);
    return {
      page,
      kind: `city-stipend:${city.slug}`,
      lead: `PG stipend in ${city.name}: ${inr(p.stipend.median)} a month in the first year in the middle, across ${p.stipend.colleges} colleges${p.stipend.govtMedian ? `; government colleges ${inr(p.stipend.govtMedian)}` : ""}${p.stipend.otherMedian ? `, private and deemed ${inr(p.stipend.otherMedian)}` : ""}.`,
      pointsTitle: "Highest published:",
      points: [...top.map((c) => `${c.short}: ${inr(c.stipendY1)} a month.`), count],
      checks: ["Whether the state binds you to a service bond after the course.", "Income tax is deducted at source, so the amount credited is lower."],
      source: "each college's own published monthly stipend, its latest year.",
      what: `college-by-college table for ${city.name}`,
    };
  }
  if (!p.bond?.govt) return null;
  return {
    page,
    kind: `city-bond:${city.slug}`,
    lead: `PG bond in ${city.name}: ${p.bond.bonded} of ${p.bond.govt} government colleges list a service bond${p.bond.years ? `, usually ${p.bond.years} year${p.bond.years === 1 ? "" : "s"}` : ""}${p.bond.penaltyMedian ? `; breaking it costs ${inr(p.bond.penaltyMedian)} in the middle` : ""}.`,
    points: [count],
    checks: ["The bond and penalty in the state's own counselling notice for your year — they change.", "Whether the bond is a paid government posting or a penalty only."],
    source: `${TERMS_CAVEAT}.`,
    what: `college-by-college table for ${city.name}`,
  };
}

/** The answer for a branch's fees, stipend or bond in a scope — or null when the scope holds nothing to say. */
export async function branchMoneyDraft(want: "fees" | "stipend" | "bond", bw: BranchWord, s: MoneyScope): Promise<Draft | null> {
  const m = await getBranchMoney(bw).catch(() => null);
  if (!m) return null;
  return want === "fees" ? feesDraft(bw, m, s) : want === "stipend" ? stipendDraft(bw, m, s) : bondDraft(bw, m, s);
}
