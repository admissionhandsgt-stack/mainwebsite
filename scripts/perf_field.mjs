#!/usr/bin/env node
/**
 * Real-user Core Web Vitals, from Google's Chrome UX Report, for us and for
 * the competitors.
 *
 *   node scripts/perf_field.mjs                 # the default comparison set
 *   node scripts/perf_field.mjs https://a.com/  # any URLs
 *
 * Lab tests (perf_lab.mjs) say what a page *can* do on one machine. This says
 * what real Chrome users actually got over the last 28 days, at the 75th
 * percentile — which is the number Google's ranking uses. For sites like these
 * the users are overwhelmingly in India, so this is the closest thing to
 * "how does it feel for an Indian student" that exists without our own RUM.
 *
 * Read through the PageSpeed Insights API. Without a key it draws on a quota
 * Google shares between every keyless caller in the world, which runs out
 * (it did on 2026-10-04: "Queries per day" exhausted before the first call).
 * A key is free — Google Cloud console, enable "PageSpeed Insights API",
 * create an API key — and goes in PSI_KEY:
 *
 *   PSI_KEY=AIza... node scripts/perf_field.mjs
 *
 * A site with too little traffic has no field data at all; that is reported,
 * not guessed.
 */

const SITES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "https://www.admissionhands.com/",
      "https://www.shiksha.com/",
      "https://collegedunia.com/",
      "https://www.careers360.com/",
      "https://www.collegedekho.com/",
    ];

// Google's own "good" thresholds, so a number can be read without a lookup.
const GOOD = {
  LARGEST_CONTENTFUL_PAINT_MS: 2500,
  INTERACTION_TO_NEXT_PAINT: 200,
  CUMULATIVE_LAYOUT_SHIFT_SCORE: 10, // reported x100 by the API
  EXPERIMENTAL_TIME_TO_FIRST_BYTE: 800,
  FIRST_CONTENTFUL_PAINT_MS: 1800,
};
const LABEL = {
  LARGEST_CONTENTFUL_PAINT_MS: "LCP",
  INTERACTION_TO_NEXT_PAINT: "INP",
  CUMULATIVE_LAYOUT_SHIFT_SCORE: "CLS",
  EXPERIMENTAL_TIME_TO_FIRST_BYTE: "TTFB",
  FIRST_CONTENTFUL_PAINT_MS: "FCP",
};

function fmt(key, p75) {
  if (p75 == null) return "—";
  if (key === "CUMULATIVE_LAYOUT_SHIFT_SCORE") return (p75 / 100).toFixed(2);
  return p75 >= 1000 ? `${(p75 / 1000).toFixed(2)}s` : `${p75}ms`;
}

async function psi(url, strategy) {
  const api =
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed" +
    `?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance` +
    (process.env.PSI_KEY ? `&key=${encodeURIComponent(process.env.PSI_KEY)}` : "");
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(api, { signal: AbortSignal.timeout(120000) });
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) throw new Error(`PSI ${res.status}`);
    await new Promise((r) => setTimeout(r, 15000 * attempt));
  }
  throw new Error("PSI kept failing");
}

const rows = [];
for (const url of SITES) {
  const host = new URL(url).host;
  for (const strategy of ["mobile", "desktop"]) {
    try {
      const j = await psi(url, strategy);
      const field = j.originLoadingExperience?.metrics ?? null;
      const m = {};
      for (const k of Object.keys(LABEL)) {
        const p75 = field?.[k]?.percentile ?? null;
        m[LABEL[k]] = { text: fmt(k, p75), good: p75 != null && p75 <= GOOD[k] };
      }
      rows.push({
        host,
        strategy,
        hasField: !!field,
        overall: j.originLoadingExperience?.overall_category ?? "NO DATA",
        m,
        labScore: Math.round((j.lighthouseResult?.categories?.performance?.score ?? 0) * 100),
      });
      process.stderr.write(`  done ${host} ${strategy}\n`);
    } catch (e) {
      rows.push({ host, strategy, error: e.message });
      process.stderr.write(`  FAIL ${host} ${strategy}: ${e.message}\n`);
    }
  }
}

console.log("\nReal users, last 28 days, 75th percentile (whole site). ✓ = within Google's 'good'.\n");
console.log(
  "  " + "site".padEnd(24) + "device".padEnd(9) + "verdict".padEnd(18) +
    ["LCP", "INP", "CLS", "FCP", "TTFB"].map((h) => h.padEnd(10)).join(""),
);
for (const r of rows) {
  if (r.error) {
    console.log(`  ${r.host.padEnd(24)}${r.strategy.padEnd(9)}error: ${r.error}`);
    continue;
  }
  const cells = ["LCP", "INP", "CLS", "FCP", "TTFB"].map((k) =>
    r.hasField ? `${r.m[k].text}${r.m[k].good ? " ✓" : "  "}`.padEnd(10) : "—".padEnd(10),
  );
  console.log(`  ${r.host.padEnd(24)}${r.strategy.padEnd(9)}${String(r.overall).padEnd(18)}${cells.join("")}`);
}
console.log("\nNO DATA = too little Chrome traffic for Google to report on.");
