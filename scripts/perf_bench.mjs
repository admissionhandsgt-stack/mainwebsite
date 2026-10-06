#!/usr/bin/env node
/**
 * Before/after benchmark for our own pages: Google's PageSpeed lab (run from
 * Google's servers, so independent of this machine's ISP route) N times per
 * page, plus a summary of any directory of Lighthouse reports.
 *
 *   node scripts/perf_bench.mjs psi  <outDir> [runs=3]     # PSI lab + CrUX field, / and the predictor
 *   node scripts/perf_bench.mjs read <dir>                 # summarise Lighthouse JSONs (PSI or perf_lab.mjs)
 *
 * The summary is what an optimisation pass needs, not just the score: the LCP
 * element and its four phases (TTFB / load delay / load time / render delay),
 * what blocks render, which fonts and images are preloaded, and the critical
 * request chain — so a change can be judged by the bottleneck it was meant to
 * remove.
 *
 * Needs PSI_KEY in .env.local. Medians, never a single run: PSI's lab swings by
 * ten points between identical runs.
 */
import { config } from "dotenv";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });

const PAGES = {
  home: "https://www.admissionhands.com/",
  predictor: "https://www.admissionhands.com/neet-college-predictor",
};

const median = (xs) => {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : NaN;
};
const ms = (x) => (Number.isFinite(x) ? `${Math.round(x)}` : "-");
const kb = (x) => (Number.isFinite(x) ? `${Math.round(x / 1024)}KB` : "-");

function facts(lhr) {
  const a = lhr.audits;
  const n = (k) => a[k]?.numericValue;
  const reqs = a["network-requests"]?.details?.items ?? [];
  // Lighthouse 12 (perf_lab.mjs) reports these as audits; Lighthouse 13 (PSI
  // since 2026) as "insights" with a different shape. Read whichever is there.
  const lcpEl = a["largest-contentful-paint-element"]?.details?.items ?? [];
  const lcpIns = a["lcp-breakdown-insight"]?.details?.items ?? [];
  const phases =
    lcpEl[1]?.items?.map((p) => `${p.phase.replace(/ /g, "")} ${Math.round(p.timing)}`) ??
    lcpIns[0]?.items?.map((p) => `${p.subpart} ${Math.round(p.duration)}`) ??
    [];
  const lcpSnippet = lcpEl[0]?.items?.[0]?.node?.snippet ?? lcpIns.find((i) => i.type === "node")?.snippet ?? "";
  const blocking = (a["render-blocking-resources"]?.details?.items ?? a["render-blocking-insight"]?.details?.items ?? []).map(
    (i) => `${i.url.replace(/^https?:\/\/[^/]+/, "")} ${kb(i.totalBytes)} (${Math.round(i.wastedMs)}ms)`,
  );
  const preloads = reqs
    .filter((r) => r.priority === "VeryHigh" || r.priority === "High")
    .filter((r) => /Font|Image/.test(r.resourceType))
    .map((r) => `${r.resourceType} ${r.priority} ${kb(r.transferSize)} ${r.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 70)}`);
  const chain = [];
  (function walk(nodes, depth) {
    for (const node of Object.values(nodes || {})) {
      chain.push(`${"  ".repeat(depth)}${node.request.url.replace(/^https?:\/\/[^/]+/, "").slice(0, 80)} ${kb(node.request.transferSize)}`);
      walk(node.children, depth + 1);
    }
  })(a["critical-request-chains"]?.details?.chains, 0);
  if (!chain.length) {
    const tree = a["network-dependency-tree-insight"]?.details?.items?.[0]?.value?.chains;
    (function walk2(nodes, depth) {
      for (const node of Object.values(nodes || {})) {
        chain.push(`${"  ".repeat(depth)}${(node.url || "").replace(/^https?:\/\/[^/]+/, "").slice(0, 80)} ${kb(node.transferSize)} done@${Math.round(node.navStartToEndTime)}ms`);
        walk2(node.children, depth + 1);
      }
    })(tree, 0);
  }
  return {
    score: Math.round((lhr.categories.performance.score ?? 0) * 100),
    ttfb: n("server-response-time"),
    fcp: n("first-contentful-paint"),
    lcp: n("largest-contentful-paint"),
    cls: n("cumulative-layout-shift"),
    tbt: n("total-blocking-time"),
    si: n("speed-index"),
    bytes: n("total-byte-weight"),
    requests: reqs.length,
    lcpNode: lcpSnippet.slice(0, 150),
    phases,
    blocking,
    preloads,
    chain,
  };
}

function summarise(label, list) {
  if (!list.length) return;
  const m = (k) => median(list.map((f) => f[k]));
  console.log(
    `\n${label}  (median of ${list.length})  score ${m("score")}  TTFB ${ms(m("ttfb"))}ms  FCP ${ms(m("fcp"))}ms  ` +
      `LCP ${ms(m("lcp"))}ms  CLS ${m("cls").toFixed(3)}  TBT ${ms(m("tbt"))}ms  SI ${ms(m("si"))}ms  ` +
      `${kb(m("bytes"))}  ${m("requests")} requests`,
  );
  console.log(`  runs: ${list.map((f) => `${f.score}/${(f.lcp / 1000).toFixed(1)}s`).join("  ")}`);
  // Detail from the median-LCP run, so it describes a typical load.
  const typical = [...list].sort((x, y) => x.lcp - y.lcp)[Math.floor(list.length / 2)];
  console.log(`  LCP element: ${typical.lcpNode}`);
  console.log(`  LCP phases:  ${typical.phases.join(" · ")}`);
  console.log(`  render-blocking: ${typical.blocking.join(" | ") || "none"}`);
  console.log(`  high-priority fonts/images:\n    ${typical.preloads.join("\n    ") || "none"}`);
  console.log(`  critical chain:\n    ${typical.chain.join("\n    ")}`);
}

async function psi(out, runs) {
  const key = process.env.PSI_KEY;
  if (!key) throw new Error("PSI_KEY is not set in .env.local");
  mkdirSync(out, { recursive: true });
  for (const [name, url] of Object.entries(PAGES)) {
    for (let i = 1; i <= runs; i++) {
      // PSI hands back its cached result for the same URL within a short
      // window — three identical runs are one run. PSI_GAP (ms) waits between.
      if (i > 1 && process.env.PSI_GAP) await new Promise((r) => setTimeout(r, Number(process.env.PSI_GAP)));
      const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?strategy=${process.env.STRATEGY || "mobile"}&category=performance&key=${key}&url=${encodeURIComponent(url)}`;
      const j = await (await fetch(api)).json();
      if (j.error) {
        console.log(`  ${name} run ${i}: ERROR ${j.error.message.slice(0, 120)}`);
        continue;
      }
      writeFileSync(join(out, `psi-${name}-${i}.json`), JSON.stringify(j.lighthouseResult));
      if (i === 1) writeFileSync(join(out, `crux-${name}.json`), JSON.stringify({ page: j.loadingExperience, origin: j.originLoadingExperience }));
      const f = facts(j.lighthouseResult);
      console.log(`  ${name} run ${i}: score ${f.score}, LCP ${(f.lcp / 1000).toFixed(1)}s`);
    }
  }
}

function read(dir) {
  const groups = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json") && !x.startsWith("crux-"))) {
    const lhr = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (!lhr.audits) continue;
    const g = f.replace(/-\d+\.json$/, "");
    (groups[g] ||= []).push(facts(lhr));
  }
  for (const [g, list] of Object.entries(groups)) summarise(g, list);
  for (const f of readdirSync(dir).filter((x) => x.startsWith("crux-"))) {
    const c = JSON.parse(readFileSync(join(dir, f), "utf8"));
    for (const [scope, d] of Object.entries(c)) {
      const mets = d?.metrics ? Object.entries(d.metrics).map(([k, v]) => `${k.replace(/_MS|_SCORE|EXPERIMENTAL_/g, "")}=${v.percentile}`).join(" ") : "no field data";
      console.log(`\nfield (CrUX p75, 28 days) ${f.replace(/crux-|\.json/g, "")} ${scope}: ${d?.overall_category ?? ""} ${mets}`);
    }
  }
}

const [cmd, dir, runs] = process.argv.slice(2);
if (cmd === "psi" && dir) {
  await psi(dir, Number(runs) || 3);
  read(dir);
} else if (cmd === "read" && dir) {
  read(dir);
} else {
  console.error("usage: perf_bench.mjs psi <outDir> [runs] | read <dir>");
  process.exit(1);
}
