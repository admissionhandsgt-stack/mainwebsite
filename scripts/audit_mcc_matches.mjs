// Which source names were matched to an institute that shares no distinctive word with them? (2026-11-05)
// "Government Medical College, Vidisha, MP" had been matched to GMC Chhindwara at 0.805 — generic words alone.
//   node --env-file=.env.local scripts/audit_mcc_matches.mjs [out.json]
import { writeFileSync } from "node:fs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const GENERIC = new Set(
  ("government govt medical college colleges hospital hospitals institute institutes institution of and the sciences science " +
    "research centre center centres health post graduate postgraduate education autonomous state society district general " +
    "civil memorial multi speciality specialty super superspeciality multispeciality trust charitable private limited ltd " +
    "road nagar near opp opposite sector colony marg main street campus city town village dist tehsil taluk pin " +
    "india indian national regional mch gmc gmch ims iims rims aiims cum with for medicine rural urban new old " +
    "teaching care cancer eye heart children women maternity mission missionary christian jain sri shri shree smt " +
    "dr doctor late saint st university deemed nbems dnb nbe pg ug mp up mah tn ka ap ts wb hp uk jk").split(" "),
);
const norm = (s) => String(s ?? "").toLowerCase().replace(/&#0?39;|'/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const words = (s) => norm(s).split(" ").filter((w) => w.length >= 3 && !GENERIC.has(w) && !/^\d+$/.test(w));
// "Sawai Man Singh" ~ "SMS": the initials of a run of distinctive words.
const initials = (ws) => ws.map((w) => w[0]).join("");

const states = (await sql`SELECT name FROM states`).flatMap((s) => norm(s.name).split(" "));
const STATEWORDS = new Set(states.filter((w) => w.length >= 3));
const distinct = (s) => words(s).filter((w) => !STATEWORDS.has(w));

const inst = new Map(
  (await sql`SELECT i.id, i.name, i.city, i.district, s.name AS state FROM institutes i LEFT JOIN states s ON s.id = i.state_id`).map((r) => [r.id, r]),
);

async function pairs(table, nameCol) {
  return sql.unsafe(`SELECT ${nameCol} AS name, institute_id, count(*)::int AS n FROM ${table} WHERE institute_id IS NOT NULL GROUP BY 1, 2`);
}

const out = [];
for (const [table, col] of [["mcc_seat_matrix", "mcc_college_name"], ["mcc_allotments", "mcc_college_name"], ["pg_seat_terms", "college_name"]]) {
  const ps = await pairs(table, col);
  let flagged = 0;
  for (const p of ps) {
    const i = inst.get(p.institute_id);
    if (!i) continue;
    const src = distinct(p.name);
    const ours = new Set([...distinct(i.name), ...distinct(i.city ?? ""), ...distinct(i.district ?? "")]);
    const shared = src.filter((w) => ours.has(w) || [...ours].some((o) => (o.length >= 5 && w.length >= 5 && (o.startsWith(w.slice(0, 5)) || w.startsWith(o.slice(0, 5))))));
    if (shared.length) continue;
    // Initials either way ("SMS" in one, "Sawai Man Singh" in the other).
    const srcAll = norm(p.name).split(" ");
    const ourAll = norm(i.name).split(" ");
    const ini = (a, b) => a.some((w) => w.length >= 2 && w.length <= 6 && initials(words(b.join(" "))).includes(w));
    if (ini(srcAll, ourAll) || ini(ourAll, srcAll)) continue;
    flagged++;
    out.push({ table, name: p.name, n: p.n, institute_id: p.institute_id, ours: i.name, state: i.state });
  }
  console.log(`${table}: ${ps.length} name→institute pairs, ${flagged} share no distinctive word`);
}
await sql.end();
const file = process.argv[2];
if (file) writeFileSync(file, JSON.stringify(out, null, 1));
for (const o of out.slice(0, 400)) console.log(`${o.table.padEnd(15)} ${String(o.n).padStart(4)} | ${o.name.slice(0, 85)}  →  [${o.institute_id}] ${o.ours.slice(0, 70)}`);
