/**
 * Open data — the summary tables journalists, teachers and coaching institutes
 * can download (CSV), embed (an iframe widget with a source link) and cite.
 * Published at /data, /data/<id>.csv and /embed/<id>.
 *
 * Why: links from other sites are earned by being the thing worth citing.
 * Every dataset here is a summary the public pages already show — category,
 * branch, state or course ranges — never seat rows, so nothing here goes round
 * the gate (CLAUDE.md, "Googlebot reads it, a visitor signs in").
 */
import { getPgAiqBranches, getPgAiqCuts, getStipends, getUgAiqCuts, type YearCuts } from "@/lib/cutoffHubQueries";
import { getPrivatePgFees, getDeemedPg } from "@/lib/pgFeeQueries";
import { getSsCourses } from "@/lib/ssQueries";
import { getMdsOverview } from "@/lib/mdsQueries";

export const SITE = "https://www.admissionhands.com";

export type Cell = string | number | null;

export interface Dataset {
  id: string;
  title: string;
  /** The page on the site the data belongs to — what a citation links to. */
  page: string;
  description: string;
  source: string;
  columns: string[];
  rows: Cell[][];
  /** Rows shown in the embeddable widget before "see all". */
  embedRows: number;
}

const complete = (years: YearCuts[]) => years.find((y) => y.rounds.includes("R3")) ?? years[0];

async function ugCut(course: "MBBS" | "BDS"): Promise<Dataset> {
  const y = complete(await getUgAiqCuts(course));
  return {
    id: `neet-ug-cutoff-${course.toLowerCase()}`,
    title: `NEET UG ${y?.year ?? ""} ${course} cutoff by category (All India Quota)`,
    page: course === "MBBS" ? "/neet-ug-cutoff" : "/bds-india",
    description: `All India Quota ${course} closing ranks by category: the tightest round-1 close and the last rank admitted in any round of ${y?.year}.`,
    source: "MCC, All India Quota UG round results",
    columns: ["Category", "Colleges", "Round 1 close (AIR)", "Last admitted (AIR)"],
    rows: (y?.categories ?? []).map((c) => [c.category, c.colleges, c.bestR1, c.widest]),
    embedRows: 12,
  };
}

const LOADERS: Record<string, () => Promise<Dataset>> = {
  "neet-ug-cutoff-mbbs": () => ugCut("MBBS"),
  "neet-ug-cutoff-bds": () => ugCut("BDS"),
  "neet-pg-cutoff-category": async () => {
    const y = complete(await getPgAiqCuts());
    return {
      id: "neet-pg-cutoff-category",
      title: `NEET PG ${y?.year ?? ""} cutoff by category (All India Quota)`,
      page: "/neet-pg-cutoff",
      description: `All India Quota MD/MS/diploma closing ranks by category, all branches together, every round of ${y?.year}.`,
      source: "MCC, All India Quota PG round results",
      columns: ["Category", "Colleges", "Round 1 close (AIR)", "Last admitted (AIR)"],
      rows: (y?.categories ?? []).map((c) => [c.category, c.colleges, c.bestR1, c.widest]),
      embedRows: 12,
    };
  },
  "neet-pg-cutoff-branch": async () => {
    const y = complete(await getPgAiqCuts());
    const b = y ? await getPgAiqBranches("GEN", y.year) : [];
    return {
      id: "neet-pg-cutoff-branch",
      title: `NEET PG ${y?.year ?? ""} branch-wise cutoff, general category (All India Quota)`,
      page: "/neet-pg-cutoff",
      description: "Every MD, MS and diploma branch: colleges, the tightest round-1 close and the last rank admitted, general category, most competitive first.",
      source: "MCC, All India Quota PG round results",
      columns: ["Branch", "Colleges", "Round 1 close (AIR)", "Last admitted (AIR)"],
      rows: b.map((x) => [x.branch, x.colleges, x.bestR1, x.widest]),
      embedRows: 15,
    };
  },
  "pg-stipend-by-state": async () => {
    const s = await getStipends();
    return {
      id: "pg-stipend-by-state",
      title: "NEET PG stipend by state (first year, per month)",
      page: "/md-ms-india/stipend",
      description: `Median monthly first-year MD/MS stipend in each state, government and private, from ${s.colleges.toLocaleString("en-IN")} colleges' published figures.`,
      source: "Colleges' published PG stipends, compiled by AdmissionHands",
      columns: ["State", "Colleges", "Median (₹/month)", "Govt median (₹/month)", "Private median (₹/month)", "Lowest (₹/month)", "Highest (₹/month)"],
      rows: s.states.map((x) => [x.state, x.colleges, x.median, x.govtMedian, x.privateMedian, x.min, x.max]),
      embedRows: 15,
    };
  },
  "pg-fees-private-by-state": async () => {
    const f = await getPrivatePgFees();
    return {
      id: "pg-fees-private-by-state",
      title: `MD/MS fees in private medical colleges by state and quota (${f.year ?? ""})`,
      page: "/md-ms-india/private-college-fees",
      description: "Yearly MD/MS fees in private colleges by state and quota family: median and the middle 80% (10th–90th percentile) of published fees.",
      source: "Fees published with the PG counselling, compiled by AdmissionHands",
      columns: ["State", "Quota", "Colleges", "Median (₹/year)", "10th percentile (₹/year)", "90th percentile (₹/year)"],
      rows: f.states.flatMap((s) => s.bands.map((b) => [s.state, b.family, b.colleges, b.median, b.p10, b.p90] as Cell[])),
      embedRows: 15,
    };
  },
  "pg-fees-deemed": async () => {
    const d = await getDeemedPg();
    return {
      id: "pg-fees-deemed",
      title: `Deemed university MD/MS fees (${d.year ?? ""})`,
      page: "/md-ms-india/deemed-universities",
      description: "Every deemed university's yearly MD/MS fee for management and NRI seats: median across its branches, and the range by branch.",
      source: "Fees published with MCC's deemed university counselling, compiled by AdmissionHands",
      columns: ["University", "State", "Management median (₹/year)", "Management low (₹/year)", "Management high (₹/year)", "NRI median (₹/year)"],
      rows: d.colleges.map((c) => [c.name, c.state, c.mngMedian, c.mngLow, c.mngHigh, c.nriMedian]),
      embedRows: 15,
    };
  },
  "neet-ss-cutoff": async () => {
    const s = await getSsCourses();
    return {
      id: "neet-ss-cutoff",
      title: `NEET SS ${s.year ?? ""} cutoff by course (DM, MCh, DrNB)`,
      page: "/neet-ss-cutoff",
      description: `Every super-speciality course: seats, the round-1 close and the last rank admitted in ${s.year}, with ${s.prevYear} beside it. Group ranks.`,
      source: "MCC, NEET SS round results",
      columns: ["Course", "Group", "Seats (round 1)", "Round 1 close (group rank)", "Last admitted (group rank)", `${s.prevYear ?? "Previous"} last admitted`],
      rows: s.courses.map((c) => [c.course, c.grp, c.seats, c.r1Close, c.widest, c.prevWidest]),
      embedRows: 15,
    };
  },
  "neet-mds-cutoff": async () => {
    const o = await getMdsOverview();
    return {
      id: "neet-mds-cutoff",
      title: `NEET MDS ${o.year ?? ""} cutoff by speciality`,
      page: "/neet-mds-cutoff",
      description: "Every MDS speciality, open category: All India Quota round-1 close and last rank admitted, and the furthest deemed-university seat.",
      source: "MCC, NEET MDS round results",
      columns: ["Speciality", "AIQ round 1 close (AIR)", "AIQ last admitted (AIR)", "Deemed last admitted (AIR)"],
      rows: o.courses.map((c) => [`MDS ${c.course}`, c.aiqR1, c.aiqLast, c.deemedLast]),
      embedRows: 9,
    };
  },
};

export const DATASET_IDS = Object.keys(LOADERS);

export async function getDataset(id: string): Promise<Dataset | null> {
  const load = LOADERS[id];
  return load ? load() : null;
}

export async function getAllDatasets(): Promise<Dataset[]> {
  return Promise.all(DATASET_IDS.map((id) => LOADERS[id]()));
}

/** RFC 4180: quote a cell that holds a comma, quote or newline; and never let a cell start a formula. */
export function toCsv(d: Dataset): string {
  const cell = (v: Cell) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [d.columns, ...d.rows].map((r) => r.map(cell).join(",")).join("\n") + "\n";
}

/** What a site pastes to embed a dataset: the widget, and a plain source link beside it. */
export function embedCode(d: Dataset): string {
  return [
    `<iframe src="${SITE}/embed/${d.id}" width="100%" height="560" style="border:0;max-width:760px" loading="lazy" title="${d.title} — AdmissionHands"></iframe>`,
    `<p style="font-size:13px">Source: <a href="${SITE}${d.page}">${d.title} — AdmissionHands</a></p>`,
  ].join("\n");
}
