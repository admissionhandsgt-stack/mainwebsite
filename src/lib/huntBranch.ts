/**
 * Branch searches as India types them (2026-11-11, owner, with "Neet pG 2026 MD radio cut off" in Google: "branch wise
 * half name full name ke sath bhi searches hote hai with year round wise etc… college ki branch ki + college round ki,
 * State + … edge cases"). Three builders for lib/huntAnswers.ts, each from the figures the site already prints:
 *
 *  - `branchRound`: a branch (short or full name — "radio", "md rd", "radiology", "radio diagnosis") with a year, a round,
 *    a category and a seat family (AIQ, deemed paid, DNB) as asked → MCC's result for that round: the last rank admitted
 *    per category over three or more colleges (the round pages' own figures), the score that rank held, the other rounds
 *    and last year's same round. A round not out yet says so and gives the latest one.
 *  - `branchState`: the same branch in a state ("md radiology cut off rajasthan") → the state's own counselling round and
 *    MCC's All India Quota in that state's colleges, each over three or more colleges (the branch × state page's figures).
 *  - `collegeBranch`: a college with a branch or a round ("sms jaipur md radio cut off 2026", "kgmu round 2 cut off") →
 *    the college page's own bands for the year in progress. A band, never the rank behind it.
 *
 * Never a college's closing rank; group figures only over three or more colleges. Server only.
 */
import type { Draft } from "@/lib/huntAnswers";
import { getRoundResult, getRoundState, getCounsellingYear, ROUNDS, roundPath, type RoundSpec, type BranchCut, type CutCat } from "@/lib/mccResults";
import { getBranchState, getBranchStateCombos, SEARCH_NAME } from "@/lib/branchStateQueries";
import { getStateRound } from "@/lib/stateRoundQueries";
import { getCollegeLiveBands } from "@/lib/collegeLiveBands";
import { getScoreTables } from "@/lib/scoreRank";

const n = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString("en-IN"));

/* ------------------------------------------------------------ reading the search --- */

/**
 * The words people type for each branch → the pattern of our course names. Order matters: the named "… medicine"
 * branches before general medicine, radiotherapy before radiology, every specific surgery before general surgery.
 */
export const BRANCH_WORDS: { q: RegExp; course: RegExp; name: string }[] = [
  { q: /nuclear medicine|\bnuclear\b/i, course: /nuclear medicine/i, name: "MD Nuclear Medicine" },
  { q: /community medicine|\bpsm\b|\bspm\b|preventive/i, course: /community medicine|social (&|and) preventive/i, name: "MD Community Medicine" },
  { q: /emergency/i, course: /emergency medicine/i, name: "MD Emergency Medicine" },
  { q: /family medicine/i, course: /family medicine/i, name: "MD Family Medicine" },
  { q: /geriatric/i, course: /geriatric/i, name: "MD Geriatrics" },
  { q: /palliative/i, course: /palliative/i, name: "MD Palliative Medicine" },
  { q: /transfusion|immuno ?ha?ematology|\bihbt\b/i, course: /transfusion|immuno ?-?ha?ematology/i, name: "MD Immunohaematology & Blood Transfusion" },
  { q: /physical medicine|\bpmr\b|rehabilitation/i, course: /physical medicine/i, name: "MD Physical Medicine & Rehabilitation" },
  { q: /tropical/i, course: /tropical/i, name: "MD Tropical Medicine" },
  { q: /sports medicine/i, course: /sports medicine/i, name: "MD Sports Medicine" },
  { q: /aerospace|aviation/i, course: /aerospace/i, name: "MD Aerospace Medicine" },
  { q: /pulmo\w*|\bchest\b|\btb\b|respiratory|tuberculosis/i, course: /respiratory|tuberculosis|pulmonary/i, name: "MD Respiratory Medicine" },
  { q: /radiation oncology|radio ?therapy|\bradiotherapy\b/i, course: /radiation oncology|radio ?-?therapy/i, name: "MD Radiation Oncology" },
  { q: /radio ?-?diagnosis|radiodiagnosis|radiology|\bradio\b|\brd\b/i, course: /radio ?-?diagnosis/i, name: "MD Radio Diagnosis" },
  { q: /derma\w*|\bdvl\b|\bskin\b/i, course: /dermatolog/i, name: "MD Dermatology" },
  { q: /\bortho\w*/i, course: /orthop/i, name: "MS Orthopaedics" },
  { q: /\bobg\w*|\bob ?gy\w*|\bgyn\w*|\bgynae?\w*|obstetric\w*|\bobs\b/i, course: /obstetric/i, name: "MS Obstetrics & Gynaecology" },
  { q: /\bpaed\w*|\bped\w*iatric\w*|\bpeds\b|\bpediatric\w*/i, course: /paediatric|pediatric/i, name: "MD Paediatrics" },
  { q: /an(a)?esth\w*|\banaes\b|\banes\b/i, course: /an(a)?esthes/i, name: "MD Anaesthesiology" },
  { q: /psych\w*/i, course: /psychiatr/i, name: "MD Psychiatry" },
  { q: /\bent\b|otorhino\w*|oto ?rhino\w*/i, course: /\bent\b|oto-?rhino/i, name: "MS ENT" },
  { q: /ophthal\w*|\bophtha\b|\beye\b/i, course: /ophthalm/i, name: "MS Ophthalmology" },
  { q: /\bpatho\w*/i, course: /patholog/i, name: "MD Pathology" },
  { q: /\bmicro\w*/i, course: /microbiolog/i, name: "MD Microbiology" },
  { q: /pharmacolog\w*|\bpharma\b/i, course: /pharmacolog/i, name: "MD Pharmacology" },
  { q: /biochem\w*/i, course: /biochem/i, name: "MD Biochemistry" },
  { q: /anatomy/i, course: /anatomy/i, name: "MD Anatomy" },
  { q: /physiolog\w*/i, course: /physiolog/i, name: "MD Physiology" },
  { q: /forensic|\bfmt\b/i, course: /forensic/i, name: "MD Forensic Medicine" },
  { q: /\bhospital admin\w*/i, course: /hospital administration/i, name: "MD Hospital Administration" },
  // General surgery and medicine last: every named surgery and medicine above has had its turn.
  { q: /general surgery|\bgen surgery\b|\bsurgery\b|\bgs\b/i, course: /general surgery/i, name: "MS General Surgery" },
  { q: /general medicine|\bgen med\b|\bmedicine\b|\bgm\b/i, course: /general medicine/i, name: "MD General Medicine" },
];

export type BranchWord = (typeof BRANCH_WORDS)[number];
/** The branch a search names, if any — never for a surgery or medicine qualified by a word we do not list. */
export function branchWord(q: string): BranchWord | null {
  const b = BRANCH_WORDS.find((x) => x.q.test(q)) ?? null;
  if (!b) return null;
  if (b.course.source.includes("general surgery") && /\b(plastic|neuro|cardio\w*|paediatric|pediatric|uro\w*|vascular|oncolog\w*|gastro\w*|thoracic|oral|maxillo\w*)\s*surgery/i.test(q)) return null;
  if (b.course.source.includes("general medicine") && /\b(lab(oratory)?|marine|space|internal)\s+medicine/i.test(q)) return null;
  return b;
}

/** "round 2", "r2", "2nd round", "second round", "stray", "mop up" → MCC's round. */
export function roundIn(q: string): RoundSpec | null {
  const s = q.toLowerCase();
  if (/special stray/.test(s)) return ROUNDS[4];
  if (/\bstray\b|mop ?-?up/.test(s)) return ROUNDS[3];
  if (/\bround ?-?(3|three|iii)\b|\br3\b|\b(3rd|third) round\b/.test(s)) return ROUNDS[2];
  if (/\bround ?-?(2|two|ii)\b|\br2\b|\b(2nd|second) round\b/.test(s)) return ROUNDS[1];
  if (/\bround ?-?(1|one|i)\b|\br1\b|\b(1st|first) round\b/.test(s)) return ROUNDS[0];
  return null;
}

export const yearIn = (q: string): number | null => {
  const m = q.match(/\b(202[3-9])\b/);
  return m ? Number(m[1]) : null;
};

export function categoryIn(q: string): CutCat | null {
  // "general surgery" and "general medicine" name a branch, not the general category.
  const s = ` ${q.toLowerCase().replace(/general (surgery|medicine)/g, " ").replace(/[^a-z0-9]+/g, " ")} `;
  if (/ ews /.test(s)) return "EWS";
  if (/ obc /.test(s)) return "OBC";
  if (/ sc /.test(s)) return "SC";
  if (/ st /.test(s)) return "ST";
  if (/ (general|gen|ur|open|unreserved|oc) /.test(s)) return "Open";
  return null;
}

const familyIn = (q: string): "aiq" | "deemed" | "dnb" =>
  /\bdnb\b|\bdrnb\b/i.test(q) ? "dnb" : /deemed|management|\bpaid\b|private/i.test(q) ? "deemed" : "aiq";
const FAMILY: Record<"aiq" | "deemed" | "dnb", string> = { aiq: "All India Quota", deemed: "deemed universities' paid seats", dnb: "DNB seats" };
const CAT_LABEL: Record<CutCat, string> = { Open: "open category", EWS: "EWS category", OBC: "OBC category", SC: "SC category", ST: "ST category" };
/** AIIMS, JIPMER, PGIMER, NIMHANS and SCTIMST fill their PG seats through INI-CET, not NEET PG: no NEET PG figure answers them. */
export const INI_CET = /\b(aiims|jipmer|pgimer|nimhans|sctimst|ini ?-?cet)\b/i;

/** Strip the branch, round, year and category words, so what is left can name a college. */
export function withoutBranchWords(q: string): string {
  let s = q;
  const b = branchWord(q);
  if (b) s = s.replace(new RegExp(b.q.source, "gi"), " ");
  return s
    .replace(/\b(md|ms|dnb|drnb|diploma)\b/gi, " ")
    .replace(/\bround ?-?\w+\b|\br[1-3]\b|\b(1st|2nd|3rd|first|second|third) round\b|\b(special )?stray\b|\bmop ?-?up\b/gi, " ")
    .replace(/\b(ews|obc|sc|st|general|gen|ur|open|cut ?off|cutoff|closing|rank|neet|pg|branch|wise|202[3-9])\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------------- helpers --- */

async function scoreFor(year: number, rank: number): Promise<string> {
  const t = (await getScoreTables("pg").catch((): Awaited<ReturnType<typeof getScoreTables>> => [])).find((x) => x.year === year);
  const row = t?.rows.find((r) => r.rankMax >= rank);
  return row && t ? ` (score ${row.score}/${t.outOf})` : "";
}

const pick = (list: BranchCut[], b: BranchWord, q: string): BranchCut | null => {
  const hits = list.filter((c) => b.course.test(c.course));
  if (!hits.length) return null;
  const wantDiploma = /\bdiploma\b/i.test(q);
  return hits.find((c) => (wantDiploma ? /diploma/i.test(c.course) : /^(MD|MS|DNB|DrNB)\b/.test(c.course))) ?? hits[0];
};

/** Rounds of `year` with a published result, in order. */
async function liveRounds(year: number, running: number): Promise<RoundSpec[]> {
  const out: RoundSpec[] = [];
  for (const spec of ROUNDS) {
    if (year === running) {
      const st = await getRoundState(year, spec.round).catch(() => null);
      if (st?.status !== "live") continue;
    }
    const r = await getRoundResult(year, spec.round);
    if (r) out.push(spec);
  }
  return out;
}

const CHECKS = [
  "Your category and quota — a state's own counselling closes at its own ranks.",
  "The fee and bond of the seat before you lock it.",
  "Which round to aim for, and whether to hold a seat or upgrade.",
];

/* -------------------------------------------------------------- branch × round --- */

export async function branchRound(q: string): Promise<Draft | null> {
  const b = branchWord(q);
  if (!b) return null;
  const running = await getCounsellingYear();
  const year = yearIn(q) ?? running;
  const asked = roundIn(q);
  const cat = categoryIn(q);
  const fam = familyIn(q);
  const rounds = await liveRounds(year, running);
  if (!rounds.length) return null;
  const spec = asked && rounds.some((r) => r.round === asked.round) ? asked : rounds[rounds.length - 1];
  const result = await getRoundResult(year, spec.round);
  const cut = result ? pick(result.cuts[fam], b, q) : null;
  if (!result || !cut) return null;
  const main: CutCat = cat && cut.last[cat] != null ? cat : "Open";
  const mainRank = cut.last[main];
  if (mainRank == null) return null;
  const name = /^(MD|MS|DNB|DrNB|Diploma)/.test(cut.course) ? cut.course : b.name;
  const notOut = asked && asked.round !== spec.round ? `${asked.label} result of NEET PG ${year} is not out yet; the latest is ${spec.label}. ` : "";
  const others = (["Open", "EWS", "OBC", "SC", "ST"] as CutCat[]).filter((c) => c !== main && cut.last[c] != null).map((c) => `${c === "Open" ? "Open" : c} ${n(cut.last[c])}`);
  const lead =
    `${notOut}NEET PG ${year} ${spec.label}, ${name}, ${FAMILY[fam]}: the last seat in the ${CAT_LABEL[main]} went to AIR ${n(mainRank)}` +
    `${await scoreFor(year, mainRank)}, across ${cut.colleges} colleges.` +
    (others.length ? ` Other categories: ${others.join(" · ")}.` : "");

  const points: string[] = [];
  for (const r of rounds) {
    if (r.round === spec.round) continue;
    const c = pick((await getRoundResult(year, r.round))?.cuts[fam] ?? [], b, q);
    if (c?.last[main] != null) points.push(`${year} ${r.label}: ${CAT_LABEL[main]} AIR ${n(c.last[main])}.`);
  }
  const prev = await getRoundResult(year - 1, spec.round).catch(() => null);
  const pc = prev ? pick(prev.cuts[fam], b, q) : null;
  if (pc?.last[main] != null) points.push(`${year - 1} ${spec.label}, for comparison: ${CAT_LABEL[main]} AIR ${n(pc.last[main])}${await scoreFor(year - 1, pc.last[main]!)}.`);
  if (fam === "aiq") {
    const dm = pick(result.cuts.deemed, b, q);
    if (dm?.last.Open != null) points.push(`Deemed universities' paid seats, ${spec.label}: AIR ${n(dm.last.Open)}.`);
    const dn = pick(result.cuts.dnb, b, q);
    if (dn?.last.Open != null) points.push(`DNB, ${spec.label}, open: AIR ${n(dn.last.Open)}.`);
  }
  return {
    page: asked || year !== running ? roundPath(year, spec.slug) : cut.slug ? `/md-ms-india/branches/${cut.slug}` : roundPath(year, spec.slug),
    kind: `branch:${year}:${spec.order}${cat ? `:${cat}` : ""}${fam !== "aiq" ? `:${fam}` : ""}`,
    lead,
    pointsTitle: points.length ? "Other rounds, MCC's own results:" : undefined,
    points,
    checks: CHECKS,
    source: `MCC's published ${spec.label} allotment result for NEET PG ${year}; scores from NBEMS's result. Each figure is the last rank admitted in that category over three or more colleges — not any one college's cut off.`,
    what: `NEET PG ${year} ${spec.label} result, branch by branch`,
    predictor: true,
  };
}

/* -------------------------------------------------------------- branch × state --- */

export async function branchState(q: string, state: { name: string; slug: string }): Promise<Draft | null> {
  const b = branchWord(q);
  if (!b) return null;
  const combos = await getBranchStateCombos().catch((): Awaited<ReturnType<typeof getBranchStateCombos>> => []);
  const combo = combos.find((c) => c.stateSlug === state.slug && b.course.test(c.course));
  const points: string[] = [];
  let lead = "";
  let year: number | null = null;
  if (combo) {
    const d = await getBranchState(combo.courseSlug, combo.stateSlug).catch(() => null);
    if (d?.round?.aiq.Open != null && d.round.aiqColleges >= 3) {
      year = d.round.year;
      lead = `${SEARCH_NAME[combo.course] ?? combo.course} in ${state.name}, NEET PG ${d.round.year} ${d.round.label}: MCC's All India Quota seats in ${state.name}'s colleges went down to AIR ${n(d.round.aiq.Open)} in the open category (${d.round.aiqColleges} colleges).`;
      const cats = (["EWS", "OBC", "SC", "ST"] as CutCat[]).filter((c) => d.round!.aiq[c] != null).map((c) => `${c} ${n(d.round!.aiq[c])}`);
      if (cats.length) points.push(`Same seats, other categories: ${cats.join(" · ")}.`);
      if (d.round.deemed.Open != null && d.round.deemedColleges >= 3) points.push(`Deemed universities' paid seats in ${state.name}: AIR ${n(d.round.deemed.Open)}.`);
    }
    // Fees stay on the page with their caveats: a figure here could be a whole-course or dollar fee read as a year's.
    for (const x of (d?.quotas ?? []).filter((x) => x.colleges >= 3 && x.widest != null && !x.stateRank).slice(0, 3))
      points.push(`${x.quota} (${d?.year ?? "last year"}, ${x.colleges} colleges): last admitted AIR ${n(x.widest)}.`);
  }
  const sr = await getStateRound(state.slug).catch(() => null);
  const own = sr?.byBranch.find((x) => x.colleges >= 3 && x.last != null && b.course.test(x.course));
  if (own && sr) {
    const line = `${state.name}'s own counselling, ${sr.year} ${sr.round} (${sr.mainQuota ?? "state quota"}, open merit): last admitted AIR ${n(own.last)} over ${own.colleges} colleges.`;
    if (lead) points.unshift(line);
    else {
      lead = `${b.name} in ${state.name}, NEET PG ${sr.year}: ${line}`;
      year = sr.year;
    }
    if (sr.note) points.push(`${state.name}'s board on this round: ${sr.note}`);
  }
  if (!lead) return null;
  return {
    page: combo ? `/md-ms-india/branches/${combo.courseSlug}/${combo.stateSlug}` : `/md-ms-india/states/${state.slug}`,
    kind: `branch-state:${state.slug}`,
    lead,
    points,
    checks: CHECKS,
    source: `MCC's allotment results and ${state.name}'s own counselling results${year ? ` (${year})` : ""}; each figure is the last rank admitted over three or more colleges — not any one college's cut off.`,
    what: `${b.name} in ${state.name} page`,
    predictor: true,
  };
}

/* ------------------------------------------------------- college × branch / round --- */

export async function collegeBranch(q: string, c: { slug: string; label: string }): Promise<Draft | null> {
  const b = branchWord(q);
  const asked = roundIn(q);
  if (!b && !asked) return null;
  const live = await getCollegeLiveBands(c.slug).catch(() => null);
  if (!live?.rows.length) return null;
  const rows = live.rows.filter((r) => (b ? b.course.test(r.course) : true) && /all india|aiq|open seat|central/i.test(r.quota));
  const use = rows.length ? rows : live.rows.filter((r) => (b ? b.course.test(r.course) : true));
  if (!use.length) return null;
  const cat = categoryIn(q);
  const line = (r: (typeof use)[number]) => {
    const extra = cat && cat !== "Open" && r.byCategory[cat as keyof typeof r.byCategory] ? `; ${cat} ${r.byCategory[cat as keyof typeof r.byCategory]}` : "";
    return `${r.course}, ${r.quota}: open category ${r.band}${extra}.`;
  };
  // With no branch named, the branches families ask about most lead.
  const POPULAR = [/radio ?-?diagnosis/i, /general medicine/i, /dermatolog/i, /paediatric|pediatric/i, /obstetric/i, /orthop/i, /general surgery/i, /an(a)?esthes/i];
  const rank = (course: string) => {
    const i = POPULAR.findIndex((re) => re.test(course));
    return i < 0 ? 99 : i;
  };
  if (!b) use.sort((x, y) => rank(x.course) - rank(y.course));
  const first = use[0];
  return {
    page: `/md-ms-india/colleges/${c.slug}`,
    kind: b ? `college-branch:${b.name}` : `college-round:${live.year}`,
    lead:
      `${asked && !live.rounds.includes(asked.round) ? `${asked.label} result of NEET PG ${live.year} is not out yet. ` : ""}` +
      `${c.label}, NEET PG ${live.year} (${live.label} so far): ${first.course}, ${first.quota} — open category ${first.band} (a band of ranks, not the exact rank).`,
    pointsTitle: use.length > 1 ? "Other seats here, same rounds:" : undefined,
    points: use.slice(1, 6).map(line),
    checks: CHECKS,
    source: `MCC's published allotment results for NEET PG ${live.year} (${live.label}). Each figure is a band of ranks, not the rank itself.`,
    what: `${c.label} fees, stipend and cut off page`,
    predictor: true,
  };
}

/* ------------------------------------------------------------- a whole round --- */

/** The clinical branches a whole-round answer lists, most asked first. */
const ROUND_BRANCHES = ["MD Radio Diagnosis", "MD Dermatology", "MD General Medicine", "MD Paediatrics", "MS Obstetrics & Gynaecology", "MS Orthopaedics", "MS General Surgery", "MD Anaesthesiology", "MS ENT", "MS Ophthalmology", "MD Psychiatry", "MD Respiratory Medicine"];

/** "neet pg 2026 round 2 cut off", "round 1 closing rank neet pg": the round's clinical branches side by side. */
export async function roundOverall(q: string): Promise<Draft | null> {
  const asked = roundIn(q);
  if (!asked) return null;
  const running = await getCounsellingYear();
  const year = yearIn(q) ?? running;
  const rounds = await liveRounds(year, running);
  if (!rounds.length) return null;
  const spec = rounds.some((r) => r.round === asked.round) ? asked : rounds[rounds.length - 1];
  const result = await getRoundResult(year, spec.round);
  if (!result) return null;
  const cat = categoryIn(q) ?? "Open";
  const lines: { course: string; rank: number }[] = [];
  for (const name of ROUND_BRANCHES) {
    const w = BRANCH_WORDS.find((x) => x.name === name);
    const c = w ? pick(result.cuts.aiq, w, "") : null;
    if (c?.last[cat] != null) lines.push({ course: c.course, rank: c.last[cat]! });
  }
  if (lines.length < 3) return null;
  const notOut = asked.round !== spec.round ? `${asked.label} result of NEET PG ${year} is not out yet; the latest is ${spec.label}. ` : "";
  return {
    page: roundPath(year, spec.slug),
    kind: `round:${year}:${spec.order}${cat !== "Open" ? `:${cat}` : ""}`,
    lead: `${notOut}NEET PG ${year} ${spec.label}, All India Quota, ${CAT_LABEL[cat]}: ${lines[0].course} closed at AIR ${n(lines[0].rank)}${await scoreFor(year, lines[0].rank)}; the other clinical branches below.`,
    pointsTitle: "Last rank admitted, branch by branch:",
    points: lines.slice(1, 10).map((l) => `${l.course}: AIR ${n(l.rank)}`),
    checks: CHECKS,
    source: `MCC's published ${spec.label} allotment result for NEET PG ${year}. Each figure is the last rank admitted over three or more colleges — not any one college's cut off.`,
    what: `NEET PG ${year} ${spec.label} result, branch by branch`,
    predictor: true,
  };
}
