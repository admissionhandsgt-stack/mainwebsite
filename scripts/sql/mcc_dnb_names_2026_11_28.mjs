/**
 * MCC's NEET PG 2026 lists name ~550 DNB hospitals no way the round ingest could match (owner, 2026-11-28: "yes proceed",
 * after the college-mapping audit): Round 1 prints "<name>, <address>, <state>-<PIN>,<address again>" and Round 2 and the
 * added-seats matrix their own spellings. Matched here three ways, and never by a PIN alone (a PIN-only match paired
 * Gleneagles with Wadia Children's Hospital):
 *   history        the same hospital name (before its first comma) and PIN as a name MCC printed in an earlier, already
 *                  matched list (2024–25 allotments, the matrix) that points to exactly one of our institutes;
 *   pin+samename   one of our PG entries at that PIN has the same name, letters only ("NEOCLINIC" = "Neo Clinic");
 *   pin+word       one of our PG entries at that PIN shares a distinctive word of the hospital's name — not a place,
 *                  not "hospital", "women", "children" ("Ankura … Women and Children" is not "Rainbow … Women and Children").
 * Everything else (a hospital we do not hold, two candidates, no PIN) is left unmatched and listed. DNB rows only.
 *
 *   node --env-file=.env.local scripts/sql/mcc_dnb_names_2026_11_28.mjs            # dry run: counts + every name match
 *   node --env-file=.env.local scripts/sql/mcc_dnb_names_2026_11_28.mjs --apply --backup <file>
 *   node --env-file=.env.local scripts/sql/mcc_dnb_names_2026_11_28.mjs --restore <file>
 */
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const apply = args.includes("--apply");
const backup = opt("--backup");
const restore = opt("--restore");
if (apply && !backup) throw new Error("--apply needs --backup <file>");
const METHOD = "admin-2026-11-28-dnb";
const ACCEPT = new Set(["history", "pin+samename", "pin+word", "pin+word+dnb"]);
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

if (restore) {
  const b = JSON.parse(readFileSync(restore, "utf8"));
  await sql.begin(async (tx) => {
    await tx`UPDATE mcc_allotments SET institute_id = NULL, match_confidence = NULL, match_method = NULL WHERE id IN ${tx(b.allot.length ? b.allot : [0])}`;
    await tx`UPDATE mcc_allotments SET state = NULL WHERE id IN ${tx(b.stateWasNull.length ? b.stateWasNull : [0])}`;
    await tx`UPDATE mcc_seat_matrix SET institute_id = NULL, match_confidence = NULL, match_method = NULL WHERE id IN ${tx(b.matrix.length ? b.matrix : [0])}`;
  });
  console.log(`restored ${b.allot.length} allotment and ${b.matrix.length} matrix rows`);
  await sql.end();
  process.exit(0);
}


const PIN = /(?:^|[\s,\-–(])(\d{3})\s?(\d{3})(?=$|[\s,)\-.])/;
const pinOf = (s) => { const m = String(s).match(PIN); return m ? m[1] + m[2] : null; };
const GENERIC = new Set("women woman children childrens child kids mother mothers the of and a an at in for hospital hospitals medical college institute institutes sciences science research centre center super speciality specialty multi multispeciality multispecialty general pvt ltd limited private unit road nagar near opp opposite no plot sector street lane main district city new old east west north south area colony post po ps dist state india trust society memorial health healthcare care clinic clinics foundation company group sri shri dr st".split(" "));
const STATES = "andhra pradesh arunachal assam bihar chhattisgarh goa gujarat haryana himachal jharkhand karnataka kerala madhya maharashtra manipur meghalaya mizoram nagaland odisha orissa punjab rajasthan sikkim tamil nadu telangana tripura uttar uttarakhand bengal delhi jammu kashmir ladakh puducherry pondicherry chandigarh".split(" ");
const words = (s) => new Set(String(s).toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !GENERIC.has(w) && !STATES.includes(w)));
const head = (s) => String(s).split(",")[0].toLowerCase().replace(/[^a-z]/g, "");

// history: every MCC name already matched (allotments any year + matrix)
const hist = await sql`SELECT mcc_college_name n, institute_id id FROM mcc_allotments WHERE institute_id IS NOT NULL GROUP BY 1,2
                       UNION SELECT mcc_college_name, institute_id FROM mcc_seat_matrix WHERE institute_id IS NOT NULL GROUP BY 1,2`;
const ours = await sql`SELECT i.id, i.name, st.name state,
   EXISTS (SELECT 1 FROM closing_ranks cr JOIN courses c ON c.id=cr.course_id WHERE cr.institute_id=i.id AND (c.name ILIKE 'DNB%' OR c.name ILIKE '%-NBE%' OR c.name ILIKE 'FNB%')) dnb
   FROM institutes i LEFT JOIN states st ON st.id=i.state_id WHERE i.level='pg' AND i.is_active`;
const byPin = new Map();
for (const o of ours) { const p = pinOf(o.name); if (p) (byPin.get(p) ?? byPin.set(p, []).get(p)).push({ ...o, w: words(o.name), hw: words(o.name.split(",")[0]) }); }
const histKey = new Map(); // head+pin -> set of ids
for (const h of hist) { const p = pinOf(h.n); if (!p) continue; const k = head(h.n) + "|" + p; (histKey.get(k) ?? histKey.set(k, new Set()).get(k)).add(h.id); }

function decide(name) {
  const p = pinOf(name);
  if (!p) return { how: "no-pin" };
  const hk = histKey.get(head(name) + "|" + p);
  if (hk && hk.size === 1) return { how: "history", id: [...hk][0] };
  const cands = byPin.get(p) ?? [];
  if (!cands.length) return { how: "no-candidate", pin: p };
  const letters = (x) => String(x).split(",")[0].toLowerCase().replace(/(.*?)/g, "").replace(/[^a-z]/g, "");
  const same = cands.filter((c) => { const a = letters(name), b = letters(c.name); return a.length >= 8 && (a === b || (b.length >= 10 && a.startsWith(b)) || (a.length >= 10 && b.startsWith(a))); });
  if (same.length === 1) return { how: "pin+samename", id: same[0].id };
  const w = words(name.split(",")[0]);
  const scored = cands.map((c) => ({ c, s: [...w].filter((x) => c.hw.has(x)).length })).sort((a, b) => b.s - a.s || Number(b.c.dnb) - Number(a.c.dnb));
  const [best, second] = scored;
  if (best.s >= 1 && (!second || second.s < best.s)) return { how: "pin+word", id: best.c.id, words: best.s };
  if (best.s >= 1 && second && second.s === best.s) {
    const dnbOnly = scored.filter((x) => x.s === best.s && x.c.dnb);
    if (dnbOnly.length === 1) return { how: "pin+word+dnb", id: dnbOnly[0].c.id };
    return { how: "tie", ids: scored.filter((x) => x.s === best.s).map((x) => x.c.id) };
  }
  if (cands.length === 1) return { how: "pin-only-rejected", pin: p };
  return { how: "pin-many-no-word", ids: cands.map((c) => c.id) };
}


const un = await sql`SELECT mcc_college_name n, count(*)::int c FROM mcc_allotments WHERE year = 2026 AND institute_id IS NULL GROUP BY 1`;
const unm = await sql`SELECT mcc_college_name n, count(*)::int c FROM mcc_seat_matrix WHERE year = 2026 AND institute_id IS NULL GROUP BY 1`;
const nameOf = new Map(ours.map((o) => [o.id, o]));
const tally = {};
const plan = [];
for (const [table, list] of [["allot", un], ["matrix", unm]]) {
  for (const r of list) {
    const d = decide(r.n);
    const k = `${table} ${d.how}`;
    tally[k] = tally[k] ?? { names: 0, rows: 0 };
    tally[k].names++;
    tally[k].rows += r.c;
    if (ACCEPT.has(d.how)) plan.push({ table, name: r.n, id: d.id, how: d.how, rows: r.c });
  }
}
console.log(JSON.stringify(tally, null, 1));
const seen = new Set();
for (const p of plan.filter((p) => p.how !== "history")) {
  const k = p.name.split(",")[0] + "|" + p.id;
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(`  ${p.how.padEnd(13)} ${p.name.split(",")[0].trim().slice(0, 55).padEnd(55)} => ${nameOf.get(p.id)?.name.split(",")[0].slice(0, 55)}`);
}

const out = { allot: [], matrix: [], stateWasNull: [] };
try {
  await sql.begin(async (tx) => {
    for (const p of plan) {
      const inst = nameOf.get(p.id);
      if (p.table === "allot") {
        const rows = await tx`SELECT id, state FROM mcc_allotments WHERE year = 2026 AND institute_id IS NULL AND mcc_college_name = ${p.name}`;
        if (!rows.length) continue;
        await tx`UPDATE mcc_allotments SET institute_id = ${p.id}, match_confidence = 0.9, match_method = ${METHOD}, state = COALESCE(state, ${inst?.state ?? null})
                  WHERE id IN ${tx(rows.map((r) => r.id))}`;
        out.allot.push(...rows.map((r) => r.id));
        out.stateWasNull.push(...rows.filter((r) => r.state == null).map((r) => r.id));
      } else {
        const rows = await tx`UPDATE mcc_seat_matrix SET institute_id = ${p.id}, match_confidence = 0.9, match_method = ${METHOD}
                                WHERE year = 2026 AND institute_id IS NULL AND mcc_college_name = ${p.name} RETURNING id`;
        out.matrix.push(...rows.map((r) => r.id));
      }
    }
    console.log(`
matched: ${out.allot.length} allotment rows, ${out.matrix.length} matrix rows`);
    if (!apply) throw new Error("dry run — rolled back");
    writeFileSync(backup, JSON.stringify(out, null, 1));
    console.log(`applied; undo with --restore ${backup}`);
  });
} catch (e) {
  if (!String(e.message).startsWith("dry run")) throw e;
  console.log("(dry run — nothing written; pass --apply --backup <file>)");
}
await sql.end();
