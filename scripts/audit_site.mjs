/**
 * A QA pass over the live site, in a browser, repeatable.
 *
 * `smoke.mjs` answers "is it up and is the gate holding" in HTTP calls. This
 * is the other half: what a person and a crawler actually meet on the page —
 * headings, labels, tap targets, text sizes, metadata, broken links, console
 * errors. It renders every page in Chromium at a phone width and a desktop
 * width, because most of these faults only exist at one of them.
 *
 * Nothing here is a guess: every finding names the element and the measured
 * value, so it can be argued with.
 *
 * Run: node scripts/audit_site.mjs [baseUrl] [--json out.json]
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = (process.argv[2] || "https://admissionhands.com").replace(/\/+$/, "");
const jsonAt = process.argv.indexOf("--json");
const JSON_OUT = jsonAt > -1 ? process.argv[jsonAt + 1] : null;

/* The routes a visitor can actually reach, plus one of each templated kind. */
const ROUTES = [
  "/",
  "/neet-college-predictor",
  "/neet-college-predictor?course=mbbs",
  "/neet-college-predictor?course=bds",
  "/mbbs-india",
  "/mbbs-india/colleges",
  "/mbbs-india/deemed-universities",
  "/md-ms-india",
  "/md-ms-india/colleges",
  "/nri-quota",
  "/nri-quota/colleges",
  "/nri-quota/documents",
  "/neet-ug-process",
  "/neet-pg-process",
  "/services",
  "/know-us",
  "/videos",
  "/login",
  "/terms",
];

/** WCAG 2.5.8 is 24px; 44px is the size a thumb actually wants. */
const TAP_MIN = 44;
/** Below this, body text on a phone is a squint. */
const TEXT_MIN = 12;

const findings = [];
const add = (severity, route, viewport, check, detail) =>
  findings.push({ severity, route, viewport, check, detail });

/* ------------------------------------------------------------------ audit */

/**
 * Everything measurable about one rendered page.
 *
 * Runs inside the page so it sees computed styles and real geometry rather
 * than the markup's intentions.
 */
const COLLECT = () => {
  const text = (el) => (el.textContent || "").trim().replace(/\s+/g, " ");

  const accessibleName = (el) => {
    const aria = el.getAttribute("aria-label");
    if (aria?.trim()) return aria.trim();
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const t = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id))
        .filter(Boolean)
        .map(text)
        .join(" ");
      if (t) return t;
    }
    if (text(el)) return text(el);
    const img = el.querySelector("img[alt]");
    if (img?.getAttribute("alt")?.trim()) return img.getAttribute("alt").trim();
    const sr = el.querySelector(".sr-only");
    if (sr && text(sr)) return text(sr);
    if (el.title?.trim()) return el.title.trim();
    return "";
  };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0.05;
  };

  const describe = (el) => {
    const cls = (el.className || "").toString().split(/\s+/).slice(0, 3).join(".");
    return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls ? "." + cls : ""}`;
  };

  /* -------------------------------------------------------------- metadata */
  const meta = {
    title: document.title || "",
    description: document.querySelector('meta[name="description"]')?.content || "",
    canonical: document.querySelector('link[rel="canonical"]')?.href || "",
    ogTitle: document.querySelector('meta[property="og:title"]')?.content || "",
    ogImage: document.querySelector('meta[property="og:image"]')?.content || "",
    robots: document.querySelector('meta[name="robots"]')?.content || "",
    lang: document.documentElement.getAttribute("lang") || "",
    viewportMeta: document.querySelector('meta[name="viewport"]')?.content || "",
  };

  const jsonLd = [];
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(s.textContent || "");
      for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
        jsonLd.push(item["@type"] || "?");
      }
    } catch {
      jsonLd.push("INVALID");
    }
  }

  /* -------------------------------------------------------------- headings */
  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
    .filter(visible)
    .map((h) => ({ level: Number(h.tagName[1]), text: text(h).slice(0, 70) }));

  /* ----------------------------------------------------------------- images */
  const images = [...document.querySelectorAll("img")].filter(visible).map((img) => ({
    src: (img.currentSrc || img.src || "").split("/").pop()?.slice(0, 60) || "",
    alt: img.getAttribute("alt"),
    broken: img.complete && img.naturalWidth === 0,
    // A raster served far larger than it is drawn is bytes nobody sees.
    oversized:
      img.naturalWidth > 0 && img.getBoundingClientRect().width > 0
        ? Math.round(img.naturalWidth / img.getBoundingClientRect().width)
        : 0,
  }));

  /* --------------------------------------------------------------- controls */
  const controls = [...document.querySelectorAll("a[href], button, [role='button']")].filter(visible);

  const unnamed = controls.filter((el) => !accessibleName(el)).map(describe);

  /**
   * A link inside a sentence is part of the sentence — it cannot be 44px tall
   * without breaking the line it sits in, and WCAG 2.5.8 exempts it for that
   * reason. Only standalone controls are counted, so the number means
   * something someone can act on.
   */
  const inlineInProse = (el) => {
    if (el.tagName !== "A") return false;
    const p = el.parentElement;
    if (!p) return false;
    if (!/^(P|LI|SPAN|TD|DD|H1|H2|H3|H4|BLOCKQUOTE)$/.test(p.tagName)) return false;
    // Prose means there is text around it, not just the link.
    return text(p).length > text(el).length + 12;
  };

  const smallTaps = controls
    .filter((el) => !inlineInProse(el))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { el, w: Math.round(r.width), h: Math.round(r.height) };
    })
    .filter((c) => c.w < 44 || c.h < 44)
    .map((c) => `${describe(c.el)} ${c.w}x${c.h} "${text(c.el).slice(0, 26)}"`);

  /* ------------------------------------------------------------------ forms */
  const unlabelled = [...document.querySelectorAll("input, select, textarea")]
    .filter(visible)
    .filter((el) => el.type !== "hidden")
    .filter((el) => {
      if (el.getAttribute("aria-label")?.trim()) return false;
      if (el.getAttribute("aria-labelledby")) return false;
      if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
      if (el.closest("label")) return false;
      return true;
    })
    .map(describe);

  /* -------------------------------------------------------------- typography */
  const tiny = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("p, span, li, td, th, dd, dt, a, button, label, div")) {
    if (!visible(el)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 3);
    if (!own) continue;
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    if (size >= 12) continue;
    const key = `${describe(el)}@${size}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // An uppercase, letter-spaced, short string is a label or an eyebrow, and
    // 10-11px is a legitimate choice there. A sentence at 10px is not.
    const body =
      cs.textTransform !== "uppercase" &&
      text(el).length > 24 &&
      parseFloat(cs.letterSpacing || "0") < 0.5;
    tiny.push({
      kind: body ? "body" : "label",
      detail: `${describe(el)} ${size}px "${text(el).slice(0, 34)}"`,
    });
  }

  /* ----------------------------------------------------------------- layout */
  const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;

  /* ------------------------------------------------------------------ links */
  const links = [...document.querySelectorAll("a[href]")]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h.startsWith("/") && !h.startsWith("//"));

  return { meta, jsonLd, headings, images, unnamed, smallTaps, unlabelled, tiny, overflow, links };
};

async function auditRoute(browser, route, width, height, label) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    // A blocked third-party pixel is not this site's fault.
    if (/favicon|net::ERR_BLOCKED|Failed to load resource: the server responded/i.test(t)) return;
    consoleErrors.push(t.slice(0, 150));
  });
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 150)));

  const started = Date.now();
  let response;
  try {
    response = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("load", { timeout: 20000 }).catch(() => {});
    // A marquee and an analytics beacon keep the network busy forever, so
    // "idle" is not a state this site reaches. A fixed settle is honest about
    // what it is measuring.
    await page.waitForTimeout(1200);
  } catch (e) {
    add("HIGH", route, label, "loads", String(e).slice(0, 120));
    await ctx.close();
    return null;
  }
  const ms = Date.now() - started;

  if (!response || response.status() >= 400) {
    add("HIGH", route, label, "loads", `HTTP ${response?.status()}`);
    await ctx.close();
    return null;
  }

  const r = await page.evaluate(COLLECT);

  /* ---- things that only make sense to say once, so desktop says them ---- */
  if (label === "desktop") {
    const t = r.meta.title;
    if (!t) add("HIGH", route, label, "title", "missing");
    else if (t.length > 65) add("LOW", route, label, "title", `${t.length} chars — Google truncates past ~60`);

    const d = r.meta.description;
    if (!d) add("MEDIUM", route, label, "meta description", "missing");
    else if (d.length > 165) add("LOW", route, label, "meta description", `${d.length} chars`);
    else if (d.length < 70) add("LOW", route, label, "meta description", `only ${d.length} chars`);

    if (!r.meta.canonical) add("MEDIUM", route, label, "canonical", "missing");
    if (!r.meta.ogTitle) add("LOW", route, label, "open graph", "no og:title");
    if (!r.meta.ogImage) add("LOW", route, label, "open graph", "no og:image");
    if (!r.meta.lang) add("MEDIUM", route, label, "lang", "<html> has no lang attribute");

    if (r.jsonLd.includes("INVALID")) add("HIGH", route, label, "structured data", "JSON-LD does not parse");

    const h1s = r.headings.filter((h) => h.level === 1);
    if (h1s.length === 0) add("MEDIUM", route, label, "headings", "no visible h1");
    else if (h1s.length > 1) add("LOW", route, label, "headings", `${h1s.length} h1s: ${h1s.map((h) => h.text).join(" | ").slice(0, 100)}`);

    // A jump from h2 straight to h4 tells a screen-reader user a level is missing.
    let prev = 0;
    for (const h of r.headings) {
      if (prev && h.level > prev + 1) {
        add("LOW", route, label, "heading order", `h${prev} → h${h.level} at "${h.text}"`);
        break;
      }
      prev = h.level;
    }

    for (const img of r.images) {
      if (img.broken) add("HIGH", route, label, "image", `broken: ${img.src}`);
      else if (img.alt === null) add("MEDIUM", route, label, "image", `no alt attribute: ${img.src}`);
      else if (img.oversized >= 4) add("LOW", route, label, "image", `${img.src} served ${img.oversized}× its drawn width`);
    }

    for (const u of [...new Set(r.unnamed)].slice(0, 6)) {
      add("MEDIUM", route, label, "unnamed control", u);
    }
    for (const u of [...new Set(r.unlabelled)].slice(0, 6)) {
      add("MEDIUM", route, label, "unlabelled field", u);
    }
    // Wall-clock from *this machine*, minus the settle wait — so it is a
    // relative number for comparing pages, not a claim about production. TTFB
    // on the box itself is tens of milliseconds; most of what is measured here
    // is the distance between here and the VPS.
    const rendered = ms - 1200;
    if (rendered > 4000) {
      add("LOW", route, label, "slower than its siblings", `${(rendered / 1000).toFixed(1)}s from this machine`);
    }
  }

  /* ------------- and the things that are only true on a phone ------------- */
  if (label === "mobile") {
    if (r.overflow > 2) add("HIGH", route, label, "horizontal overflow", `${r.overflow}px wider than the screen`);
    if (!r.meta.viewportMeta.includes("width=device-width")) {
      add("HIGH", route, label, "viewport", r.meta.viewportMeta || "missing");
    }
    if (/user-scalable=no|maximum-scale=1/.test(r.meta.viewportMeta)) {
      add("HIGH", route, label, "viewport", "zoom is disabled");
    }
    for (const t of [...new Set(r.smallTaps)].slice(0, 8)) {
      add("MEDIUM", route, label, `tap target under ${TAP_MIN}px`, t);
    }
    // Body copy first: that is the one a reader actually struggles with.
    for (const t of r.tiny.filter((x) => x.kind === "body").slice(0, 8)) {
      add("MEDIUM", route, label, `body text under ${TEXT_MIN}px`, t.detail);
    }
    for (const t of r.tiny.filter((x) => x.kind === "label").slice(0, 6)) {
      add("LOW", route, label, `label text under ${TEXT_MIN}px`, t.detail);
    }
  }

  for (const e of [...new Set(consoleErrors)].slice(0, 4)) {
    add("MEDIUM", route, label, "console error", e);
  }

  await ctx.close();
  return {
    links: r.links,
    ms,
    tapCount: new Set(r.smallTaps).size,
    tinyCount: r.tiny.filter((x) => x.kind === "body").length,
  };
}

/* ------------------------------------------------------------------- run */

async function main() {
  console.log(`\nAuditing ${BASE}\n`);
  const browser = await chromium.launch();
  const allLinks = new Set();

  for (const route of ROUTES) {
    process.stdout.write(`  ${route} `);
    const d = await auditRoute(browser, route, 1440, 900, "desktop");
    const m = await auditRoute(browser, route, 390, 844, "mobile");
    d?.links.forEach((l) => allLinks.add(l.split("#")[0]));
    const marks = findings.filter((f) => f.route === route);
    console.log(
      marks.length === 0
        ? "✓"
        : `${marks.length} finding${marks.length === 1 ? "" : "s"}` +
            (m ? ` (taps ${m.tapCount}, small body text ${m.tinyCount})` : ""),
    );
  }

  /* Every internal link the site points at, actually fetched. */
  console.log(`\n  checking ${allLinks.size} internal links…`);
  let broken = 0;
  for (const href of allLinks) {
    try {
      const res = await fetch(BASE + href, { redirect: "follow" });
      if (res.status >= 400) {
        add("HIGH", href, "link", "broken internal link", `HTTP ${res.status}`);
        broken += 1;
      }
    } catch (e) {
      add("HIGH", href, "link", "broken internal link", String(e).slice(0, 80));
      broken += 1;
    }
  }
  console.log(`  ${broken} broken`);

  await browser.close();

  /* ---------------------------------------------------------------- report */
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.route.localeCompare(b.route));

  const counts = findings.reduce((acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] ?? 0) + 1 }), {});
  console.log(`\n${"=".repeat(70)}`);
  console.log(`HIGH ${counts.HIGH ?? 0} · MEDIUM ${counts.MEDIUM ?? 0} · LOW ${counts.LOW ?? 0}`);
  console.log("=".repeat(70));

  let lastSeverity = "";
  for (const f of findings) {
    if (f.severity !== lastSeverity) {
      console.log(`\n[${f.severity}]`);
      lastSeverity = f.severity;
    }
    console.log(`  ${f.route} (${f.viewport}) — ${f.check}: ${f.detail}`);
  }

  if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify({ base: BASE, at: new Date().toISOString(), findings }, null, 2));
    console.log(`\nwritten to ${JSON_OUT}`);
  }

  console.log("");
  process.exit((counts.HIGH ?? 0) > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
