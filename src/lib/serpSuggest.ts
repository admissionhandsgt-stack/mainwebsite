/**
 * Real searches, from autocomplete (2026-11-11, owner: "real searches keywords, combinations etc ko search kar paye").
 * Each run asks Google's and Bing's public suggestion endpoints about a handful of seeds — our own entities joined with
 * the words people add (states × "pg stipend", branches × "cutoff", the Hinglish phrasings counsellors hear) — from the
 * server in Mumbai, so the suggestions are India's. What comes back is what people actually type; it is stored in
 * serp_suggest with how often it recurs. Seeds rotate (least recently asked first), a few per hour, at an honest user
 * agent; a refused or failed engine is skipped, never worked around. Free: no API key, no credits. Server only.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getPgStates } from "@/lib/pgStateQueries";

const UA = "AdmissionHands-research/1.0 (+https://www.admissionhands.com)";

/** Branches as India searches them (Search Console's own words where we have them). */
const BRANCHES = [
  "md radiology", "md general medicine", "md dermatology", "md pediatrics", "ms general surgery", "ms obg", "ms orthopaedics",
  "md anesthesia", "ms ent", "ms ophthalmology", "md psychiatry", "md pathology", "md pulmonary medicine", "md emergency medicine",
  "dnb radiology", "dnb general medicine",
];
const STATE_INTENTS = ["pg stipend", "neet pg cutoff", "pg fees", "mbbs seats", "neet pg counselling 2026", "medical colleges"];
const BRANCH_INTENTS = ["cutoff", "seats", "rank", "fees"];
/** The questions themselves, as heads to complete — English and Hinglish (the Hinglish plan of 2026-11-11, §8). */
const HEADS = [
  "neet pg round 2", "neet pg round 3", "neet pg choice filling", "neet pg upgrade", "neet pg free exit", "neet pg stray vacancy round",
  "neet pg 2026 cutoff", "neet pg marks vs rank", "neet pg low rank", "neet pg bond", "neet pg stipend", "dnb vs md", "dnb stipend",
  "deemed university pg fees", "management quota pg", "nri quota md", "new medical colleges 2026", "mbbs fees in",
  "neet ug 2026 cutoff", "neet ug counselling 2026", "mbbs seats in", "neet pg counselling 2026",
  "neet pg me kitne marks", "neet pg marks vs rank hindi", "md radiology ke liye kitni rank", "neet pg counselling kaise kare",
  "neet pg round 2 kaise hota hai", "upgrade kaise hota hai neet pg", "free exit kya hai", "freeze float kya hota hai",
  "seat leaving bond kya hai", "service bond kya hota hai", "neet pg stipend kitna milta hai", "private college md fees kitni",
  "management quota kya hota hai", "aiq vs state quota", "mbbs ke liye kitne marks chahiye", "neet ug counselling kaise hoti hai",
  "domicile kya hota hai neet", "mbbs private college fees kitni", "500 marks mbbs milega kya", "neet counselling fraud",
];
/**
 * How people name a place or a body instead of the state (owner, 2026-11-11: "jaise mai search karta hu JK neet pg
 * website ya pura naam likh ke… city state college university etc"): short state names, the counselling authorities,
 * the health universities, the cities with many medical colleges, and the colleges searched most — each joined with what
 * people ask about it.
 */
const STATE_SHORT = ["jk", "j&k", "up", "mp", "ap", "tn", "wb", "hp", "mh"];
const SHORT_INTENTS = ["neet pg counselling", "neet pg website", "mbbs counselling", "pg stipend"];
const WEBSITE_INTENTS = ["neet pg counselling website", "mbbs counselling website"];
const AUTHORITIES = [
  "kea", "jkbopee", "bopee", "cee kerala", "knruhs", "dr ntr uhs", "upneet", "dgme up", "wbmcc", "uhsr", "bfuhs", "bceceb",
  "ojee", "dmet odisha", "acppgmec", "acpugmec", "amru", "centac", "hnbumu", "mahacet", "cet cell", "tn medical selection",
  "jceceb", "mcc", "nbems", "rguhs", "muhs", "ssuhs", "kaloji university",
];
const AUTHORITY_INTENTS = ["pg counselling", "website", "merit list", "neet pg"];
const CITIES = [
  "mumbai", "pune", "delhi", "bangalore", "chennai", "hyderabad", "kolkata", "jaipur", "lucknow", "ahmedabad", "indore", "nagpur",
  "kanpur", "bhopal", "patna", "mangalore", "coimbatore", "vadodara", "surat", "varanasi",
];
const CITY_SEEDS = (c: string) => [`medical colleges in ${c}`, `pg fees ${c}`, `md ms colleges in ${c}`];
const COLLEGES = [
  "aiims delhi", "pgimer chandigarh", "cmc vellore", "jipmer", "kgmu lucknow", "bhu ims", "jnmc aligarh", "kmc manipal",
  "maulana azad medical college", "afmc pune", "grant medical college", "kem mumbai", "sms jaipur", "bj medical college ahmedabad",
  "madras medical college", "stanley medical college", "osmania medical college", "gandhi medical college hyderabad",
  "bmcri bangalore", "mysore medical college", "gmc nagpur", "gmch chandigarh", "ipgmer kolkata", "rg kar medical college",
  "nrs medical college", "lhmc delhi", "ucms delhi", "vmmc safdarjung", "dy patil pune", "dy patil navi mumbai",
  "bharati vidyapeeth pune", "kmc mangalore", "saveetha medical college", "sri ramachandra medical college", "jnmc wardha",
  "kims bhubaneswar", "ims sum bhubaneswar", "amrita kochi", "sgpgi lucknow", "igims patna", "pmch patna", "rims ranchi",
  "scb cuttack", "gmc srinagar", "gmc jammu",
];
const COLLEGE_INTENTS = ["pg fees", "pg stipend", "cut off"];

/** A suggestion is ours to study only when it is about medical admission. */
const RELEVANT =
  /\b(neet|pg|mbbs|bds|md|ms|dnb|mds|medical|stipend|counsel+ing|bond|seat|seats|cut ?off|rank|marks|fees?|quota|college|aiims|jipmer|nmc|mcc|choice|round|upgrade|freeze|float|domicile|website|portal|merit list|kea|bopee|jkbopee|wbmcc|bfuhs|bceceb|uhsr|knruhs|upneet|acppgmec|acpugmec|amru|centac|hnbumu|nbems|mahacet|ojee|jceceb)\b/i;
/** …and not about another course or exam the same boards run. */
const OTHER =
  /\b(nursing|pharm\w*|b\.?\s?sc|m\.?\s?sc|bams|bhms|bums|ayush|physio\w*|paramedical|engineering|b\.?\s?tech|polytechnic|iti|b\.?\s?ed|d\.?\s?el\.?\s?ed|llb|law|mba|bca|ug cet|kcet|jee|cuet|recruitment|vacancy for|job|jobs)\b/i;

export async function buildSeeds(): Promise<string[]> {
  const states = (await getPgStates().catch(() => [])).map((s) => s.name.toLowerCase());
  const out = new Set<string>(HEADS);
  for (const st of states) for (const i of STATE_INTENTS) out.add(i === "medical colleges" ? `medical colleges in ${st}` : `${st} ${i}`);
  for (const st of states) for (const i of WEBSITE_INTENTS) out.add(`${st} ${i}`);
  for (const st of STATE_SHORT) for (const i of SHORT_INTENTS) out.add(`${st} ${i}`);
  for (const a of AUTHORITIES) for (const i of AUTHORITY_INTENTS) out.add(`${a} ${i}`);
  for (const c of CITIES) for (const x of CITY_SEEDS(c)) out.add(x);
  for (const c of COLLEGES) for (const i of COLLEGE_INTENTS) out.add(`${c} ${i}`);
  for (const b of BRANCHES) for (const i of BRANCH_INTENTS) out.add(`${b} ${i}`);
  return [...out];
}

async function ask(url: string, pick: (j: unknown) => unknown): Promise<string[]> {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return [];
    const list = pick(await r.json());
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string").slice(0, 10) : [];
  } catch {
    return [];
  }
}

const tidy = (q: string) => q.toLowerCase().replace(/\s+/g, " ").trim();

/** Ask both engines about `count` seeds (least recently asked first); store what comes back. */
export async function collectSuggestions(count = 12): Promise<{ seeds: number; found: number; added: number }> {
  const seeds = await buildSeeds();
  await db.execute(sql`INSERT INTO serp_seeds (seed) SELECT unnest(${`{${seeds.map((s) => `"${s.replace(/"/g, "")}"`).join(",")}}`}::text[]) ON CONFLICT DO NOTHING`);
  const due = (await db.execute(sql`
    SELECT seed FROM serp_seeds WHERE seed IN (${sql.join(seeds.map((s) => sql`${s}`), sql`, `)})
     ORDER BY last_run NULLS FIRST, seed LIMIT ${count}`)) as unknown as { seed: string }[];
  let found = 0;
  let added = 0;
  for (const { seed } of due) {
    const q = encodeURIComponent(seed);
    const [g, b] = await Promise.all([
      ask(`https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=in&q=${q}`, (j) => (j as unknown[])[1]),
      ask(`https://api.bing.com/osjson.aspx?query=${q}&mkt=en-IN`, (j) => (j as unknown[])[1]),
    ]);
    const all = new Map<string, Set<string>>();
    for (const [engine, list] of [["google", g], ["bing", b]] as const)
      for (const s of list.map(tidy)) if (s.length >= 8 && s.split(" ").length >= 3 && RELEVANT.test(s) && !OTHER.test(s)) all.set(s, (all.get(s) ?? new Set()).add(engine));
    for (const [query, engines] of all) {
      const r = (await db.execute(sql`
        INSERT INTO serp_suggest (query, seed, engines) VALUES (${query}, ${seed}, ${`{${[...engines].join(",")}}`}::text[])
        ON CONFLICT (query) DO UPDATE SET times_seen = serp_suggest.times_seen + 1, last_seen = now(),
               engines = (SELECT array_agg(DISTINCT e) FROM unnest(serp_suggest.engines || EXCLUDED.engines) e)
        RETURNING (xmax = 0) AS inserted`)) as unknown as { inserted: boolean }[];
      if (r[0]?.inserted) added++;
    }
    found += all.size;
    await db.execute(sql`UPDATE serp_seeds SET last_run = now(), found = ${all.size} WHERE seed = ${seed}`);
  }
  return { seeds: due.length, found, added };
}
