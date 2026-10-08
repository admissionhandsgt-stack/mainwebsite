// Point www.admissionhands.com at the in-country edge, or back at the server.
//
//   node --env-file=.env.local scripts/edge/switch_www.mjs --show
//   node --env-file=.env.local scripts/edge/switch_www.mjs --pages-proxied   step 1: CNAME → pages.dev, orange (lets Pages validate)
//   node --env-file=.env.local scripts/edge/switch_www.mjs --pages           step 2: DNS-only — the in-country path
//   node --env-file=.env.local scripts/edge/switch_www.mjs --rollback        A 137.23.39.214, proxied — as before 2026-10-08
//
// Touches the www record only. The apex (301 → www), admin and origin stay on
// the proxied A record.
import { cf, zone } from "../lib/cloudflare.mjs";

const NAME = "www.admissionhands.com";
const PAGES = "admissionhands-edge.pages.dev";
const ORIGIN_IP = "137.23.39.214";

const mode = process.argv[2] ?? "--show";
const z = await zone();
const list = await cf("GET", `/zones/${z.id}/dns_records?name=${NAME}`);
const records = list.result ?? [];
const show = (rs) => rs.map((r) => `${r.type} ${r.content} proxied=${r.proxied}`).join(", ") || "(none)";
console.log(`  before: ${show(records)}`);

const want =
  mode === "--pages-proxied" ? { type: "CNAME", content: PAGES, proxied: true }
  : mode === "--pages" ? { type: "CNAME", content: PAGES, proxied: false }
  : mode === "--rollback" ? { type: "A", content: ORIGIN_IP, proxied: true }
  : null;
if (!want) process.exit(0);

const body = { ...want, name: NAME, ttl: want.proxied ? 1 : 60, comment: `www → ${want.content} (${mode}, scripts/edge/switch_www.mjs)` };
const same = records.find((r) => r.type === want.type);
let res;
if (same) {
  res = await cf("PATCH", `/zones/${z.id}/dns_records/${same.id}`, body);
} else if (records.length === 1) {
  // A ↔ CNAME: a record cannot change type in place, but PUT replaces it whole.
  res = await cf("PUT", `/zones/${z.id}/dns_records/${records[0].id}`, body);
} else {
  for (const r of records) await cf("DELETE", `/zones/${z.id}/dns_records/${r.id}`);
  res = await cf("POST", `/zones/${z.id}/dns_records`, body);
}
if (!res.ok) throw new Error(`Cloudflare: ${JSON.stringify(res.errors)}`);
const after = await cf("GET", `/zones/${z.id}/dns_records?name=${NAME}`);
console.log(`  after:  ${show(after.result ?? [])}`);
