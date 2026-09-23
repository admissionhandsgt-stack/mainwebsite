/**
 * Read-only survey of the UG scrape before anything is imported.
 *
 * Prints every distinct value the importer will have to map, so the mapping is
 * decided from the data rather than assumed. Writes nothing.
 *
 * Run: node scripts/inspect_ug_source.mjs
 */

import { readUgPages, num, money, blank } from "./lib/parseUgPages.mjs";

const DIR = "D:/Gulshan/PG/Website/extracted-data/ug-live/pages";

const tally = (rows, get) => {
  const c = new Map();
  for (const r of rows) {
    const v = get(r);
    if (v === undefined) continue;
    c.set(v, (c.get(v) ?? 0) + 1);
  }
  return [...c.entries()].sort((a, b) => b[1] - a[1]);
};

const show = (title, entries, limit = 25) => {
  console.log(`\n${title}  (${entries.length} distinct)`);
  for (const [v, n] of entries.slice(0, limit)) {
    console.log(`  ${String(n).padStart(6)}  ${JSON.stringify(v)}`);
  }
  if (entries.length > limit) console.log(`  … ${entries.length - limit} more`);
};

const rows = await readUgPages(DIR);
const ranks = rows.filter((r) => r._kind === "closing-rank1");
const cutoffs = rows.filter((r) => r._kind === "closing-cutoff");

console.log(`parsed ${rows.length} rows: ${ranks.length} rank, ${cutoffs.length} cutoff`);

console.log("\ncolumn sets actually present after comment-stripping:");
for (const [label, set] of [["rank", ranks], ["cutoff", cutoffs]]) {
  const cols = new Set();
  for (const r of set) Object.keys(r).forEach((k) => !k.startsWith("_") && cols.add(k));
  console.log(`  ${label}: ${[...cols].join(" | ")}`);
}

show("counselling type", tally(rows, (r) => r._counselling));
show("course", tally(rows, (r) => r.Course));
show("quota (rank)", tally(ranks, (r) => r["Cutoff Quota"]));
show("round (cutoff)", tally(cutoffs, (r) => r.Round));

// The rank tables have no State column, so the site's state id from the
// filename is the only link. The cutoff tables have both — use them to prove
// that id maps to exactly one state name.
const byStateId = new Map();
for (const r of cutoffs) {
  if (blank(r.State)) continue;
  if (!byStateId.has(r._stateId)) byStateId.set(r._stateId, new Set());
  byStateId.get(r._stateId).add(r.State);
}
const ambiguous = [...byStateId.entries()].filter(([, names]) => names.size > 1);
console.log(`\nsite state id -> state name: ${byStateId.size} ids, ${ambiguous.length} ambiguous`);
for (const [id, names] of ambiguous.slice(0, 5)) {
  console.log(`  id ${id}: ${[...names].join(" / ")}`);
}
const rankStateIds = new Set(ranks.map((r) => r._stateId));
const unmapped = [...rankStateIds].filter((id) => !byStateId.has(id));
console.log(`rank rows use ${rankStateIds.size} state ids; ${unmapped.length} have no name from the cutoff pages: ${unmapped}`);

console.log("\nrank columns — filled / range");
const rankCols = Object.keys(ranks[0] ?? {}).filter((k) => /^CR/i.test(k));
for (const col of rankCols) {
  const present = ranks.filter((r) => r[col] !== undefined);
  const vals = present.map((r) => num(r[col])).filter((v) => v !== null);
  console.log(
    `  ${col.padEnd(14)} in ${String(present.length).padStart(5)} rows, ${String(vals.length).padStart(5)} filled` +
      (vals.length ? `, ${Math.min(...vals).toLocaleString("en-IN")} – ${Math.max(...vals).toLocaleString("en-IN")}` : ""),
  );
}

const fees = ranks.map((r) => money(r.Fees)).filter((v) => v !== null);
console.log(
  `\nFees: ${fees.length} of ${ranks.length} filled` +
    (fees.length ? `, ${Math.min(...fees).toLocaleString("en-IN")} – ${Math.max(...fees).toLocaleString("en-IN")}` : ""),
);

const withId = rows.filter((r) => r._collegeId !== null);
const ids = new Set(withId.map((r) => r._collegeId));
const names = new Set(rows.map((r) => r.Institute).filter(Boolean));
console.log(`\ncollege links: ${withId.length}/${rows.length} rows carry an id, ${ids.size} distinct ids, ${names.size} distinct names`);

// One name per id, and one id per name — otherwise the join is unsafe.
const nameOfId = new Map();
const idOfName = new Map();
let idClash = 0;
let nameClash = 0;
for (const r of withId) {
  if (!nameOfId.has(r._collegeId)) nameOfId.set(r._collegeId, r.Institute);
  else if (nameOfId.get(r._collegeId) !== r.Institute) idClash++;
  if (!idOfName.has(r.Institute)) idOfName.set(r.Institute, r._collegeId);
  else if (idOfName.get(r.Institute) !== r._collegeId) nameClash++;
}
console.log(`  rows where an id maps to a second name: ${idClash}`);
console.log(`  rows where a name maps to a second id:  ${nameClash}`);

show("category", tally(rows, (r) => r.Category), 15);
