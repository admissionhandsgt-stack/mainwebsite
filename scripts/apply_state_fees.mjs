// Write one state's official 2026-27 PG fees into `fees` — the nationwide pass that followed Maharashtra's (owner,
// 2026-10-25: "nation wide har state ke sab colleges k data update karo").
//
//   node --env-file=.env.local scripts/apply_state_fees.mjs <official.json> [--rate 96] [--backup <file.json>] [--apply]
//        [--detail]  every change, grouped by college, column and new fee
//        [--no-refresh]  skip the seat_options refresh (applying several states: refresh once after the last)
//   node --env-file=.env.local scripts/apply_official_fees.mjs --restore <file.json>      (the same backup format)
//
// <official.json> is written by the state's scripts/data/make_fees_official_<state>_2026_27.py:
//   { "state": "Karnataka",
//     "classes": [["^AIQ$", "AIQ"], ["NRI", "NRI"], …],   each quota code → the column a notice prints; first match wins
//     "null_class": { "TEL Govt PG": "Gen" },               a quota-less row, by its counselling
//     "entries": [ { college, ids, seat, branches, fee_inr | fee_usd, source, max?, noseat?, reason?, period? }, … ] }
// `ids` is the college's institute ids, or "*" (with an optional `ownership`) for one fee every such college charges —
// the state's government fee, NBEMS's DNB fee. `branches` is "*" (every branch the college has in that column) or
// course names exactly as `courses.name` spells them, and a named branch beats "*", a college's "*" beats the
// state's. `period` defaults to "per year"; null keeps the row's own. Hostel entries ({ seat: "Hostel", min, max,
// text, source }) go on every row of the college. The rules are apply_official_fees.mjs's: the source is the
// college's own notice, or the state counselling authority's official fee list where the college publishes none —
// never a compiled listing; rows are updated in place and never inserted; a `noseat` entry blanks the row with a
// reason; a quota code no class matches is reported and left alone; colleges with no entry are not touched; and
// nothing is written without --apply (then the old values go to --backup first, one transaction, seat_options refreshed).

import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const argv = process.argv.slice(2);
const opt = (k, d = null) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const [offPath] = argv.filter((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
if (!offPath) throw new Error("usage: apply_state_fees.mjs <official.json> [--rate 96] [--backup <file>] [--apply]");
const APPLY = argv.includes("--apply");
const RATE = Number(opt("rate", "96"));
const OFF = JSON.parse(readFileSync(offPath, "utf8"));
const CLASSES = OFF.classes.map(([p, c]) => [new RegExp(p, "i"), c]);
const classOf = (r) =>
  r.quota == null ? OFF.null_class?.[r.counselling] ?? null : CLASSES.find(([re]) => re.test(r.quota))?.[1] ?? null;
const LABEL = { Gen: "state quota", Mgmt: "management", NRI: "NRI", Min: "minority", Inst: "institutional" };

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const current = await sql`
  SELECT f.id, f.institute_id, i.name AS institute, i.ownership::text AS ownership, co.name AS course, q.code AS quota,
         cs.name AS counselling, f.fee_inr, f.fee_usd, f.fee_periodicity, f.fee_session, f.year, f.is_carried_forward,
         f.fee_null_reason, f.hostel_min_inr, f.hostel_max_inr, f.hostel_note, f.fee_source
    FROM fees f
    JOIN institutes i ON i.id = f.institute_id
    JOIN states s ON s.id = i.state_id
    JOIN courses co ON co.id = f.course_id
    LEFT JOIN quotas q ON q.id = f.quota_id
    LEFT JOIN counsellings cs ON cs.id = f.counselling_id
   WHERE f.level = 'pg' AND s.name = ${OFF.state}`;
if (!current.length) throw new Error(`no PG fees rows for ${OFF.state}`);
const unclassified = new Map();
for (const r of current) {
  r.class = classOf(r);
  if (!r.class) {
    const k = `${r.quota ?? "(no quota)"} [${r.counselling}]`;
    unclassified.set(k, (unclassified.get(k) ?? 0) + 1);
  }
}
const byInst = new Map();
for (const r of current) byInst.set(r.institute_id, [...(byInst.get(r.institute_id) ?? []), r]);
const rowsOf = (e) => {
  if (e.ids === "*") return current.filter((r) => !e.ownership || r.ownership === e.ownership);
  return e.ids.flatMap((id) => {
    const rows = byInst.get(id);
    if (!rows) throw new Error(`${e.college}: institute ${id} has no PG fees rows in ${OFF.state}`);
    return rows;
  });
};

// ------------------------------------------------------------------ plan
const plan = new Map(); // fees row id -> { row, entry, rank }
const missing = [];
const hostels = [];
for (const e of OFF.entries) {
  if (e.seat === "Note") continue;
  if (e.seat === "Hostel") {
    if (e.min) hostels.push(e);
    continue;
  }
  let rows = rowsOf(e).filter((r) => r.class === e.seat);
  if (e.branches !== "*") {
    rows = rows.filter((r) => e.branches.includes(r.course));
    const found = new Set(rows.map((r) => r.course));
    for (const b of e.branches) if (!found.has(b) && !e.noseat) missing.push(`${e.college} · ${b} · ${e.seat}`);
  } else if (!rows.length) missing.push(`${e.college} · every branch · ${e.seat}`);
  const rank = e.branches !== "*" ? 2 : e.ids === "*" ? 0 : 1;
  for (const r of rows) {
    const had = plan.get(r.id);
    if (had && had.rank > rank) continue;
    if (had && had.rank === rank && JSON.stringify(had.entry) !== JSON.stringify(e)) {
      throw new Error(`two entries price ${r.institute} · ${r.course} · ${r.quota}: ${had.entry.source} / ${e.source}`);
    }
    plan.set(r.id, { row: r, entry: e, rank });
  }
}

const updates = [];
const changed = new Map(); // institute -> [lines]
const note = (who, line) => changed.set(who, [...(changed.get(who) ?? []), line]);
for (const [id, { row: r, entry: e }] of plan) {
  if (e.noseat) {
    updates.push({ id, set: { fee_inr: null, fee_usd: null, fee_periodicity: r.fee_periodicity, fee_session: "2026", year: 2026,
      is_carried_forward: false, fee_null_reason: e.reason ?? `No ${LABEL[e.seat] ?? e.seat} seat in the college's 2026-27 fee notice`,
      fee_source: e.source } });
    note(r.institute, `${r.course} ${e.seat}: ${r.fee_inr ?? "—"} → no seat`);
    continue;
  }
  const feeInr = e.fee_inr ?? Math.round(e.fee_usd * RATE);
  const feeUsd = e.fee_usd ?? (e.seat === "NRI" ? Math.round(feeInr / RATE) : null);
  const source = `${e.source}${e.max ? " — up to this figure" : ""}` +
    `${e.fee_usd ? ` — US$${e.fee_usd.toLocaleString("en-US")}, ₹ at ${RATE} a dollar` : ""}`;
  updates.push({ id, set: { fee_inr: feeInr, fee_usd: feeUsd,
    fee_periodicity: e.period === undefined ? "per year" : e.period ?? r.fee_periodicity,
    fee_session: "2026", year: 2026, is_carried_forward: false, fee_null_reason: null, fee_source: source } });
  if (Number(r.fee_inr) !== feeInr) note(r.institute, `${r.course} ${e.seat}: ${r.fee_inr ?? "—"} → ${feeInr}`);
}
const hostelUpdates = [];
for (const h of hostels) {
  for (const r of rowsOf(h)) {
    hostelUpdates.push({ id: r.id, set: { hostel_min_inr: h.min, hostel_max_inr: h.max ?? h.min, hostel_note: `${h.text} (${h.source})` } });
  }
}

// ------------------------------------------------------------------ report
const named = new Set(OFF.entries.filter((e) => e.ids !== "*").flatMap((e) => e.ids));
const colleges = [...byInst.keys()];
const priced = new Set([...plan.values()].map((p) => p.row.institute_id));
console.log(`${OFF.state}: ${current.length} PG fees rows at ${colleges.length} institutes; ` +
  `${plan.size} rows get an official fee or "no seat" (${updates.filter((u) => u.set.fee_inr === null).length} blanked), ` +
  `at ${priced.size} institutes; hostel figures on ${hostelUpdates.length} rows`);
const left = new Map(); // institute named in the file -> rows of a priced column the file did not reach
for (const id of named) {
  for (const r of byInst.get(id) ?? []) {
    if (!plan.has(r.id)) left.set(r.institute, [...(left.get(r.institute) ?? []), `${r.class ?? r.quota ?? "?"}`]);
  }
}
console.log(`value changes: ${[...changed.values()].reduce((n, l) => n + l.length, 0)} rows at ${changed.size} institutes`);
for (const [who, lines] of changed) console.log(`  ${who}: ${lines.length} — e.g. ${lines.slice(0, 3).join(" · ")}`);
if (missing.length) console.log(`no fees row for: ${missing.slice(0, 15).join(" | ")}${missing.length > 15 ? ` … (${missing.length})` : ""}`);
for (const [who, cls] of left) {
  const n = cls.reduce((m, c) => m.set(c, (m.get(c) ?? 0) + 1), new Map());
  console.log(`  left as before at ${who}: ${[...n].map(([c, k]) => `${c} ×${k}`).join(", ")}`);
}
if (unclassified.size) console.log(`quota codes no class matches (left alone): ${[...unclassified].map(([k, n]) => `${k} ×${n}`).join(" | ")}`);
console.log(`institutes with no official fee yet: ${colleges.length - priced.size} of ${colleges.length}`);

// --detail: every change, grouped by college, column and new fee, with the old values it replaces.
if (argv.includes("--detail")) {
  const groups = new Map();
  for (const u of updates) {
    const p = plan.get(u.id);
    const key = `${p.row.institute}\u0000${p.row.class}\u0000${u.set.fee_inr ?? "no seat"}`;
    const g = groups.get(key) ?? { inst: p.row.institute, col: p.row.class, fee: u.set.fee_inr, usd: u.set.fee_usd,
      why: u.set.fee_null_reason, old: new Map(), branches: new Set(), rows: 0 };
    groups.set(key, g);
    g.old.set(p.row.fee_inr ?? "—", (g.old.get(p.row.fee_inr ?? "—") ?? 0) + 1);
    g.branches.add(p.row.course);
    g.rows++;
  }
  const lakh = (v) => (v == null || v === "—" ? "—" : `₹${(Number(v) / 100000).toFixed(2)} L`);
  let last = "";
  for (const g of [...groups.values()].sort((a, b) => a.inst.localeCompare(b.inst) || a.col.localeCompare(b.col) || (a.fee ?? 0) - (b.fee ?? 0))) {
    if (g.inst !== last) console.log(`\n${g.inst}`);
    last = g.inst;
    const old = [...g.old].map(([v, n]) => `${lakh(v)}${n > 1 ? ` ×${n}` : ""}`).join(", ");
    const now = g.fee == null ? `no seat (${g.why})` : `${lakh(g.fee)}${g.usd ? ` ($${g.usd.toLocaleString("en-US")})` : ""}`;
    const br = g.branches.size > 4 ? `${g.branches.size} branches` : [...g.branches].join(", ");
    console.log(`  ${g.col.padEnd(5)} ${old} → ${now}   [${br}]`);
  }
}

if (!APPLY) {
  console.log("dry run — nothing written (add --apply)");
  await sql.end();
  process.exit(0);
}

const backup = opt("backup");
if (!backup) throw new Error("--apply needs --backup <file.json> for the old values");
const touched = new Set([...updates, ...hostelUpdates].map((u) => u.id));
writeFileSync(backup, JSON.stringify(current.filter((r) => touched.has(r.id)), null, 1));
console.log(`old values of ${touched.size} rows saved to ${backup}`);

await sql.begin(async (tx) => {
  for (const u of updates) {
    const s = u.set;
    await tx`UPDATE fees SET fee_inr = ${s.fee_inr}, fee_usd = ${s.fee_usd}, fee_periodicity = ${s.fee_periodicity},
      fee_session = ${s.fee_session}, year = ${s.year}, is_carried_forward = ${s.is_carried_forward},
      fee_null_reason = ${s.fee_null_reason}, fee_source = ${s.fee_source}, updated_at = now() WHERE id = ${u.id}`;
  }
  for (const u of hostelUpdates) {
    const s = u.set;
    await tx`UPDATE fees SET hostel_min_inr = ${s.hostel_min_inr}, hostel_max_inr = ${s.hostel_max_inr}, hostel_note = ${s.hostel_note},
      updated_at = now() WHERE id = ${u.id}`;
  }
});
// --no-refresh when several states are applied in a row: refresh seat_options once after the last.
if (!argv.includes("--no-refresh")) await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY seat_options`;
const [check] = await sql`SELECT count(*)::int AS n FROM fees WHERE fee_source IS NOT NULL`;
console.log(`applied: ${updates.length} fee rows, ${hostelUpdates.length} hostel rows; ${check.n} fees rows now carry a source; ` +
  `seat_options ${argv.includes("--no-refresh") ? "NOT refreshed (--no-refresh)" : "refreshed"}`);
await sql.end();
