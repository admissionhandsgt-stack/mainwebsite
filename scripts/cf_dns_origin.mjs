#!/usr/bin/env node
/**
 * Point the site's A records at an origin, through Cloudflare.
 *
 *   node scripts/cf_dns_origin.mjs --show
 *   node scripts/cf_dns_origin.mjs 137.23.39.214            # Oracle Mumbai
 *   node scripts/cf_dns_origin.mjs 38.49.209.165            # the old VPS (rollback)
 *
 * Touches exactly three records — the apex, www and admin — and nothing else in
 * the zone. The mail records (MX, SPF, DKIM, autodiscover) are never read for
 * writing, let alone changed.
 *
 * All three are set proxied. Oracle's firewall admits 80/443 from Cloudflare
 * only, so a grey-clouded record pointing there would simply time out. The old
 * box accepts both, so proxied is right for a rollback too.
 *
 * For visitors this is not a DNS change at all: a proxied record answers with
 * Cloudflare's addresses whatever the origin is, so nothing has to propagate —
 * Cloudflare starts using the new origin within seconds.
 */
import { cf, zone } from "./lib/cloudflare.mjs";

const NAMES = ["admissionhands.com", "www.admissionhands.com", "admin.admissionhands.com"];
const ALLOWED = ["137.23.39.214", "38.49.209.165"];

const arg = process.argv[2];
if (!arg || (arg !== "--show" && !ALLOWED.includes(arg))) {
  console.error(`Pass --show, or one of the two origins: ${ALLOWED.join(", ")}`);
  process.exit(1);
}

const z = await zone();
const all = (await cf("GET", `/zones/${z.id}/dns_records?type=A&per_page=100`)).result || [];
const show = (r) => `${r.name.padEnd(28)} ${r.content.padEnd(16)} ${r.proxied ? "proxied" : "dns-only"}`;

if (arg === "--show") {
  for (const n of NAMES) {
    const r = all.find((x) => x.name === n);
    console.log("  " + (r ? show(r) : `${n.padEnd(28)} (missing)`));
  }
  process.exit(0);
}

let failed = 0;
for (const n of NAMES) {
  const r = all.find((x) => x.name === n);
  if (!r) {
    console.error(`  ${n}: no A record — not creating one blind`);
    failed++;
    continue;
  }
  if (r.content === arg && r.proxied) {
    console.log(`  ${show(r)}  (already)`);
    continue;
  }
  const u = await cf("PATCH", `/zones/${z.id}/dns_records/${r.id}`, { content: arg, proxied: true });
  if (u.ok) console.log(`  ${show(u.result)}  (was ${r.content}${r.proxied ? "" : ", dns-only"})`);
  else {
    console.error(`  ${n}: FAIL ${u.errors}`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
