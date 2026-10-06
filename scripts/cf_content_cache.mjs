#!/usr/bin/env node
/**
 * Let Cloudflare cache the public CMS reads, for exactly as long as each route
 * says.
 *
 *   node scripts/cf_content_cache.mjs        # create or replace the rule
 *   node scripts/cf_content_cache.mjs --off  # remove it
 *
 * Every page's client components read contact numbers and similar public copy
 * from /api/content/*. Those routes already send their own lifetime —
 * `public, s-maxage=60` for /api/content/[resource], 300 for media — but /api/
 * is outside every cache rule, so Cloudflare passed each one to Mumbai.
 *
 * Why this is safe to share between visitors: /api/content/* reads an
 * allow-list of public tables and nothing about the caller — no cookie,
 * session or header changes the answer (checked 2026-10-06). The rule respects
 * the origin's own Cache-Control, so a 429 or 500, which carry none, are not
 * held, and an admin's edit shows within the route's 60 seconds.
 *
 * /api/content/college-list is left out: it sends no Cache-Control, and with
 * none Cloudflare would apply its default of two hours. Give it a header first.
 *
 * Never widen this to the rest of /api. Everything else there is per visitor
 * (the gate, accounts, documents, admin) and is `no-store` in next.config.mjs.
 */
import { cf, zone } from "./lib/cloudflare.mjs";

const TAG = "Public CMS reads";
const off = process.argv.includes("--off");

const z = await zone();
const path = `/zones/${z.id}/rulesets/phases/http_request_cache_settings/entrypoint`;
const cur = await cf("GET", path);
const rules = (cur.result?.rules || [])
  .filter((r) => !r.description?.startsWith(TAG))
  .map(({ id, version, last_updated, ref, ...r }) => r);

if (!off) {
  rules.push({
    description: `${TAG}: /api/content/* (minus college-list), for as long as each route's own Cache-Control says. Nothing per visitor is served there.`,
    expression: [
      `http.request.method eq "GET"`,
      `starts_with(http.request.uri.path, "/api/content/")`,
      `not starts_with(http.request.uri.path, "/api/content/college-list")`,
    ].join(" and "),
    action: "set_cache_settings",
    action_parameters: {
      cache: true,
      edge_ttl: { mode: "respect_origin" },
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
console.log(`  ${off ? "removed" : "on"}: ${TAG}; ${put.result.rules.length} cache rules in total`);
