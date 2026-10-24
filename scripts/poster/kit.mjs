// The poster frame every Admission Hands data poster shares (owner's design, 2026-10-24): the header with the
// logo and "Guiding Your Medical Journey", the "NEET PG <last> vs <this>" title and ribbon, the "How to read"
// box, the footer with the phone number — plus the browser that renders it. The table in between is each
// poster's own: round_cuts_poster.mjs (branch × category or seat type), college_cuts_poster.mjs (college × branch).
//
// The CSS is split in two so a poster's table styles sit between them, in the cascade order they were written in.

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const num = (n) => n.toLocaleString("en-US");

export const icon = (paths, cls = "") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
// Lucide icons (ISC licence).
export const I = {
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  college: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  stethoscope: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
};

export const logo = () => readFileSync(join(ROOT, "public/icon-512.png")).toString("base64");

export const FONTS_HEAD = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@700;800;900&family=Inter:wght@400;500;600;700;800&family=Kaushan+Script&family=Montserrat:wght@300;800&family=Roboto+Condensed:wght@400;500;700&display=block" rel="stylesheet">`;

/** Tokens, page, header, title and the "How to read" box — before a poster's table styles. */
export const CSS_BASE = `:root{
  --navy:#0b2447;--navy-2:#123a66;--ink:#16243b;--muted:#5d6c82;--line:#e3eaf3;
  --mint:#1fd8ae;--teal:#0c9c8b;
  --open:#2f6fe4;--open-d:#2358c2;--open-t:#f0f5ff;--open-t2:#e4edfd;
  --ews:#7a4fe0;--ews-d:#6240c4;--ews-t:#f6f2ff;--ews-t2:#ece4fd;
  --obc:#0f9d8f;--obc-d:#0b8175;--obc-t:#edf9f6;--obc-t2:#dff3ee;
  --sc:#ee6a17;--sc-d:#cf560b;--sc-t:#fff5ed;--sc-t2:#ffe9da;
  --st:#1f9b52;--st-d:#167f41;--st-t:#eef9f2;--st-t2:#e0f2e7;
  --up:#0f7a35;--down:#c8251b;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#dfe6ef}
body{font-family:Inter,system-ui,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
.poster{width:1080px;background:#f4f7fb;position:relative;overflow:hidden}

/* ---------- header */
.hd{position:relative;height:200px;padding:0 40px;display:flex;align-items:center;justify-content:space-between;color:#fff;
  background:radial-gradient(90% 160% at 0% 0%,#16507f 0%,#0b2447 52%,#071a36 100%)}
.hd::before{content:"";position:absolute;inset:0;
  background-image:linear-gradient(rgba(255,255,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.055) 1px,transparent 1px);
  background-size:26px 26px;-webkit-mask-image:linear-gradient(90deg,transparent 0%,#000 45%,#000 100%)}
.hd::after{content:"";position:absolute;left:0;right:0;bottom:0;height:5px;background:linear-gradient(90deg,var(--mint),#12b5c9 55%,rgba(18,181,201,0))}
.ecg{position:absolute;left:0;right:0;bottom:22px;width:100%;height:70px;color:var(--mint);opacity:.22}
.steth{position:absolute;right:250px;top:-26px;width:250px;height:250px;color:#fff;opacity:.06;stroke-width:1.1}
.brand{position:relative;display:flex;align-items:center;z-index:1}
.shield{width:122px;height:122px;filter:drop-shadow(0 8px 18px rgba(0,0,0,.35))}
.bar{width:3px;height:106px;border-radius:3px;background:var(--mint);margin:0 22px 0 14px}
.w1{font:800 56px/0.95 Montserrat,sans-serif;letter-spacing:1px}
.w2{font:300 47px/1.08 Montserrat,sans-serif;letter-spacing:4px}
.w3{font:700 12.5px/1 Inter,sans-serif;letter-spacing:5.4px;color:#a6efdc;margin-top:12px}
.tag{position:relative;z-index:1;text-align:center;transform:rotate(-7deg);margin-right:6px}
.tag p{font:36px/1.02 'Kaushan Script',cursive;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.25)}
.tag svg{display:block;width:170px;height:16px;margin:4px auto 0;color:var(--mint)}

/* ---------- title */
.title{position:relative;text-align:center;padding:26px 24px 0}
.title::before{content:"";position:absolute;inset:0 0 auto 0;height:220px;pointer-events:none;
  background:radial-gradient(60% 100% at 50% 0%,rgba(31,216,174,.10),transparent 70%)}
h1{position:relative;font:900 104px/1 Figtree,sans-serif;letter-spacing:-3.5px;color:var(--navy);white-space:nowrap}
h1 .y1{color:var(--teal)}
h1 .vs{font-size:62px;letter-spacing:-1px;margin:0 18px 0 16px;color:var(--navy-2)}
.ribbon{position:relative;display:flex;align-items:center;justify-content:space-between;gap:16px;margin:18px 14px 0;padding:9px 9px 9px 30px;
  border-radius:20px;background:linear-gradient(90deg,#0b2447,#123a66);box-shadow:0 10px 24px rgba(11,36,71,.22)}
.ribbon .l{font:900 33px/1.1 Figtree,sans-serif;letter-spacing:.4px;color:#fff;white-space:nowrap}
.ribbon .r{font:900 30px/1 Figtree,sans-serif;letter-spacing:.6px;color:#062c2a;white-space:nowrap;padding:13px 30px;border-radius:14px;
  background:linear-gradient(90deg,#3be3bd,#19c3a0)}
.prov{display:inline-flex;align-items:center;gap:10px;margin-top:16px;padding:9px 22px 9px 16px;border-radius:999px;
  background:#e6f8ee;border:1.5px solid #b6e6cb;font:800 21px/1 Figtree,sans-serif;color:var(--navy)}
.prov svg{width:24px;height:24px;color:#14894a}

/* ---------- legend */
.legend{display:flex;gap:10px;align-items:flex-start;margin:16px 16px 0;padding:11px 16px;border-radius:12px;background:#fff;border:1px solid #d9e2ee;
  font:500 13.5px/1.45 Inter,sans-serif;color:#33425a}
.legend svg{flex:none;width:18px;height:18px;margin-top:1px;color:var(--navy-2)}
.legend b{color:var(--navy);font-weight:800}
.legend .up,.legend .down{font-weight:800}
.up{color:var(--up)}.down{color:var(--down)}
`;

/** The source line and the footer — after a poster's table styles. */
export const CSS_FOOTER = `.src{margin:9px 20px 0;font:500 11.5px/1.4 Inter,sans-serif;color:var(--muted)}

/* ---------- footer */
.ft{position:relative;margin-top:18px;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:22px 26px 24px;color:#fff;
  background:radial-gradient(80% 180% at 100% 100%,#0e5a66 0%,#0d3a63 45%,#0b2447 100%)}
.ft::before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,rgba(31,216,174,0),var(--mint) 30%,#12b5c9)}
.fi{display:flex;align-items:center;gap:12px}
.ic{flex:none;width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:rgba(31,216,174,.13);border:1.5px solid rgba(31,216,174,.55)}
.ic svg{width:26px;height:26px;color:var(--mint)}
.fi b{display:block;font:800 17.5px/1.15 Figtree,sans-serif}
.fi div>span{display:block;font:500 13.5px/1.25 Inter,sans-serif;color:#bccbe0;margin-top:2px}
.sep{width:1px;align-self:stretch;background:rgba(255,255,255,.14)}
.phone{display:flex;align-items:center;gap:12px;padding:8px 22px 8px 8px;border-radius:999px;background:#fff;box-shadow:0 10px 26px rgba(0,0,0,.25)}
.pi{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:#18a34a}
.pi svg{width:27px;height:27px;color:#fff}
.phone b{display:block;font:900 35px/1 Figtree,sans-serif;letter-spacing:.6px;color:var(--navy)}
.phone div>span{display:block;font:600 12.5px/1 Inter,sans-serif;color:var(--muted);margin-top:4px;letter-spacing:.3px}
`;

export const headerHtml = (logoB64) => `  <header class="hd">
    <svg class="ecg" viewBox="0 0 1080 70" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">
      <polyline points="0,40 360,40 380,40 392,22 404,58 418,6 432,52 444,40 700,40 716,40 726,26 736,54 748,14 760,48 770,40 1080,40"/>
    </svg>
    ${icon(I.stethoscope, "steth")}
    <div class="brand">
      <img class="shield" src="data:image/png;base64,${logoB64}" alt="">
      <span class="bar"></span>
      <div><div class="w1">ADMISSION</div><div class="w2">HANDS</div><div class="w3">YOUR MEDICAL ADMISSION PARTNER</div></div>
    </div>
    <div class="tag"><p>Guiding<br>Your Medical<br>Journey</p>
      <svg viewBox="0 0 170 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4 11 C 50 2, 110 2, 166 8"/></svg></div>
  </header>`;

/** `after` (HTML) sits on the same line as the basis pill — a multi-page poster's page number. */
export const titleHtml = ({ last, year, ribbon, pill, basis, after = "" }) => `  <section class="title">
    <h1>NEET PG <span class="y1">${last}</span><span class="vs">vs</span>${year}</h1>
    <div class="ribbon"><span class="l">${esc(ribbon)}</span><span class="r">${esc(pill)}</span></div>
    <div class="prov">${icon(I.megaphone)}${esc(basis)}</div>${after}
  </section>`;

export const footerHtml = () => `  <footer class="ft">
    <div class="fi"><span class="ic">${icon(I.users)}</span><div><b>Expert Guidance</b><span>for NEET PG Admissions</span></div></div>
    <span class="sep"></span>
    <div class="fi"><span class="ic">${icon(I.clipboard)}</span><div><b>Personalised</b><span>Counselling</span></div></div>
    <span class="sep"></span>
    <div class="fi"><span class="ic">${icon(I.college)}</span><div><b>College Options</b><span>as per your Profile</span></div></div>
    <div class="phone"><span class="pi">${icon(I.phone)}</span><div><b>9310301949</b><span>www.admissionhands.com</span></div></div>
  </footer>`;

/** A whole poster document: the frame around `body`, with the poster's own table CSS in the middle of the cascade. */
export const page = ({ title, css, body }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
${FONTS_HEAD}
<style>
${CSS_BASE}
${css}
${CSS_FOOTER}</style></head>
<body>
<div class="poster">
${body}
</div>
</body></html>`;

/** The browser every poster renders in: 1080 css px wide at 2× (a 2160 px image), analytics never loaded. */
export async function openBrowser() {
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1080, height: 1400 }, deviceScaleFactor: 2 });
  await tab.route(/google-analytics|googletagmanager|theautoloom/, (r) => r.abort());
  return { browser, tab };
}

/** Load a written poster and wait for its fonts. Returns the families that failed to load (none, normally). */
export async function load(tab, htmlPath) {
  await tab.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await tab.evaluate(() => document.fonts.ready);
  return tab.evaluate(() => {
    // Google Fonts registers a face per script subset and loads only the ones the page uses, so a face
    // counts as missing only when no subset of that family and weight loaded.
    const used = [["Figtree", "800"], ["Figtree", "900"], ["Montserrat", "300"], ["Montserrat", "800"], ["Kaushan Script", "400"],
      ["Inter", "500"], ["Inter", "600"], ["Inter", "700"], ["Inter", "800"], ["Roboto Condensed", "400"], ["Roboto Condensed", "700"]];
    const faces = [...document.fonts];
    return used
      .filter(([f, w]) => !faces.some((x) => x.family.replace(/["']/g, "") === f && String(x.weight) === w && x.status === "loaded"))
      .map(([f, w]) => `${f} ${w}`);
  });
}

/** Screenshot the poster element of the loaded page. */
export async function shoot(tab, pngPath) {
  await (await tab.$(".poster")).screenshot({ path: pngPath });
}
