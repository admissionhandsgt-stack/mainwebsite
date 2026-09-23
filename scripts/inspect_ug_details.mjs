/**
 * Read-only survey of the 1,727 saved college detail pages.
 *
 * The list pages give 2,332 cutoff/rank rows. Each detail page carries its own
 * "Cutoff UG <year>" table with quota, category, counselling, round, score and
 * closing rank — a richer and much larger source. This measures it before
 * anything is imported. Writes nothing.
 *
 * Run: node scripts/inspect_ug_details.mjs
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseDetailPage } from "./lib/parseUgDetails.mjs";

const DIR = "D:/Gulshan/PG/Website/extracted-data/ug-live/details";

const files = (await readdir(DIR)).filter((f) => f.endsWith(".html"));
console.log(`scanning ${files.length} detail pages…`);

let cutoffRows = 0;
let feeRows = 0;
let pagesWithCutoffs = 0;
let pagesWithFees = 0;
const years = new Map();
const counsellings = new Map();
const quotas = new Map();
const rounds = new Map();
const courses = new Map();
const categories = new Map();
const states = new Map();
const failures = [];
const missingState = [];
const missingName = [];
let establishedCount = 0;

const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);

for (const file of files) {
  const id = Number(path.basename(file, ".html"));
  let page;
  try {
    page = parseDetailPage(await readFile(path.join(DIR, file), "utf8"), id);
  } catch (e) {
    failures.push(`${file}: ${e.message}`);
    continue;
  }

  if (page.cutoffs.length) pagesWithCutoffs++;
  if (page.fees.length) pagesWithFees++;
  cutoffRows += page.cutoffs.length;
  feeRows += page.fees.length;

  if (page.state) bump(states, page.state);
  else missingState.push(page.collegeId);
  if (!page.name) missingName.push(page.collegeId);
  if (page.established) establishedCount++;
  for (const c of page.cutoffs) {
    bump(years, c.year);
    bump(counsellings, c.counselling);
    bump(quotas, c.quota);
    bump(rounds, c.round);
    bump(courses, c.course);
    bump(categories, c.category);
  }
}

const top = (m, n = 20) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

console.log(`\npages with a cutoff table: ${pagesWithCutoffs}`);
console.log(`pages with a fee table:    ${pagesWithFees}`);
console.log(`cutoff rows: ${cutoffRows.toLocaleString("en-IN")}`);
console.log(`fee rows:    ${feeRows.toLocaleString("en-IN")}`);
if (failures.length) {
  console.log(`\nparse failures: ${failures.length}`);
  failures.slice(0, 5).forEach((f) => console.log("  " + f));
}

const dump = (title, m) => {
  console.log(`\n${title} (${m.size} distinct)`);
  for (const [v, n] of top(m)) console.log(`  ${String(n).padStart(7)}  ${JSON.stringify(v)}`);
  if (m.size > 20) console.log(`  … ${m.size - 20} more`);
};

dump("year", years);
dump("counselling", counsellings);
dump("quota", quotas);
dump("round", rounds);
dump("course", courses);
dump("category", categories);
dump("state (from the page header)", states);
console.log(`
pages with no state in the header: ${missingState.length}`);
console.log(`pages with no name:                ${missingName.length}`);
console.log(`pages with an establishment year:  ${establishedCount}`);
