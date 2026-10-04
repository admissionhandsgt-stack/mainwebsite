#!/usr/bin/env node
/**
 * Lighthouse, run from this machine, against us and the competitors.
 *
 *   node scripts/perf_lab.mjs                  # the default comparison set
 *   RUNS=5 MODE=observed node scripts/perf_lab.mjs
 *
 * MODE=standard (default) is Lighthouse's mobile preset: a mid-range phone on
 * simulated slow 4G. It is the score PageSpeed Insights shows, and the right
 * one for comparing sites with each other — every site gets the same phone.
 *
 * MODE=observed turns the simulation off and measures what this connection
 * actually delivers, on a phone-sized viewport. Run from India, that is the
 * honest "what does an Indian user on decent broadband see" number, including
 * the distance to wherever each site's server is.
 *
 * Every page is run RUNS times and the median kept. Single Lighthouse runs on
 * ad-heavy pages swing by a second or more; one run is an anecdote.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const RUNS = Number(process.env.RUNS) || 3;
const MODE = process.env.MODE === "observed" ? "observed" : "standard";
const OUT = process.env.OUT || "perf-results";

const PAGES = [
  ["AdmissionHands", "home", "https://www.admissionhands.com/"],
  ["AdmissionHands", "predictor", "https://www.admissionhands.com/neet-college-predictor"],
  ["Shiksha", "home", "https://www.shiksha.com/"],
  ["Shiksha", "predictor", "https://www.shiksha.com/medicine-and-health-sciences/neet-college-predictor"],
  ["Collegedunia", "home", "https://collegedunia.com/"],
  ["Collegedunia", "predictor", "https://collegedunia.com/neet-college-predictor"],
  ["Careers360", "home", "https://www.careers360.com/"],
  ["Careers360", "predictor", "https://medicine.careers360.com/nta-neet-college-predictor"],
  ["CollegeDekho", "home", "https://www.collegedekho.com/"],
  ["CollegeDekho", "predictor", "https://www.collegedekho.com/exam/neet-ug/college-predictor"],
];

const only = process.env.ONLY ? new RegExp(process.env.ONLY, "i") : null;
const pages = only ? PAGES.filter(([site, kind]) => only.test(`${site} ${kind}`)) : PAGES;

mkdirSync(OUT, { recursive: true });
const chrome = chromium.executablePath();

const median = (xs) => {
  const v = xs.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};

function runOnce(url, file) {
  const args = [
    "-y", "lighthouse@12", url,
    "--quiet", "--output=json", `--output-path=${file}`,
    "--only-categories=performance",
    // CHROME_EXTRA adds flags — e.g. --host-resolver-rules="MAP host ip" to
    // measure a route before the visitor's DNS has caught up with it (used the
    // day Cloudflare went in front: the ISP resolver held the old address).
    `--chrome-flags=--headless=new --no-sandbox --disable-gpu${process.env.CHROME_EXTRA ? " " + process.env.CHROME_EXTRA : ""}`,
    "--max-wait-for-load=60000",
  ];
  if (MODE === "observed") args.push("--throttling-method=provided");
  const r = spawnSync("npx", args, {
    env: { ...process.env, CHROME_PATH: chrome },
    encoding: "utf8",
    shell: true,
    timeout: 240000,
  });
  if (!existsSync(file)) return { error: (r.stderr || "no report").split("\n").slice(-3).join(" ") };
  const j = JSON.parse(readFileSync(file, "utf8"));
  if (j.runtimeError) return { error: j.runtimeError.message };
  const a = j.audits;
  const num = (id) => a[id]?.numericValue ?? null;
  return {
    score: j.categories.performance.score != null ? Math.round(j.categories.performance.score * 100) : null,
    lcp: num("largest-contentful-paint"),
    fcp: num("first-contentful-paint"),
    tbt: num("total-blocking-time"),
    cls: num("cumulative-layout-shift"),
    si: num("speed-index"),
    ttfb: num("server-response-time"),
    bytes: num("total-byte-weight"),
    requests: a["network-requests"]?.details?.items?.length ?? null,
    thirdParty: a["third-party-summary"]?.details?.items?.length ?? null,
    finalUrl: j.finalDisplayedUrl,
  };
}

const results = [];
for (const [site, kind, url] of pages) {
  const runs = [];
  for (let i = 1; i <= RUNS; i++) {
    const file = join(OUT, `${MODE}-${site}-${kind}-${i}.json`.replace(/\s+/g, "_"));
    const r = runOnce(url, file);
    runs.push(r);
    process.stderr.write(`  ${site} ${kind} run ${i}: ${r.error ? "ERROR " + r.error.slice(0, 80) : `score ${r.score}, LCP ${(r.lcp / 1000).toFixed(1)}s`}\n`);
  }
  const ok = runs.filter((r) => !r.error);
  const pick = (k) => median(ok.map((r) => r[k]));
  results.push({
    site, kind, url, ok: ok.length, runs: runs.length,
    error: ok.length ? null : runs[0].error,
    score: pick("score"), lcp: pick("lcp"), fcp: pick("fcp"), tbt: pick("tbt"),
    cls: pick("cls"), si: pick("si"), ttfb: pick("ttfb"), bytes: pick("bytes"),
    requests: pick("requests"), thirdParty: pick("thirdParty"),
  });
}

const s = (ms) => (ms == null ? "—" : `${(ms / 1000).toFixed(1)}s`);
const kb = (b) => (b == null ? "—" : b > 1048576 ? `${(b / 1048576).toFixed(1)}MB` : `${Math.round(b / 1024)}KB`);

console.log(`\nLighthouse ${MODE === "observed" ? "OBSERVED (real network from here, no simulation)" : "STANDARD MOBILE (simulated slow 4G, mid-range phone)"} — median of ${RUNS}\n`);
console.log("  " + "site".padEnd(16) + "page".padEnd(11) + "score".padEnd(7) + "LCP".padEnd(7) + "FCP".padEnd(7) +
  "TBT".padEnd(8) + "CLS".padEnd(7) + "SpeedIdx".padEnd(10) + "weight".padEnd(9) + "requests".padEnd(10) + "3rd-party");
for (const r of results) {
  if (r.error) { console.log(`  ${r.site.padEnd(16)}${r.kind.padEnd(11)}could not test: ${r.error.slice(0, 70)}`); continue; }
  console.log("  " + r.site.padEnd(16) + r.kind.padEnd(11) + String(r.score ?? "—").padEnd(7) + s(r.lcp).padEnd(7) +
    s(r.fcp).padEnd(7) + `${Math.round(r.tbt ?? 0)}ms`.padEnd(8) + (r.cls ?? 0).toFixed(3).padEnd(7) + s(r.si).padEnd(10) +
    kb(r.bytes).padEnd(9) + String(r.requests ?? "—").padEnd(10) + String(r.thirdParty ?? "—") +
    (r.ok < r.runs ? `   (${r.ok}/${r.runs} runs ok)` : ""));
}
