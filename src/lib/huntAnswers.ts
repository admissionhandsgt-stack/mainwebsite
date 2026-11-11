import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { pageCopy } from "@/lib/pageCopy";
import { collegeName } from "@/lib/collegeName";
import { getPgStates, type PgState } from "@/lib/pgStateQueries";
import { getStateStipend, getStipends } from "@/lib/cutoffHubQueries";
import { getBondByState, getCollegeSeatTerms, type BondState, type SeatTerms } from "@/lib/pgSeatData";
import { getLowRankClinical, CLINICAL, type ClinicalRow } from "@/lib/lowRankClinical";
import { scoreRange } from "@/lib/scoreRank";
import { getPgStatistics } from "@/lib/pgStatistics";
import { getSeatMatrixOverview, MATRIX_LABEL } from "@/lib/pgSeatData";
import { ROUND_RULES, DEPOSITS, SOURCES } from "@/lib/choiceFillingRules";
import { getDeemedPg, getPrivatePgFees, type FeeBand } from "@/lib/pgFeeQueries";
import { unstable_cache } from "next/cache";
import { getStateAuthority } from "@/lib/stateAuthorities";
import { getStateNotices, getHubNotices, stateKey, FEED_STATE } from "@/lib/stateNotices";
import { ALERT_SOURCES } from "@/lib/alertFeed";
import { getCounselPgStates, getCounselUgStates } from "@/lib/counselStates";
import { officialLink } from "@/lib/zynNotices";
import { branchWord, branchRound, branchState, collegeBranch, roundIn, roundOverall, withoutBranchWords, INI_CET } from "@/lib/huntBranch";

/**
 * Answers the daily hunt writes (2026-11-10; owner, with his own AIIMS New Delhi answer as the model: "aise detailed
 * answers bane outreach mai post karne ke liye… as per specific questions… signup wala etc bhi rehna chaiye").
 *
 * The shape is the owner's: the answer in the first line, the figures that make it, what to check before accepting a
 * seat, where the figures come from, one comparison, the page (free, no sign-up — said only of pages that need none),
 * the disclosure and his signature. No LLM (owner: no paid AI before Dec 2026): the question is read for what it asks
 * (a college, a state, a branch, a score, a round) and the figures come from the same readers the pages use.
 *
 * The rules every page keeps hold here too: no college's closing rank (rank figures are group figures over three or
 * more colleges), no seat promised, a bond / seat-leaving figure always with its "as listed for the counselling…
 * confirm" caveat, a fee or stipend only as the college or its notice publishes it.
 *
 * Order of trust: the owner's saved answers (`hunt_library`) first, then a builder for what the question asks, then the
 * answering page's own first line.
 *
 * Server only.
 */
const SITE = "https://www.admissionhands.com";
const n = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString("en-IN"));
const inr = (v: number | null | undefined) => {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v >= 1e7) return `₹${+(v / 1e7).toFixed(2)} crore`;
  if (v >= 1e5) return `₹${+(v / 1e5).toFixed(2)} lakh`;
  return `₹${n(v)}`;
};
const fold = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
const span = (lo: number | null | undefined, hi: number | null | undefined) => (lo != null && hi != null && lo !== hi ? ` (${inr(lo)} – ${inr(hi)})` : "");
const has = (q: string, word: string) => fold(q).includes(` ${word.toLowerCase()} `);
/** Said once, in the source line, wherever a bond or seat-leaving figure appears (pg_seat_terms is a compilation). */
const CAVEAT = "bond and seat-leaving terms as listed for the 2026 counselling, not an official notice — confirm with the state's notice or the college before you pay a fee or sign a bond";

export type Draft = {
  /** Our page the answer links to. */
  page: string;
  /** Which builder wrote it. */
  kind: string;
  lead: string;
  pointsTitle?: string;
  points?: string[];
  /** Things to check before accepting a seat. */
  checks?: string[];
  source?: string;
  compare?: string;
  /** What the page holds, for "The full {what} is free…". */
  what: string;
  /** Add the predictor line (rank → colleges). */
  predictor?: boolean;
  /** An official site the answer names, shown as a link. */
  link?: { url: string; title: string };
};

export type Answer = { page: string; kind: string; answer: string };

async function render(d: Draft): Promise<Answer> {
  const c = await pageCopy("site.hunt_answer", { what: d.what, url: `${SITE}${d.page}` });
  const pred = await pageCopy("site.hunt_answer", { url: `${SITE}/neet-college-predictor?course=pg` });
  const out: string[] = [d.lead];
  if (d.link) out.push("", `Official site: ${d.link.url}`);
  if (d.points?.length) {
    if (d.pointsTitle) out.push("", d.pointsTitle);
    out.push("", ...d.points.map((p) => `- ${p}`));
  }
  if (d.checks?.length) out.push("", c.check_title, "", ...d.checks.map((p) => `- ${p}`));
  if (d.source) out.push("", `Source: ${d.source}`);
  if (d.compare) out.push("", d.compare);
  out.push("", c.free_line);
  if (d.predictor) out.push(pred.predictor_line);
  out.push("", c.disclosure, "", c.signature);
  return { page: d.page, kind: d.kind, answer: out.join("\n") };
}

/* ---------------------------------------------------------------- saved answers --- */

export type LibraryEntry = { id: number; match: string; answer: string; page: string; checked_on: string | null; is_active: boolean };

/** "aiims, stipend | salary": every comma group must match, any one alternative within a group. */
export function libraryMatches(match: string, question: string): boolean {
  const groups = match.split(",").map((g) => g.split("|").map((w) => w.trim().toLowerCase()).filter(Boolean)).filter((g) => g.length);
  if (!groups.length) return false;
  const q = fold(question);
  return groups.every((alts) => alts.some((w) => q.includes(` ${w.replace(/[^a-z0-9]+/g, " ").trim()} `)));
}

export async function listLibrary(): Promise<LibraryEntry[]> {
  return (await db.execute(sql`
    SELECT id, match, answer, page, to_json(checked_on)#>>'{}' AS checked_on, is_active FROM hunt_library ORDER BY updated_at DESC`)) as unknown as LibraryEntry[];
}

export async function saveLibrary(e: { id?: number; match: string; answer: string; page: string; checkedOn?: string | null; active?: boolean }) {
  const match = e.match.trim().slice(0, 300);
  const answer = e.answer.trim().slice(0, 8000);
  const page = /^\/[^\s]*$/.test(e.page.trim()) ? e.page.trim().slice(0, 300) : "/";
  const checked = e.checkedOn && /^\d{4}-\d{2}-\d{2}$/.test(e.checkedOn) ? e.checkedOn : null;
  if (!match || !answer) throw new Error("Give the words to match and the answer.");
  if (e.id) {
    await db.execute(sql`
      UPDATE hunt_library SET match = ${match}, answer = ${answer}, page = ${page}, checked_on = ${checked}::date,
             is_active = ${e.active ?? true}, updated_at = now() WHERE id = ${e.id}`);
  } else {
    await db.execute(sql`INSERT INTO hunt_library (match, answer, page, checked_on) VALUES (${match}, ${answer}, ${page}, ${checked}::date)`);
  }
}

export async function deleteLibrary(id: number) {
  await db.execute(sql`DELETE FROM hunt_library WHERE id = ${id}`);
}

async function fromLibrary(question: string): Promise<Answer | null> {
  const rows = (await db.execute(sql`SELECT id, match, answer, page FROM hunt_library WHERE is_active ORDER BY length(match) DESC`).catch(() => [])) as unknown as LibraryEntry[];
  const hit = rows.find((r) => libraryMatches(r.match, question));
  if (!hit) return null;
  const c = await pageCopy("site.hunt_answer", {});
  const firstSig = c.signature.split("\n")[0]?.trim();
  // The owner's answer as he wrote it; the disclosure and signature are added only if it has none.
  const answer = firstSig && hit.answer.includes(firstSig) ? hit.answer : [hit.answer.trim(), "", c.disclosure, "", c.signature].join("\n");
  return { page: hit.page, kind: "saved", answer };
}

/* ------------------------------------------------------- reading the question --- */

/**
 * How India types a state: short forms, misspellings, and the counselling authority or university searched in its place
 * ("jk neet pg website", "kea pg counselling", "bopee merit list"). Matched as whole words; compared by `stateKey`, so
 * "Jammu and Kashmir" and "Jammu & Kashmir" are one state (the alias said "&" while our list says "and", so "jk" had
 * matched nothing).
 */
const STATE_ALIAS: Record<string, string> = {
  mp: "Madhya Pradesh", up: "Uttar Pradesh", tn: "Tamil Nadu", tamilnadu: "Tamil Nadu", ap: "Andhra Pradesh", wb: "West Bengal",
  bengal: "West Bengal", jk: "Jammu and Kashmir", "j k": "Jammu and Kashmir", "jammu kashmir": "Jammu and Kashmir",
  kashmir: "Jammu and Kashmir", jammu: "Jammu and Kashmir", hp: "Himachal Pradesh", himachal: "Himachal Pradesh",
  mh: "Maharashtra", uttrakhand: "Uttarakhand", chattisgarh: "Chhattisgarh", chhatisgarh: "Chhattisgarh",
  pondicherry: "Puducherry", pondy: "Puducherry", orissa: "Odisha", andaman: "Andaman and Nicobar Islands",
  // Authorities that run a state's counselling, searched by name.
  kea: "Karnataka", bopee: "Jammu and Kashmir", jkbopee: "Jammu and Kashmir", bceceb: "Bihar", bceceboard: "Bihar",
  pgmac: "Bihar", ugmac: "Bihar", wbmcc: "West Bengal", bfuhs: "Punjab", hnbumu: "Uttarakhand", amru: "Himachal Pradesh",
  centac: "Puducherry", uhsr: "Haryana", knruhs: "Telangana", kaloji: "Telangana", ntruhs: "Andhra Pradesh",
  drntruhs: "Andhra Pradesh", uhsap: "Andhra Pradesh", acppgmec: "Gujarat", acpugmec: "Gujarat", medadmgujarat: "Gujarat",
  upneet: "Uttar Pradesh", mahacet: "Maharashtra", "cet cell": "Maharashtra", jceceb: "Jharkhand", ojee: "Odisha",
  pgmcc: "Odisha", trmcc: "Tripura", tnmedicalselection: "Tamil Nadu", "cee kerala": "Kerala",
  // Cities with many medical colleges, searched in place of the state ("md radiology cut off jaipur"). A city in two
  // states (Bilaspur, Aurangabad in Bihar) is left out or given to the one with the medical colleges people mean.
  jaipur: "Rajasthan", jodhpur: "Rajasthan", udaipur: "Rajasthan", kota: "Rajasthan", bikaner: "Rajasthan", ajmer: "Rajasthan",
  lucknow: "Uttar Pradesh", kanpur: "Uttar Pradesh", varanasi: "Uttar Pradesh", agra: "Uttar Pradesh", meerut: "Uttar Pradesh",
  prayagraj: "Uttar Pradesh", allahabad: "Uttar Pradesh", gorakhpur: "Uttar Pradesh", noida: "Uttar Pradesh",
  mumbai: "Maharashtra", pune: "Maharashtra", nagpur: "Maharashtra", nashik: "Maharashtra", aurangabad: "Maharashtra",
  bangalore: "Karnataka", bengaluru: "Karnataka", mysore: "Karnataka", mysuru: "Karnataka", mangalore: "Karnataka",
  mangaluru: "Karnataka", hubli: "Karnataka", belgaum: "Karnataka", belagavi: "Karnataka", davangere: "Karnataka", manipal: "Karnataka",
  chennai: "Tamil Nadu", madurai: "Tamil Nadu", coimbatore: "Tamil Nadu", salem: "Tamil Nadu", trichy: "Tamil Nadu", vellore: "Tamil Nadu",
  hyderabad: "Telangana", warangal: "Telangana", kolkata: "West Bengal", ahmedabad: "Gujarat", surat: "Gujarat", vadodara: "Gujarat",
  rajkot: "Gujarat", jamnagar: "Gujarat", indore: "Madhya Pradesh", bhopal: "Madhya Pradesh", gwalior: "Madhya Pradesh",
  jabalpur: "Madhya Pradesh", patna: "Bihar", darbhanga: "Bihar", kochi: "Kerala", cochin: "Kerala", trivandrum: "Kerala",
  thiruvananthapuram: "Kerala", kozhikode: "Kerala", calicut: "Kerala", thrissur: "Kerala", bhubaneswar: "Odisha", cuttack: "Odisha",
  ranchi: "Jharkhand", jamshedpur: "Jharkhand", dhanbad: "Jharkhand", raipur: "Chhattisgarh", dehradun: "Uttarakhand",
  guwahati: "Assam", dibrugarh: "Assam", srinagar: "Jammu and Kashmir", ludhiana: "Punjab", amritsar: "Punjab", patiala: "Punjab",
  faridkot: "Punjab", rohtak: "Haryana", shimla: "Himachal Pradesh", visakhapatnam: "Andhra Pradesh", vizag: "Andhra Pradesh",
  guntur: "Andhra Pradesh", vijayawada: "Andhra Pradesh", kurnool: "Andhra Pradesh", tirupati: "Andhra Pradesh",
};

function stateIn<T extends { name: string }>(q: string, states: T[]): T | null {
  const f = fold(q);
  const byName = [...states].sort((a, b) => b.name.length - a.name.length).find((s) => f.includes(fold(s.name.replace(/&/g, "and"))) || f.includes(fold(s.name)));
  if (byName) return byName;
  for (const [k, v] of Object.entries(STATE_ALIAS)) if (has(q, k)) return states.find((s) => stateKey(s.name) === stateKey(v)) ?? null;
  return null;
}

/** Words that say what is asked, not which college. What is left names the college. */
const NOT_A_NAME = new Set(
  (
    "pg md ms mbbs neet ini cet inicet stipend stipends salary salaries pay paid fee fees structure cut off cutoff rank ranks closing " +
    "bond penalty seat seats leaving leave how much what which is are the in at of for per month monthly year yearly annual a an and or " +
    "to kitna kitni kitne kya hai milta milti milega ka ki ke me mein se 2023 2024 2025 2026 2027 college colleges medical government govt " +
    "private deemed university india residents resident junior jr doctor doctors student students admission counselling counseling quota " +
    "management nri total details list branch branches wise state best highest lowest top compare vs hostel tuition first second third " +
    "1st 2nd 3rd do does can i my get given gross net hand in-hand ctc amount new old structure institute sciences hospital"
  ).split(" "),
);

type College = { id: number; slug: string; name: string; state: string | null; ownership: string };

/** Colleges searched by their initials, as the name we hold spells them (with a place word, "jnmc wardha", one is left). */
const COLLEGE_ACRONYM: Record<string, string> = {
  aiims: "all india institute of medical sciences", gmc: "government medical college", kgmu: "king george", kgmc: "king george",
  bhu: "banaras hindu", ims: "institute of medical sciences", amu: "aligarh muslim", mamc: "maulana azad", lhmc: "lady hardinge",
  ucms: "university college of medical sciences", vmmc: "vardhman mahavir", sgpgi: "sanjay gandhi postgraduate", sgpgims: "sanjay gandhi postgraduate",
  kmc: "kasturba medical college", cmc: "christian medical college", afmc: "armed forces medical college", mmc: "madras medical college",
  bmcri: "bangalore medical college", bmc: "bangalore medical college", igims: "indira gandhi institute of medical sciences",
  pmch: "patna medical college", nmch: "nalanda medical college", ipgmer: "ipgme", sskm: "ipgme", rgkar: "rg kar",
  nrs: "nil ratan sircar", gsmc: "seth gs medical", kem: "seth gs medical", bjmc: "bj medical", jnmc: "jawaharlal nehru medical college",
  grmc: "gajra raja", gmch: "government medical college and hospital", hims: "himalayan institute", srmc: "sri ramachandra",
  dmc: "dayanand medical college",
};

async function collegeIn(q: string, states: PgState[]): Promise<College | null> {
  const st = stateIn(q, states);
  let words = fold(q).trim().split(" ").filter((w) => w.length >= 2 && !NOT_A_NAME.has(w) && !/^\d+$/.test(w));
  if (st) words = words.filter((w) => !fold(st.name).includes(` ${w} `));
  if (!words.length || words.length > 5 || !words.some((w) => w.length >= 3)) return null;
  const like = (w: string): SQL =>
    COLLEGE_ACRONYM[w]
      ? sql`i.name ILIKE ${`%${COLLEGE_ACRONYM[w]}%`}`
      : w.length <= 3
          ? sql`i.name ~* ${`\\y${w}\\y`}`
          : sql`i.name ILIKE ${`%${w}%`}`;
  const rows = (await db.execute(sql`
    SELECT i.id, i.slug, i.name, s.name AS state, i.ownership::text AS ownership,
           EXISTS (SELECT 1 FROM seat_options so JOIN courses co ON co.id = so.course_id
                    WHERE so.institute_id = i.id AND co.name !~* '^(DNB|DrNB|FNB|Diploma|PG Diploma)') AS mdms
      FROM institutes i LEFT JOIN states s ON s.id = i.state_id
     WHERE i.level = 'pg' AND i.is_active AND i.slug IS NOT NULL AND ${sql.join(words.map(like), sql` AND `)}
     LIMIT 6`)) as unknown as (College & { mdms: boolean })[];
  const mdms = rows.filter((r) => r.mdms);
  const pick = mdms.length === 1 ? mdms[0] : rows.length === 1 ? rows[0] : null;
  return pick ? { id: Number(pick.id), slug: pick.slug, name: pick.name, state: pick.state, ownership: pick.ownership } : null;
}

const branchIn = (q: string) => CLINICAL.find((c) => c.re.test(q)) ?? null;

/* ------------------------------------------------------------------- builders --- */

function bondChecks(t: SeatTerms | undefined): string[] {
  if (!t) return [];
  const out: string[] = [];
  if (t.bondYears) out.push(`Service bond: ${t.bondYears} year${t.bondYears === 1 ? "" : "s"} after the course${t.bondPenalty ? `, ${inr(t.bondPenalty)} to break it` : ""}${t.bondVaries ? "; it differs between branches here" : ""}.`);
  else if (t.bondYears === 0 && !t.bondUnknown) out.push("No service bond is listed for this seat type.");
  if (t.exitPenalty) out.push(`Leaving the seat after joining: ${inr(t.exitPenalty)}${t.exitDebarYears ? `, and a ${t.exitDebarYears}-year bar from counselling` : ""}${t.exitRefundStipend ? ", and the stipend paid back" : ""}.`);
  else if (t.exitFullCourseFee) out.push("Leaving the seat after joining: the fee for the whole course is listed as payable.");
  if (t.hostelMin) out.push(`Hostel: ${inr(t.hostelMin)}${t.hostelMax && t.hostelMax !== t.hostelMin ? ` – ${inr(t.hostelMax)}` : ""}${t.hostelPeriod ? ` a ${t.hostelPeriod}` : ""}${t.hostelMess ? ", mess included" : ""}.`);
  return out;
}

async function college(c: College, q: string): Promise<Draft | null> {
  const nm = collegeName(c.name);
  const label = nm.place && !nm.short.toLowerCase().includes(nm.place.toLowerCase()) ? `${nm.short}, ${nm.place}` : nm.short;
  const [stipend, fees, terms] = await Promise.all([
    db.execute(sql`
      SELECT f.stipend_y1_inr AS y1, f.stipend_y2_inr AS y2, f.stipend_y3_inr AS y3, f.year
        FROM fees f WHERE f.institute_id = ${c.id} AND f.level = 'pg' AND f.stipend_y1_inr > 0 AND f.stipend_periodicity = 'per_month'
       ORDER BY f.year DESC NULLS LAST, f.stipend_y1_inr DESC LIMIT 1`),
    db.execute(sql`
      SELECT q.label AS quota, MIN(f.fee_inr)::int AS lo, MAX(f.fee_inr)::int AS hi, MAX(f.fee_label) AS label, f.fee_periodicity AS period
        FROM fees f LEFT JOIN quotas q ON q.id = f.quota_id
       WHERE f.institute_id = ${c.id} AND f.level = 'pg' AND f.fee_source IS NOT NULL AND f.fee_inr > 0
         AND f.fee_periodicity IN ('per year', 'first year')
       GROUP BY q.label, f.fee_periodicity ORDER BY MIN(f.fee_inr) LIMIT 4`),
    getCollegeSeatTerms(c.slug).catch(() => [] as SeatTerms[]),
  ]);
  const s = (stipend as unknown as { y1: number; y2: number | null; y3: number | null }[])[0];
  const f = fees as unknown as { quota: string | null; lo: number; hi: number; label: string | null; period: string }[];
  const per = (period: string) => (period === "first year" ? "in year 1" : "a year");
  const main = terms.find((t) => t.family === "state") ?? terms.find((t) => t.family === "aiq") ?? terms[0];
  const tStipend = main?.stipend?.[0] ? main.stipend : null;
  const y1 = s?.y1 ?? tStipend?.[0] ?? null;
  const asksFee = /fee|cost|tuition/i.test(q);
  if (!y1 && !f.length) return null;

  const points: string[] = [];
  if (y1) {
    const y2 = s?.y2 ?? tStipend?.[1];
    const y3 = s?.y3 ?? tStipend?.[2];
    points.push(`Stipend, year 1: ${inr(y1)} a month${y2 ? `; year 2: ${inr(y2)}` : ""}${y3 ? `; year 3: ${inr(y3)}` : ""}.`);
  }
  for (const r of f) points.push(`${r.quota ?? "Fee"}: ${inr(r.lo)}${r.hi !== r.lo ? ` – ${inr(r.hi)} (by branch)` : ""} ${per(r.period)}${/tuition/i.test(r.label ?? "") ? ", tuition alone" : ""} — the college's 2026-27 notice.`);

  const lead =
    (asksFee || !y1) && f.length
      ? `At ${label}${c.state ? ` (${c.state})` : ""}, the 2026-27 PG fee starts at ${inr(f[0].lo)} ${per(f[0].period)} on a ${f[0].quota ?? "state"} seat${f.length > 1 ? `, and other quotas cost more` : ""}${y1 ? `; the stipend is ${inr(y1)} a month in the first year` : ""}.`
      : `At ${label}${c.state ? ` (${c.state})` : ""}, a first-year MD/MS resident's stipend is ${inr(y1)} a month${f.length ? `, and the 2026-27 fee starts at ${inr(f[0].lo)} ${per(f[0].period)}` : ""}.`;
  const compareState = c.state ? await getStateStipend(c.state).catch(() => null) : null;
  return {
    page: `/md-ms-india/colleges/${c.slug}`,
    kind: "college",
    lead,
    pointsTitle: "What the college publishes:",
    points,
    checks: [...bondChecks(main), "Ask the college whether the stipend is paid from month one, and what is deducted from it."],
    source: [f.length ? "the college's own 2026-27 fee notice" : null, y1 ? "the stipend the college publishes" : null, main ? CAVEAT : null].filter(Boolean).join("; ") + ".",
    compare:
      compareState && y1
        ? `For comparison, the median first-year stipend across ${compareState.colleges} PG colleges in ${c.state} is ${inr(compareState.median)} a month${compareState.govtMedian ? ` (government colleges ${inr(compareState.govtMedian)})` : ""}.`
        : undefined,
    what: `fee, stipend and seat table for ${label}`,
    predictor: true,
  };
}

async function stateStipend(st: PgState): Promise<Draft | null> {
  const [s, bond, all] = await Promise.all([getStateStipend(st.name).catch(() => null), getBondByState().catch(() => null), getStipends().catch(() => null)]);
  if (!s) return null;
  const b: BondState | undefined = bond?.states.find((x) => x.state === st.name);
  const ranked = all ? [...all.states].sort((a, z) => (z.govtMedian ?? z.median) - (a.govtMedian ?? a.median)) : [];
  const pos = ranked.findIndex((x) => x.state === st.name);
  const top = s.list.slice(0, 3);
  return {
    page: `/md-ms-india/stipend/${st.slug}`,
    kind: "state-stipend",
    lead: `In ${st.name}, the median first-year PG stipend is ${inr(s.median)} a month across ${s.colleges} colleges that publish one${s.govtMedian ? `; government colleges pay a median of ${inr(s.govtMedian)}` : ""}${s.privateMedian ? ` and private/deemed colleges ${inr(s.privateMedian)}` : ""}.`,
    pointsTitle: "How it runs:",
    points: [
      ...(s.y2Median ? [`Year 2: median ${inr(s.y2Median)} a month${s.y3Median ? `; year 3: ${inr(s.y3Median)}` : ""}.`] : []),
      `Range: ${inr(s.min)} to ${inr(s.max)} a month, college to college.`,
      ...(top.length ? [`Highest published: ${top.map((c) => `${collegeName(c.name).short} ${inr(c.y1)}`).join(", ")}.`] : []),
    ],
    checks: [
      ...(b && b.govt.withBond
        ? [`${b.govt.withBond} of ${b.govt.colleges} government colleges here list a service bond${b.govt.typicalYears ? ` (typically ${b.govt.typicalYears} year${b.govt.typicalYears === 1 ? "" : "s"})` : ""}${b.govt.penaltyMedian ? `; breaking it costs ${inr(b.govt.penaltyMedian)} in the middle` : ""}.`]
        : []),
      ...(b?.govt.exitMedian ? [`Leaving a government seat after joining: ${inr(b.govt.exitMedian)} in the middle${b.govt.debarYears ? `, with a ${b.govt.debarYears}-year bar` : ""}.`] : []),
      "Income tax is deducted at source on the stipend, so the amount credited is lower.",
    ],
    source: `each college's own published stipend, its latest year${b && b.govt.withBond ? `; ${CAVEAT}` : ""}.`,
    compare:
      all && pos >= 0
        ? `For comparison, the national median is ${inr(all.median)} a month; ${st.name} is ${pos === 0 ? "the highest" : `number ${pos + 1}`} of ${ranked.length} states by its government colleges' median.`
        : undefined,
    what: `${st.name} college-by-college stipend table`,
  };
}

async function nationalStipend(): Promise<Draft | null> {
  const all = await getStipends().catch(() => null);
  if (!all) return null;
  const states = [...all.states].sort((a, z) => (z.govtMedian ?? z.median) - (a.govtMedian ?? a.median)).slice(0, 3);
  return {
    page: "/md-ms-india/stipend",
    kind: "stipend",
    lead: `The median first-year MD/MS stipend in India is ${inr(all.median)} a month across ${n(all.colleges)} colleges that publish one${all.govtMedian ? ` — government colleges ${inr(all.govtMedian)}` : ""}${all.privateMedian ? `, private and deemed ${inr(all.privateMedian)}` : ""}.`,
    pointsTitle: "Where it is highest (government colleges' median):",
    points: states.map((s) => `${s.state}: ${inr(s.govtMedian ?? s.median)} a month (${s.colleges} colleges)`),
    checks: ["Whether the state binds you to a service bond after the course, and what breaking it costs.", "Whether the stipend rises in years 2 and 3, and whether it is paid from month one.", "Income tax is deducted at source, so the credited amount is lower."],
    source: "each college's own published monthly stipend, its latest year.",
    compare: "AIIMS, JIPMER and PGIMER admit through INI-CET and pay residents a salary on the central pay matrix, so they are not in NEET PG stipend lists.",
    what: "state-wise and college-wise stipend table",
  };
}

async function bond(st: PgState | null): Promise<Draft | null> {
  const b = await getBondByState().catch(() => null);
  if (!b) return null;
  const s = st ? b.states.find((x) => x.state === st.name) : undefined;
  if (s && s.govt.colleges) {
    return {
      page: `/md-ms-india/bond#${s.anchor}`,
      kind: "bond-state",
      lead: `In ${s.state}, ${s.govt.withBond} of ${s.govt.colleges} government PG colleges list a service bond${s.govt.typicalYears ? `, typically ${s.govt.typicalYears} year${s.govt.typicalYears === 1 ? "" : "s"}` : ""}${s.govt.penaltyMedian ? `; breaking it costs ${inr(s.govt.penaltyMedian)} in the middle${span(s.govt.penaltyLow, s.govt.penaltyHigh)}` : ""}.`,
      points: [
        ...(s.govt.exitMedian ? [`Leaving the seat after joining: ${inr(s.govt.exitMedian)} in the middle${s.govt.debarYears ? `, and a ${s.govt.debarYears}-year bar from counselling` : ""}.`] : []),
        ...(s.other.colleges ? [`Private and deemed colleges: ${s.other.withBond} of ${s.other.colleges} list a bond${s.other.exitMedian ? `; leaving one costs ${inr(s.other.exitMedian)} in the middle` : ""}.`] : []),
      ],
      checks: ["The bond and penalty in the state's own counselling notice for your year — they change.", "Whether the bond is served in a government post (and paid) or only as a penalty.", "Whether original certificates are kept by the college until the course ends."],
      source: `${CAVEAT}.`,
      what: "state-wise bond and penalty table",
    };
  }
  return {
    page: "/md-ms-india/bond",
    kind: "bond",
    lead: `${b.govtBonded} of ${b.govtColleges} government PG colleges bind MD/MS graduates to a service bond${b.penaltyMedian ? `; breaking it costs ${inr(b.penaltyMedian)} in the middle${span(b.penaltyLow, b.penaltyHigh)}` : ""}.`,
    points: [
      `Bond length: ${b.byYears[1]} colleges 1 year, ${b.byYears[2]} colleges 2 years, ${b.byYears[3]} colleges 3 years.`,
      ...(b.exitMedian ? [`Leaving a seat after joining: ${inr(b.exitMedian)} in the middle; ${b.exitColleges} of ${b.allColleges} colleges list a seat-leaving penalty.`] : []),
    ],
    checks: ["Your state's own counselling notice for the bond and penalty in your year.", "Whether the bond is a paid government posting or a penalty only.", "Whether the college keeps your original certificates."],
    source: `${CAVEAT}.`,
    what: "state-wise bond and penalty table",
  };
}

async function marks(score: number): Promise<Draft | null> {
  const r = await scoreRange("pg", score);
  if (!r.ok) return null;
  const { year, outOf, rankMin, rankMax, candidates } = r.range;
  const d = await getLowRankClinical().catch(() => null);
  const last = d ? (d.runningRound ? d.years[0] : d.years[d.years.length - 1]) : null;
  const reach = (fam: "aiq" | "deemed") =>
    d && last ? d.rows.filter((x) => (x.cuts[last]?.[fam]?.rank ?? 0) >= rankMax).map((x) => x.branch) : [];
  const aiq = reach("aiq");
  const deemed = reach("deemed");
  return {
    page: "/neet-pg-marks-vs-rank",
    kind: "marks",
    lead: `A score of ${score} out of ${outOf} in NEET PG ${year} was rank ${n(rankMin)}${rankMax !== rankMin ? ` – ${n(rankMax)}` : ""}${candidates ? ` (${n(candidates)} candidates had exactly this score)` : ""}.`,
    pointsTitle: last ? `Where a rank like that went in ${last} (last rank admitted, over three or more colleges):` : undefined,
    points: last
      ? [
          aiq.length ? `All India Quota, government seats (open category): ${aiq.join(", ")}.` : "All India Quota government seats in the clinical branches closed before this rank.",
          deemed.length ? `Deemed universities' paid seats: ${deemed.join(", ")}.` : "Deemed universities' paid clinical seats closed before this rank.",
          "State quota, management and NRI seats are filled by each state's own counselling and close at their own ranks.",
        ]
      : undefined,
    checks: ["Your category and domicile — they change which seats count for you.", "Which round: the later rounds reach further down the list.", "The fee and bond of each seat before you put it in your choices."],
    source: `NBEMS's NEET PG ${year} result (score and rank of every candidate); MCC's published allotment results.`,
    what: "marks vs rank table for every score",
    predictor: true,
  };
}

function branch(row: ClinicalRow, d: NonNullable<Awaited<ReturnType<typeof getLowRankClinical>>>): Draft {
  const last = d.runningRound ? d.years[0] : d.years[d.years.length - 1];
  const now = d.years[d.years.length - 1];
  const c = row.cuts[last] ?? {};
  const cn = now !== last ? row.cuts[now] ?? {} : {};
  const sc = (x?: { score: number | null; outOf: number | null }) => (x?.score != null ? ` (score ${x.score}/${x.outOf})` : "");
  const name = row.slug?.startsWith("ms-") ? `MS ${row.branch}` : `MD ${row.branch}`;
  const points: string[] = [];
  if (c.aiq) points.push(`All India Quota, government seats, open category, ${last}: last admitted AIR ${n(c.aiq.rank)}${sc(c.aiq)}, over ${c.aiq.colleges} colleges.`);
  if (c.deemed) points.push(`Deemed universities' paid seats, ${last}: AIR ${n(c.deemed.rank)}${sc(c.deemed)}.`);
  if (c.dnb) points.push(`DNB, open, ${last}: AIR ${n(c.dnb.rank)}${sc(c.dnb)}.`);
  if (cn.aiq || cn.deemed) points.push(`${now} ${d.runningRound ?? ""} so far: ${[cn.aiq ? `AIQ AIR ${n(cn.aiq.rank)}` : null, cn.deemed ? `deemed paid AIR ${n(cn.deemed.rank)}` : null].filter(Boolean).join(", ")}.`.replace("  ", " "));
  return {
    page: row.slug ? `/md-ms-india/branches/${row.slug}` : "/neet-pg-cutoff",
    kind: "branch",
    lead: c.aiq
      ? `${name}: in ${last} the last All India Quota government seat (open category) went to AIR ${n(c.aiq.rank)}${sc(c.aiq)}${c.deemed ? `, and deemed universities' paid seats went down to AIR ${n(c.deemed.rank)}` : ""}.`
      : `${name}: in ${last}, deemed universities' paid seats went down to AIR ${n(c.deemed?.rank)}${sc(c.deemed)}.`,
    pointsTitle: "Round by round, MCC's own results:",
    points,
    checks: ["Your category and state quota — state counselling seats close at their own ranks.", "The fee and bond of a deemed or management seat before you choose it.", "Which round to aim for, and whether to hold a seat or upgrade."],
    source: "MCC's published allotment results; scores from NBEMS's result. Each rank is the last admitted over three or more colleges.",
    what: `${name} cut off, seats and colleges page`,
    predictor: true,
  };
}

async function lowScore(): Promise<Draft | null> {
  const d = await getLowRankClinical().catch(() => null);
  if (!d) return null;
  const last = d.runningRound ? d.years[0] : d.years[d.years.length - 1];
  const deep = d.rows
    .map((r) => ({ r, c: r.cuts[last]?.deemed }))
    .filter((x) => x.c)
    .sort((a, b) => (b.c?.rank ?? 0) - (a.c?.rank ?? 0));
  if (!deep.length) return null;
  const med = d.rows.find((r) => r.branch === "General Medicine")?.cuts[last]?.deemed;
  return {
    page: "/neet-pg-low-score-clinical-branches",
    kind: "low-score",
    lead: `Yes, at a low rank a clinical branch is still possible — on paid seats. In ${last}, MD General Medicine on deemed universities' paid seats went to AIR ${n(med?.rank)}${med?.score != null ? ` (score ${med.score}/${med.outOf})` : ""}, out of ${n(d.ranked[last])} ranked.`,
    pointsTitle: `Deepest clinical seats in ${last} (deemed paid, last admitted over three or more colleges):`,
    points: deep.slice(0, 6).map((x) => `${x.r.branch}: AIR ${n(x.c?.rank)}${x.c?.score != null ? ` (score ${x.c.score}/${x.c.outOf})` : ""}`),
    checks: ["The fee for all three years — paid seats cost far more than government seats.", "State management and NRI quotas, which each state fills in its own counselling.", "Which round: the widest ranks come in round 3 and the stray round."],
    source: "MCC's published allotment results; scores from NBEMS's result.",
    what: "table of every clinical branch, rank and score",
    predictor: true,
  };
}

async function seats(): Promise<Draft | null> {
  const [s, m] = await Promise.all([getPgStatistics().catch(() => null), getSeatMatrixOverview().catch(() => null)]);
  if (!s?.scores.length) return null;
  const now = s.scores[s.scores.length - 1];
  const md = s.nmc.find((r) => r.type === "MD")?.seats ?? 0;
  const ms = s.nmc.find((r) => r.type === "MS")?.seats ?? 0;
  return {
    page: "/neet-pg-statistics",
    kind: "seats",
    lead: `India has ${n(md + ms)} MD/MS seats on NMC's register (${n(md)} MD, ${n(ms)} MS), for ${n(now.ranked)} candidates ranked in NEET PG ${now.year} — about ${((now.ranked) / (md + ms)).toFixed(1)} for every seat.`,
    points: [
      ...s.nmc.filter((r) => r.type !== "MD" && r.type !== "MS").map((r) => `${r.type}: ${n(r.seats)} seats in ${n(r.colleges)} colleges.`),
      ...(m ? [`MCC's ${m.year} counselling fills ${n(m.total)} of them: ${m.byMatrix.map((b) => `${n(b.seats)} ${MATRIX_LABEL[b.seatMatrix] ?? b.seatMatrix}`).join(", ")}.`] : []),
      ...s.kinds.map((k) => `${k.kind}: ${n(k.seats)} MD/MS seats.`),
    ],
    source: "NMC's college and course register; NBEMS's NEET PG result; MCC's seat matrix.",
    what: "NEET PG statistics page (seats by course and branch, rounds, scores)",
  };
}

/** PG fees in deemed universities or private colleges: the middle 80% and the median, per seat family. */
async function fees(q: string): Promise<Draft | null> {
  const deemed = /deemed/i.test(q);
  const band = (b: FeeBand) =>
    b.p10 === b.p90
      ? `${b.family}: ${inr(b.median)} a year (${n(b.colleges)} colleges).`
      : `${b.family}: ${inr(b.median)} a year in the middle; most between ${inr(b.p10)} and ${inr(b.p90)} (${n(b.colleges)} colleges).`;
  if (deemed) {
    const d = await getDeemedPg().catch(() => null);
    if (!d?.national.length) return null;
    const m = d.national.find((b) => b.family === "Management");
    return {
      page: "/md-ms-india/deemed-universities",
      kind: "fees-deemed",
      lead: m
        ? `An MD/MS paid seat in a deemed university costs ${inr(m.median)} a year in the middle, with most between ${inr(m.p10)} and ${inr(m.p90)} a year, across ${m.colleges} deemed universities.`
        : `MD/MS fees in deemed universities, across ${d.colleges.length} of them:`,
      points: d.national.filter((b) => b.median).map(band),
      checks: [
        "Whether the figure is a year's fee or the whole course — notices differ, and some print only the first year.",
        "Hostel, mess, caution deposit and university charges on top of tuition.",
        "MCC's deemed-university security deposit (₹2 lakh) and when it is refunded.",
      ],
      source: `fees the universities published${d.year ? ` (${d.year})` : ""} — a 2026-27 notice where one exists; the middle 80% is shown, never the extremes.`,
      what: "college-by-college deemed university fee table",
      predictor: true,
    };
  }
  const p = await getPrivatePgFees().catch(() => null);
  if (!p?.national.length) return null;
  const g = p.national.find((b) => /state|government/i.test(b.family));
  const m = p.national.find((b) => b.family === "Management");
  return {
    page: "/md-ms-india/private-college-fees",
    kind: "fees-private",
    lead: `In private medical colleges, an MD/MS ${g ? `state-quota seat costs ${inr(g.median)} a year in the middle` : "seat's fee depends on the quota"}${m ? `, and a management seat ${inr(m.median)} a year` : ""}.`,
    points: p.national.filter((b) => b.median).map(band),
    checks: ["The quota: the same branch can cost several times more on a management or NRI seat.", "Whether the figure is a year's fee or the whole course.", "Hostel, mess, deposits, and the bond or seat-leaving penalty the state sets."],
    source: `fees the colleges published${p.year ? ` (${p.year})` : ""} — a 2026-27 notice where one exists; the middle 80% is shown, never the extremes.`,
    what: "state-by-state private college fee table",
    predictor: true,
  };
}

function choice(q: string): Draft {
  const which = /stray/i.test(q) ? "Stray vacancy round" : /round ?3|third/i.test(q) ? "Round 3" : /round ?2|second/i.test(q) ? "Round 2" : /round ?1|first|free exit/i.test(q) ? "Round 1" : null;
  const rule = which ? ROUND_RULES.find((r) => r.round === which) : null;
  const dep = DEPOSITS.map((x) => `${x.who}: ₹${n(x.registration)} registration, ₹${n(x.deposit)} security deposit.`);
  return {
    page: "/neet-pg-choice-filling",
    kind: "choice",
    lead: rule
      ? `${rule.round} of MCC's NEET PG counselling: ${rule.leaving}`
      : "In MCC's NEET PG counselling, a round 1 seat can be left free, a round 2 seat costs the security deposit, and a round 3 seat cannot be resigned once joined.",
    points: rule ? [rule.choices, rule.upgrade] : ROUND_RULES.map((r) => `${r.round}: ${r.exit}. ${r.upgrade}`),
    checks: [...dep, "Each round needs fresh choice filling and locking — earlier rounds' choices do not count."],
    source: `MCC's ${SOURCES.bulletin.title} (${SOURCES.bulletin.date}).`,
    what: "round-by-round guide to choice filling, upgrades and free exit",
    predictor: true,
  };
}

/* ------------------------------------------------- a counselling's official site --- */

/** "jk neet pg website", "kea pg counselling portal", "neet pg official site": which site runs it. */
const WEBSITE = /\b(website|web site|official (site|page|portal)|portal|login|log in)\b/i;
const COUNSEL_WORDS = /\b(neet|pg|ug|mbbs|bds|md|ms|dnb|counsel\w*|admission|merit list|allotment|registration|choice filling|seat matrix)\b/i;
/** A counselling authority searched by its own name ("kea website", "bopee portal") — no exam word needed. */
const AUTHORITY_NAMED =
  /\b(kea|bopee|jkbopee|bceceb|bceceboard|pgmac|ugmac|wbmcc|bfuhs|hnbumu|amru|centac|uhsr|knruhs|kaloji|ntruhs|drntruhs|uhsap|acppgmec|acpugmec|medadmgujarat|upneet|mahacet|cet cell|jceceb|ojee|pgmcc|trmcc|tnmedicalselection|mcc|nbems|natboard)\b/i;
/** A college's or a university's own site is not a counselling's. */
const A_COLLEGE = /\b(college|institute|hospital|aiims|jipmer|pgimer|university)\b/i;
const day = (iso: string | Date | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};
const hostLabel = (u: string) => {
  try {
    const x = new URL(u);
    const path = x.pathname.replace(/\/+$/, "");
    return `${x.hostname.replace(/^www\./, "")}${path && path.length <= 30 ? path : ""}`;
  } catch {
    return u;
  }
};

/** The page each state's authority links its PG notices from, as the owner approved them in Zyn — the newest per state. */
const authorityPages = unstable_cache(
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

/** "9 Nov 2026: Online registration…" — the board's name the alerts bar puts before a title is said once, above. */
const noticeLine = (x: { on: string; title: string }) => {
  // Only a name before the colon (no digits): "Round 2: result" keeps its words.
  const t = x.title.replace(/^[^:\d]{2,80}:\s*/, "").trim() || x.title;
  const d = day(x.on);
  return d ? `${d}: ${t}` : t;
};

const CHECKS = [
  "Register, fill choices and pay only on the official site — no agent, college office or \"direct admission\" contact can register you or hold a counselling seat.",
  "Dates move between rounds: the newest notice on the authority's own site is the final word.",
];

async function nationalSite(level: "pg" | "ug"): Promise<Draft> {
  const mcc = ALERT_SOURCES.find((s) => s.id === (level === "pg" ? "mcc-pg" : "mcc-ug"))!;
  const notes = (await getHubNotices(level, 60).catch((): Awaited<ReturnType<typeof getHubNotices>> => [])).filter((x) => x.where === "MCC").slice(0, 3);
  return {
    page: "/neet-counselling-updates",
    kind: "authority",
    lead:
      level === "pg"
        ? "NEET PG has two official websites: NBEMS (natboard.edu.in) conducts the exam — application, admit card and result — and MCC (mcc.nic.in) runs the All India Quota counselling, with the deemed and central universities' seats and DNB seats. Each state runs its own state-quota counselling on its own site."
        : "NEET UG has two official websites: NTA (neet.nta.nic.in) conducts the exam — application, admit card and result — and MCC (mcc.nic.in) runs the All India Quota counselling, with AIIMS, JIPMER and the deemed and central universities. Each state runs its own state-quota counselling on its own site.",
    link: { url: mcc.url, title: hostLabel(mcc.url) },
    pointsTitle: notes.length ? "MCC's latest notices:" : undefined,
    points: notes.map(noticeLine),
    checks: CHECKS,
    source: "the authorities' own sites.",
    what: `list of every official ${level === "pg" ? "NEET PG" : "NEET UG"} counselling notice`,
  };
}

async function authoritySite(q: string, states: PgState[]): Promise<Draft | null> {
  if (!WEBSITE.test(q) || A_COLLEGE.test(q)) return null;
  if (!COUNSEL_WORDS.test(q) && !AUTHORITY_NAMED.test(q)) return null;
  const pgWords = /\b(pg|md|ms|dnb|pgmac|pget|post ?grad\w*)\b/i.test(q);
  const ugWords = /\b(mbbs|bds|ug|ugmac|under ?grad\w*)\b/i.test(q);
  const level: "pg" | "ug" = ugWords && !pgWords ? "ug" : "pg";
  // Every state with MD/MS colleges or an MBBS college on NMC's register (a state with none has no counselling of its own).
  const ugStates = await getCounselUgStates().catch((): Awaited<ReturnType<typeof getCounselUgStates>> => []);
  const places = [...states.map((s) => ({ name: s.name, slug: s.slug })), ...ugStates.filter((u) => !states.some((s) => stateKey(s.name) === stateKey(u.name)))];
  const st = stateIn(q, places);
  if (!st || /\bmcc\b|all india|\baiq\b|central counsel/i.test(q)) return nationalSite(level);

  const key = stateKey(st.name);
  let site: { url: string; who: string; when: string | null; checked: string | null } | null = null;
  if (level === "pg") {
    const z = (await authorityPages().catch((): Awaited<ReturnType<typeof authorityPages>> => [])).find((r) => stateKey(r.state) === key && (r.level ?? "pg") === "pg" && officialLink(r.page));
    if (z) site = { url: z.page, who: z.authority.split(" · ")[0].trim(), when: day(z.on), checked: null };
  }
  if (!site) {
    const a = await getStateAuthority(st.name).catch(() => null);
    if (a && (level === "ug" || a.scope === "UG and PG")) site = { url: a.url, who: a.authority, when: null, checked: a.checked };
  }
  if (!site && level === "ug") {
    const id = Object.entries(FEED_STATE).find(([, s]) => stateKey(s) === key)?.[0];
    const src = id ? ALERT_SOURCES.find((x) => x.id === id) : undefined;
    if (src) site = { url: src.url, who: src.label, when: null, checked: null };
  }
  if (!site) return null;

  const exam = level === "pg" ? "NEET PG" : "MBBS and BDS";
  const notes = await getStateNotices(st.name, level, 3).catch((): Awaited<ReturnType<typeof getStateNotices>> => []);
  const counsel = level === "pg" ? await getCounselPgStates().catch((): { name: string; slug: string }[] => []) : ugStates;
  const c = counsel.find((s) => stateKey(s.name) === key);
  const pg = states.find((s) => stateKey(s.name) === key);
  const page = c ? `/counselling/${level === "pg" ? "neet-pg" : "mbbs"}/${c.slug}` : level === "pg" && pg ? `/md-ms-india/states/${pg.slug}` : "/counselling";
  const mcc = ALERT_SOURCES.find((s) => s.id === (level === "pg" ? "mcc-pg" : "mcc-ug"))!;
  return {
    page,
    kind: "authority",
    lead: `The official website for ${exam} counselling in ${st.name} (the state quota seats) is ${hostLabel(site.url)}, run by ${site.who}.`,
    link: { url: site.url, title: hostLabel(site.url) },
    pointsTitle: notes.length ? `${site.who}'s latest notices:` : undefined,
    points: [
      ...notes.map(noticeLine),
      `The All India Quota seats in ${st.name}'s government colleges, and the deemed universities' seats, are filled by MCC instead: ${hostLabel(mcc.url)}.`,
    ],
    checks: CHECKS,
    source: site.when ? `${site.who}'s own site, as linked from its notice of ${site.when}.` : site.checked ? `${site.who}'s own site (checked ${site.checked}).` : `${site.who}'s own site.`,
    what: `${st.name} ${level === "pg" ? "NEET PG" : "MBBS"} counselling guide`,
  };
}

/* ---------------------------------------------------------------------- entry --- */

const STIPEND = /stipend|salary|\bpay\b|in hand|ctc/i;
const BOND = /\bbond\b|penalt|seat leaving|leav(e|ing) (the |my )?seat/i;
const CHOICE = /upgrad|freeze|float|choice fill|lock(ing)? (my )?choices|choice (list|order)|free exit|resign/i;
const MARKS = /\b(-?\d{2,3})\s*(marks?|score|no\.?|number)\b|\b(marks?|score)\s*(of\s*)?(-?\d{2,3})\b/i;
const SEATS = /how many (pg|md|ms|md ?\/ ?ms|post ?graduate)? ?seats|seats in india|total (pg|md|ms)? ?seats|statistic|how many candidates|candidates appeared/i;
const LOW = /low (score|rank|marks)|just (qualified|eligible|passed)|clinical branch|clinical at|less marks|kam marks/i;
const CUTOFF = /cut ?off|closing rank|rank (needed|required)|kitn[ae] rank|which rank|rank for/i;

/** Which builder answers a question, from our live data — or none. Shared by the hunt and the site's search answers. */
async function pickDraft(q: string, all: string, hasText: boolean, states: PgState[]): Promise<Draft | null> {
  if (WEBSITE.test(q)) {
    const d = await authoritySite(q, states);
    if (d) return d;
  }
  // A branch, a round, a college or a state in any spelling, asking for a cut off ("neet pg 2026 md radio cut off",
  // "sms jaipur radiology round 2", "md radiology cut off rajasthan") — lib/huntBranch.ts. Not a fee or stipend question.
  const bw = branchWord(q);
  const cutAsked = (CUTOFF.test(q) || /\b(rank|round|closing|allot\w*)\b/i.test(q)) && !STIPEND.test(q) && !/fee|cost|tuition/i.test(q);
  // AIIMS, JIPMER, PGIMER… fill their PG seats through INI-CET: no NEET PG figure answers their cut off.
  if (cutAsked && INI_CET.test(q)) return null;
  if (cutAsked && (bw || roundIn(q))) {
    // What is left once the branch, round, year and category words go: a college's name, or only a place.
    const rest = withoutBranchWords(q);
    const onlyPlace = fold(rest).trim().split(" ").filter(Boolean).every((w) => w.length < 2 || NOT_A_NAME.has(w) || /^\d+$/.test(w) || STATE_ALIAS[w] !== undefined || states.some((s) => fold(s.name).includes(` ${w} `)));
    const c = onlyPlace ? null : await collegeIn(rest, states);
    if (c) {
      // A college named is answered with its own bands or not at all — never with the national figure under its name
      // (a deemed university's paid seats have no public band).
      const nm = collegeName(c.name);
      const label = nm.place && !nm.short.toLowerCase().includes(nm.place.toLowerCase()) ? `${nm.short}, ${nm.place}` : nm.short;
      return collegeBranch(q, { slug: c.slug, label });
    } else if (bw) {
      const st = stateIn(q, states);
      const d = st ? await branchState(q, st) : await branchRound(q);
      if (d) return d;
    } else {
      const d = await roundOverall(q);
      if (d) return d;
    }
  }
  if (STIPEND.test(q) || /fee|cost|tuition/i.test(q)) {
    const c = await collegeIn(q, states);
    if (c) {
      const d = await college(c, q);
      if (d) return d;
    }
  }
  if (BOND.test(q)) {
    const d = await bond(stateIn(q, states));
    if (d) return d;
  }
  if (STIPEND.test(q)) {
    const st = stateIn(q, states);
    const d = await (st ? stateStipend(st) : nationalStipend());
    if (d) return d;
  }
  if (CHOICE.test(q)) return choice(q);
  if (/fee|cost/i.test(q) && /deemed|private|management/i.test(q)) {
    const d = await fees(q);
    if (d) return d;
  }
  const mk = q.match(MARKS);
  const score = mk ? Number(mk[1] ?? mk[5]) : NaN;
  if (Number.isFinite(score) && score >= -180 && score <= 800 && /pg|md|ms|rank|marks|score/i.test(q)) {
    const d = await marks(score);
    if (d) return d;
  }
  if (LOW.test(q)) {
    const d = await lowScore();
    if (d) return d;
  }
  if (SEATS.test(q)) {
    const d = await seats();
    if (d) return d;
  }
  const br = branchIn(q);
  if (br && (CUTOFF.test(q) || /seat|rank|marks|get/i.test(q))) {
    const d = await getLowRankClinical().catch(() => null);
    const row = d?.rows.find((r) => r.branch === br.branch);
    if (d && row) return branch(row, d);
  }
  // A thread's text can say more than its title: read it once more for the broad topics.
  if (hasText) {
    if (STIPEND.test(all)) {
      const st = stateIn(all, states);
      const d = await (st ? stateStipend(st) : nationalStipend());
      if (d) return d;
    }
    if (BOND.test(all)) {
      const d = await bond(stateIn(all, states));
      if (d) return d;
    }
    if (CHOICE.test(all)) return choice(all);
    if (LOW.test(all)) {
      const d = await lowScore();
      if (d) return d;
    }
  }
  return null;
}

/**
 * The same answer as a draft — lead, points, checks, source — for a page of the site (lib/searchFaq.ts): only a data
 * builder's, never the owner's saved forum answers or a page's first line, and without the forum's link and signature.
 */
export async function draftFor(question: string): Promise<Draft | null> {
  const q = question.slice(0, 300);
  const states = await getPgStates().catch((): PgState[] => []);
  try {
    return await pickDraft(q, q, false, states);
  } catch {
    return null;
  }
}

/**
 * An answer for a question (a search or a thread title, with the thread's text when there is one). `fallback` is the
 * page that answers it when no builder fits; `pageLine` reads that page's own first line.
 */
export async function answerFor(
  question: string,
  opts: { text?: string; fallback?: string | null; pageLine?: (path: string) => Promise<string | null> } = {},
): Promise<Answer | null> {
  const q = question.slice(0, 300);
  const all = `${q} ${opts.text ?? ""}`.slice(0, 1500);
  const saved = await fromLibrary(q).catch(() => null);
  if (saved) return saved;

  const states = await getPgStates().catch((): PgState[] => []);
  try {
    const d = await pickDraft(q, all, Boolean(opts.text), states);
    if (d) return render(d);
  } catch {
    /* a builder failed — fall back to the page's own line */
  }

  if (opts.fallback && opts.pageLine) {
    const line = await opts.pageLine(opts.fallback);
    if (line) return render({ page: opts.fallback, kind: "page", lead: line, what: "table", predictor: false });
  }
  return null;
}
