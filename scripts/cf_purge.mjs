#!/usr/bin/env node
/**
 * Clear Cloudflare's edge cache for www.admissionhands.com.
 *
 *   node scripts/cf_purge.mjs /assets/images/uploads/hero-nri_hero.avif   # one file
 *   node scripts/cf_purge.mjs --images                                    # every /_next/image result
 *   node scripts/cf_purge.mjs --everything                                # the whole zone
 *
 * ## When it is needed
 *
 * Almost never, by design. /_next/static/* is content-hashed, so a deploy
 * produces new names and nothing goes stale. Admin uploads get a fresh name
 * every time, so they are immutable. HTML and /api are never cached at all.
 *
 * The exception is a file overwritten **in place** under a name the site
 * already serves — scripts/replace_hero_images.mjs writes fixed hero filenames,
 * fetch_college_images.mjs writes slug-named ones. Cloudflare holds those for
 * the origin's max-age (a day), and the /_next/image results derived from them
 * for a day too. Purge the file and its optimised versions after such a
 * script, or wait a day.
 *
 * The optimised versions cannot be purged one image at a time: they differ
 * only in the query string (url, w, q), and Cloudflare refuses a query string
 * in a prefix purge. So naming a file purges that file and *all* of
 * /_next/image. That is cheap — the server keeps its own encoded copies in a
 * cache that survives deploys, so the edge refills from them, not from sharp.
 *
 * On Windows, run it from PowerShell or with MSYS_NO_PATHCONV=1: Git Bash
 * rewrites an argument like /assets/x.avif into C:/Program Files/Git/assets/…
 * before the script ever sees it, and that purges a URL that does not exist.
 *
 * Needs CLOUDFLARE_API_TOKEN in .env.local with Zone → Cache Purge → Purge.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const T = process.env.CLOUDFLARE_API_TOKEN;
if (!T) {
  console.error("CLOUDFLARE_API_TOKEN is not set in .env.local");
  process.exit(1);
}
const HOST = "www.admissionhands.com";

async function cf(method, path, body) {
  const r = await fetch("https://api.cloudflare.com/client/v4" + path, {
    method,
    headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { ok: j.success === true, result: j.result, errors: (j.errors || []).map((e) => `${e.code} ${e.message}`).join("; ") };
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Say what to purge: a path, --images, or --everything. See the header of this file.");
  process.exit(1);
}

// Checked before any network call: exiting while a fetch connection is still
// closing trips a libuv assertion on Windows.
//
// Git Bash turns /assets/x into C:/Program Files/Git/assets/x. Refuse rather
// than purge a URL nobody requests and report success.
const mangled = args.find((p) => /^[A-Za-z]:[\\/]/.test(p) || p.includes("Program Files"));
if (mangled) {
  console.error(`"${mangled}" looks like a Windows path, not a URL path. Git Bash rewrote it — run with MSYS_NO_PATHCONV=1, or from PowerShell.`);
  process.exit(1);
}

const zone = (await cf("GET", "/zones?name=admissionhands.com")).result?.[0];
if (!zone) {
  console.error("The token cannot see the admissionhands.com zone.");
  process.exit(1);
}

let body;
if (args.includes("--everything")) {
  body = { purge_everything: true };
} else if (args.includes("--images")) {
  body = { prefixes: [`${HOST}/_next/image`] };
} else {
  const files = args.map((p) => `https://${HOST}${p.startsWith("/") ? p : "/" + p}`);
  const a = await cf("POST", `/zones/${zone.id}/purge_cache`, { files });
  console.log(`  files     ${a.ok ? "purged: " + args.join(", ") : "FAIL " + a.errors}`);
  if (!a.ok) process.exit(1);
  // Their optimised versions differ only by query string, which a prefix purge
  // may not contain — so all of /_next/image goes. See the header.
  body = { prefixes: [`${HOST}/_next/image`] };
}

const r = await cf("POST", `/zones/${zone.id}/purge_cache`, body);
console.log(`  ${Object.keys(body)[0].padEnd(9)} ${r.ok ? "purged" : "FAIL " + r.errors}`);
process.exit(r.ok ? 0 : 1);
