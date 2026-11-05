/**
 * A state counselling's round results → state_round_cuts + state_round_allotments (migration 0047).
 *
 *   npx tsx --env-file=.env.local scripts/import_state_round.ts <up|rajasthan> [--apply] [--show]
 *
 * Kept out of closing_ranks on purpose (owner, 2026-11-04): the predictor must not read a year still in
 * progress. Files come from the PG data session, extracted from each board's own allotment PDF, one
 * closing line per institute × course × allotted category (× seat type / service status) and the
 * allotments behind them. No names, roll numbers or registration ids are in either file.
 *
 * Dry run by default: prints how every college and course was matched and what would be written.
 * --show also prints the colleges left unmatched with their two best candidates. Hand decisions live in
 * scripts/data/state_round_decisions.json ({ "<state>": { "<college as printed>": <institute id> | null } }).
 * --apply replaces that state's year × round in both tables in one transaction.
 */
import { readFileSync, existsSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "../src/db/client";
import { ourCourseFor } from "../src/lib/mccCourses";
import { makeScorer } from "../src/lib/nmcSync";

const ROOT = "D:/Gulshan/PG/Website/extracted-data/official-states";
const DECISIONS = "scripts/data/state_round_decisions.json";
const args = process.argv.slice(2);
const key = args.find((a) => !a.startsWith("--")) ?? "";
const APPLY = args.includes("--apply");
const SHOW = args.includes("--show");

type Row = Record<string, string>;

/** RFC 4180 enough for these files: quoted cells, commas inside quotes, a BOM. */
function readCsv(path: string): Row[] {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const out: string[][] = [];
  let cell = "", row: string[] = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c !== "")) out.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); out.push(row); }
  const [head, ...body] = out;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const int = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return v && Number.isFinite(n) && String(v).trim() !== "" ? Math.round(n) : null;
};

/** What every adapter turns a file's row into. */
interface Cut {
  college: string; instCode: string | null; seatType: string | null; quota: string; course: string;
  categoryPrinted: string; category: string; pwd: boolean; additional: string | null; inService: boolean;
  seats: number | null; openAir: number | null; closeAir: number | null; openSr: number | null; closeSr: number | null;
}
interface Allot {
  college: string; instCode: string | null; seatType: string | null; quota: string; course: string;
  categoryPrinted: string; category: string; ownCategory: string | null; pwd: boolean; additional: string | null;
  inService: boolean; domicile: string | null; stateRank: number | null; air: number | null; score: number | null;
}
interface Source {
  state: string; year: number; round: string; roundPrinted: string; counselling: string; sourceUrl: string | null;
  /** The board's own word on the round's standing (a hold, a court order), with its notice. */
  note?: string; noteUrl?: string;
  cuts: Cut[]; allots: Allot[];
  /** A quota that depends on whether the college is government or private (Rajasthan's management seats). */
  ownershipQuota?: (q: string, government: boolean | null) => string;
}

/* ------------------------------------------------------------------ Uttar Pradesh (DGME) */

function upSource(): Source {
  const dir = `${ROOT}/uttar-pradesh`;
  const cutsRaw = readCsv(`${dir}/up_pg_2026_r1_closing_ranks.csv`);
  const allotRaw = readCsv(`${dir}/up_pg_2026_r1_allotments.csv`);
  const quotaOf = (r: Row) => {
    const q = r["Seat quota (our reading - DGME prints none)"];
    if (/^Govt college - state quota/i.test(q)) return { quota: "Uttar Pradesh Govt Quota", inService: /in-service/i.test(q) };
    if (/^Private college - minority/i.test(q)) return { quota: "Uttar Pradesh Private Seats - Minority Quota", inService: false };
    if (/^Private college - open/i.test(q)) return { quota: "Uttar Pradesh Private Seats - Open Quota", inService: false };
    throw new Error(`UP: unknown seat quota "${q}"`);
  };
  // DGME's codes: UR/BC/SC/ST/EW + OP (open) or PH (disability). BS and SS (2025's rows have them too) stay as printed.
  const PREFIX: Record<string, string> = { UR: "GEN", BC: "OBC", SC: "SC", ST: "ST", EW: "EWS" };
  const catOf = (code: string) => ({ category: PREFIX[code.slice(0, 2)] ?? code, pwd: /PH$/.test(code) });
  const first = cutsRaw[0];
  return {
    state: "Uttar Pradesh",
    year: 2026,
    round: "R1",
    roundPrinted: first["Round (as printed)"],
    counselling: first["Counselling"],
    sourceUrl: null,
    cuts: cutsRaw.map((r) => {
      const { quota, inService } = quotaOf(r);
      const c = catOf(r["Seat category (as printed)"]);
      return {
        college: r["Institute (as printed)"], instCode: r["Inst code"] || null, seatType: r["Seat quota (our reading - DGME prints none)"],
        quota, course: r["Branch (as printed)"], categoryPrinted: r["Seat category (as printed)"], ...c, additional: null, inService,
        seats: int(r["Seats allotted"]), openAir: int(r["Opening AIR"]), closeAir: int(r["Closing AIR"]),
        openSr: int(r["Opening state rank"]), closeSr: int(r["Closing state rank"]),
      };
    }),
    allots: allotRaw.map((r) => {
      const { quota, inService } = quotaOf(r);
      const c = catOf(r["Seat category (as printed)"]);
      return {
        college: r["Institute (as printed)"], instCode: r["Inst code"] || null, seatType: r["Seat quota (our reading - DGME prints none)"],
        quota, course: r["Branch (as printed)"], categoryPrinted: r["Seat category (as printed)"], ...c,
        ownCategory: r["Candidate's own category"] || null, additional: null, inService, domicile: null,
        stateRank: int(r["State rank"]), air: int(r["AIR (NEET rank)"]), score: int(r["NEET marks"]),
      };
    }),
  };
}

/* ------------------------------------------------------------------ Rajasthan (RUHS board) */

function rajasthanSource(): Source {
  const dir = `${ROOT}/rajasthan`;
  const cutsRaw = readCsv(`${dir}/raj_pg_2026_r1_closing_ranks.csv`);
  const allotRaw = readCsv(`${dir}/raj_pg_2026_r1_allotments.csv`);
  const QUOTA: Record<string, string> = {
    Government: "Rajasthan Govt Seats - Govt Quota",
    State: "Rajasthan Private Seats - Govt Quota",
    AI: "Rajasthan Private Seats - All India (Eligibility)",
    Management: "Rajasthan Management Quota", // resolved by ownership below
    "not printed": "Seat type not printed",
  };
  const CAT: Record<string, string> = { General: "GEN", "OBC NCL": "OBC", "MBC NCL": "MBC", SC: "SC", ST: "ST", EWS: "EWS" };
  const quota = (t: string) => {
    const q = QUOTA[t];
    if (!q) throw new Error(`Rajasthan: unknown seat type "${t}"`);
    return q;
  };
  const extra = (r: Row) => ({
    category: CAT[r.allotted_category] ?? r.allotted_category,
    pwd: /pwbd|pwd/i.test(r.additional_category),
    additional: r.additional_category && !/pwbd|pwd/i.test(r.additional_category) ? r.additional_category : null,
    inService: /^in-service$/i.test(r.service_status),
  });
  const first = cutsRaw[0];
  return {
    state: "Rajasthan",
    year: 2026,
    round: "R1",
    roundPrinted: first.round,
    counselling: first.counselling,
    sourceUrl: "https://pg.neetrajasthan.com/notifications/1793607772653.pdf",
    cuts: cutsRaw.map((r) => ({
      college: r.college, instCode: null, seatType: r.seat_type, quota: quota(r.seat_type), course: r.course,
      categoryPrinted: [r.allotted_category, r.additional_category].filter(Boolean).join(" "), ...extra(r),
      seats: int(r.seats_allotted), openAir: null, closeAir: int(r.closing_all_india_rank), openSr: null, closeSr: int(r.closing_state_merit_rank),
    })),
    allots: allotRaw.map((r) => ({
      college: r.college, instCode: null, seatType: r.seat_type, quota: quota(r.seat_type), course: r.course,
      categoryPrinted: [r.allotted_category, r.additional_category].filter(Boolean).join(" "), ...extra(r),
      ownCategory: null, domicile: r.domicile || null, stateRank: int(r.state_merit_rank), air: int(r.all_india_rank), score: null,
    })),
    ownershipQuota: (q, government) =>
      q !== "Rajasthan Management Quota" ? q
        : government === true ? "Rajasthan Govt Seats - Management Quota"
          : government === false ? "Rajasthan Private Seats - Management Quota" : q,
  };
}

/* ------------------------------------------------------------------ West Bengal (WBMCC) */

function westBengalSource(): Source {
  const dir = `${ROOT}/west-bengal`;
  const cutsRaw = readCsv(`${dir}/wb_pg_2026_r1_closing_ranks.csv`);
  const allotRaw = readCsv(`${dir}/wb_pg_2026_r1_allotments.csv`);
  const QUOTA: Record<string, { quota: string; inService: boolean }> = {
    "Open Quota": { quota: "West Bengal Govt Quota", inService: false },
    "In-service Quota": { quota: "West Bengal Govt Quota", inService: true },
    "Private Management Quota": { quota: "West Bengal Management Quota", inService: false },
    "In-service DNB Quota": { quota: "West Bengal DNB Inservice Seats", inService: true },
  };
  const q = (t: string) => {
    const v = QUOTA[t];
    if (!v) throw new Error(`West Bengal: unknown seat type "${t}"`);
    return v;
  };
  const cat = (c: string) => ({
    category: /^UR/.test(c) ? "GEN" : /^OBC/.test(c) ? "OBC" : c.replace(/\s*PwD$/i, ""),
    pwd: /pwd/i.test(c),
    additional: null,
  });
  const first = cutsRaw[0];
  return {
    state: "West Bengal", year: 2026, round: "R1", roundPrinted: first.round, counselling: first.counselling,
    sourceUrl: "https://cdnbbsr.s3waas.gov.in/s3aae8d1e00b15a30e5901227e97ffbef7/uploads/2026/11/202611041797935242.pdf",
    cuts: cutsRaw.map((r) => ({
      college: r.college, instCode: null, seatType: r.seat_type, ...q(r.seat_type), course: r.course,
      categoryPrinted: r.allotted_category, ...cat(r.allotted_category),
      seats: int(r.seats_allotted), openAir: null, closeAir: int(r.closing_all_india_rank), openSr: null, closeSr: null,
    })),
    allots: allotRaw.map((r) => ({
      college: r.college, instCode: null, seatType: r.seat_type, ...q(r.seat_type), course: r.course,
      categoryPrinted: r.allotted_category, ...cat(r.allotted_category), ownCategory: r.candidate_category || null,
      domicile: null, stateRank: null, air: int(r.all_india_rank), score: null,
    })),
  };
}

/* ------------------------------------------------------------------ Chhattisgarh (DME) */

function chhattisgarhSource(): Source {
  const dir = `${ROOT}/chhattisgarh`;
  const cutsRaw = readCsv(`${dir}/cg_pg_2026_r1_closing_ranks.csv`);
  const allotRaw = readCsv(`${dir}/cg_pg_2026_r1_allotments.csv`);
  // "MBBS or Inservice" is how 2025's rows name Chhattisgarh's main state quota; its open seats are "Other State".
  const QUOTA: Record<string, string> = {
    "State Institutional Quota": "Chhattisgarh MBBS or Inservice",
    "State Open Quota": "Chhattisgarh Other State",
  };
  const q = (t: string) => {
    const v = QUOTA[t];
    if (!v) throw new Error(`Chhattisgarh: unknown seat type "${t}"`);
    return v;
  };
  const cat = (r: Row) => ({
    category: r.category === "UR" ? "GEN" : r.category,
    pwd: /pwd|ph\b/i.test(r.sub_category),
    additional: r.sub_category && !/^NC$/i.test(r.sub_category) && !/pwd|ph\b/i.test(r.sub_category) ? r.sub_category : null,
  });
  const first = cutsRaw[0];
  return {
    state: "Chhattisgarh", year: 2026, round: "R1", roundPrinted: first.round, counselling: first.counselling,
    sourceUrl: "https://cdnbbsr.s3waas.gov.in/s34b4edc2630fe75800ddc29a7b4070add/uploads/2026/10/202610311822194150.pdf",
    cuts: cutsRaw.map((r) => ({
      college: r.college, instCode: null, seatType: r.seat_type, quota: q(r.seat_type), course: r.course,
      categoryPrinted: r.allotted_category, ...cat(r), inService: false,
      seats: int(r.seats_allotted), openAir: null, closeAir: int(r.closing_all_india_rank), openSr: null, closeSr: int(r.closing_state_merit_rank),
    })),
    allots: allotRaw.map((r) => ({
      college: r.college, instCode: null, seatType: r.seat_type, quota: q(r.seat_type), course: r.course,
      categoryPrinted: r.allotted_category, ...cat(r), ownCategory: r.candidate_category || null,
      inService: /inservice|in-service/i.test(r.candidature_type), domicile: r.candidature_type || null,
      stateRank: int(r.state_merit_rank), air: int(r.all_india_rank), score: null,
    })),
  };
}

/* ------------------------------------------------------------------ Uttarakhand (HNBUMU board) */

function uttarakhandSource(): Source {
  const dir = `${ROOT}/uttarakhand`;
  const cutsRaw = readCsv(`${dir}/uk_pg_2026_r1_closing_ranks.csv`);
  const allotRaw = readCsv(`${dir}/uk_pg_2026_r1_allotments.csv`);
  // State Quota is "Govt Quota" at a government college and "Private Seats - Govt Quota" at a private one
  // (2025's labels); resolved by the college's ownership once it is matched.
  const q = (r: Row) => {
    const pmhs = /^PMHS/i.test(r.seat_type);
    if (/^State Quota$/i.test(r.allotted_quota)) return { quota: "Uttarakhand State Quota", inService: pmhs };
    if (/^All India quota$/i.test(r.allotted_quota)) return { quota: "Uttarakhand Private Seats - All India / Management", inService: pmhs };
    if (/^NRI Quota$/i.test(r.allotted_quota)) return { quota: "Uttarakhand Private Seats - NRI", inService: pmhs };
    throw new Error(`Uttarakhand: unknown quota "${r.allotted_quota}"`);
  };
  const CAT: Record<string, string> = { UR: "GEN", "OBC(NCL)": "OBC", SC: "SC", ST: "ST", EWS: "EWS" };
  const cat = (r: Row) => {
    const sub = r.allotted_sub_category;
    return {
      category: CAT[r.allotted_category] ?? r.allotted_category,
      pwd: /^DPW$|pwd/i.test(sub),
      additional: sub && !/^OPEN$/i.test(sub) && !/^DPW$|pwd/i.test(sub) ? sub : r.merit_list && /NRI/i.test(r.merit_list) ? "NRI merit list" : null,
    };
  };
  const first = cutsRaw[0];
  return {
    state: "Uttarakhand", year: 2026, round: "R1", roundPrinted: first.round, counselling: first.counselling,
    sourceUrl: "https://meta-secure.com/MDMS2024/UploadDocs/PROVISIONALCOMPLETEBROADSHEETNEETMDMS2026FirstRoundRegular.pdf",
    cuts: cutsRaw.map((r) => ({
      college: r.college, instCode: null, seatType: r.seat_type, ...q(r), course: r.course,
      categoryPrinted: r.allotted_sub_category ? `${r.allotted_category} (${r.allotted_sub_category})` : r.allotted_category, ...cat(r),
      seats: int(r.seats_allotted), openAir: null, closeAir: int(r.closing_all_india_rank), openSr: null, closeSr: int(r.closing_state_merit_rank),
    })),
    allots: allotRaw.map((r) => ({
      college: r.college, instCode: null, seatType: r.seat_type, ...q(r), course: r.course,
      categoryPrinted: r.allotted_category_as_printed || r.allotted_category, ...cat(r), ownCategory: null,
      domicile: r.domicile_uk ? `Uttarakhand domicile: ${r.domicile_uk}` : null,
      stateRank: int(r.state_merit_rank), air: int(r.all_india_rank), score: null,
    })),
    ownershipQuota: (quota, government) =>
      quota !== "Uttarakhand State Quota" ? quota
        : government === true ? "Uttarakhand Govt Quota"
          : government === false ? "Uttarakhand Private Seats - Govt Quota" : quota,
  };
}

/* ------------------------------------------------------------------ Madhya Pradesh (DME MP) */

function madhyaPradeshSource(): Source {
  const dir = `${ROOT}/madhya-pradesh`;
  const cutsRaw = readCsv(`${dir}/mp_pg_2026_r1_closing_ranks.csv`);
  const allotRaw = readCsv(`${dir}/mp_pg_2026_r1_allotments.csv`);
  // MP prints only the codes. INST (MBBS from an MP college) and NON_INST (anyone else) are separate merit
  // pools, so they stay separate quotas; 2025's rows did not split them.
  const q = (r: Row) => {
    const govt = /^govt/i.test(r.seat_type);
    const nri = /^NRI$/i.test(r.sub_category);
    if (/^IN$/i.test(r.quota)) return { quota: "MP Govt Quota (in-service)", inService: true };
    if (nri) return { quota: "MP Private Seats - NRI Quota", inService: false };
    const pool = /^INST$/i.test(r.quota) ? "MBBS from MP" : /^NON_INST$/i.test(r.quota) ? "open to all" : null;
    if (!pool) throw new Error(`Madhya Pradesh: unknown quota "${r.quota}"`);
    return { quota: `${govt ? "MP Govt Quota" : "MP Private Seats - Open Quota"} (${pool})`, inService: false };
  };
  const cat = (r: Row) => ({
    category: r.allotted_category === "UR" ? "GEN" : r.allotted_category,
    pwd: /^PH$/i.test(r.sub_category),
    additional: null,
  });
  const course = (r: Row) => `${r.course} ${r.subject}`.trim();
  const first = cutsRaw[0];
  return {
    state: "Madhya Pradesh", year: 2026, round: "R1", roundPrinted: first.round, counselling: first.counselling,
    sourceUrl: "https://dme.mponline.gov.in/ql_dme/DMECounselling_Public/DMEPG/2026/DISPLAY_ALLOTMENT_RESULT%20LIST_c_57.pdf",
    note: "On 03.11.2026 DME MP put the Round 1 admission process on hold after an interim order of the High Court, Jabalpur (W.P. 44909/2026). These allotments are provisional and may change.",
    noteUrl: "https://dme.mponline.gov.in/ql_dme/DMECounselling_Public/DMEPG/2026/Notice%20today_59.pdf",
    cuts: cutsRaw.map((r) => ({
      college: r.college, instCode: r.institute_code || null, seatType: `${r.seat_type} · ${r.quota}`, ...q(r), course: course(r),
      categoryPrinted: r.allotted_category_class || r.allotted_category, ...cat(r),
      seats: int(r.seats_allotted), openAir: null, closeAir: int(r.closing_all_india_rank), openSr: null, closeSr: int(r.closing_state_merit_rank),
    })),
    allots: allotRaw.map((r) => ({
      college: r.college, instCode: r.institute_code || null, seatType: `${r.seat_type} · ${r.quota}`, ...q(r), course: course(r),
      categoryPrinted: r.allotted_category_class || r.allotted_category, ...cat(r), ownCategory: r.candidate_type || null,
      domicile: r.mbbs_passed_from_mp_state ? `MBBS from MP: ${r.mbbs_passed_from_mp_state}` : null,
      stateRank: int(r.state_merit_rank), air: int(r.all_india_rank), score: null,
    })),
  };
}

/* ------------------------------------------------------------------ Gujarat (ACPPGMEC) */

function gujaratSource(): Source {
  const dir = `${ROOT}/gujarat`;
  const cutsRaw = readCsv(`${dir}/guj_pg_2026_r1_closing_ranks.csv`);
  const allotRaw = readCsv(`${dir}/guj_pg_2026_r1_allotments.csv`);
  // ACPPGMEC's seat-type codes, onto 2025's quota labels (closing_ranks, "Gujarat PG").
  const QUOTA: Record<string, { quota: string; inService: boolean }> = {
    GQ: { quota: "All Gujarat Students Quota", inService: false },
    UQ: { quota: "Gujarat Institutional Preference Quota", inService: false },
    MQ: { quota: "Gujarat Management Quota", inService: false },
    NQ: { quota: "Gujarat NRI Quota", inService: false },
    IQ: { quota: "Gujarat Inservice Quota", inService: true },
  };
  const q = (t: string) => {
    const v = QUOTA[t];
    if (!v) throw new Error(`Gujarat: unknown seat type "${t}"`);
    return v;
  };
  // OP open, SE SEBC, EW EWS; a management seat's category is the management merit list itself (open).
  const CAT: Record<string, string> = { OP: "GEN", SE: "OBC", EW: "EWS", SC: "SC", ST: "ST", MQ: "GEN", NRI: "NRI" };
  const cat = (r: Row) => {
    const base = r.category || r.allotted_category.replace(/PH$/, "");
    return { category: CAT[base] ?? base, pwd: /^PH$/i.test(r.pwd) || /PH$/.test(r.allotted_category), additional: null };
  };
  // Branch alone ("Anaesthesiology"); the one National Board seat is "Radio Diagnosis (DNB)".
  const course = (c: string) => {
    const dnb = c.match(/^(.*?)\s*\(DNB\)$/i);
    return dnb ? `Post MBBS DNB ${dnb[1]}` : c;
  };
  const first = cutsRaw[0];
  return {
    state: "Gujarat", year: 2026, round: "R1", roundPrinted: first.round, counselling: first.counselling, sourceUrl: null,
    cuts: cutsRaw.map((r) => ({
      college: r.college, instCode: r.institute_code || null, seatType: r.seat_type_name, ...q(r.seat_type), course: course(r.course),
      categoryPrinted: r.allotted_category, ...cat(r),
      seats: int(r.seats_allotted), openAir: null, closeAir: int(r.closing_all_india_rank), openSr: null, closeSr: int(r.closing_state_merit_rank),
    })),
    allots: allotRaw.map((r) => ({
      college: r.college, instCode: r.institute_code || null, seatType: r.seat_type_name, ...q(r.seat_type), course: course(r.course),
      categoryPrinted: r.allotted_category, ...cat(r), ownCategory: r.candidate_category || null, domicile: null,
      stateRank: int(r.state_merit_rank), air: int(r.all_india_rank), score: null,
    })),
  };
}

/* ------------------------------------------------------------------ Kerala (CEE) */

function keralaSource(): Source {
  const dir = `${ROOT}/kerala`;
  const cutsRaw = readCsv(`${dir}/kl_pg_2026_r1_closing_ranks.csv`);
  const allotRaw = readCsv(`${dir}/kl_pg_2026_r1_allotments.csv`);
  // CEE prints no seat type: the allotted category code is the quota. SM is state merit; the community codes
  // are reservations inside the same state quota; AC/MM are the minority seats of self-financing colleges;
  // NR/NC/NM are NRI seats (NC/NM have no printed legend and occur only where a college has NRI minority seats).
  const NRI = new Set(["NR", "NC", "NM"]);
  const q = (code: string) =>
    NRI.has(code) ? { quota: "Kerala Self Financing - NRI Seats", inService: false } : { quota: "Kerala State Quota", inService: false };
  const CAT: Record<string, string> = { SM: "GEN", EW: "EWS", SC: "SC", ST: "ST" };
  const cat = (code: string) => ({
    category: NRI.has(code) ? "NRI" : CAT[code] ?? code,
    pwd: false,
    additional: null,
  });
  // "M D Anaesthesia" → "MD Anaesthesia".
  const course = (c: string) => c.replace(/^M\s+D\b/i, "MD").replace(/^M\s+S\b/i, "MS").replace(/\s+/g, " ").trim();
  const first = cutsRaw[0];
  return {
    state: "Kerala", year: 2026, round: "R1", roundPrinted: first.round, counselling: first.counselling, sourceUrl: null,
    cuts: cutsRaw.map((r) => ({
      college: r.college, instCode: r.college_code || null, seatType: r.allotted_category_decoded || r.allotted_category_code,
      ...q(r.allotted_category_code), course: course(r.course),
      categoryPrinted: r.allotted_category_code, ...cat(r.allotted_category_code),
      seats: int(r.seats_allotted), openAir: null, closeAir: int(r.closing_all_india_rank), openSr: null, closeSr: null,
    })),
    allots: allotRaw.map((r) => ({
      college: r.college, instCode: r.college_code || null, seatType: r.allotted_category_decoded || r.allotted_category_code,
      ...q(r.allotted_category_code), course: course(r.course),
      categoryPrinted: r.allotted_category_code, ...cat(r.allotted_category_code), ownCategory: r.candidate_category || null,
      domicile: null, stateRank: int(r.state_merit_rank), air: int(r.all_india_rank), score: null,
    })),
    // State-quota seats are "Govt Quota" at a government college and "Self Financing Seats" at a private one
    // (2025's labels), resolved once the college is matched.
    ownershipQuota: (quota, government) =>
      quota !== "Kerala State Quota" ? quota
        : government === true ? "Kerala Govt Quota"
          : government === false ? "Kerala Self Financing Seats" : quota,
  };
}

/* ------------------------------------------------------------------ Goa (DTE) */

function goaSource(): Source {
  const dir = `${ROOT}/goa`;
  const cutsRaw = readCsv(`${dir}/goa_pg_2026_r1_closing_ranks.csv`);
  const allotRaw = readCsv(`${dir}/goa_pg_2026_r1_allotments.csv`);
  // DTE does not print the category of the seat allotted, only the candidate's own: never presented as a seat's
  // category, so these lines carry "Not printed" and stay out of every category figure.
  const course = (c: string) =>
    c.replace(/^RADIOLOGY \(RADIO DIAGNOSIS\)$/i, "Radio Diagnosis")
      .replace(/^PSM \(COMMUNITY MEDICINE\)$/i, "Community Medicine")
      .replace(/^TB \(RESPIRATORY MEDICINE\)$/i, "Respiratory Medicine")
      .replace(/^OTORHINOLARYNGOLOGY \(ENT\)$/i, "ENT")
      .replace(/^TRANSFUSION MEDICINE \(IHBT\)$/i, "Immuno Haematology and Blood Transfusion")
      .replace(/^DERMATOLOGY$/i, "Dermatology Venereology and Leprosy");
  const first = cutsRaw[0];
  return {
    state: "Goa", year: 2026, round: "R1", roundPrinted: first.round, counselling: first.counselling, sourceUrl: null,
    cuts: cutsRaw.map((r) => ({
      college: r.college, instCode: null, seatType: `${r.seat_type} · ${r.group}`, quota: "Goa Govt Quota", inService: false,
      course: course(r.course), categoryPrinted: `${r.group}${r.category_2 ? ` · candidate ${r.category_2}` : ""}`,
      category: "Not printed", pwd: false, additional: null,
      seats: int(r.seats_allotted), openAir: null, closeAir: int(r.closing_all_india_rank), openSr: null, closeSr: int(r.closing_state_merit_rank),
    })),
    allots: allotRaw.map((r) => ({
      college: r.college, instCode: null, seatType: `${r.seat_type} · ${r.group}`, quota: "Goa Govt Quota", inService: false,
      course: course(r.course), categoryPrinted: r.group, category: "Not printed", ownCategory: r.category_2 || r.category_1 || null,
      pwd: false, additional: null, domicile: null,
      stateRank: int(r.state_merit_rank), air: int(r.all_india_rank), score: null,
    })),
  };
}

/* ------------------------------------------------------------------ Punjab (BFUHS) */

function punjabSource(): Source {
  const dir = `${ROOT}/punjab`;
  // BFUHS prints state merit numbers only; pg-a7 filled the AIR from BFUHS's own merit lists (22 and 23 Oct
  // 2026; the NRI list for NRI lines), so closing_all_india_rank is the AIR of the last admitted in merit order.
  // Six-month Ultrasonography training is not a PG seat and stays out.
  const keep = (r: Row) => r.course_type !== "Ultrasonography";
  const cutsRaw = readCsv(`${dir}/pb_pg_2026_r1_closing_ranks.csv`).filter(keep);
  const allotRaw = readCsv(`${dir}/pb_pg_2026_r1_allotments.csv`).filter(keep);
  const SEAT: Record<string, string> = {
    "Government Quota": "Punjab Govt Quota",
    "Management Quota": "Punjab Management Quota",
    "General Quota as per Punjab Govt. Notification": "Punjab Private Seats - Govt Notification Quota",
    "Open Merit (All India Basis)": "Punjab Open Quota (All India Basis)",
    "General Merit (50%)": "Punjab Private Seats - General Merit (50%)",
    "State Quota (50%)": "Punjab Private Seats - State Quota (50%)",
    "Sikh Minority Seats": "Punjab Sikh Minority Quota",
    A: "Punjab CMC Ludhiana - Group A",
    B: "Punjab CMC Minority Quota (Category B)",
    C: "Punjab CMC Ludhiana - NRI (Group C)",
  };
  // At Punjab's government colleges the general seats are Institutional Preference seats (MBBS from a Punjab
  // university); 2025 filed them as their own quota, and so does this. Post-MBBS DNB and diploma seats went to
  // PCMS (in-service) doctors — 47 of 51 allotments — as 2025's "DNB Inservice Seats" did.
  const q = (r: Row) => {
    const base = SEAT[r.seat_type];
    if (!base) throw new Error(`Punjab: unknown seat type "${r.seat_type}"`);
    if (/^Post_MBBS_(DNB|Diploma)$/.test(r.course_type)) return { quota: "Punjab DNB Inservice Seats", inService: true };
    const ip = /^IP$|\(IP\)/.test(r.allotted_category);
    return { quota: ip ? `${base} - Institutional Preference` : base, inService: false };
  };
  const CAT: Record<string, string> = {
    IP: "GEN", "General Category": "GEN", "EWS (IP)": "EWS", "Scheduled Caste": "SC", "Backward Classes": "OBC",
    Christian: "Christian minority", NRI: "NRI", "Persons with Disability": "GEN",
  };
  const cat = (r: Row) => {
    const c = CAT[r.allotted_category];
    if (!c) throw new Error(`Punjab: unknown category "${r.allotted_category}"`);
    return { category: c, pwd: r.allotted_category === "Persons with Disability", additional: null };
  };
  // BFUHS's "Opthalmology"; NIS Patiala's university diploma, which must not read as MD Sports Medicine.
  const name = (r: Row) =>
    r.course_name.replace(/\bOpthalmology\b/i, "Ophthalmology").replace(/^Post Graduation Diploma in\s+/i, "Diploma in ");
  const course = (r: Row) =>
    r.course_type === "Post_MBBS_DNB" ? `Post MBBS DNB ${name(r)}`
      : r.course_type === "Post_MBBS_Diploma" ? `Post MBBS PG Dip ${name(r)}`
        : name(r);
  const first = cutsRaw[0];
  return {
    state: "Punjab", year: 2026, round: "R1", roundPrinted: first.round, counselling: first.counselling, sourceUrl: null,
    cuts: cutsRaw.map((r) => ({
      college: r.college, instCode: null, seatType: r.seat_type_decoded || r.seat_type, ...q(r), course: course(r),
      categoryPrinted: r.allotted_category, ...cat(r),
      seats: int(r.seats_allotted), openAir: null, closeAir: int(r.closing_all_india_rank), openSr: null, closeSr: int(r.closing_state_merit_rank),
    })),
    allots: allotRaw.map((r) => ({
      college: r.college, instCode: null, seatType: r.seat_type_decoded || r.seat_type, ...q(r), course: course(r),
      categoryPrinted: r.allotted_category, ...cat(r), ownCategory: r.candidate_category || null,
      domicile: r.mbbs_university ? `MBBS: ${r.mbbs_university}` : null,
      stateRank: int(r.state_merit_rank), air: int(r.all_india_rank), score: null,
    })),
  };
}

/* ------------------------------------------------------------------ Odisha (DMET) */

function odishaSource(): Source {
  const dir = `${ROOT}/odisha`;
  const cutsRaw = readCsv(`${dir}/od_pg_2026_r1_closing_ranks.csv`);
  const allotRaw = readCsv(`${dir}/od_pg_2026_r1_allotments.csv`);
  // DMET prints state merit numbers (CMR-UR) only; pg-a7 filled the AIR from DMET's Final Common Merit List
  // (30-10-2026). The in-service list has its own numbering and its seats stay out of the figures anyway.
  // "-MGT" after a college's short name marks its management seats.
  const q = (r: Row) => {
    const inService = /^INSERVICE$/i.test(r.seat_type);
    if (/^DNB$/i.test(r.course)) return { quota: "Odisha DNB Inservice Seats - Inservice", inService: true };
    const mgt = /-MGT$/i.test(r.college);
    return { quota: `Odisha ${mgt ? "Management Quota" : "Govt Quota"} - ${inService ? "Inservice" : "Direct"}`, inService };
  };
  const CAT: Record<string, string> = { UR: "GEN", SEBC: "OBC", SC: "SC", ST: "ST", EWS: "EWS" };
  const cat = (r: Row) => ({
    category: CAT[r.category] ?? r.category,
    pwd: /^PWD$/i.test(r.sub_category),
    additional: r.sub_category && !/^PWD$/i.test(r.sub_category) ? r.sub_category : null,
  });
  const SUBJECT: Record<string, string> = {
    "GEN SURGERY": "General Surgery", "GEN MEDICINE": "General Medicine", ANESTHESIOLOGY: "Anaesthesia",
    PEDIATRICS: "Paediatrics", "OBST & GYN": "Obstetrics and Gynaecology", "COMM MEDICINE": "Community Medicine",
    "RESP MEDICINE": "Respiratory Medicine", RADIODIAGNOSIS: "Radio Diagnosis", "SKIN VD (DVL)": "Dermatology Venereology and Leprosy",
    FMT: "Forensic Medicine", "TRANSF MEDICINE": "Immuno Haematology and Blood Transfusion", RADIOTHERAPY: "Radiation Oncology",
  };
  const course = (r: Row) => {
    const s = SUBJECT[r.subject.trim()] ?? r.subject.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    return /^DNB$/i.test(r.course) ? `Post MBBS DNB ${s}` : s;
  };
  // The college's short name without the management marker; the matcher and the hand decisions read this.
  const college = (r: Row) => r.college.replace(/-MGT$/i, "").replace(/-/g, " ").replace(/\s+/g, " ").trim();
  const first = cutsRaw[0];
  return {
    state: "Odisha", year: 2026, round: "R1", roundPrinted: first.round, counselling: first.counselling, sourceUrl: null,
    cuts: cutsRaw.map((r) => ({
      college: college(r), instCode: null, seatType: `${r.seat_type}${/-MGT$/i.test(r.college) ? " · management" : ""}`, ...q(r), course: course(r),
      categoryPrinted: r.allotted_category, ...cat(r),
      seats: int(r.seats_allotted), openAir: null, closeAir: int(r.closing_all_india_rank), openSr: null, closeSr: int(r.closing_state_merit_rank),
    })),
    allots: allotRaw.map((r) => ({
      college: college(r), instCode: null, seatType: `${r.seat_type}${/-MGT$/i.test(r.college) ? " · management" : ""}`, ...q(r), course: course(r),
      categoryPrinted: r.allotted_category, ...cat(r), ownCategory: null, domicile: null,
      stateRank: int(r.state_merit_rank), air: int(r.all_india_rank), score: null,
    })),
  };
}

/* ------------------------------------------------------------------ Tamil Nadu (Selection Committee, DME) */

function tamilNaduSource(): Source {
  const dir = `${ROOT}/tamil-nadu`;
  const cutsRaw = readCsv(`${dir}/tn_pg_2026_r1_closing_ranks.csv`);
  const allotRaw = readCsv(`${dir}/tn_pg_2026_r1_allotments.csv`);
  // Each seat type onto 2025's quota label and category (closing_ranks, "TN Govt PG" / "TN Mgmt PG").
  const SEAT: Record<string, { quota: string; category: string; inService?: boolean }> = {
    "Management Quota": { quota: "TN Mgmt Quota", category: "GEN" },
    NRI: { quota: "TN NRI Quota", category: "NRI" },
    "Telugu Minority": { quota: "TN Mgmt-Telugu Min", category: "Telugu Minority" },
    "Malayalam Minority": { quota: "TN Mgmt-Malayalam Min", category: "Malayalam Minority" },
    "Christian Minority": { quota: "TN Mgmt-Christian Min", category: "Christian Minority" },
    "Minority Network": { quota: "TN CMC-Minority Network", category: "CMC-Minority Network" },
    "CMC Service": { quota: "TN CMC-Service", category: "CMC-Service", inService: true },
    "CMC General": { quota: "TN CMC-General Merit", category: "CMC-General Merit" },
    "Inst. Preference": { quota: "TN CMC-Inst Preference", category: "CMC-Institutional Preference" },
    "Government Quota - CMC 20%": { quota: "TN-CMC Minority 20", category: "CMC 20% Minority" },
  };
  // Government Quota seats carry the seat's own pool and category, worked out by pg-a7 from TN's vacancy matrix
  // (seat_pool Open | Service, seat_category OC | BC | BCM | MBC&DNC | SC | SCA | ST). TN prints only the candidate's
  // community, which is never a seat's category: a row whose pool or category is unresolved is "Not printed" and stays
  // out of every figure. PwD seats (list "GQ PwD", 31-10) are their own quota.
  // Open seats are stored as the read side's codes (OC, Open Competition, is the unreserved seat: GEN — as Kerala's SM
  // and Odisha's UR are; MBC&DNC is MBC); service seats as 2025's codes (OC Serv, SC-In-Service…), in-service and so
  // out of the figures. TN's own words stay in categoryPrinted.
  const GQ_CAT: Record<string, [string, string]> = {
    OC: ["GEN", "OC Serv"], BC: ["BC", "BC Serv"], BCM: ["BCM", "BCM Serv"],
    "MBC&DNC": ["MBC", "MBC Serv"], SCA: ["SCA", "SCA Serv"], SC: ["SC", "SC-In-Service"], ST: ["ST", "ST-In-Service"],
  };
  const gqCategory = (r: Row) => {
    const pair = GQ_CAT[r.seat_category?.trim() ?? ""];
    const pool = r.seat_pool?.trim();
    if (!pair || (pool !== "Open" && pool !== "Service")) return { category: "Not printed", inService: false };
    return { category: pool === "Open" ? pair[0] : pair[1], inService: pool === "Service" };
  };
  const printed = (r: Row) =>
    r.seat_category ? `${r.seat_pool ? `${r.seat_pool} · ` : ""}${r.seat_category}` : r.seat_pool || r.seat_type;
  const seat = (r: Row) => {
    const s = SEAT[r.seat_type];
    if (s) return { quota: s.quota, inService: Boolean(s.inService), category: s.category, pwd: false };
    if (r.seat_type === "Government Quota") return { quota: "TN Govt Quota", ...gqCategory(r), pwd: false };
    if (r.seat_type === "Government Quota - PwD") return { quota: "TN Govt-PwD", ...gqCategory(r), pwd: true };
    throw new Error(`Tamil Nadu: unknown seat type "${r.seat_type}"`);
  };
  // TN's short forms for diplomas and two MD subjects, written out as our course names spell them.
  const SHORT: Record<string, string> = {
    "D.A.": "Diploma in Anaesthesia", "D.C.H.": "Diploma in Child Health", "D.C.P.": "Diploma in Clinical Pathology",
    "D.D.V.L.": "Diploma in Dermatology, Venereology and Leprosy", "D.G.O": "Diploma in Obstetrics and Gynaecology",
    "D.O.": "Diploma in Ophthalmology", "D.ORTHO": "Diploma in Orthopaedics", "Dip. in Diabetology": "Diploma in Diabetology",
    "M. D. (P.M.R)": "MD Physical Medicine and Rehabilitation", "M.D. D.V.L": "MD Dermatology Venereology and Leprosy",
  };
  const course = (c: string) => SHORT[c.trim()] ?? c;
  const first = cutsRaw[0];
  return {
    state: "Tamil Nadu", year: 2026, round: "R1", roundPrinted: "Round 1", counselling: first.counselling, sourceUrl: null,
    cuts: cutsRaw.map((r) => {
      const s = seat(r);
      return {
        college: r.college, instCode: null, seatType: r.seat_pool ? `${r.seat_type} · ${r.seat_pool}` : r.seat_type,
        quota: s.quota, inService: s.inService, course: course(r.course),
        categoryPrinted: printed(r), category: s.category, pwd: s.pwd, additional: null,
        seats: int(r.seats_allotted), openAir: null, closeAir: int(r.closing_all_india_rank), openSr: null,
        closeSr: int(r.closing_state_merit_rank),
      };
    }),
    allots: allotRaw.map((r) => {
      const s = seat(r);
      return {
        college: r.college, instCode: null, seatType: r.seat_pool ? `${r.seat_type} · ${r.seat_pool}` : r.seat_type,
        quota: s.quota, inService: s.inService, course: course(r.course),
        categoryPrinted: printed(r), category: s.category, ownCategory: r.candidate_community || null,
        pwd: s.pwd, additional: null, domicile: null,
        stateRank: int(r.state_merit_rank), air: int(r.all_india_rank), score: null,
      };
    }),
  };
}

/* ------------------------------------------------------------------ Jammu & Kashmir (JKBOPEE) */

function jammuKashmirSource(): Source {
  const dir = `${ROOT}/jammu-kashmir`;
  // Closing lines only: BOPEE's provisional selection list was read to the line, with no allotments file. The
  // closing AIR is the AIR of the last selected in UT merit order (pg-a7).
  const cutsRaw = readCsv(`${dir}/jk_pg_2026_r1_closing_ranks.csv`);
  // OM open merit; MQ the management merit list (open); J&K's own reservations (RBA, ALC/IB, ST-I, ST-II, STK, STL,
  // HM) stay as printed — they are separate pools, not the national ones; SP is the sports seat.
  const CAT: Record<string, string> = { OM: "GEN", MQ: "GEN", OBC: "OBC", SC: "SC", EWS: "EWS", NRI: "NRI" };
  const cat = (r: Row) => ({
    category: CAT[r.allotted_category] ?? r.allotted_category,
    pwd: false,
    // Children of defence personnel, J&K police martyrs, sportspersons: their own merit lists.
    additional: r.sub_categories || null,
  });
  const first = cutsRaw[0];
  return {
    state: "Jammu and Kashmir", year: 2026, round: "R1", roundPrinted: first.round, counselling: first.counselling, sourceUrl: null,
    cuts: cutsRaw.map((r) => ({
      college: r.college_full_name || r.college, instCode: r.college || null, seatType: r.jk_categories || r.seat_type,
      quota: r.seat_type, inService: false, course: r.course,
      categoryPrinted: r.allotted_category, ...cat(r),
      seats: int(r.seats_allotted), openAir: null, closeAir: int(r.closing_all_india_rank), openSr: null, closeSr: int(r.closing_state_merit_rank),
    })),
    allots: [],
  };
}

const SOURCES: Record<string, () => Source> = {
  "jammu-kashmir": jammuKashmirSource,
  "tamil-nadu": tamilNaduSource,
  punjab: punjabSource,
  odisha: odishaSource,
  up: upSource,
  "madhya-pradesh": madhyaPradeshSource,
  rajasthan: rajasthanSource,
  "west-bengal": westBengalSource,
  chhattisgarh: chhattisgarhSource,
  uttarakhand: uttarakhandSource,
  gujarat: gujaratSource,
  kerala: keralaSource,
  goa: goaSource,
};

/* ------------------------------------------------------------------ matching */

/** UP's diploma abbreviations, Rajasthan's "Post MBBS …" and two spellings ourCourseFor does not know. */
const UP_DIP: Record<string, string> = {
  "D ORTH": "Diploma in Orthopaedics", DA: "Diploma in Anaesthesia", DCH: "Diploma in Child Health",
  DGO: "Diploma in Obstetrics and Gynaecology", DLO: "Diploma in Otorhinolaryngology",
  DMRD: "Diploma in Medical Radio Diagnosis", DVD: "Diploma in Dermatology Venereology and Leprosy",
};
/** Uttarakhand prints the subject alone ("General Medicine"); these subjects are MS by our naming. */
const MS_SUBJECT = /surgery|orthop|ophthal|^e\.?n\.?t\b|otorhino|obst|gyna/i;
function courseLabel(printed: string): string {
  const l = printed.trim();
  if (UP_DIP[l]) return UP_DIP[l];
  // Uttarakhand: "General Surgery (Post MBBS DNB Seats)", "Diploma in ENT (Post MBBS DIPLOMA Seats)".
  const ukDnb = l.match(/^(.*?)\s*\(Post MBBS DNB Seats\)$/i);
  if (ukDnb) return `NBEMS ${ukDnb[1]}`;
  const ukDip = l.match(/^(.*?)\s*\(Post MBBS DIPLOMA Seats\)$/i);
  if (ukDip) return /^diploma/i.test(ukDip[1]) ? ukDip[1].replace(/\(NAEMS\)|\bDA\b/gi, "").trim() : `Diploma in ${ukDip[1].replace(/\(NAEMS\)|\bDA\b/gi, "").trim()}`;
  const fixed = l
    .replace(/^Post MBBS DNB\s*/i, "NBEMS ")
    .replace(/^Post MBBS PG Dip\s*/i, "Diploma in ")
    .replace(/^Post MBBS Diploma\s*/i, "Diploma ")
    .replace(/TRANSFUISION/i, "TRANSFUSION")
    .replace(/\bOBGY\b/i, "Obstetrics and Gynaecology")
    .replace(/\bAnesthesiology\b/i, "Anaesthesia")
    .replace(/Obs\s*&\s*Gyne|Obst\.?\s*&\s*Gyane/i, "Obstetrics and Gynaecology");
  // No programme printed at all: add the one our naming uses for the subject.
  if (!/^(M\.?\s?D|M\.?\s?S|MD|MS|NBEMS|\(NBEMS\)|DNB|Diploma|D\s|M\.?\s?Ch|PG\s?Dip)/i.test(fixed) && !UP_DIP[l]) {
    return `${MS_SUBJECT.test(fixed) ? "MS" : "MD"} ${fixed}`;
  }
  return fixed;
}

/** The college's name without UP's "(031) … [Govt.] Co-Education" and with the boards' short forms written out. */
function collegeName(printed: string): string {
  return printed
    .replace(/^\(\d+\)\s*/, "")
    .replace(/\s*\[[^\]]*\].*$/, "")
    // "K.D. Medical College", "F.H.", "G.S." → "KD": the name tokenizer drops single letters.
    .replace(/\b((?:[A-Z]\.\s*){2,})/g, (m) => `${m.replace(/[.\s]/g, "")} `)
    .replace(/\bCOLLGE\b/gi, "College")
    .replace(/\bMEICAL\b/gi, "Medical")
    .replace(/\bLKO\b/g, "Lucknow")
    .replace(/\bBARILLY\b/gi, "Bareilly")
    .replace(/\bSHAHAJANPUR\b/gi, "Shahjahanpur")
    .replace(/\bMUZAFFAR NAGAR\b/gi, "Muzaffarnagar")
    .replace(/\bSUBHARATI\b/gi, "Subharti")
    .replace(/\bVARUNARJUN\b/gi, "Varun Arjun")
    .replace(/\bGMC\b/g, "Government Medical College")
    .replace(/\bGH\b/g, "General Hospital")
    .replace(/\bDH\b/g, "District Hospital")
    .replace(/\bSDH\b/g, "Sub District Hospital")
    .replace(/\bGovt\.?(?=\s|$)/gi, "Government")
    .replace(/\bHosp\.?(?=\s|$)/gi, "Hospital")
    .replace(/\bAssoc\.?(?=\s|$)/gi, "Associated")
    .replace(/\bDist\.?(?=\s|$)/gi, "District")
    .replace(/\bMed\.?(?=\s|$)/gi, "Medical")
    .replace(/\bColl\.?(?=\s|$)/gi, "College")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The same name with the words before "Medical College" / "Institute" as initials: the board writes
 * "Baba Raghav Das Medical College", our list "BRD Medical College" (also LLRM, SN, GSVM).
 */
function initialsVariant(name: string): string | null {
  const m = name.match(/^(.*?)\s+(Memorial\s+)?(Medical College|Institute|Medical Sciences)\b(.*)$/i);
  if (!m) return null;
  // Only proper names become initials: "Raiganj Government" must not turn into "RG" (RG Kar, Kolkata).
  const words = `${m[1]}${m[2] ? ` ${m[2]}` : ""}`
    .trim()
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(government|govt\.?|state|autonomous|late|shri|smt\.?|sri|dr\.?|pt\.?|the|of|and|district|general|regional)$/i.test(w));
  if (words.length < 2) return null;
  return `${words.map((w) => w[0].toUpperCase()).join("")} ${m[3]}${m[4]}`;
}

/** Our PG list holds a DNB-only hospital as a second entry whose name ends in its PIN code. */
const pinEntry = (name: string) => /\b\d{6}\b/.test(name);

/** A National Board seat (DNB, or a post-MBBS NBEMS diploma), however the board prints it. */
const isDnbCourse = (name: string | null, printed: string) => /^DNB/i.test(name ?? "") || /Post MBBS|NBEMS/i.test(printed);

/** Our name without the DNB twin's ", West Bengal-700073" tail and joint-programme note: twins share it. */
const baseName = (name: string) =>
  name.replace(/\s*\(Joint Programme[^)]*\)/gi, "").replace(/,\s*[^,]*-\s*\d{6}\b.*$/, "").replace(/\s+/g, " ").trim();

async function main() {
  const load = SOURCES[key];
  if (!load) throw new Error(`Usage: import_state_round.ts <${Object.keys(SOURCES).join("|")}> [--apply] [--show]`);
  const src = load();

  const st = (await db.execute(sql`SELECT id FROM states WHERE name = ${src.state}`)) as unknown as { id: number }[];
  if (!st[0]) throw new Error(`No state ${src.state}`);
  const stateId = Number(st[0].id);

  // Courses: our 101 PG names.
  const courses = (await db.execute(sql`SELECT id, name FROM courses WHERE level = 'pg'`)) as unknown as { id: number; name: string }[];
  const courseId = new Map(courses.map((c) => [c.name, Number(c.id)]));
  const courseOf = new Map<string, { id: number | null; name: string | null }>();
  for (const printed of new Set([...src.cuts, ...src.allots].map((r) => r.course))) {
    const name = ourCourseFor(courseLabel(printed));
    courseOf.set(printed, { id: name ? courseId.get(name) ?? null : null, name });
  }

  // Colleges: the state's PG institutes, MD/MS-holding and DNB-holding apart (our lists carry one hospital twice).
  const inst = (await db.execute(sql`
    SELECT i.id, i.name, i.ownership::text AS ownership,
           bool_or(co.name !~* '^(DNB|DrNB|FNB|Diploma|PG Diploma)') AS mdms,
           bool_or(co.name ~* '^(DNB|DrNB|FNB)' OR co.name ~* 'NBEMS') AS dnb
      FROM institutes i
      LEFT JOIN seat_options so ON so.institute_id = i.id
      LEFT JOIN courses co ON co.id = so.course_id
     WHERE i.level = 'pg' AND i.is_active = true AND i.state_id = ${stateId}
     GROUP BY i.id, i.name, i.ownership`)) as unknown as { id: number; name: string; ownership: string; mdms: boolean; dnb: boolean }[];
  const decisions: Record<string, Record<string, number | null>> = existsSync(DECISIONS) ? JSON.parse(readFileSync(DECISIONS, "utf8")) : {};
  const hand = decisions[key] ?? {};
  const printedColleges = [...new Set([...src.cuts, ...src.allots].map((r) => r.college))];
  const score = makeScorer([...inst.map((i) => i.name), ...printedColleges.map(collegeName)]);

  type Pick = { id: number | null; name: string | null; score: number; how: string; second?: string };
  const pickFor = new Map<string, Pick>();
  const pick = (printed: string, dnbRow: boolean): Pick => {
    const k = `${printed}|${dnbRow ? "dnb" : "mdms"}`;
    const known = pickFor.get(k);
    if (known) return known;
    let out: Pick;
    // A decision can name the seat kind ("<college>|dnb") when the college's two entries take different seats.
    const handKey = `${printed}|${dnbRow ? "dnb" : "mdms"}` in hand ? `${printed}|${dnbRow ? "dnb" : "mdms"}` : printed in hand ? printed : null;
    if (handKey) {
      const id = hand[handKey];
      out = { id, name: inst.find((i) => i.id === id)?.name ?? null, score: 1, how: "hand" };
    } else {
      const want = collegeName(printed);
      const variants = [want, initialsVariant(want)].filter((v): v is string => !!v);
      // Within one pool, the best candidate must clear 0.6 and beat the next by 0.12.
      const best = (pool: typeof inst) => {
        const ranked = pool
          .map((i) => ({ i, s: Math.max(...variants.map((v) => score(v, baseName(i.name)))) }))
          .sort((x, y) => y.s - x.s);
        const [a, b] = ranked;
        return { a, b, ok: !!a && a.s >= 0.6 && (!b || a.s - b.s >= 0.12) };
      };
      // A district / civil / general hospital is never a medical college, institute or research centre:
      // with the generic words dropped, "DH Bhopal" and "Bhopal Memorial Hospital and Research Centre"
      // both read "Bhopal", and "DH Satna" read like "Government Medical College, Satna".
      const hospitalOnly = /district hospital|\bDH\b|civil hospital|sadar|\bGH\b|general hospital/i.test(printed) && !/medical college|institute|\bGMC\b/i.test(printed);
      const eligible = hospitalOnly ? inst.filter((i) => !/medical college|institute|research cent/i.test(i.name)) : inst;
      // A medical college's MD/MS seats: its MD/MS entry, never a PIN-code DNB entry (a "District Women
      // Hospital, Saharanpur" must not win against the college in Saharanpur).
      const mdmsPool = eligible.filter((i) => !pinEntry(i.name));
      const m = best(mdmsPool.length ? mdmsPool : eligible);
      // A DNB / NBEMS-diploma seat: the hospital's PIN-code entry when one wins clearly, else the college's own.
      const d = dnbRow ? best(eligible.filter((i) => pinEntry(i.name) || (i.dnb && !i.mdms))) : null;
      const won = d?.ok ? d : m.ok ? m : null;
      const shown = d ?? m;
      out = won
        ? { id: Number(won.a.i.id), name: won.a.i.name, score: won.a.s, how: "auto", second: won.b ? `${won.b.i.name} (${won.b.s.toFixed(2)})` : undefined }
        : { id: null, name: null, score: shown.a?.s ?? 0, how: "none", second: [shown.a, shown.b, m.a].filter(Boolean).map((x) => `${x!.i.name} (${x!.s.toFixed(2)})`).join(" | ") };
    }
    pickFor.set(k, out);
    return out;
  };
  const ownership = (id: number | null) => {
    const o = inst.find((i) => i.id === id)?.ownership;
    return o == null ? null : o === "government";
  };

  const resolve = <T extends Cut | Allot>(r: T) => {
    const c = courseOf.get(r.course)!;
    const p = pick(r.college, isDnbCourse(c.name, r.course));
    const quota = src.ownershipQuota ? src.ownershipQuota(r.quota, ownership(p.id)) : r.quota;
    return { r, courseId: c.id, instituteId: p.id, quota };
  };
  const cuts = src.cuts.map(resolve);
  const allots = src.allots.map(resolve);

  // ---- report
  console.log(`${src.state} — ${src.counselling} · ${src.roundPrinted}`);
  console.log(`closing lines ${cuts.length}, allotments ${allots.length}`);
  const picks = [...pickFor.entries()];
  const matched = picks.filter(([, p]) => p.id != null);
  console.log(`colleges: ${printedColleges.length} as printed → ${matched.length} of ${picks.length} (college × kind) matched (${picks.filter(([, p]) => p.how === "hand").length} by hand)`);
  for (const [k, p] of picks.sort()) {
    if (p.id != null && !SHOW) continue;
    console.log(`  ${p.id == null ? "✗" : p.how === "hand" ? "✋" : "✓"} ${k.replace(/\|(dnb|mdms)$/, " [$1]")}\n      → ${p.name ?? "—"} ${p.how === "auto" ? `(${p.score.toFixed(2)}; next ${p.second ?? "none"})` : p.how === "none" ? `(best ${p.second || "none"})` : ""}`);
  }
  const unmapped = [...courseOf.entries()].filter(([, c]) => c.id == null).map(([p]) => p);
  console.log(`courses: ${courseOf.size} as printed, unmapped kept as printed: ${unmapped.join("; ") || "none"}`);
  if (SHOW) for (const [p, c] of [...courseOf.entries()].sort()) console.log(`  course: ${p}  →  ${c.name ?? "—"}`);
  const by = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((a, x) => ((a[x] = (a[x] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  console.log("quotas:", by(cuts.map((x) => x.quota)));
  console.log("categories:", by(cuts.map((x) => `${x.r.category}${x.r.pwd ? "-PwD" : ""}${x.r.additional ? `+${x.r.additional}` : ""}${x.r.inService ? " (in-service)" : ""}`)));
  console.log(`closing lines with no college matched: ${cuts.filter((x) => x.instituteId == null).length}`);

  if (!APPLY) {
    console.log("\nDry run — nothing written. --apply to write, --show to list every match.");
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM state_round_cuts WHERE state_id = ${stateId} AND level = 'pg' AND year = ${src.year} AND round = ${src.round}`);
    await tx.execute(sql`DELETE FROM state_round_allotments WHERE state_id = ${stateId} AND level = 'pg' AND year = ${src.year} AND round = ${src.round}`);
    for (let i = 0; i < cuts.length; i += 400) {
      const chunk = cuts.slice(i, i + 400).map(({ r, courseId, instituteId, quota }) => sql`(
        'pg', ${stateId}, ${src.year}, ${src.round}, ${src.roundPrinted}, ${src.counselling}, ${src.sourceUrl}, ${src.note ?? null}, ${src.noteUrl ?? null},
        ${instituteId}, ${r.college}, ${r.instCode}, ${courseId}, ${r.course}, ${quota}, ${r.seatType},
        ${r.category}, ${r.categoryPrinted}, ${r.pwd}, ${r.additional}, ${r.inService},
        ${r.seats}, ${r.openAir}, ${r.closeAir}, ${r.openSr}, ${r.closeSr})`);
      await tx.execute(sql`INSERT INTO state_round_cuts (level, state_id, year, round, round_printed, counselling, source_url, note, note_url,
        institute_id, college_printed, inst_code, course_id, course_printed, quota, seat_type_printed,
        category, category_printed, pwd, additional_category, in_service,
        seats_allotted, opening_air, closing_air, opening_state_rank, closing_state_rank)
        VALUES ${sql.join(chunk, sql`, `)}`);
    }
    for (let i = 0; i < allots.length; i += 400) {
      const chunk = allots.slice(i, i + 400).map(({ r, courseId, instituteId, quota }) => sql`(
        'pg', ${stateId}, ${src.year}, ${src.round}, ${src.counselling},
        ${instituteId}, ${r.college}, ${r.instCode}, ${courseId}, ${r.course}, ${quota}, ${r.seatType},
        ${r.category}, ${r.categoryPrinted}, ${r.ownCategory}, ${r.pwd}, ${r.additional}, ${r.inService},
        ${r.domicile}, ${r.stateRank}, ${r.air}, ${r.score})`);
      await tx.execute(sql`INSERT INTO state_round_allotments (level, state_id, year, round, counselling,
        institute_id, college_printed, inst_code, course_id, course_printed, quota, seat_type_printed,
        category, category_printed, own_category, pwd, additional_category, in_service,
        domicile, state_rank, air, neet_score)
        VALUES ${sql.join(chunk, sql`, `)}`);
    }
    const [c] = (await tx.execute(sql`SELECT
        (SELECT COUNT(*) FROM state_round_cuts WHERE state_id = ${stateId} AND year = ${src.year} AND round = ${src.round})::int AS cuts,
        (SELECT COUNT(*) FROM state_round_allotments WHERE state_id = ${stateId} AND year = ${src.year} AND round = ${src.round})::int AS allots`)) as unknown as { cuts: number; allots: number }[];
    if (c.cuts !== cuts.length || c.allots !== allots.length) throw new Error(`count mismatch: ${JSON.stringify(c)} vs ${cuts.length}/${allots.length}`);
    console.log(`written: ${c.cuts} closing lines, ${c.allots} allotments`);
  });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
