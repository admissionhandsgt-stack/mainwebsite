// Match MCC's NEET UG allotment institute names to our UG institutes (2026-11-09). Read-only.
//
//   node --env-file=.env.local scripts/ug/match_ug_institutes.mjs <dir with r1.csv … special_stray.csv> [--show]
//
// MCC prints a college as "<name>,<address>" in round 1 and the stray rounds and as the short "<name>" in later
// rounds; our UG institutes carry the short name (the source took MCC's). So a name matches when, normalised, ours
// is the whole MCC name or its start — the longest such of ours wins, and a tie is no match. What is left is scored on
// rare words shared (state-free, so it is only a suggestion) and printed for a person to decide; decisions go in
// scripts/data/ug_mcc_decisions.json (MCC name → institute id, or null for "none of ours"). Writes <dir>/matches.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import postgres from "postgres";

const dir = process.argv[2];
const show = process.argv.includes("--show");
const FILES = ["r1", "r2", "r3", "stray", "special_stray"];
const DECISIONS = "scripts/data/ug_mcc_decisions.json";

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

export const norm = (s) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/\baiims\b/g, "all india institute of medical sciences")
    .replace(/\bgovt\b\.?/g, "government").replace(/\bgoverment\b/g, "government").replace(/\bcoll\b\.?/g, "college")
    .replace(/\binstt\b\.?/g, "institute").replace(/\bmed\b\.?/g, "medical").replace(/\bims\b/g, "institute of medical sciences")
    .replace(/\bmch\b/g, "medical college and hospital")
    .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
    .split(" ").map((w) => PLACE[w] ?? w).join(" ");

// One spelling per town: the two lists spell them differently.
const PLACE = {
  bengaluru: "bangalore", belagavi: "belgaum", mysuru: "mysore", kancheepuram: "kanchipuram", vijaywada: "vijayawada",
  gurugram: "gurgaon", mangaluru: "mangalore", tumakuru: "tumkur", kalaburagi: "gulbarga", vijayapura: "bijapur",
  ballari: "bellary", hubballi: "hubli", puducherry: "pondicherry", varansi: "varanasi", odhisha: "odisha",
  uttrakhand: "uttarakhand", tamilnadu: "tamil", kozikode: "kozhikode", calicut: "kozhikode", trichy: "tiruchirappalli",
  tiruchirapalli: "tiruchirappalli", vadodra: "vadodara", baroda: "vadodara", raebareli: "rae", bathinda: "bhatinda",
  deogarh: "deoghar", gauhati: "guwahati", chennai1: "chennai", davangere: "davanagere", shivamogga: "shimoga",
  thiruvanantampuram: "thiruvananthapuram", trivandrum: "thiruvananthapuram", ananthapuramu: "ananthapuram",
};

// A medical college is never a dental or AYUSH one, and the reverse (MCC also allots B.Sc. Nursing).
const OTHER_STREAM = /dental|dentistry|ayurved|homoeo|homeo|unani|siddha|nursing|yoga|naturopathy|veterinary|pharma/i;
const streamOk = (courses, name) =>
  courses.has("BDS") && !courses.has("MBBS") ? /dental|dentistry/i.test(name) : courses.has("MBBS") ? !OTHER_STREAM.test(name) : true;

// Words that make two colleges different though the rest of the name agrees ("Government Medical College & ESIC
// Hospital, Coimbatore" is not "Coimbatore Medical College"): both names carry it, or neither does.
const MARKERS = [/\besic?\b/, /all india institute of medical sciences/, /\bjipmer\b/, /\bwomen/, /\bcampus (ii|2)\b|\bphulnakhara\b/, /\bcapfims\b/, /\bbhu\b|banaras hindu/, /\bjamia\b/, /armed forces/];
const markersAgree = (a, b) => MARKERS.every((m) => m.test(a) === m.test(b));
// The town or state must show in MCC's whole string (name + address): ours after its last comma, or its state when
// our name has no town ("Chettinad Institute of Medical Education & Research" is in Karnataka; MCC's Chettinad
// Hospital is in Kelambakkam, Tamil Nadu).
const placeOk = (mccNorm, o) => {
  // Every part of our name after its first comma: "Government Medical College, DINDIGUL, Tamil Nadu" names its town
  // before the state.
  const town = o.name.includes(",") ? norm(o.name.slice(o.name.indexOf(",") + 1)).replace(/\b(au|svu|ntruhs|tamil|nadu|pradesh|india|dist|district)\b/g, "").trim() : "";
  const words = town.split(" ").filter((w) => w.length > 3);
  if (words.length && words.some((w) => mccNorm.includes(w))) return true;
  return o.state ? mccNorm.includes(norm(o.state)) : false;
};

const GENERIC = /\b(and|of|the|medical|college|hospital|hospitals|institute|sciences?|research|centre|center|government|india|dental|and)\b/g;
const gramsOf = (s) => {
  const t = ` ${s.replace(GENERIC, " ").replace(/\s+/g, " ").trim()} `;
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

const STOP = new Set("and of the medical college hospital institute sciences science research centre center government dental india".split(" "));

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const ours = await sql`
  SELECT i.id, i.name, st.name AS state,
         EXISTS (SELECT 1 FROM closing_ranks cr WHERE cr.institute_id = i.id AND cr.counselling_id IN (123,126,135,137,146,147,150,153,154,158)) AS mcc
    FROM institutes i LEFT JOIN states st ON st.id = i.state_id
   WHERE i.level = 'ug' AND i.is_active = true`;
await sql.end();

const decisions = existsSync(DECISIONS) ? JSON.parse(readFileSync(DECISIONS, "utf8")) : {};
const names = new Map(); // MCC name -> { n, courses }
for (const f of FILES) {
  const p = `${dir}/${f}.csv`;
  if (!existsSync(p)) continue;
  for (const r of parseCsv(readFileSync(p, "utf8"))) {
    // MBBS and BDS only: B.Sc. Nursing seats have no college page of their own here.
    if (!/^(MBBS|BDS)$/.test(r.course)) continue;
    const x = names.get(r.institute) ?? { n: 0, courses: new Set() };
    x.n++; x.courses.add(r.course);
    names.set(r.institute, x);
  }
}

const normed = ours.map((o) => ({ ...o, k: norm(o.name) }));
const df = new Map();
for (const o of normed) for (const w of new Set(o.k.split(" "))) df.set(w, (df.get(w) ?? 0) + 1);
const rare = (w) => !STOP.has(w) && w.length > 1;

// One college is printed several ways (round 1 "Name, Town,Address", later rounds "Name, Town , Address"): grouped
// by name and town, decided once, and the decision (scripts/data/ug_mcc_decisions.json) is keyed the same way.
export const headKey = (m) => norm(m.split(",").slice(0, 2).join(" "));
const groups = new Map();
for (const [mcc, info] of names) {
  const key = headKey(mcc);
  const g = groups.get(key) ?? { key, names: [], n: 0, courses: new Set(), rep: mcc };
  g.names.push(mcc); g.n += info.n;
  for (const c of info.courses) g.courses.add(c);
  if (mcc.length > g.rep.length) g.rep = mcc;
  groups.set(key, g);
}

const out = {};
let byPrefix = 0, byDecision = 0, open = 0;
const review = [];
const auto = [];
const settle = (g, id) => { for (const m of g.names) if (id != null) out[m] = id; };
for (const g of [...groups.values()].sort((a, b) => b.n - a.n)) {
  const info = g;
  // A decision names the key or its start (the longest that fits wins); "_notes" holds the reasons.
  const dk = Object.keys(decisions).filter((d) => d !== "_notes" && (g.key === d || g.key.startsWith(d + " "))).sort((a, b) => b.length - a.length)[0];
  if (dk) { settle(g, decisions[dk]); byDecision++; continue; }
  // Ours is MCC's whole name, or its start up to a word boundary — for any of the ways MCC prints it.
  const ks = g.names.map(norm);
  const hits = normed.filter((o) => ks.some((k) => k === o.k || k.startsWith(o.k + " ")) && streamOk(info.courses, o.name));
  if (hits.length) {
    const best = Math.max(...hits.map((h) => h.k.length));
    const top = hits.filter((h) => h.k.length === best);
    // Several of ours with one name: prefer the one MCC has allotted before.
    const pick = top.length === 1 ? top[0] : top.filter((t) => t.mcc).length === 1 ? top.find((t) => t.mcc) : null;
    if (pick) { settle(g, pick.id); byPrefix++; continue; }
  }
  const k = norm(g.rep);
  // Suggest by shared rare words, weighted by rarity, over the name and town (the rest is the address): Dice on idf
  // weights, so a short name of ours inside a long one is not a full match.
  const head = g.key;
  const words = new Set(head.split(" ").filter(rare));
  const idf = (w) => 1 / (df.get(w) ?? 1);
  const wA = [...words].reduce((t, w) => t + idf(w), 0);
  const scored = normed
    .filter((o) => streamOk(info.courses, o.name) && markersAgree(k, o.k) && placeOk(k, o))
    .map((o) => {
      const ow = new Set(o.k.split(" ").filter(rare));
      let shared = 0, wB = 0;
      for (const w of ow) { wB += idf(w); if (words.has(w)) shared += idf(w); }
      const dice = wA + wB ? (2 * shared) / (wA + wB) : 0;
      // Spelling differs between the two lists ("Bhaarath" / "Bharat", "Deogarh" / "Deoghar"): letter trigrams of the
      // distinctive words catch what whole words miss.
      return { o, s: Math.max(dice, tri(gramsOf(head), gramsOf(o.k))) };
    })
    .sort((a, b) => b.s - a.s);
  // A clear winner is accepted, and listed so a person can still overrule it in the decisions file.
  const margin = scored[0] ? scored[0].s - (scored[1]?.s ?? 0) : 0;
  if (scored[0] && ((scored[0].s >= 0.6 && margin >= 0.2) || (scored[0].s >= 0.85 && margin >= 0.08))) {
    settle(g, scored[0].o.id);
    auto.push({ key: g.key, n: g.n, pick: `${scored[0].o.id} ${scored[0].o.name} [${scored[0].o.state ?? "?"}] ${scored[0].s.toFixed(2)}` });
    continue;
  }
  open++;
  review.push({ key: g.key, rep: g.rep, n: g.n, courses: [...g.courses].join("/"), top: scored.slice(0, 3).map((x) => `${x.o.id} ${x.o.name} [${x.o.state ?? "?"}] ${x.s.toFixed(2)}${x.o.mcc ? " mcc" : ""}`) });
}

writeFileSync(`${dir}/matches.json`, JSON.stringify(out, null, 1));
const rows = [...names.values()].reduce((t, x) => t + x.n, 0);
const matchedRows = [...names].filter(([m]) => out[m] != null).reduce((t, [, x]) => t + x.n, 0);
console.log({ names: names.size, colleges: groups.size, byPrefix, byScore: auto.length, byDecision, open, rows, matchedRows });
if (show) {
  console.log("\n=== accepted by score (check these)");
  for (const a of auto) console.log(`${a.n} × ${a.key}  ⇒  ${a.pick}`);
  console.log("\n=== open");
  for (const r of review) console.log(`${r.n} × ${r.courses}  "${r.key}"\n      ${r.rep.slice(0, 150)}\n   1) ${r.top[0] ?? "-"}\n   2) ${r.top[1] ?? "-"}`);
}
