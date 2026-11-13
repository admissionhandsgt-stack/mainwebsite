/**
 * What an outreach email offers, beyond the stipend table (2026-11-13, owner: "stipend ke alaawa aur bhi cheeje de
 * sakte hai jaise ranking trend ya data se jo bhi kar sakte hai"). Each angle is built from live data at draft time —
 * never a typed figure — and is a group figure or a count: no college's closing rank (the chance-view rule).
 *
 *  - trend    MCC's running round against the same round last year, branch by branch (AIQ open, 3+ colleges).
 *  - seats    MCC's matrix as first published and the seats its "newly added" notices added.
 *  - colleges NMC's new MBBS colleges and seats for the coming session.
 *  - fees     official 2026-27 PG fees in private medical colleges and deemed universities (middle and spread).
 *  - stipend  handled in lib/outreach.ts (the first angle, unchanged).
 *
 * An angle returns null when its data is missing, and the email falls back to another one.
 *
 * Server only.
 */
import { getLatestLiveRound, getRoundResult } from "@/lib/mccResults";
import { getSeatIncrease } from "@/lib/seatIncrease";
import { getNewColleges } from "@/lib/newColleges";
import { getPrivatePgFees, getDeemedPg, type FeeBand } from "@/lib/pgFeeQueries";

export type Topic = "trend" | "seats" | "colleges" | "fees" | "stipend";
export const DATA_TOPICS: Exclude<Topic, "stipend">[] = ["trend", "seats", "colleges", "fees"];

export interface Angle {
  topic: Topic;
  subject: string;
  /** One sentence after the greeting, before the points. */
  intro: string;
  points: string[];
  links: string[];
}

const SITE = "https://www.admissionhands.com";
const n = (v: number) => Math.round(v).toLocaleString("en-IN");
const lakh = (v: number | null | undefined) =>
  v == null ? "—" : v >= 1e7 ? `₹${(v / 1e7).toFixed(2).replace(/\.?0+$/, "")} crore` : `₹${(v / 1e5).toFixed(1).replace(/\.0$/, "")} lakh`;

/** The clinical branches people ask about, in MCC course names as our courses table spells them. */
const WATCH = ["MD Radio Diagnosis", "MD General Medicine", "MD Dermatology, Venereology & Leprosy", "MD Paediatrics", "MS General Surgery", "MS Orthopaedics", "MS Obstetrics & Gynaecology", "MD Psychiatry", "MS Ophthalmology", "MD Anaesthesiology"];
const SHORT: Record<string, string> = {
  "MD Radio Diagnosis": "MD Radiology",
  "MD Dermatology, Venereology & Leprosy": "MD Dermatology",
  "MS Obstetrics & Gynaecology": "MS OBG",
};

async function trend(): Promise<Angle | null> {
  const now = await getLatestLiveRound();
  if (!now) return null;
  const before = await getRoundResult(now.year - 1, now.spec.round).catch(() => null);
  if (!before) return null;
  const prev = new Map(before.cuts.aiq.map((b) => [b.course, b.last.Open]));
  const moves = WATCH.map((course) => ({ course, now: now.byCourse.get(course)?.Open ?? null, then: prev.get(course) ?? null }))
    .filter((m): m is { course: string; now: number; then: number } => m.now != null && m.then != null)
    .map((m) => ({ ...m, change: m.now - m.then }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 4);
  if (moves.length < 2) return null;
  const round = now.spec.label;
  return {
    topic: "trend",
    subject: `NEET PG ${now.year} ${round}: how the All India cut offs moved from ${now.year - 1}`,
    intro: `MCC's NEET PG ${now.year} ${round.toLowerCase()} result is out, and we set it beside the same round of ${now.year - 1}, branch by branch (All India Quota, open category, the last seat admitted across every college that took the branch):`,
    points: moves.map(
      (m) =>
        `${SHORT[m.course] ?? m.course}: AIR ${n(m.now)} this year against ${n(m.then)} last year (${m.change > 0 ? "a looser" : "a tighter"} close by ${n(Math.abs(m.change))} ranks).`,
    ),
    links: [`Every branch and category: ${SITE}/neet-pg-cutoff`, `Marks vs rank, NBEMS's own tables: ${SITE}/neet-pg-marks-vs-rank`],
  };
}

async function seats(): Promise<Angle | null> {
  const s = await getSeatIncrease().catch(() => null);
  if (!s || !s.added) return null;
  const branches = s.byBranch.slice(0, 3).map((b) => `${b.branch} (+${n(b.added)})`).join(", ");
  const states = s.byState.slice(0, 3).map((x) => `${x.state} (+${n(x.added)})`).join(", ");
  return {
    topic: "seats",
    subject: `NEET PG ${s.year}: ${n(s.added)} seats added to MCC's counselling after the first matrix`,
    intro: `MCC's NEET PG ${s.year} seat matrix opened with ${n(s.base)} seats; its "newly added seats" notices have since added ${n(s.added)}, to ${n(s.total)}. Where they went:`,
    points: [
      ...(branches ? [`Most added in: ${branches}.`] : []),
      ...(states ? [`By state: ${states}.`] : []),
      ...(s.nmc.length ? [`NMC's register lists ${n(s.nmc.reduce((t, x) => t + x.seats, 0))} approved PG seats in all (MD, MS, diploma).`] : []),
    ],
    links: [`Branch, state and college detail, with MCC's notices: ${SITE}/neet-pg-seat-increase`, `The full matrix: ${SITE}/neet-pg-seat-matrix`],
  };
}

async function colleges(): Promise<Angle | null> {
  const d = await getNewColleges().catch(() => null);
  const y = d?.now;
  if (!y || !y.colleges.length) return null;
  const top = [...y.byState].sort((a, b) => b.colleges - a.colleges || b.seats - a.seats).slice(0, 3).map((x) => `${x.state} (${x.colleges})`).join(", ");
  return {
    topic: "colleges",
    subject: `${y.colleges.length} new MBBS colleges and ${n(y.seats)} seats for ${y.year}-${String(y.year + 1).slice(2)}, from NMC's register`,
    intro: `NMC's college register lists ${y.colleges.length} medical colleges whose MBBS course starts in ${y.year}, with ${n(y.seats)} seats between them:`,
    points: [
      `Government: ${y.govt.colleges} colleges, ${n(y.govt.seats)} seats; private: ${y.private.colleges} colleges, ${n(y.private.seats)} seats.`,
      ...(top ? [`Most new colleges in ${top}.`] : []),
      ...(d?.prev ? [`The year before: ${d.prev.colleges.length} colleges, ${n(d.prev.seats)} seats.`] : []),
    ],
    links: [`Every college, with NMC's letter-of-permission date: ${SITE}/mbbs-india/new-medical-colleges`],
  };
}

const band = (bands: FeeBand[], re: RegExp) => bands.find((b) => re.test(b.family) && b.median != null) ?? null;

async function fees(): Promise<Angle | null> {
  const [pvt, deemed] = await Promise.all([getPrivatePgFees().catch(() => null), getDeemedPg().catch(() => null)]);
  const state = pvt ? band(pvt.national, /state|govt/i) : null;
  const mgmt = pvt ? band(pvt.national, /manag/i) : null;
  const dPaid = deemed ? band(deemed.national, /paid|manag|deemed/i) : null;
  if (!state && !mgmt && !dPaid) return null;
  const year = pvt?.year ?? deemed?.year ?? null;
  const line = (label: string, b: FeeBand) =>
    `${label}: ${lakh(b.median)} a year in the middle; most between ${lakh(b.p10)} and ${lakh(b.p90)} (${n(b.colleges)} colleges).`;
  return {
    topic: "fees",
    subject: `MD/MS fees${year ? ` ${year}` : ""}: what a PG seat costs in private and deemed colleges`,
    intro: `We track the MD/MS fees colleges publish — their own 2026-27 notices where they are out, last year's counselling listing otherwise — one figure per college, per year:`,
    points: [
      ...(state ? [line("Private colleges, state-quota seats", state)] : []),
      ...(mgmt ? [line("Private colleges, management seats", mgmt)] : []),
      ...(dPaid ? [line("Deemed universities, paid seats", dPaid)] : []),
    ],
    links: [`State by state and college by college: ${SITE}/md-ms-india/fees`, `Deemed universities: ${SITE}/md-ms-india/deemed-universities`],
  };
}

export async function angleFor(topic: Topic): Promise<Angle | null> {
  try {
    if (topic === "trend") return await trend();
    if (topic === "seats") return await seats();
    if (topic === "colleges") return await colleges();
    if (topic === "fees") return await fees();
  } catch {
    /* fall through to another angle */
  }
  return null;
}

/** The first angle that has data, starting from `preferred`, then the rest in turn. */
export async function firstAngle(preferred: Topic | null, seed: number): Promise<Angle | null> {
  const order = preferred && preferred !== "stipend" ? [preferred, ...DATA_TOPICS.filter((t) => t !== preferred)] : [...DATA_TOPICS.slice(seed % DATA_TOPICS.length), ...DATA_TOPICS.slice(0, seed % DATA_TOPICS.length)];
  for (const t of order) {
    const a = await angleFor(t);
    if (a) return a;
  }
  return null;
}
