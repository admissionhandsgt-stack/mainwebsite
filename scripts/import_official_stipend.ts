// Loads the official PG stipend file (the PG data session's handoff) into pg_stipend_rules and pg_stipend_colleges
// (migration 0066), as scripts/import_official_bond.ts does for the bond.
// Dry run by default: prints how every state and college matched, what will be stored and anything held back. --apply
// replaces both tables in one transaction; --backup <file> first writes the rows it replaces.
//
//   npx tsx --env-file=.env.local scripts/import_official_stipend.ts [file] [--apply] [--backup <file>]
//
// Rules: a state key maps onto our states.name (Puducherry → Pondicherry, "Delhi (NCT)" → Delhi, "Jammu & Kashmir (UT) …"
// → Jammu and Kashmir); a college's our_id must be a PG institute of that state, else the row is held back and printed.
// Links on hosts the PG data session found compromised are kept in the data but never rendered (lib/officialBond.ts).
import { readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

const args = process.argv.slice(2);
const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--backup") ?? "D:/Admisson Hands/pg_handoff/from_pg/official_stipend_all_states_2026-27.json";
const apply = args.includes("--apply");
const backup = args.includes("--backup") ? args[args.indexOf("--backup") + 1] : null;
const rows = <T,>(r: unknown) => r as unknown as T[];

const d = JSON.parse(readFileSync(file, "utf8")) as {
  as_of: string;
  state_rules: Record<string, Record<string, unknown>>;
  national: Record<string, unknown>;
  central_govt: Record<string, unknown>;
  colleges: { our_id: number; college: string; state: string; status: string; type: string; [k: string]: unknown }[];
};

const STATE_ALIAS: Record<string, string> = { puducherry: "Pondicherry", "delhi (nct)": "Delhi", "jammu & kashmir (ut)": "Jammu and Kashmir" };
const ourStateName = (raw: string) => {
  const k = raw.toLowerCase().trim();
  if (STATE_ALIAS[k]) return STATE_ALIAS[k];
  return raw.replace(/\s*\(.*$/, "").replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ").trim();
};
const slugOf = (name: string) => name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const states = new Set(rows<{ name: string }>(await db.execute(sql`SELECT name FROM states`)).map((r) => r.name));
// our_id is the PG tool's College_ID, which our import stored as institutes.source_id (not institutes.id).
const instRows = rows<{ id: number; source_id: number; name: string; state: string | null }>(
  await db.execute(sql`SELECT i.id, i.source_id, i.name, s.name AS state FROM institutes i LEFT JOIN states s ON s.id = i.state_id
                        WHERE i.level = 'pg' AND i.source_id IS NOT NULL`),
);
const inst = new Map<number, { id: number; name: string; state: string | null }>();
const twice = new Set<number>();
for (const r of instRows) {
  const k = Number(r.source_id);
  if (inst.has(k)) twice.add(k);
  inst.set(k, r);
}

console.log(`file: ${file}\nas of ${d.as_of}\n`);

// ------------------------------------------------------------------ states
const ruleRows: { slug: string; state: string; label: string; data: unknown }[] = [];
for (const [label, data] of Object.entries(d.state_rules)) {
  const name = ourStateName(label);
  const ok = states.has(name);
  console.log(`${ok ? "  " : "!!"} ${label.padEnd(52)} → ${name} (/md-ms-india/stipend/${slugOf(name)})`);
  if (ok) ruleRows.push({ slug: slugOf(name), state: name, label, data });
}
ruleRows.push({ slug: "national", state: "NMC", label: "NMC", data: d.national });
ruleRows.push({ slug: "central", state: "Central Government", label: "Central Government", data: d.central_govt });

// ------------------------------------------------------------------ colleges
const collegeRows: { our_id: number; institute_id: number | null; state: string; status: string; data: unknown }[] = [];
const held: string[] = [];
const by: Record<string, number> = {};
for (const c of d.colleges) {
  const state = ourStateName(c.state);
  const i = inst.get(c.our_id);
  if (!i) {
    held.push(`no PG institute ${c.our_id}: ${c.college} (${c.state})`);
    continue;
  }
  if (twice.has(c.our_id)) {
    held.push(`two PG institutes share source id ${c.our_id}: ${c.college}`);
    continue;
  }
  if (i.state !== state) {
    held.push(`state differs ${c.our_id}: file ${c.state} / ours ${i.state} — ${c.college} ↔ ${i.name}`);
    continue;
  }
  collegeRows.push({ our_id: c.our_id, institute_id: i.id, state, status: c.status, data: c });
  const k = `${state} · ${c.status}`;
  by[k] = (by[k] ?? 0) + 1;
}
console.log(`\ncolleges: ${collegeRows.length} of ${d.colleges.length} matched`);
const byStatus: Record<string, number> = {};
for (const r of collegeRows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
console.log("  by status:", byStatus);
if (held.length) console.log(`\nheld back (${held.length}):\n  ${held.join("\n  ")}`);
// Names side by side, so a wrong our_id shows: the file's name and ours.
if (args.includes("--show")) for (const r of collegeRows) console.log(`  ${String(r.our_id).padStart(5)} ${(r.data as { college: string }).college.slice(0, 60).padEnd(60)} ↔ ${inst.get(r.our_id)?.name}`);

if (!apply) {
  console.log("\nDry run — nothing written. --apply to load.");
  process.exit(0);
}
if (backup) {
  const old = {
    rules: rows(await db.execute(sql`SELECT * FROM pg_stipend_rules`)),
    colleges: rows(await db.execute(sql`SELECT * FROM pg_stipend_colleges`)),
  };
  writeFileSync(backup, JSON.stringify(old));
  console.log(`backup: ${backup} (${old.rules.length} rules, ${old.colleges.length} colleges)`);
}
await db.transaction(async (tx) => {
  await tx.execute(sql`DELETE FROM pg_stipend_rules`);
  await tx.execute(sql`DELETE FROM pg_stipend_colleges`);
  for (const r of ruleRows)
    await tx.execute(sql`INSERT INTO pg_stipend_rules (slug, state, label, data, as_of)
      VALUES (${r.slug}, ${r.state}, ${r.label}, ${JSON.stringify(r.data)}::jsonb, ${d.as_of})`);
  for (const r of collegeRows)
    await tx.execute(sql`INSERT INTO pg_stipend_colleges (our_id, institute_id, state, status, data, as_of)
      VALUES (${r.our_id}, ${r.institute_id}, ${r.state}, ${r.status}, ${JSON.stringify(r.data)}::jsonb, ${d.as_of})`);
});
console.log(`\nloaded: ${ruleRows.length} rule rows (incl. NMC and central), ${collegeRows.length} colleges`);
process.exit(0);
