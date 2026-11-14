// Match the states' own NEET UG 2026 college names (zyn's state_ug_2026.json) to our UG institutes (2026-11-14).
// Read-only.
//
//   node --env-file=.env.local scripts/ug/match_state_ug_2026.mjs [--file <state_ug_2026.json>] [--air-only] [--show]
//
// Within the state only. A name matches when, normalised (match_ug_institutes.mjs' norm), it equals one of ours, or one
// of ours is its start or the whole of ours sits inside it — the longest such wins and a tie is no match. Then a score
// on rare words shared (weighted by how rare the word is in that state's list) plus letter trigrams; accepted at ≥ 0.62
// with a 0.12 margin over the next. MBBS lines only match a medical college, BDS lines only a dental one. Everything
// else is printed for a person; decisions go in scripts/data/ug_state_2026_decisions.json as
// "<state>|<name as printed>|<MBBS|BDS>": institute id, or null for "none of ours".
// Writes scripts/data/ug_state_2026_matches.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const FILE = flag("--file") ?? "D:/Zyn/data/reference/state_ug_2026.json";
const AIR_ONLY = args.includes("--air-only");
const SHOW = args.includes("--show");
const DECISIONS = "scripts/data/ug_state_2026_decisions.json";
const OUT = "scripts/data/ug_state_2026_matches.json";

const PLACE = {
  bengaluru: "bangalore", belagavi: "belgaum", mysuru: "mysore", kancheepuram: "kanchipuram", vijaywada: "vijayawada",
  gurugram: "gurgaon", mangaluru: "mangalore", tumakuru: "tumkur", kalaburagi: "gulbarga", vijayapura: "bijapur",
  ballari: "bellary", hubballi: "hubli", puducherry: "pondicherry", varansi: "varanasi", odhisha: "odisha",
  uttrakhand: "uttarakhand", kozikode: "kozhikode", calicut: "kozhikode", trichy: "tiruchirappalli",
  tiruchirapalli: "tiruchirappalli", vadodra: "vadodara", baroda: "vadodara", bathinda: "bhatinda", gauhati: "guwahati",
  davangere: "davanagere", shivamogga: "shimoga", trivandrum: "thiruvananthapuram", chattrapati: "chhatrapati",
  aurangabad: "sambhajinagar", ahmednagar: "ahilyanagar", osmanabad: "dharashiv", bombay: "mumbai", poona: "pune",
  gulberga: "gulbarga", allahabad: "prayagraj", faizabad: "ayodhya", hoshangabad: "narmadapuram",
};
export const norm = (s) =>
  String(s ?? "").toLowerCase().replace(/&/g, " and ").replace(/\baiims\b/g, "all india institute of medical sciences")
    .replace(/\bgovt\b\.?/g, "government").replace(/\bgov\b\.?/g, "government").replace(/\bgoverment\b/g, "government")
    .replace(/\bcoll\b\.?/g, "college").replace(/\binstt?\b\.?/g, "institute").replace(/\bmed\b\.?/g, "medical")
    .replace(/\bgmc\b/g, "government medical college").replace(/\bims\b/g, "institute of medical sciences")
    .replace(/\bmch\b/g, "medical college and hospital").replace(/\bhosp\b\.?/g, "hospital").replace(/\bres\b\.?/g, "research")
    .replace(/\bsci\b\.?/g, "sciences").replace(/\bdr\b\.?/g, "dr").replace(/\bsmt\b\.?/g, "smt")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
    .split(" ").map((w) => PLACE[w] ?? w).join(" ");

const DENTAL = /dental|dentistry/i;
const OTHER_STREAM = /dental|dentistry|ayurved|homoeo|homeo|unani|siddha|nursing|yoga|naturopathy|veterinary|pharma|physiotherap/i;
const streamOk = (course, ourName) => (course === "BDS" ? DENTAL.test(ourName) : !OTHER_STREAM.test(ourName));
const MARKERS = [/\besic?\b/, /all india institute of medical sciences/, /\bjipmer\b/, /\bwomen/, /\bcampus (ii|2)\b/, /armed forces/, /\bautonomous\b/];
const markersAgree = (a, b) => MARKERS.every((m) => m.test(a) === m.test(b));
const STOP = new Set("and of the medical college hospital hospitals institute sciences science research centre center government dental india general district".split(" "));
// North-East states allot their own quota in colleges all over India (central pool): their names are looked for nationwide.
const NATIONWIDE = new Set(["Meghalaya", "Arunachal Pradesh", "Manipur", "Tripura", "Assam", "Mizoram", "Nagaland", "Sikkim"]);
const STATE_ALIAS = { "Jammu and Kashmir (with UT of Ladakh)": "Jammu and Kashmir", "Andaman & Nicobar Islands": "Andaman Nicobar Island", "Dadra & Nagar Haveli and Daman & Diu": "Dadra Nagar Havelli" };

const grams = (s) => {
  const t = ` ${s.split(" ").filter((w) => !STOP.has(w)).join(" ")} `;
  const g = new Set();
  for (let i = 0; i + 3 <= t.length; i++) g.add(t.slice(i, i + 3));
  return g;
};
const tri = (a, b) => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return (2 * n) / (a.size + b.size);
};

const J = JSON.parse(readFileSync(FILE, "utf8"));
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const ours = await sql`
  SELECT i.id, i.name, st.name AS state FROM institutes i LEFT JOIN states st ON st.id = i.state_id
   WHERE i.level = 'ug' AND i.is_active = true`;
await sql.end();
const decisions = existsSync(DECISIONS) ? JSON.parse(readFileSync(DECISIONS, "utf8")) : {};

const want = new Map(); // key -> { state, college, course, lines }
for (const l of J.lines) {
  if (AIR_ONLY && l.rank_type !== "NEET AIR") continue;
  if (!/^(MBBS|BDS)$/.test(l.course)) continue;
  const key = `${l.state}|${l.college}|${l.course}`;
  const w = want.get(key) ?? { state: l.state, college: l.college, code: l.college_code, course: l.course, lines: 0 };
  w.lines++;
  want.set(key, w);
}

const byState = new Map();
for (const o of ours) {
  const k = o.state ?? "";
  if (!byState.has(k)) byState.set(k, []);
  byState.get(k).push({ ...o, k: norm(o.name), short: norm(o.name.split(",")[0]), g: grams(norm(o.name)) });
}

const out = {};
const pending = [];
let byDecision = 0, exact = 0, start = 0, scored = 0;
for (const [key, w] of want) {
  if (key in decisions) {
    out[key] = { id: decisions[key], how: "decision" };
    byDecision++;
    continue;
  }
  const st = STATE_ALIAS[w.state] ?? w.state;
  const pool = (NATIONWIDE.has(st) ? ours.map((o) => ({ ...o, k: norm(o.name), short: norm(o.name.split(",")[0]), g: grams(norm(o.name)) })) : byState.get(st) ?? []).filter((o) => streamOk(w.course, o.name));
  const n = norm(w.college);
  // 1. exact / 2. ours is its start or sits wholly inside it
  let hit = pool.filter((o) => o.k === n || o.short === n);
  let how = "exact";
  if (hit.length !== 1) {
    const cands = pool.filter((o) => o.short.length >= 8 && (n.startsWith(o.short) || n.includes(` ${o.short} `) || n.startsWith(o.k) || o.k.startsWith(n) && n.split(" ").length >= 3) && markersAgree(n, o.k));
    const best = Math.max(0, ...cands.map((o) => o.short.length));
    hit = cands.filter((o) => o.short.length === best);
    how = "start";
  }
  if (hit.length === 1) {
    out[key] = { id: hit[0].id, how, ours: hit[0].name };
    how === "exact" ? exact++ : start++;
    continue;
  }
  // 3. score
  const df = new Map();
  for (const o of pool) for (const x of new Set(o.k.split(" "))) df.set(x, (df.get(x) ?? 0) + 1);
  const words = new Set(n.split(" ").filter((x) => !STOP.has(x) && x.length > 1));
  const g = grams(n);
  const scoredList = pool
    .filter((o) => markersAgree(n, o.k))
    .map((o) => {
      const ow = new Set(o.k.split(" ").filter((x) => !STOP.has(x) && x.length > 1));
      let share = 0, total = 0;
      for (const x of new Set([...words, ...ow])) {
        const wgt = 1 / (df.get(x) ?? 1);
        total += wgt;
        if (words.has(x) && ow.has(x)) share += wgt;
      }
      return { o, s: 0.6 * (total ? share / total : 0) + 0.4 * tri(g, o.g) };
    })
    .sort((a, b) => b.s - a.s);
  const [a, b] = scoredList;
  if (a && a.s >= 0.62 && (!b || a.s - b.s >= 0.12)) {
    out[key] = { id: a.o.id, how: `score ${a.s.toFixed(2)}`, ours: a.o.name };
    scored++;
    continue;
  }
  pending.push({ key, w, top: scoredList.slice(0, 8).map((x) => `${x.o.id} ${x.o.name}${NATIONWIDE.has(st) ? ` [${x.o.state}]` : ""} (${x.s.toFixed(2)})`) });
}
writeFileSync(OUT, JSON.stringify(out, null, 1));
writeFileSync(OUT.replace(".json", "_pending.json"), JSON.stringify(pending, null, 1));
console.log(`names ${want.size}: decision ${byDecision}, exact ${exact}, start ${start}, scored ${scored}, pending ${pending.length}`);
if (SHOW) for (const [k, v] of Object.entries(out)) if (v.how !== "decision") console.log(`  ${v.how.padEnd(11)} ${k}  ->  ${v.id} ${v.ours}`);
console.log("\n-- pending (decide in " + DECISIONS + ")");
for (const p of pending) console.log(`${p.key}  [${p.w.lines} lines, code ${p.w.code ?? "-"}]\n     ${p.top.join("\n     ") || "(no candidate in our list for this state)"}`);
