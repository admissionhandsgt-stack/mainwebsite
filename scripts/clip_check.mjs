// Finds text the visitor cannot read in full at phone width (2026-10-20): a placeholder wider than
// its input, a select whose chosen option does not fit, and any ellipsis / line-clamped text that
// is actually cut. Analytics are blocked. Read-only.
//   node scripts/clip_check.mjs <base> [width] [path ...]
import { chromium } from "playwright";
import { blockAnalytics } from "./lib/noAnalytics.mjs";

const base = process.argv[2] ?? "http://localhost:3000";
const width = Number(process.argv[3]) || 360;
const paths = process.argv.slice(4).length ? process.argv.slice(4) : ["/"];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await blockAnalytics(ctx);
let total = 0;
for (const path of paths) {
  const p = await ctx.newPage();
  try {
    await p.goto(base + path, { waitUntil: "load", timeout: 120000 });
    await p.waitForTimeout(2500);
    const found = await p.evaluate(() => {
      const out = [];
      const ctx = document.createElement("canvas").getContext("2d");
      const font = (cs) => `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
      };
      for (const el of document.querySelectorAll("input[placeholder]")) {
        if (!visible(el) || ["checkbox", "radio", "hidden"].includes(el.type)) continue;
        const cs = getComputedStyle(el);
        ctx.font = font(cs);
        const have = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const need = ctx.measureText(el.placeholder).width;
        if (need > have + 1) out.push({ kind: "placeholder", id: el.id || el.name || "", text: el.placeholder, need: Math.round(need), have: Math.round(have) });
      }
      for (const el of document.querySelectorAll("select")) {
        if (!visible(el) || !el.selectedOptions[0]) continue;
        const cs = getComputedStyle(el);
        ctx.font = font(cs);
        const have = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const text = el.selectedOptions[0].textContent.trim();
        const need = ctx.measureText(text).width;
        if (need > have + 1) out.push({ kind: "select", id: el.id || el.name || "", text, need: Math.round(need), have: Math.round(have) });
      }
      for (const el of document.querySelectorAll("body *")) {
        if (!visible(el) || el.closest("svg")) continue;
        const cs = getComputedStyle(el);
        const ellipsis = cs.textOverflow === "ellipsis" && cs.overflow !== "visible";
        const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
        if (!ellipsis && !clamp) continue;
        const cut = ellipsis ? el.scrollWidth > el.clientWidth + 1 : el.scrollHeight > el.clientHeight + 1;
        if (cut) out.push({ kind: clamp ? "line-clamp" : "ellipsis", tag: el.tagName.toLowerCase(), text: el.textContent.replace(/\s+/g, " ").trim().slice(0, 110), cls: String(el.className).slice(0, 70) });
      }
      return out;
    });
    total += found.length;
    console.log(`\n${path}  (${found.length})`);
    for (const f of found) console.log(`  [${f.kind}] ${f.id ? `#${f.id} ` : ""}${f.tag ? `<${f.tag}> ` : ""}"${f.text}"${f.need ? `  needs ${f.need}px, has ${f.have}px` : ""}${f.cls ? `  .${f.cls}` : ""}`);
  } catch (e) {
    console.log(`\n${path}  ERROR ${e.message.split("\n")[0]}`);
  }
  await p.close();
}
await b.close();
console.log(`\n${total} finding(s) at ${width}px`);
