#!/usr/bin/env node
/**
 * Put photographs of real Indian medical colleges behind every marketing image
 * that names an institution.
 *
 *   node scripts/replace_hero_images.mjs --dry-run
 *   node scripts/replace_hero_images.mjs
 *   node scripts/replace_hero_images.mjs --only mbbs_hero_campus,nri_hero
 *
 * ## What was there
 *
 * Every image in `media_assets` was AI-generated, and most of them carried an
 * institution's name on the building:
 *
 *   mbbs_hero_campus      "D.Y. PATIL UNIVERSITY / D.Y. PATIL MEDICAL COLLEGE,
 *                         NAVI MUMBAI" — a real college, a building that is not
 *                         its own. Live on /mbbs-india and the UG predictor.
 *   nri_hero              "SWAMI VIVEKANANDA MEDICAL COLLEGE AND HOSPITAL",
 *                         with SCIENCES misspelt "SCIERCES" on the board.
 *   neet_hero             "AIRS MEDICAL COLLEGE & RESEARCH INSTITUTE" — an
 *                         institution that does not exist, name half-garbled.
 *   college_campus_1      "ALL INDIA INSTITUTE OF MEDICAL SCIENCES (AIIMS)" on
 *                         a glass building that is not AIIMS.
 *   college_campus_2      "ST. JUDE GRAND HOSPITAL" — invented.
 *   college_campus_3/4    Western campuses, "UNIVERSITY OF HEALTH SCIENCES"
 *                         and "MEDICAL ACADEMY".
 *   knowus_hero           a nameplate reading "Priya Sharma — Senior Admission
 *                         Counselor", a counsellor who does not exist, beside
 *                         brochures for US and UK admissions, which is not this
 *                         business.
 *   services_hero_        the same invented counsellor, under an invented
 *     counselor           "AMC MEDICAL COLLEGE" wordmark. Serves both
 *                         `services_hero` and `about_hero`.
 *   deemed_campus_1       "ROYAL INTERNATIONAL MEDICAL UNIVERSITY & RESEARCH
 *                         CENTER", which does not exist, on a European campus,
 *                         under the heading "India's Finest Deemed Universities".
 *
 * Cropping the signage out was tried first and does not work: the names sit in
 * the middle of several of the frames, and the architecture gives the rest away.
 *
 * ## Why this is not cosmetic
 *
 * The argument this site makes is that its figures are the counselling
 * authority's own and that it refuses to invent a forecast. An invented campus
 * under a real college's name is the same claim told backwards, and it is the
 * one a visitor can check at a glance.
 *
 * ## What replaces them
 *
 * Photographs from Wikimedia Commons of real Indian medical colleges, under
 * CC BY, CC BY-SA or CC0 — free, and conditional on crediting the photographer,
 * which `media_assets.attribution` carries and the page renders.
 *
 * The licence and the photographer are read **live from Commons** rather than
 * trusted from the table below, because a file's terms can be corrected after
 * somebody picks it. Anything that is not free when the script runs is skipped
 * rather than downloaded.
 *
 * `subject` names the college in the credit line. The licence does not ask for
 * it; the deemed-universities page does — it rotates four campuses behind
 * "India's Finest Deemed Universities", so an unnamed backdrop invites the
 * reader to attach the heading to the building.
 */

import postgres from "postgres";
import sharp from "sharp";
import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });

const DRY = process.argv.includes("--dry-run");
const onlyArg = process.argv.indexOf("--only");
const ONLY = onlyArg > -1 ? new Set(process.argv[onlyArg + 1].split(",")) : null;

const UA = "AdmissionHands/1.0 (https://www.admissionhands.com; hero images)";
const DIR = "public/assets/images/uploads";

/**
 * One row per image the site renders.
 *
 * `key` is the `media_assets.media_key` the pages already ask for and `file` is
 * the path already stored against it, so nothing in the code has to change —
 * the picture behind the key does. `credit` is a fallback only: Commons is
 * asked for the live author and licence first.
 */
const HEROES = [
  {
    key: "mbbs_hero_campus",
    file: "hero-mbbs_hero_campus.avif",
    commons: "Medical college Gate Thiruvananthapuram.jpg",
    subject: "Government Medical College, Thiruvananthapuram",
    credit: "Adnan Haleem",
  },
  {
    key: "nri_hero",
    file: "hero-nri_hero.avif",
    commons: "CMCH Vellore.JPG",
    subject: "Christian Medical College, Vellore",
    credit: "Lubap lubap",
  },
  {
    key: "neet_hero",
    file: "hero-neet_hero.avif",
    commons: "Pushpagiri Institute of Medical Sciences & Research Center.jpg",
    subject: "Pushpagiri Institute of Medical Sciences, Tiruvalla",
    credit: "Pushpagiritvla",
  },
  {
    key: "pg_hero_bg",
    file: "hero-1779979125127-pg_hero_bg.avif",
    commons: "ESIC Medical College, Faridabad Campus Building.jpg",
    subject: "ESIC Medical College, Faridabad",
    credit: "Samarthrastogi15",
  },
  {
    key: "knowus_hero",
    file: "hero-1779974375281-knowus_hero.avif",
    commons: "Main building of Osmania Medical College.jpg",
    subject: "Osmania Medical College, Hyderabad",
    credit: "Mouryan",
  },
  {
    // Serves `services_hero` and `about_hero` — they share one file.
    key: "services_hero",
    alsoKeys: ["about_hero"],
    file: "hero-services_hero_counselor.avif",
    commons: "Calicut medical college view from inside.jpg",
    subject: "Government Medical College, Kozhikode",
    credit: "Netha Hussain",
  },
  {
    key: "college_aiims",
    file: "college-college_aiims.avif",
    commons: "OPD Building,AIIMS Kalyani.jpg",
    subject: "AIIMS Kalyani",
    credit: "Pinakpani",
  },
  {
    key: "college_campus_1",
    file: "college-college_campus_1.avif",
    commons: "Nagpur Government Medical College and Hospital.jpg",
    subject: "Government Medical College, Nagpur",
    credit: "Amitbalani",
  },
  {
    key: "college_campus_2",
    file: "college-college_campus_2.avif",
    commons: "GCS Medical College.jpg",
    subject: "GCS Medical College, Ahmedabad",
    credit: "Dipeshgc",
  },
  {
    key: "college_campus_3",
    file: "college-college_campus_3.avif",
    commons: "Murshidabad Medical College and Hospital, Berhampore.JPG",
    subject: "Murshidabad Medical College and Hospital",
    credit: "Sukdev Paul",
  },
  {
    key: "college_campus_4",
    file: "college-college_campus_4.avif",
    commons: "Gujarat adani institute of medical sciences bhuj..jpg",
    subject: "Gujarat Adani Institute of Medical Sciences, Bhuj",
    credit: "Bhargavinf",
  },
  {
    key: "neet_medical_college",
    file: "content-neet_medical_college.avif",
    commons: "Gauhati Medical College.jpg",
    subject: "Gauhati Medical College and Hospital",
    credit: "Baruah ranuj",
  },
  {
    // The deemed page's own hero. Amrita Vishwa Vidyapeetham *is* a deemed
    // university, so this one belongs to the heading above it rather than
    // merely not contradicting it.
    key: "deemed_campus_1",
    file: "college-deemed_campus_1.avif",
    commons: "Amrita Hospital Kochi.jpg",
    subject: "Amrita Institute of Medical Sciences, Kochi",
    credit: "Mujeebcpy",
  },
];

/**
 * Free to use. Anything else is skipped, whatever the table here says.
 *
 * Licence and framing are separate problems and only one of them is checkable
 * in code. Two picks in this pass had impeccable licences and were still wrong:
 * both files named "Sardar Patel Medical College" are murals of ancient
 * surgery, and the Kalyani frames chosen on aspect ratio alone came out as
 * storm sky with the campus a strip along the bottom. Look at a candidate —
 * `scripts/tmp`-style thumbnail sheets are enough — before adding it here.
 */
const FREE = /^(cc[- ]?by([- ]sa)?([- ]\d(\.\d)?)?|cc0|public domain|pd[- ])/i;

/**
 * The author, out of the blob of HTML Commons stores it as.
 *
 * A Commons `Artist` field is usually a user-page link, and very often a talk
 * link beside it, so the raw value for CMC Vellore is
 * `<a ...>Lubap</a> <a ...>talk</a>lubap` — which a naive strip turns into
 * "Lubap ( talk )lubap". The credit is the licence condition, so it has to read
 * like a name and not like scraped markup.
 */
function cleanArtist(html) {
  const text = String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/gi, " ")
    // The talk link, with or without the brackets Commons sometimes adds.
    .replace(/\(?\s*\btalk\b\s*\)?/gi, " ")
    .replace(/\d{1,2}:\d{2},\s*\d{1,2}\s+\w+\s+\d{4}\s*\(UTC\)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // "Lubap lubap" -> "Lubap": the username appears twice because the link text
  // and the raw signature both survive the strip.
  return text
    .split(" ")
    .filter((word, i, all) => i === 0 || word.toLowerCase() !== all[i - 1].toLowerCase())
    .join(" ")
    .slice(0, 60);
}

async function commonsFile(title) {
  const res = await fetch(
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo" +
      "&iiprop=url|size|extmetadata&titles=" + encodeURIComponent("File:" + title),
    { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(25000) },
  );
  const json = await res.json();
  const info = Object.values(json?.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!info?.url) throw new Error("not found on Commons");
  return {
    url: info.url,
    width: info.width,
    height: info.height,
    license: String(info.extmetadata?.LicenseShortName?.value ?? "").trim(),
    artist: cleanArtist(info.extmetadata?.Artist?.value),
    page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title.replace(/ /g, "_"))}`,
  };
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

let done = 0;
let skipped = 0;

try {
  for (const hero of HEROES) {
    if (ONLY && !ONLY.has(hero.key)) continue;

    let found;
    try {
      found = await commonsFile(hero.commons);
    } catch (err) {
      console.log(`  SKIP  ${hero.key.padEnd(22)}${err.message}`);
      skipped++;
      continue;
    }

    if (!FREE.test(found.license)) {
      console.log(`  SKIP  ${hero.key.padEnd(22)}licence reads "${found.license}"`);
      skipped++;
      continue;
    }

    // A credit is a licence condition. No author, no use — rather than quietly
    // publishing an uncredited CC BY photograph, which is the licence breach
    // this whole pass exists to avoid.
    const credit = found.artist || hero.credit;
    if (!credit) {
      console.log(`  SKIP  ${hero.key.padEnd(22)}no author recorded on Commons`);
      skipped++;
      continue;
    }

    if (DRY) {
      console.log(
        `  would replace ${hero.file.padEnd(38)}${found.width}x${found.height}  ` +
          `${found.license.padEnd(15)}© ${credit}`,
      );
      continue;
    }

    const res = await fetch(found.url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) {
      console.log(`  SKIP  ${hero.key.padEnd(22)}download returned ${res.status}`);
      skipped++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());

    // 2000x1125 is a 16:9 frame wide enough for the --page-max ladder's top
    // step without shipping a five-megapixel original to a phone.
    const out = await sharp(buf)
      .rotate()
      .resize({ width: 2000, height: 1125, fit: "cover", position: "centre" })
      .avif({ quality: 58 })
      .toBuffer();

    mkdirSync(DIR, { recursive: true });
    writeFileSync(join(DIR, hero.file), out);

    const keys = [hero.key, ...(hero.alsoKeys ?? [])];
    await sql`
      UPDATE media_assets
         SET attribution = ${credit},
             license     = ${found.license},
             source_url  = ${found.page},
             subject     = ${hero.subject}
       WHERE media_key IN ${sql(keys)}`;

    console.log(
      `  OK    ${hero.file.padEnd(38)}${String((out.length / 1024).toFixed(0) + "KB").padEnd(8)}` +
        `${found.license.padEnd(15)}© ${credit}  — ${hero.subject}`,
    );
    done++;
  }
} finally {
  await sql.end();
}

console.log(`\n${done} replaced, ${skipped} skipped.`);
process.exit(skipped ? 1 : 0);
