// The verified 2026-27 PG fee file from zyn-c9 (the AH AI Counselor session, 4 Nov 2026) → one
// scripts/data/fees_official_zyn_<state>_2026_27.json per state, in the shape apply_state_fees.mjs reads.
//
// The owner, 4 Nov (relayed by zyn-c9, confirmed in this session): fix the discrepancies, and "jaha par tution
// fees hai sirf tution fees hi mention ho" — where a fee is tuition, show tuition alone. This supersedes the
// 25–26 Oct own-notice-only rule for these records: KEA's fee structure of 02-11-2026, FRA's 2026-27 approvals,
// the Rajasthan board's sheet of 22-10-2026 and MCC's Annexure-C forms are used as zyn-c9 verified them.
//
//   node --env-file=.env.local scripts/data/make_fees_zyn_2026_27.mjs [file.json]
//   then, per state: node --env-file=.env.local scripts/apply_state_fees.mjs scripts/data/fees_official_zyn_<state>_2026_27.json \
//                      --rate 95.9832 [--backup <file> --apply]
//
// Rules, from the file's own read-me:
//  - show_as "Tuition fee": the stored figure is the tuition alone (`tuition_inr`; for a dollar fee, `amount`); the
//    items in `components` (development, other fee, RGUHS fees) are kept beside it and never added in.
//  - show_as "Fee (as printed) - …": the notice prints no tuition alone — `amount`, labelled with that wording.
//  - "Tuition fee: nil": the row is blanked with that reason (a ₹0 would read as "not published").
//  - period: per year / first year / whole course / not stated — never divided into years.
//  - Dollar figures are the college's own; the rupee view is at FBIL ₹95.9832 a dollar (30.09.2026).
// Colleges are matched by the file's college_id_ah_tool = institutes.source_id (all 131 matched, state agreeing,
// on 2026-11-04); branches are courses.name exactly.

import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const FILE = process.argv[2] ?? "scripts/data/fees_extract_2026_27/zyn_2026_11_04/website_fees_2026-27.json";
const { records } = JSON.parse(readFileSync(FILE, "utf8"));
const RATE_NOTE = "FBIL ₹95.9832 a dollar, 30.09.2026";

/** Each state's quota codes → the seat types the file names. First match wins; "Other" is never priced. */
const CLASSES = {
  Karnataka: [
    ["^KAR Govt Quota", "KGovt"], ["^KAR Priv Seats", "KPriv"], ["^KAR NRI", "KNRI"], ["^KAR Others", "KOth"],
    ["^MNG$", "DPaid"], ["^NRI$", "DNRI"], [".", "Other"],
  ],
  Maharashtra: [
    ["^MAHA-Govt", "MState"], ["^MAHA Priv-Mgmt", "MInst"], ["^MAHA-NRI", "MNRI"], ["^MAHA Priv-Min", "MMin"],
    ["^MNG$", "DPaid"], ["^NRI$", "DNRI"], [".", "Other"],
  ],
  Rajasthan: [["^RAJ Priv-All India", "RAI"], ["^RAJ Priv-Govt", "RState"], ["^RAJ Priv-Mgmt", "RMgmt"], [".", "Other"]],
  "Tamil Nadu": [["^MNG$", "DPaid"], ["^NRI$", "DNRI"], [".", "Other"]],
  Pondicherry: [["^MNG$", "DPaid"], ["^NRI$", "DNRI"], [".", "Other"]],
  Odisha: [["^MNG$", "DPaid"], ["^NRI$", "DNRI"], [".", "Other"]],
};
/** The file's state names → ours. */
const STATE = { Puducherry: "Pondicherry" };

function seatClass(r) {
  const mcc = /^MCC/i.test(r.counselling);
  switch (r.seat_type) {
    case "Govt quota (KEA)": return "KGovt";
    case "Private quota - GMP / Open / Minority (KEA)": return "KPriv";
    case "NRI (KEA)": return "KNRI";
    case "Others - OTH(Q) (KEA)": return "KOth";
    case "Paid / Management (MCC)": return "DPaid";
    case "State quota (CAP)": return "MState";
    case "Institutional": return "MInst";
    case "Minority": return "MMin";
    case "All India (state counselling)": return "RAI";
    case "State": return "RState";
    case "Management": return "RMgmt";
    case "NRI": return mcc ? "DNRI" : /Maharashtra/i.test(r.counselling) ? "MNRI" : null;
    default: return null;
  }
}

function period(p) {
  if (p === "per year") return "per year";
  if (/^first year|^year 1/i.test(p)) return "first year";
  if (/^whole course/i.test(p)) return "whole course";
  if (/^not stated/i.test(p)) return "not stated";
  return null;
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const inst = await sql`SELECT id, source_id FROM institutes WHERE level = 'pg' AND source_id IS NOT NULL`;
const bySource = new Map(inst.map((i) => [String(i.source_id), i.id]));
await sql.end();

const out = new Map();
const problems = [];
for (const r of records) {
  const state = STATE[r.state] ?? r.state;
  const id = bySource.get(String(r.college_id_ah_tool));
  const seat = seatClass(r);
  const per = period(r.period);
  if (!id || !CLASSES[state] || !seat || !per) {
    problems.push(`${r.state} · ${r.college} · ${r.seat_type} · ${r.branch}: ${!id ? "no institute" : !seat ? "seat type" : !per ? `period "${r.period}"` : "state"}`);
    continue;
  }
  const source = [`${r.source}${r.source_date ? ` (${r.source_date})` : ""}`, r.source_url, r.note].filter(Boolean).join(" — ");
  const e = {
    college: r.college,
    ids: [id],
    seat,
    branches: [r.branch],
    year: "2026-27",
    source,
    period: per,
    label: r.show_as,
    currency: r.currency,
    components: r.components ?? {},
  };
  if (/^Tuition fee: nil/i.test(r.show_as)) {
    Object.assign(e, { noseat: true, reason: "No tuition fee (the 2026-27 notice prints nil)", label: "Tuition fee" });
  } else if (r.currency === "USD") {
    const usd = r.show_as === "Tuition fee" ? r.tuition_inr ?? r.amount : r.amount; // the file keeps a dollar tuition in tuition_inr
    if (r.show_as === "Tuition fee" && r.tuition_inr != null && r.tuition_inr !== r.amount) {
      problems.push(`${r.college} · ${r.branch} · ${r.seat_type}: dollar tuition ${r.tuition_inr} ≠ amount ${r.amount}`);
    }
    Object.assign(e, { fee_inr: null, fee_usd: usd, rate_note: RATE_NOTE });
  } else {
    const inr = r.show_as === "Tuition fee" ? r.tuition_inr : r.amount;
    if (inr == null) {
      problems.push(`${r.college} · ${r.branch} · ${r.seat_type}: no figure for "${r.show_as}"`);
      continue;
    }
    Object.assign(e, { fee_inr: inr, fee_usd: null });
  }
  const s = out.get(state) ?? { state, classes: CLASSES[state], null_class: {}, source_file: FILE, entries: [] };
  s.entries.push(e);
  out.set(state, s);
}

for (const [state, s] of out) {
  const path = `scripts/data/fees_official_zyn_${state.toLowerCase().replace(/\s+/g, "_")}_2026_27.json`;
  writeFileSync(path, JSON.stringify(s, null, 1));
  console.log(`${state}: ${s.entries.length} entries → ${path}`);
}
console.log(`${records.length} records; ${problems.length} not placed`);
for (const p of problems) console.log(`  ${p}`);
