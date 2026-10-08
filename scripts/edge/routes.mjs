// Writes _routes.json and _headers for the Pages edge project.
//
// _routes.json: which paths skip the worker and are served by Pages as static
// files — free and unlimited, where every worker invocation counts against the
// Workers Free 100,000 a day. Everything built (_next/static) and every public
// file shipped with the release, EXCEPT /assets/images/uploads: the admin adds
// files there at any time, so those must reach the origin (through the worker,
// which caches them).
//
// Usage: node scripts/edge/routes.mjs <site dir>
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const site = process.argv[2];
if (!site) throw new Error("usage: routes.mjs <site dir>");

const exclude = ["/_next/static/*"];
for (const name of readdirSync(site)) {
  if (["_worker.js", "_routes.json", "_headers", "_next"].includes(name)) continue;
  const p = join(site, name);
  if (!statSync(p).isDirectory()) {
    exclude.push(`/${name}`);
    continue;
  }
  if (name !== "assets") {
    exclude.push(`/${name}/*`);
    continue;
  }
  for (const sub of readdirSync(p)) {
    const sp = join(p, sub);
    if (!statSync(sp).isDirectory()) {
      exclude.push(`/assets/${sub}`);
      continue;
    }
    if (sub !== "images") {
      exclude.push(`/assets/${sub}/*`);
      continue;
    }
    for (const img of readdirSync(sp)) {
      if (img === "uploads") continue; // live uploads go to the origin
      exclude.push(statSync(join(sp, img)).isDirectory() ? `/assets/images/${img}/*` : `/assets/images/${img}`);
    }
  }
}
if (exclude.length > 99) throw new Error(`_routes.json allows 100 rules; this needs ${exclude.length + 1}`);
writeFileSync(join(site, "_routes.json"), JSON.stringify({ version: 1, include: ["/*"], exclude }, null, 2));

// Cache lifetimes for what Pages serves itself. Built files are content-hashed;
// public files keep the origin's rule (a day, then stale-while-revalidate).
writeFileSync(
  join(site, "_headers"),
  [
    "/_next/static/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "/assets/*",
    "  Cache-Control: public, max-age=86400, stale-while-revalidate=604800",
    "/*.png",
    "  Cache-Control: public, max-age=86400, stale-while-revalidate=604800",
    "/favicon.ico",
    "  Cache-Control: public, max-age=86400, stale-while-revalidate=604800",
    "",
  ].join("\n"),
);
console.log(`  _routes.json: ${exclude.length} static rules; _headers written`);
