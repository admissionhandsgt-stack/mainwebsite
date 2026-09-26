#!/usr/bin/env node
/**
 * Does the crawler matcher actually recognise Googlebot?
 *
 *   node scripts/verify_ipranges.mjs
 *
 * `verify_gate.mjs` proves nobody gets in who should not. This proves the other
 * direction, which is the one that fails silently: if `inRanges()` wrongly
 * rejects, a real crawler is simply served the locked page. Nothing errors,
 * nothing is logged, and some weeks later 3,600 pages have stopped ranking.
 *
 * It compiles `src/lib/ipRange.ts` and runs the real function against the
 * addresses Google and Bing publish — not a reimplementation of it, which would
 * only prove that two copies of the same mistake agree.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const SOURCES = [
  "https://developers.google.com/static/search/apis/ipranges/googlebot.json",
  "https://developers.google.com/static/search/apis/ipranges/special-crawlers.json",
  "https://www.bing.com/toolbox/bingbot.json",
];

let pass = 0;
let fail = 0;
const ok = (cond, label, extra = "") => {
  if (cond) pass++;
  else fail++;
  console.log(`  ${cond ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}  ${label}${extra ? `  ${extra}` : ""}`);
};

const out = mkdtempSync(join(tmpdir(), "ah-iprange-"));
try {
  // The compiler is invoked through node rather than npx: npx is a shell script
  // on Windows and execFileSync will not spawn it.
  execFileSync(
    process.execPath,
    [
      "node_modules/typescript/bin/tsc",
      "src/lib/ipRange.ts",
      "--outDir", out,
      "--module", "esnext",
      "--target", "es2020",
      "--moduleResolution", "bundler",
    ],
    { stdio: "pipe" },
  );
  const { parseCidr, inRanges, toBigInt } = await import(
    pathToFileURL(join(out, "ipRange.js")).href
  );

  console.log("\n\x1b[1mThe parser handles the forms the lists actually use\x1b[0m");
  ok(parseCidr("66.249.64.0/27") !== null, "IPv4 CIDR parses");
  ok(parseCidr("2001:4860:4801:10::/64") !== null, "IPv6 CIDR parses");
  ok(parseCidr("nonsense") === null, "junk is rejected");
  ok(parseCidr("66.249.64.0/33") === null, "an impossible IPv4 prefix is rejected");
  ok(toBigInt("300.1.1.1") === null, "an out-of-range octet is rejected");

  console.log("\n\x1b[1mBoundaries, where an off-by-one would hide\x1b[0m");
  const slash27 = [parseCidr("66.249.64.0/27")];
  ok(inRanges("66.249.64.0", slash27), "the first address in a /27 matches");
  ok(inRanges("66.249.64.31", slash27), "the last address in a /27 matches");
  ok(!inRanges("66.249.64.32", slash27), "the address after it does not");
  ok(!inRanges("66.249.63.255", slash27), "the address before it does not");

  console.log("\n\x1b[1mAgainst the lists Google and Bing publish right now\x1b[0m");
  const ranges = [];
  const samples = [];
  for (const url of SOURCES) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      ok(false, `${new URL(url).hostname} list fetched`, `HTTP ${res.status}`);
      continue;
    }
    const json = await res.json();
    const prefixes = json.prefixes ?? [];
    let added = 0;
    for (const p of prefixes) {
      const cidr = p.ipv4Prefix ?? p.ipv6Prefix;
      if (typeof cidr !== "string") continue;
      const range = parseCidr(cidr);
      if (range) {
        ranges.push(range);
        added++;
        // The network address of each block is a real address in it.
        if (samples.length < 400) samples.push(cidr.split("/")[0]);
      }
    }
    ok(added > 0 && added === prefixes.length, `${new URL(url).hostname}: all ${prefixes.length} prefixes parsed`, `parsed ${added}`);
  }

  const missed = samples.filter((ip) => !inRanges(ip, ranges));
  ok(missed.length === 0, `every published address matches (${samples.length} checked)`, missed.slice(0, 3).join(" "));

  console.log("\n\x1b[1mAddresses that must not match\x1b[0m");
  for (const ip of ["1.2.3.4", "127.0.0.1", "8.8.8.8", "203.0.113.7", "2001:db8::1"]) {
    ok(!inRanges(ip, ranges), `${ip} is not a crawler`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

console.log(`\n\x1b[1m${pass} passed, ${fail} failed\x1b[0m\n`);
process.exit(fail ? 1 : 0);
