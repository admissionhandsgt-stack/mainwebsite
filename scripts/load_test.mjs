#!/usr/bin/env node
/**
 * A bounded load test, run ON the box, against the app directly.
 *
 *   scp scripts/load_test.mjs root@<box>:/tmp/ && ssh root@<box> 'cd /tmp && node load_test.mjs'
 *   STAGES=10,25,50 SECONDS=20 node load_test.mjs
 *
 * ## Why on the box, against 127.0.0.1:8120
 *
 * From India every request spends ~0.9 s crossing to Montreal, so a load test
 * from here measures the ocean, not the server: each connection manages about
 * one request a second however fast the app is. Run beside the app, it measures
 * what the server itself can take. The cost of distance is measured separately.
 *
 * ## Why bounded, and why it stops itself
 *
 * There is no staging. This is the live site, mid-counselling season, on a box
 * that also runs five other applications. So it ramps in stages and stops at the
 * first sign of harm — an error rate over 1%, p95 over 3 s, the box's load
 * average past 75% of its cores, or another site on the box no longer
 * answering. It never looks for the breaking point; that needs a copy of the
 * site on a machine of its own.
 *
 * Pages only. The data APIs are rate-limited per client by design, and from
 * one address every request would be that one client — the test would measure
 * the limiter. That the limiter works is checked by the smoke suite.
 */

import http from "node:http";
import os from "node:os";
import { execSync } from "node:child_process";

const TARGET = process.env.TARGET || "http://127.0.0.1:8120";
const STAGES = (process.env.STAGES || "5,10,25,50,100").split(",").map(Number);
const SECONDS = Number(process.env.SECONDS) || 20;
const NEIGHBOUR = process.env.NEIGHBOUR || "https://kosmae.in/";

// A realistic mix: what a visitor actually opens, weighted roughly by traffic.
const PATHS = [
  ["/", 3],
  ["/neet-college-predictor", 2],
  ["/md-ms-india/colleges/sms-medical-college-jaipur", 2],
  ["/mbbs-india/colleges/a-j-institute-of-medical-sciences-research-centre-mangalore-ug", 1],
  ["/md-ms-india/branches/md-general-medicine", 1],
  ["/md-ms-india/colleges", 1],
  ["/nri-quota/fees", 1],
];
const BAG = PATHS.flatMap(([p, w]) => Array(w).fill(p));

const agent = new http.Agent({ keepAlive: true, maxSockets: 1000 });

function hit(path) {
  return new Promise((resolve) => {
    const t0 = process.hrtime.bigint();
    const req = http.get(
      TARGET + path,
      {
        agent,
        timeout: 15000,
        headers: {
          // An ordinary browser. A crawler user-agent would send the request down
          // the DNS-verification path, which is not what visitors cost.
          "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36 AH-loadtest",
          Accept: "text/html",
          "Accept-Encoding": "identity",
          Host: "www.admissionhands.com",
        },
      },
      (res) => {
        let bytes = 0;
        res.on("data", (c) => (bytes += c.length));
        res.on("end", () =>
          resolve({ ok: res.statusCode < 400, status: res.statusCode, ms: Number(process.hrtime.bigint() - t0) / 1e6, bytes }),
        );
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", () => resolve({ ok: false, status: 0, ms: Number(process.hrtime.bigint() - t0) / 1e6, bytes: 0 }));
  });
}

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0);

async function neighbourOk() {
  try {
    const code = execSync(`curl -s -o /dev/null -m 10 -w '%{http_code}' ${NEIGHBOUR}`).toString();
    return Number(code) > 0 && Number(code) < 500;
  } catch {
    return false;
  }
}

async function stage(concurrency) {
  const until = Date.now() + SECONDS * 1000;
  const results = [];
  let peakLoad = 0;
  const sampler = setInterval(() => (peakLoad = Math.max(peakLoad, os.loadavg()[0])), 1000);

  async function worker() {
    while (Date.now() < until) {
      results.push(await hit(BAG[Math.floor(Math.random() * BAG.length)]));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  clearInterval(sampler);

  const ms = results.map((r) => r.ms).sort((a, b) => a - b);
  const errors = results.filter((r) => !r.ok);
  return {
    concurrency,
    requests: results.length,
    rps: results.length / SECONDS,
    p50: pct(ms, 50), p95: pct(ms, 95), p99: pct(ms, 99), max: ms[ms.length - 1] ?? 0,
    errorRate: results.length ? errors.length / results.length : 1,
    statuses: [...new Set(errors.map((e) => e.status))],
    peakLoad,
    mbps: results.reduce((s, r) => s + r.bytes, 0) / SECONDS / 1048576,
  };
}

const cores = os.cpus().length;
console.log(`Load test: ${TARGET}, ${SECONDS}s per stage, stages ${STAGES.join(" → ")} concurrent`);
console.log(`Box: ${cores} cores, load before start ${os.loadavg()[0].toFixed(2)}, ${Math.round(os.freemem() / 1048576)} MB free\n`);
console.log("  conc   req/s   p50     p95     p99     max     errors  peak-load  MB/s");

// Warm the caches first, so stage one measures the site and not a cold start.
for (const [p] of PATHS) await hit(p);

for (const c of STAGES) {
  const r = await stage(c);
  const n = await neighbourOk();
  console.log(
    `  ${String(c).padEnd(6)} ${r.rps.toFixed(1).padEnd(7)} ${Math.round(r.p50) + "ms"}`.padEnd(30) +
      `${Math.round(r.p95)}ms`.padEnd(8) + `${Math.round(r.p99)}ms`.padEnd(8) + `${Math.round(r.max)}ms`.padEnd(8) +
      `${(r.errorRate * 100).toFixed(1)}%`.padEnd(8) + `${r.peakLoad.toFixed(1)}/${cores}`.padEnd(11) + r.mbps.toFixed(1) +
      (r.statuses.length ? `  statuses ${r.statuses.join(",")}` : ""),
  );
  const why =
    r.errorRate > 0.01 ? `error rate ${(r.errorRate * 100).toFixed(1)}%` :
    r.p95 > 3000 ? `p95 ${Math.round(r.p95)}ms` :
    r.peakLoad > cores * 0.75 ? `load average ${r.peakLoad.toFixed(1)} on ${cores} cores` :
    !n ? `neighbouring site ${NEIGHBOUR} stopped answering` : null;
  if (why) {
    console.log(`\nStopped after ${c} concurrent: ${why}. Not going further on a shared live box.`);
    break;
  }
  // Let the box settle so one stage does not bleed into the next.
  await new Promise((res) => setTimeout(res, 5000));
}
agent.destroy();
