/**
 * DNB hospitals in MCC's NEET PG 2026 lists that we held no entry for (owner, 2026-11-28: "Yes go AHEAD", after
 * scripts/sql/mcc_dnb_names_2026_11_28.mjs matched every name that had one). One PG institute per hospital, named the way
 * our DNB entries are (NBEMS's style, "<Name>, <City>, <State>-<PIN>", the PIN marking it as the DNB entry), and MCC's 2026
 * matrix and allotment rows that name it moved onto it.
 *
 * Before anything is created, MCC's names whose hospital we already hold under another name — MCC prints a former name in
 * brackets, or no PIN — go to that entry (EXISTING, each decided by hand on 2026-11-28 from a list of our entries in the
 * same state sharing a distinctive word, the bracketed former name counted).
 *
 * A hospital is MCC's name before its first comma (address text and "M/s." trimmed), grouped by PIN — one hospital prints
 * its name several ways across Round 1, Round 2 and the added-seats matrix. The PIN is the one MCC prints after the state
 * ("Kerala-673016"); the six-digit numbers in brackets in the matrix ("(700696)") are NBEMS codes, never a PIN. The state
 * comes from MCC's "<State>-<PIN>", else from a place we know in the name, else from the PIN's first three digits as our
 * other entries use them; the city is a place we know (our entries' own place names) in MCC's address. Its type only where
 * the name itself says so — "Pvt Ltd", "Private Limited", "LLP", "(A unit of …)" → private; ESIC/ESI, district, sadar,
 * civil, sub-divisional, railway, municipal, headquarters hospitals, autonomous state medical colleges, "Government" →
 * government — else "other" (no type is shown). Source ids 99126 onwards are ours. DNB and NBE rows only.
 *
 *   node --env-file=.env.local scripts/sql/new_dnb_hospitals_2026_11_28.mjs            # dry run: every hospital
 *   node --env-file=.env.local scripts/sql/new_dnb_hospitals_2026_11_28.mjs --apply --backup <file>
 *   node --env-file=.env.local scripts/sql/new_dnb_hospitals_2026_11_28.mjs --restore <file>
 */
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const apply = args.includes("--apply");
const backup = opt("--backup");
const restore = opt("--restore");
if (apply && !backup) throw new Error("--apply needs --backup <file>");
const METHOD = "admin-2026-11-28-dnb-new";
const FIRST_ID = 99126;
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

if (restore) {
  const b = JSON.parse(readFileSync(restore, "utf8"));
  await sql.begin(async (tx) => {
    await tx`UPDATE mcc_allotments SET institute_id = NULL, match_confidence = NULL, match_method = NULL WHERE id IN ${tx(b.allot.length ? b.allot : [0])}`;
    await tx`UPDATE mcc_allotments SET state = NULL WHERE id IN ${tx(b.stateWasNull.length ? b.stateWasNull : [0])}`;
    await tx`UPDATE mcc_seat_matrix SET institute_id = NULL, match_confidence = NULL, match_method = NULL WHERE id IN ${tx(b.matrix.length ? b.matrix : [0])}`;
    await tx`DELETE FROM institutes WHERE id IN ${tx(b.institutes.length ? b.institutes : [0])}`;
  });
  console.log(`restored: removed ${b.institutes.length} institutes, unmatched ${b.allot.length + b.matrix.length} rows`);
  await sql.end();
  process.exit(0);
}

/** MCC's name (letters only, its start) → the entry we already hold for that hospital. */
const EXISTING = [
  ["narayanahrudayalayahospitalformerlysparsh", 1004], // Narayana Hrudayalaya (Prev. Sparsh Hospital, Bommasandra)
  ["rainbowchildrenshospitalandprashanthi", 1079], // Prashanthi Hospital, Hanamkonda — "formerly known as Prashanthi Hospital"
  ["coimbatorechildtrusthospitals", 1451],
  ["marengoasiahealthcareprivatelimitedformerlyknownascare", 813], // Care / CIMS Hospital, Sola, Ahmedabad
  ["prafullachandrasengovernmentmedicalcollegeandhospitalformerlyarambagh", 1197], // the DNB entry: Arambagh SDH
  ["bharatcancerhospital", 633],
  ["subdivisionalhospitalsagara", 1579],
  ["commandhospitalairforce", 1855],
  ["commandhospitalchandimandir", 1844],
  ["ahoojaeyeanddentalinstitute", 1555],
  ["medicasuperspecialtyhospital", 319], // Manipal Hospitals EM Bypass (Prev. Medica Superspecialty Hospital)
  ["govtmedicalcollegebmedicalenclavejammu", 57], // "Govt. Medical College, B-5, Medical Enclave, Jammu"
  ["yashwantraochavanmemorialhospital", 59], // the PCMC PG Institute at YCM Hospital, Pimpri
  ["generalhospitaloppstdeopt", 1670], // General Hospital, Raj Mahel Road, Mehsana
];
const existingFor = (name) => {
  const k = String(name).toLowerCase().replace(/[^a-z]/g, "");
  return EXISTING.find(([h]) => k.startsWith(h))?.[1] ?? null;
};

const noCode = (t) => String(t).replace(/\(\d{6}\)/g, " ");
/** The PIN MCC prints after the state ("Kerala-673016"), else the last six-digit number that is not an NBEMS code. */
const pinOf = (t) => {
  const x = noCode(t);
  const m = x.match(/[A-Za-z.)]\s*[-–]\s*(\d{3})\s?(\d{3})(?!\d)/);
  if (m) return m[1] + m[2];
  const all = [...x.matchAll(/(?<![\d/-])(\d{6})(?![\d/])/g)];
  return all.length ? all[all.length - 1][1] : null;
};
const DNB_COURSE = (c) => /^(DNB|DrNB|FNB)\b|^\(NBEMS|NBE\b|-NBE/i.test(c ?? "");
const letters = (s) => String(s).toLowerCase().replace(/[^a-z]/g, "");

const STATES = (await sql`SELECT id, name FROM states`).map((s) => ({ ...s, key: letters(s.name) }));
const ALIAS = { orissa: "Odisha", pondicherry: "Puducherry", jammukashmir: "Jammu and Kashmir", delhincr: "Delhi", newdelhi: "Delhi" };
const stateByKey = (k) => STATES.find((s) => s.key === k) ?? STATES.find((s) => s.name === ALIAS[k]) ?? null;
/** "<State>-<digits>" anywhere in MCC's text ("Maharashtra-18", "West Bengal-0" count too). */
const stateFromText = (t) => {
  for (const seg of noCode(t).split(",")) {
    const m = seg.trim().match(/([A-Za-z .&]+?)\s*-\s*\d/);
    if (m) {
      const hit = stateByKey(letters(m[1]));
      if (hit) return hit;
    }
  }
  return null;
};

// Places we know: the place our PG entries name before their "<State>-<PIN>" (and their city), with the state.
const places = new Map(); // place (lower) -> state name
const pinState = new Map(); // first three PIN digits -> Map(state -> count)
for (const r of await sql`SELECT i.name, i.city, st.name state FROM institutes i JOIN states st ON st.id = i.state_id WHERE i.level = 'pg'`) {
  const segs = r.name.split(",").map((x) => x.trim());
  const last = segs[segs.length - 1] ?? "";
  const m = last.match(/-(\d{3})(\d{3})\b/);
  if (m) {
    const e = pinState.get(m[1]) ?? new Map();
    e.set(r.state, (e.get(r.state) ?? 0) + 1);
    pinState.set(m[1], e);
    const place = segs[segs.length - 2];
    if (place && place.length <= 22 && !/\d/.test(place)) places.set(place.toLowerCase(), r.state);
  }
  if (r.city && r.city.length <= 22) places.set(r.city.toLowerCase(), r.state);
}
for (const [k] of places) if (k.length < 4 || /hospital|college|road|nagar$|sector|colony/.test(k)) places.delete(k);
const stateFromPin = (pin) => {
  const e = pinState.get(pin.slice(0, 3));
  if (!e) return null;
  const [best] = [...e].sort((a, b) => b[1] - a[1]);
  return STATES.find((s) => s.name === best[0]) ?? null;
};
/** The place we know that MCC's address names last before the PIN (or anywhere, if there is no PIN). */
const STATE_WORDS = [...STATES.map((s) => s.name.toLowerCase()), "jammu & kashmir", "jammu and kashmir", "orissa", "pondicherry"].sort((a, b) => b.length - a.length);
const STATE_NAMES = new Set(STATES.map((s) => s.name.toLowerCase()));
const placeIn = (t, state) => {
  let x = noCode(t).toLowerCase();
  // A state's name is never the city ("Jammu" inside "Jammu and Kashmir"): blanked, the length kept.
  for (const w of STATE_WORDS) x = x.split(w).join(" ".repeat(w.length));
  const pinAt = (() => {
    const p = pinOf(t);
    return p ? x.indexOf(p.slice(0, 3)) : -1;
  })();
  const scope = pinAt > 0 ? x.slice(0, pinAt) : x;
  let best = null;
  for (const [place, st] of places) {
    if (STATE_NAMES.has(place)) continue;
    if (state && st !== state.name) continue;
    const i = scope.lastIndexOf(place);
    if (i < 0) continue;
    const before = scope[i - 1];
    const after = scope[i + place.length];
    if ((before && /[a-z]/.test(before)) || (after && /[a-z]/.test(after))) continue;
    const end = i + place.length;
    // The place that ends last wins; on a tie the longer ("Navi Mumbai" over "Mumbai").
    if (!best || end > best.end || (end === best.end && place.length > best.place.length)) best = { place, st, i, end };
  }
  return best;
};
/**
 * No place we know: the town MCC prints just before "<State>-<PIN>" ("…, Dibiyapur Road, Auraiya, Uttar Pradesh-206122"),
 * else its second part ("Kasturba Medical College, Jhagadia, Gujarat-…"), when it reads like a town, not an address.
 */
const townLike = (seg) => {
  const s = String(seg ?? "").replace(/\(.*?\)/g, " ").trim();
  if (!s || s.length > 20 || /\d|road|marg|nagar|no\b|plot|opp|near|sector|colony|street|lane|floor|block|po\b|dist|line\b/i.test(s)) return null;
  if (s.split(/\s+/).length > 2 || STATE_NAMES.has(s.toLowerCase())) return null;
  return s.replace(/\b[a-z]/gi, (c) => c.toUpperCase()).replace(/\B[A-Z]+/g, (w) => w.toLowerCase());
};
const townIn = (t) => {
  const segs = noCode(t).split(",").map((x) => x.trim());
  const st = segs.findIndex((x) => /[A-Za-z]\s*-\s*\d/.test(x));
  return (st > 1 ? townLike(segs[st - 1]) : null) ?? townLike(segs[1]);
};

const ACRONYM = new Set("KIMS ESIC ESI MGM MCH DVC SP SN BP ACT HCG LLP SDM CIMS AIIMS GMC SRM TB ENT ICU II III IV KMC MY RG RGK".split(" "));
const title = (s) =>
  String(s)
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => {
      const bare = w.replace(/[^A-Za-z]/g, "").toUpperCase();
      if (bare.length > 1 && ACRONYM.has(bare)) return w.toUpperCase();
      if (/\d/.test(w) || /^[A-Z][a-z]/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/ (And|Of|For|The|In|At|With) /g, (x) => x.toLowerCase());
const placeTitle = (p) => p.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** MCC's name before its first comma, without "M/s.", a former name in brackets, or address text run into it. */
const head = (n) =>
  noCode(n)
    .split(",")[0]
    .replace(/\(.*?\)/g, " ")
    .replace(/^\s*m\/s\.?\s*/i, "")
    .replace(/\s+(survey no|no\s?\.?\s?[\dc]|plot|opp\.?|near|#|d\.?\s?no|h\.?\s?no|ground floor|\d+\s*\/|\d+\s*-\s*\d).*$/i, "")
    .replace(/\s+(?:(?!hospitals?\b|centre\b|center\b|college\b|institute\b|and\b)[a-z]+\s+){1,3}(road|marg)\b.*$/i, "")
    .replace(/\s+(pvt\.?\s*ltd\.?|private limited|llp)\b.*$/i, "")
    .replace(/\bluycknow\b/i, "")
    .replace(/^dr\.r\.g\.k\b/i, "Dr RGK")
    .replace(/\s+/g, " ")
    .trim();

const GOVT = /\b(autonomous state medical college|e\.?s\.?i\.?c\.?|government|govt\.?|district hospital|distric hopital|sadar hospital|civil hospital|esi hospital|railway|combined hospital|sub[ -]?divisional|municipal|headquarters? hospital|district headquarter|area hospital|taluk(a)? hospital|zonal hospital|referral hospital|community health cent|state hospital|bedded mch)\b/i;
const PRIV = /\b(pvt|private limited|private ltd|ltd|llp)\b|\(p\)|a unit of/i;

const rows = [
  ...(await sql`SELECT 'allot' t, id, mcc_college_name n, mcc_course c, state FROM mcc_allotments WHERE year = 2026 AND institute_id IS NULL`),
  ...(await sql`SELECT 'matrix' t, id, mcc_college_name n, mcc_course c, state FROM mcc_seat_matrix WHERE year = 2026 AND institute_id IS NULL`),
].filter((r) => DNB_COURSE(r.c));

const groups = new Map();
const toExisting = [];
for (const r of rows) {
  const ex = existingFor(r.n);
  if (ex) {
    toExisting.push({ ...r, id: ex });
    continue;
  }
  const pin = pinOf(r.n);
  const h = head(r.n);
  const key = `${pin ?? "-"}|${letters(h).slice(0, 14)}`;
  const g = groups.get(key) ?? { pin, heads: new Map(), names: new Set(), rows: [], texts: [] };
  g.heads.set(h, (g.heads.get(h) ?? 0) + 1);
  g.names.add(r.n);
  g.rows.push(r);
  g.texts.push(r.n);
  groups.set(key, g);
}
// A name MCC printed without a PIN joins the group of the same hospital name that has one (Gupta Hospital, Kathua).
for (const [key, g] of groups) {
  if (g.pin) continue;
  const hk = key.split("|")[1];
  const twin = [...groups].find(([k, x]) => x.pin && k.split("|")[1] === hk);
  if (twin) {
    twin[1].rows.push(...g.rows);
    twin[1].texts.push(...g.texts);
    for (const n of g.names) twin[1].names.add(n);
    for (const [h, c] of g.heads) twin[1].heads.set(h, (twin[1].heads.get(h) ?? 0) + c);
    groups.delete(key);
  }
}

const plan = [];
let nextId = FIRST_ID;
const taken = new Set((await sql`SELECT slug FROM institutes`).map((r) => r.slug));
const slugify = (s) => s.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 170);
for (const g of [...groups.values()].sort((a, b) => b.rows.length - a.rows.length)) {
  // The spelling MCC printed in mixed case if it ever did, else the most printed one.
  const heads = [...g.heads.keys()].sort((a, b) => Number(/[a-z]/.test(b)) - Number(/[a-z]/.test(a)) || g.heads.get(b) - g.heads.get(a));
  const name0 = title(heads[0]);
  let state = g.texts.map(stateFromText).find(Boolean) ?? null;
  const place = g.texts.map((t) => placeIn(t, state)).find(Boolean) ?? null;
  if (!state && place) state = STATES.find((s) => s.name === place.st) ?? null;
  if (!state && g.pin) state = stateFromPin(g.pin);
  if (!state) {
    plan.push({ skip: "no state", name0, g });
    continue;
  }
  const city = place && place.st === state.name ? placeTitle(place.place) : g.texts.map(townIn).find(Boolean) ?? null;
  const cityPart = city && !letters(name0).includes(letters(city)) ? `, ${city}` : "";
  const full = `${name0}${cityPart}, ${state.name}${g.pin ? `-${g.pin}` : ""}`;
  const ownership = GOVT.test(heads.join(" ")) ? "government" : PRIV.test([...g.names].join(" ")) ? "private" : "other";
  let slug = slugify(full);
  if (taken.has(slug)) slug = `${slug}-${nextId}`;
  taken.add(slug);
  plan.push({ sid: nextId++, full, slug, state, city, ownership, g });
}

const made = plan.filter((p) => !p.skip);
const exIds = [...new Set(toExisting.map((r) => r.id))];
const exNames = new Map((exIds.length ? await sql`SELECT id, name FROM institutes WHERE id IN ${sql(exIds)}` : []).map((r) => [r.id, r.name]));
console.log(`to entries we hold: ${toExisting.length} rows`);
for (const id of exIds) console.log(`  ${String(toExisting.filter((r) => r.id === id).length).padStart(3)} → ${id} ${exNames.get(id)?.slice(0, 80)}`);
console.log(`\n${made.length} new hospitals from ${rows.length - toExisting.length} rows; ${plan.length - made.length} without a state`);
console.log("types:", JSON.stringify(made.reduce((m, p) => ((m[p.ownership] = (m[p.ownership] ?? 0) + 1), m), {})));
for (const p of plan) {
  if (p.skip) console.log(`  SKIP (${p.skip}) ${p.name0} ← ${[...p.g.names][0].slice(0, 100)}`);
  else console.log(`  ${String(p.g.rows.length).padStart(3)} ${p.ownership.padEnd(10)} ${p.full.slice(0, 110)}${p.g.heads.size > 1 ? `   [${p.g.heads.size} spellings]` : ""}`);
}

const out = { institutes: [], allot: [], matrix: [], stateWasNull: [] };
const STATE_OF = new Map((await sql`SELECT i.id, st.name FROM institutes i LEFT JOIN states st ON st.id = i.state_id WHERE i.id IN ${sql(exIds.length ? exIds : [0])}`).map((r) => [r.id, r.name]));
try {
  await sql.begin(async (tx) => {
    const move = async (list, id, state) => {
      const al = list.filter((r) => r.t === "allot");
      const mx = list.filter((r) => r.t === "matrix");
      if (al.length)
        await tx`UPDATE mcc_allotments SET institute_id = ${id}, match_confidence = 1, match_method = ${METHOD}, state = COALESCE(state, ${state}) WHERE id IN ${tx(al.map((r) => r.id))}`;
      if (mx.length) await tx`UPDATE mcc_seat_matrix SET institute_id = ${id}, match_confidence = 1, match_method = ${METHOD} WHERE id IN ${tx(mx.map((r) => r.id))}`;
      out.allot.push(...al.map((r) => r.id));
      out.matrix.push(...mx.map((r) => r.id));
      out.stateWasNull.push(...al.filter((r) => r.state == null).map((r) => r.id));
    };
    for (const id of exIds) await move(toExisting.filter((r) => r.id === id), id, STATE_OF.get(id) ?? null);
    for (const p of made) {
      const id = (
        await tx`INSERT INTO institutes (source_id, name, slug, level, ownership, state_id, city, district, is_active, created_at, updated_at)
                 VALUES (${p.sid}, ${p.full}, ${p.slug}, 'pg', ${p.ownership}, ${p.state.id}, ${p.city}, ${p.city}, true, now(), now()) RETURNING id`
      )[0].id;
      out.institutes.push(id);
      await move(p.g.rows, id, p.state.name);
    }
    console.log(`\n${out.institutes.length} institutes created; ${out.allot.length} allotment rows, ${out.matrix.length} matrix rows matched`);
    if (!apply) throw new Error("dry run — rolled back");
    writeFileSync(backup, JSON.stringify(out, null, 1));
    console.log(`applied; undo with --restore ${backup}`);
  });
} catch (e) {
  if (!String(e.message).startsWith("dry run")) throw e;
  console.log("(dry run — nothing written; pass --apply --backup <file>)");
}
await sql.end();
