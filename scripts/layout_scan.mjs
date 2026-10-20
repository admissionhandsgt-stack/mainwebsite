// Layout scan of any pages (2026-10-20): short button labels that wrap, uppercase labels that wrap,
// text under 11px, and controls spilling out of their box. Read-only, analytics blocked.
//   node scripts/layout_scan.mjs <base> <width> <path ...>
import { chromium } from "playwright";
import { blockAnalytics } from "./lib/noAnalytics.mjs";

const base = process.argv[2];
const width = Number(process.argv[3]) || 390;
const paths = process.argv.slice(4);
const FOOTER = /^(Explore|Get in Touch|Updates|UPDATES|Privacy|Terms|Data & DPDP|© 20\d\d)/;

const issues = () => {
  const found = [];
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
  };
  // Lines of text only: an icon beside the label is not a second line.
  const lines = (el) => {
    const tops = new Set();
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width > 1) tops.add(Math.round(r.top / 6));
    }
    return tops.size;
  };
  const text = (el) => el.textContent.replace(/\s+/g, " ").trim();
  for (const el of document.querySelectorAll("button, a")) {
    if (!vis(el) || el.closest("nav[aria-label='Breadcrumb'], footer, p")) continue;
    const t = text(el);
    const r = el.getBoundingClientRect();
    if (t && t.length <= 32 && r.height < 120 && lines(el) >= 2 && /rounded|btn|button/.test(String(el.className) + el.tagName))
      found.push({ kind: "button wraps", text: t, w: Math.round(r.width) });
  }
  for (const el of document.querySelectorAll("label, dt, th")) {
    if (!vis(el)) continue;
    const t = text(el);
    if (t && t.length <= 30 && lines(el) >= 2 && getComputedStyle(el).textTransform === "uppercase") found.push({ kind: "label wraps", text: t });
  }
  for (const el of document.querySelectorAll("body *")) {
    if (!vis(el) || !el.childNodes.length || el.closest("svg, [aria-hidden='true'], footer")) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (own && parseFloat(getComputedStyle(el).fontSize) < 11) found.push({ kind: "tiny text", text: text(el).slice(0, 60), px: getComputedStyle(el).fontSize });
  }
  for (const el of document.querySelectorAll("button, input, select, a[class*='rounded']")) {
    if (!vis(el) || getComputedStyle(el).position === "fixed" || /(^|\s)-m[rl]-/.test(String(el.className))) continue;
    const p = el.parentElement;
    if (!p || getComputedStyle(p).display === "contents") continue;
    if (/auto|scroll|hidden/.test(getComputedStyle(p).overflowX)) continue;
    const r = el.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    if (r.right > pr.right + 2 || r.left < pr.left - 2) found.push({ kind: "spills out", text: text(el).slice(0, 40) || el.tagName, by: Math.round(Math.max(r.right - pr.right, pr.left - r.left)) });
  }
  const seen = new Set();
  return found.filter((f) => {
    const k = f.kind + f.text;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width, height: 900 }, isMobile: width < 500, hasTouch: width < 500 });
await blockAnalytics(ctx);
let total = 0;
for (const path of paths) {
  const p = await ctx.newPage();
  try {
    await p.goto(base + path, { waitUntil: "load", timeout: 120000 });
    await p.waitForTimeout(2000);
    const list = (await p.evaluate(issues)).filter((f) => f.kind !== "tiny text" || !FOOTER.test(f.text));
    total += list.length;
    if (list.length) {
      console.log("\n" + path + "  (" + list.length + ")");
      for (const f of list) console.log(`  [${f.kind}] "${f.text}"${f.w ? ` ${f.w}px wide` : ""}${f.px ? ` ${f.px}` : ""}${f.by ? ` by ${f.by}px` : ""}`);
    }
  } catch (e) {
    console.log("\n" + path + "  ERROR " + String(e.message).split("\n")[0]);
  }
  await p.close();
}
await b.close();
console.log(`\n${total} finding(s) at ${width}px on ${paths.length} pages`);
