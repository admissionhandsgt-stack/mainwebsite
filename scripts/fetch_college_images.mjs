#!/usr/bin/env node
/**
 * Give each college its own photograph, or leave it alone.
 *
 *   node scripts/fetch_college_images.mjs --dry-run     # decide, write nothing
 *   node scripts/fetch_college_images.mjs               # fetch and store
 *   node scripts/fetch_college_images.mjs --table pg_colleges_content --limit 20
 *
 * ## The rule
 *
 * A photograph is attached only when the source can be shown to be about that
 * college. Not "probably", not "the words line up" — shown. Three gates, and
 * every one of them exists because something got through without it:
 *
 *  1. **Wikidata says it is an institution.** Matching on words alone offered
 *     Kalpana Chawla's portrait for Kalpana Chawla Government Medical College,
 *     and the town of Shimoga for Shimoga Institute of Medical Sciences. The
 *     entity's `P31` ("instance of") label has to read like a college,
 *     university, school, hospital or institute.
 *  2. **Every distinctive word of the name is in the title, and a medical
 *     college matches a medical article.** Without the second half, "Maulana
 *     Azad Medical College" matched "Maulana Azad College" — a different
 *     institution in a different city.
 *  3. **The licence permits commercial reuse.** Wikimedia is mostly CC BY-SA
 *     and public domain, but it also hosts non-free files, and those are
 *     refused rather than quietly used.
 *
 * Anything that fails a gate keeps its monogram, which is honest. A photograph
 * of the wrong building is not a smaller mistake than no photograph — it is a
 * larger one, because it looks like evidence.
 *
 * ## What is stored
 *
 * The file, locally, converted and resized — not a hotlink, which would put a
 * third party in the page's critical path and break the moment they move it.
 * Beside it: the author, the licence and the article it came from. CC BY-SA is
 * free *and conditional*; a credit nobody recorded is a credit nobody can show.
 */

import postgres from "postgres";
import sharp from "sharp";
import { config } from "dotenv";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const LIMIT = Number(args[args.indexOf("--limit") + 1]) || 0;
const ONLY_TABLE = args.includes("--table") ? args[args.indexOf("--table") + 1] : null;

const UA = "AdmissionHands/1.0 (https://www.admissionhands.com; college images)";
const OUT_DIR = "public/assets/images/uploads/colleges";
const PUBLIC_PREFIX = "/assets/images/uploads/colleges";

/* ------------------------------------------------------------ name handling */

/** Abbreviations that are unambiguous in Indian medical education. */
const EXPAND = [
  [/\baiims\b/g, "all india institute of medical sciences"],
  [/\bjipmer\b/g, "jawaharlal institute of postgraduate medical education and research"],
  [/\bpgimer\b/g, "postgraduate institute of medical education and research"],
  [/\bkgmu\b/g, "king george medical university"],
  [/\bmamc\b/g, "maulana azad medical college"],
  [/\bucms\b/g, "university college of medical sciences"],
  [/\bvmmc\b/g, "vardhman mahavir medical college"],
  [/\blhmc\b/g, "lady hardinge medical college"],
  [/\bnimhans\b/g, "national institute of mental health and neurosciences"],
  [/\bjnmc\b/g, "jawaharlal nehru medical college"],
  [/\bgmc\b/g, "government medical college"],
];

function norm(s) {
  let t = String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  for (const [re, full] of EXPAND) t = t.replace(re, full);
  return t.replace(/\s+/g, " ").trim();
}

const STOP = new Set(["the", "of", "and", "for", "a", "an", "dr", "shri", "sri", "smt", "late", "pt"]);
const tokens = (s) => norm(s).split(" ").filter((t) => t.length > 1 && !STOP.has(t));

const MEDICAL = ["medical", "medicine", "dental", "ayurved", "homoeopath", "homeopath", "nursing"];

/**
 * Words that appear in half these names and identify nobody.
 *
 * A name has to carry at least one word from outside this set, or it cannot be
 * verified at all. "Dr. S.N. Medical College" reduces to "medical college" once
 * the initials and the honorific drop out, and that matched **Christian Medical
 * College Vellore** — a different college in a different state. There is no
 * clever fix for a name with nothing distinctive left in it; the honest answer
 * is to refuse and keep the monogram.
 */
const GENERIC = new Set([
  "medical", "college", "institute", "institution", "sciences", "science",
  "hospital", "research", "centre", "center", "university", "school",
  "government", "govt", "memorial", "medicine", "academy", "health",
]);

/** Does this article title describe this college? */
function titleMatches(collegeName, title) {
  const want = tokens(collegeName);
  // At least one word that is not boilerplate, or there is nothing to match on.
  const distinctive = want.filter((t) => !GENERIC.has(t));
  if (!distinctive.length) return false;

  const have = norm(title);
  if (!want.every((t) => have.includes(t))) return false;

  // A medical college must match a medical article. This is the rule that
  // separates Maulana Azad Medical College from Maulana Azad College.
  const isMedical = MEDICAL.some((m) => norm(collegeName).includes(m));
  if (isMedical && !MEDICAL.some((m) => have.includes(m))) return false;

  return true;
}

/* ------------------------------------------------------------------- lookup */

async function api(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Is this Wikidata entity an institution?
 *
 * Checked by the **label** of what it is an instance of, not by a fixed list of
 * ids. A list missed "institute" and "medical college in India" — both real,
 * both obviously correct — and would have kept missing whatever the next one is.
 */
const INSTITUTION_WORDS = /college|universit|school|hospital|institut|education|academy/i;

/** Wikidata's id for India. */
const INDIA = "Q668";

/**
 * An institution, **in India**.
 *
 * The country check was added after "UCMS" matched *Allianze University College
 * of Medical Sciences* — a real medical college, correctly identified as a
 * medical college, in **Malaysia**. Every word of the expanded Indian name
 * appears in the Malaysian one, so no amount of name matching would have caught
 * it. `P17` settles it in one lookup.
 *
 * An entity with no country at all is refused. That loses a few real colleges
 * whose Wikidata entry is thin, and it is the right way round: a missing
 * photograph costs nothing, and a photograph of the wrong continent is the
 * whole problem.
 */
async function isInstitution(qid) {
  if (!qid) return false;
  const ent = await api(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&ids=${qid}&props=claims`,
  );
  const claims = ent?.entities?.[qid]?.claims;
  if (!claims) return false;

  const country = (claims.P17 ?? [])
    .map((c) => c.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
  if (!country.includes(INDIA)) return false;

  const ids = (claims.P31 ?? [])
    .map((c) => c.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
  if (!ids.length) return false;

  const labelled = await api(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&ids=${ids.join("|")}&props=labels&languages=en`,
  );
  return ids.some((id) =>
    INSTITUTION_WORDS.test(labelled?.entities?.[id]?.labels?.en?.value ?? ""),
  );
}

/** The file URL without the tracking query Wikipedia adds. */
const cleanUrl = (u) => String(u ?? "").split("?")[0];

/** Licences that permit commercial reuse. Anything else is refused. */
const FREE_LICENCE = /^(cc[- ]?by([- ]sa)?([- ]\d(\.\d)?)?|cc0|public domain|pd[- ])/i;

/**
 * The licence and author of a Commons file.
 *
 * Returned as it will be displayed, so nothing has to be reconstructed later.
 * `null` means the file is not usable and the college keeps its monogram.
 */
async function licenceFor(fileUrl) {
  // Wikipedia appends `?utm_source=...` to these URLs, so the last path segment
  // carries a query string with it. Taking the filename without stripping that
  // asked Commons for a file that does not exist, every lookup came back
  // missing, and six colleges with perfectly free photographs were recorded as
  // "licence not free".
  const file = decodeURIComponent(cleanUrl(fileUrl).split("/").pop() ?? "");
  const json = await api(
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo" +
      "&iiprop=extmetadata&titles=" + encodeURIComponent("File:" + file),
  );
  const page = Object.values(json?.query?.pages ?? {})[0];
  const meta = page?.imageinfo?.[0]?.extmetadata;
  if (!meta) return null;

  const licence = meta.LicenseShortName?.value ?? meta.License?.value ?? "";
  if (!FREE_LICENCE.test(licence.replace(/\s+/g, " ").trim())) return null;

  const author = String(meta.Artist?.value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  return {
    licence: licence.trim(),
    author: author || "Wikimedia Commons",
    file,
  };
}

/** The article, the image and the licence — or null, with the reason. */
async function findPhoto(name) {
  const search = await api(
    "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*" +
      // Ten rather than five: the right article is often not the top hit —
      // "Kasturba Medical College, Manipal" ranked below both the town and a
      // disambiguation page. The gates below decide; this only widens what they
      // get to look at, and costs one request either way.
      "&generator=search&gsrlimit=10&gsrsearch=" + encodeURIComponent(norm(name)) +
      "&prop=pageimages|pageprops&piprop=original&ppprop=wikibase_item",
  );

  const pages = Object.values(search?.query?.pages ?? {});
  if (!pages.length) return { ok: false, why: "no search results" };

  let sawTitle = false;
  for (const p of pages) {
    if (!titleMatches(name, p.title)) continue;
    sawTitle = true;
    if (!p.original?.source) continue;
    if (!(await isInstitution(p.pageprops?.wikibase_item))) continue;

    const lic = await licenceFor(p.original.source);
    if (!lic) return { ok: false, why: "licence not free" };

    return {
      ok: true,
      title: p.title,
      image: p.original.source,
      article: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`,
      ...lic,
    };
  }
  return { ok: false, why: sawTitle ? "article has no photo" : "no matching article" };
}

/* -------------------------------------------------------------------- store */

const slug = (s) =>
  norm(s).replace(/\s+/g, "-").slice(0, 70).replace(/^-+|-+$/g, "") || "college";

/**
 * Download, resize and convert.
 *
 * 1200px wide is more than any card or hero on the site asks for, and AVIF at
 * quality 62 keeps a campus photograph around 60–90 KB — these pages already
 * render per request and a page of twenty cards must not pull twenty megabytes.
 */
async function store(url, name) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const out = await sharp(buf)
    .rotate()
    .resize({ width: 1200, height: 800, fit: "cover", position: "centre", withoutEnlargement: true })
    .avif({ quality: 62 })
    .toBuffer();

  mkdirSync(OUT_DIR, { recursive: true });
  const file = `${slug(name)}.avif`;
  writeFileSync(join(OUT_DIR, file), out);
  return { path: `${PUBLIC_PREFIX}/${file}`, bytes: out.length };
}

/* --------------------------------------------------------------------- main */

const sql = postgres(process.env.DATABASE_URL, { max: 2 });

const TABLES = [
  { table: "pg_colleges_content", nameCol: "college_name" },
  { table: "deemed_colleges", nameCol: "college_name" },
  { table: "ug_all_colleges", nameCol: "college_name" },
].filter((t) => !ONLY_TABLE || t.table === ONLY_TABLE);

let found = 0;
let skipped = 0;
const reasons = {};

try {
  for (const { table, nameCol } of TABLES) {
    const rows = await sql.unsafe(
      `SELECT id, ${nameCol} AS name FROM ${table} WHERE image_url IS NULL ORDER BY id` +
        (LIMIT ? ` LIMIT ${LIMIT}` : ""),
    );
    console.log(`\n${table}: ${rows.length} without a photograph\n`);

    for (const row of rows) {
      const hit = await findPhoto(row.name);

      if (!hit.ok) {
        skipped++;
        reasons[hit.why] = (reasons[hit.why] ?? 0) + 1;
        console.log(`  ·    ${row.name.slice(0, 54).padEnd(56)}${hit.why}`);
      } else if (DRY) {
        found++;
        console.log(`  OK   ${row.name.slice(0, 54).padEnd(56)}${hit.title}  [${hit.licence}]`);
      } else {
        try {
          const saved = await store(cleanUrl(hit.image), row.name);
          await sql.unsafe(
            `UPDATE ${table} SET image_url = $1, image_attribution = $2,
                                 image_license = $3, image_source_url = $4
              WHERE id = $5`,
            [saved.path, hit.author, hit.licence, hit.article, row.id],
          );
          found++;
          console.log(
            `  OK   ${row.name.slice(0, 54).padEnd(56)}${(saved.bytes / 1024).toFixed(0)}KB  ${hit.licence}`,
          );
        } catch (e) {
          skipped++;
          reasons["download failed"] = (reasons["download failed"] ?? 0) + 1;
          console.log(`  !    ${row.name.slice(0, 54).padEnd(56)}${e.message}`);
        }
      }

      // Wikimedia asks for courtesy, and this is not a race.
      await new Promise((r) => setTimeout(r, 350));
    }
  }
} finally {
  await sql.end();
}

console.log(`\n${found} photographs ${DRY ? "available" : "stored"}, ${skipped} left with a monogram`);
for (const [why, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${why}`);
}
