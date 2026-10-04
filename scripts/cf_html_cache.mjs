#!/usr/bin/env node
/**
 * Cache the HTML that logged-out visitors get, for five minutes, at Cloudflare's
 * Mumbai edge — on the hostnames named, and nowhere else.
 *
 *   node scripts/cf_html_cache.mjs mumbai.admissionhands.com www.admissionhands.com
 *   node scripts/cf_html_cache.mjs --off
 *
 * ## Why it is safe, and what has to stay true for it to stay safe
 *
 * The pages are force-dynamic because one URL is two answers: a visitor with no
 * session gets counts and the locked summary, a session or a verified crawler
 * gets every seat row. A shared cache that ever stored the second answer would
 * hand it to everybody. So the rule only caches requests that can only ever
 * receive the first:
 *
 *   - GET only, and never /api, /admin, /account, /login, /_next, /assets;
 *   - no ah_user, ah_unlock or ah_admin_session cookie — any session at all
 *     goes straight to the origin;
 *   - no RSC navigation (the `rsc` / `next-router-prefetch` headers, `_rsc=`),
 *     which is a different payload under the same URL;
 *   - no crawler user-agent. The origin believes a crawler only after checking
 *     its IP, and then serves it the rows — so every user-agent the origin is
 *     willing to verify must bypass the cache, or a real Googlebot's page would
 *     be stored and served to the next visitor.
 *
 * That last list is read out of src/lib/crawler.ts (CRAWLER_UA) rather than
 * copied here, so widening the crawler check cannot quietly open a leak. If the
 * regex cannot be found, this refuses to write a rule at all.
 *
 * Proved by verify_gate.mjs and verify_documents.mjs through the cached host,
 * plus repeated anonymous fetches after a signed-in run: every HIT was the
 * locked page.
 *
 * Deploys purge the zone (scripts/deploy_oracle.sh), so a release is never
 * hidden behind five minutes of the previous one's HTML.
 */
import { readFileSync } from "node:fs";
import { cf, zone } from "./lib/cloudflare.mjs";

const TAG = "HTML for logged-out visitors";
const args = process.argv.slice(2);
const off = args.includes("--off");
const hosts = args.filter((a) => !a.startsWith("--"));

if (!off && !hosts.length) {
  console.error("Name the hostnames to cache, or pass --off. See the header of this file.");
  process.exit(1);
}
const bad = hosts.find((h) => !/^([a-z0-9-]+\.)*admissionhands\.com$/.test(h));
if (bad) {
  console.error(`"${bad}" is not an admissionhands.com hostname.`);
  process.exit(1);
}
if (hosts.some((h) => h.startsWith("admin"))) {
  console.error("The admin host is never cached.");
  process.exit(1);
}

const src = readFileSync(new URL("../src/lib/crawler.ts", import.meta.url), "utf8");
const m = src.match(/const CRAWLER_UA = \/\(([^)]+)\)\/i;/);
if (!m || !/googlebot/.test(m[1])) {
  console.error("Could not read CRAWLER_UA out of src/lib/crawler.ts — not writing a rule that might miss a crawler.");
  process.exit(1);
}
const crawlers = m[1].split("|").map((s) => s.trim().toLowerCase()).filter(Boolean);
if (crawlers.some((c) => !/^[a-z0-9-]+$/.test(c))) {
  console.error(`CRAWLER_UA is no longer a plain list of names (${m[1]}); update this script to match it.`);
  process.exit(1);
}

const z = await zone();
const path = `/zones/${z.id}/rulesets/phases/http_request_cache_settings/entrypoint`;
const cur = await cf("GET", path);
const keep = (cur.result?.rules || [])
  .filter((r) => !r.description?.startsWith(TAG))
  .map(({ id, version, last_updated, ref, ...r }) => r);

const rules = [...keep];
if (!off) {
  const expression = [
    `(${hosts.map((h) => `http.host eq "${h}"`).join(" or ")})`,
    `http.request.method eq "GET"`,
    ...["/api/", "/admin", "/account", "/login", "/_next/", "/assets/"].map(
      (p) => `not starts_with(http.request.uri.path, "${p}")`,
    ),
    ...["ah_user=", "ah_unlock=", "ah_admin_session="].map((c) => `not http.cookie contains "${c}"`),
    `not any(http.request.headers["rsc"][*] eq "1")`,
    `not any(http.request.headers["next-router-prefetch"][*] eq "1")`,
    `not http.request.uri.query contains "_rsc="`,
    ...crawlers.map((u) => `not lower(http.user_agent) contains "${u}"`),
  ].join(" and ");
  rules.push({
    description: `${TAG}: 5 minutes at the edge. Bypassed by any login/unlock/admin cookie, /api, /admin, /account, /login, RSC navigation and crawler user-agents (the origin verifies crawlers by IP).`,
    expression,
    action: "set_cache_settings",
    action_parameters: {
      cache: true,
      edge_ttl: { mode: "override_origin", default: 300 },
      browser_ttl: { mode: "respect_origin" },
    },
    enabled: true,
  });
}

const put = await cf("PUT", path, { rules });
if (!put.ok) {
  console.error(`  FAIL ${put.errors}`);
  process.exit(1);
}
console.log(
  off
    ? `  HTML caching off; ${put.result.rules.length} other cache rule(s) kept`
    : `  HTML caching on: ${hosts.join(", ")} (crawlers bypassed: ${crawlers.join(", ")}); ${put.result.rules.length} cache rules in total`,
);
