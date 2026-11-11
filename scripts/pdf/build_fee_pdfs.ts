/**
 * Builds each state's NEET PG fee & stipend PDF — the file the official WhatsApp number sends (lib/waPdf.ts).
 *
 * Version 2 (owner, 2026-11-11, on the first PDF: "kafi detailed information dere hai… logo bhi sahi nhi… counsellor ke
 * bare mai unchi unchi baate nhi… contact details highlighted nhi… marketing lines achi nhi"): a three-page brochure, not
 * a data dump — the real logo and brand colours; page 1 sells Admission Hands with the team's own figures and a large
 * contact box; page 2 is the state at a glance (fee by kind of seat, stipend, bond — group figures over 3+ colleges, from
 * the same live data as /md-ms-india/fees/<state>) with the college-by-college list kept for the counsellor's call; page 3
 * is why families choose the team, the counsellor, how Expert Counselling works and the call to action. Contact details on
 * every page. Strong but true: the team's own figures (Admin → Content "Site: the team's own figures"), counted facts, no
 * promise of a seat, no invented student, the "as listed, not an official notice" caveat.
 *
 *   npx tsx --tsconfig scripts/pdf/tsconfig.json --env-file=.env.local scripts/pdf/build_fee_pdfs.ts \
 *       --states maharashtra,karnataka,rajasthan,tamil-nadu,madhya-pradesh [--out <dir>] [--apply]
 *
 * Without --apply it only writes the PDFs (and their HTML) to --out for a person to read. With --apply each state's new
 * PDF goes into lead_pdfs (migration 0061) and the state's older rows are switched off. Re-run after a fee, stipend or bond
 * import.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { chromium } from "playwright";
import { getStateFeeMatrix, FAMILY_LABEL, type Ownership } from "@/lib/pgFeeMatrix";
import { getStateStipend } from "@/lib/cutoffHubQueries";
import { getBondByState } from "@/lib/pgSeatData";
import { getStateAuthority } from "@/lib/stateAuthorities";
import { getCounsellingFacts } from "@/lib/counsellingFacts";
import { getLiveFigures } from "@/lib/liveFigures";
import { pageCopy } from "@/lib/pageCopy";
import { CONTACT_INFO } from "@/lib/constants";
import { refFor } from "@/lib/feePdfRefs";

const arg = (k: string, d = "") => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : d;
};
const STATES = arg("states", "maharashtra").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = resolve(arg("out", "pdf_out"));
const APPLY = process.argv.includes("--apply");
const SITE = "www.admissionhands.com";

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString("en-IN"));
const money = (v: number | null | undefined) => {
  if (v == null) return "—";
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  if (v >= 1e7) return `₹${trim(v / 1e7)} Cr`;
  if (v >= 1e5) return `₹${trim(v / 1e5)} L`;
  return `₹${n(v)}`;
};
const phoneText = (digits: string) => {
  const d = digits.replace(/\D/g, "").replace(/^91/, "");
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
};
const OWN: Record<Ownership, string> = { government: "Government colleges", private: "Private colleges", deemed: "Deemed universities" };
const LOGO = `data:image/png;base64,${readFileSync(resolve("public/logo.png")).toString("base64")}`;

const ICON = {
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
};
const svg = (p: string, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

async function build(slug: string) {
  const m = await getStateFeeMatrix(slug);
  if (!m) {
    console.warn(`! ${slug}: no fee matrix (fewer than 3 colleges with a yearly fee) — skipped`);
    return null;
  }
  const [stipend, bondAll, authority, facts, live, team, reviewer] = await Promise.all([
    getStateStipend(m.state).catch(() => null),
    getBondByState().catch(() => null),
    getStateAuthority(m.state).catch(() => null),
    getCounsellingFacts().catch(() => null),
    getLiveFigures().catch(() => null),
    pageCopy("page.services.figures"),
    pageCopy("site.reviewer"),
  ]);
  const bond = bondAll?.states.find((s) => s.state === m.state) ?? null;
  const auth = authority && authority.scope === "UG and PG" ? authority : null;
  const date = m.updated ? new Date(`${m.updated}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
  const phone = phoneText(CONTACT_INFO.whatsapp);
  const counsellings = facts ? facts.counsellings.pg + facts.counsellings.ug : null;
  const colleges = live?.nmc_colleges && /^\d/.test(live.nmc_colleges) ? live.nmc_colleges : null;
  const total = m.colleges.length;

  const bandRows = (["government", "private", "deemed"] as Ownership[])
    .flatMap((own) =>
      (["state", "aiq", "management", "nri"] as const)
        .filter((f) => m.bands[own][f])
        .map((f) => {
          const b = m.bands[own][f]!;
          return `<tr><th>${OWN[own]}</th><td>${esc(FAMILY_LABEL[f])}</td><td class="num big">${money(b.median)}</td><td class="num">${b.p10 != null && b.p90 != null && b.p10 !== b.p90 ? `${money(b.p10)} – ${money(b.p90)}` : "—"}</td></tr>`;
        }),
    )
    .join("");

  const contactBox = (title: string, line: string) => `<div class="contact">
    <div class="ct-left"><div class="ct-title">${esc(title)}</div><div class="ct-line">${esc(line)}</div></div>
    <div class="ct-right">
      <div class="ct-phone">${svg(ICON.phone, 22)}<span>${esc(phone)}</span></div>
      <div class="ct-sub">WhatsApp &amp; call · 10 AM – 10 PM</div>
      <div class="ct-web">${svg(ICON.globe, 15)}<span>${SITE}</span></div>
    </div>
  </div>`;

  const why = [
    [`${team.years} years in medical admissions`, "Our counsellors have guided NEET UG and NEET PG families through every kind of counselling, year after year."],
    [`${team.students} students guided`, "Students from every state, from top ranks to just-qualified, each with a plan made for their rank and budget."],
    [
      counsellings ? `${counsellings} counsellings followed, round by round` : "Every counselling followed, round by round",
      "MCC's All India rounds, deemed universities and each state's own counselling — dates, notices and seat changes, the day they happen.",
    ],
    [
      colleges ? `${colleges} medical colleges known seat by seat` : "Every medical college known seat by seat",
      "Fees by quota, stipend, bond, hostel and seat-leaving terms — checked with the colleges, in writing, before you pay.",
    ],
    ["Choice-filling strategy that saves seats", "The order of your choices, Freeze or Float, AIQ or state quota — the decisions where a better seat is most often lost."],
    ["With you till you join", "Documents, reporting, fee payment and every later round — one counsellor, start to finish."],
  ];

  const services = [
    ["Your personal college list", `Every ${m.state} and All India option that fits your rank, category, domicile and budget, with fee, stipend and bond side by side.`],
    ["The right choice order", "Which seats to lock first, which to keep as safety, and what to leave out — the order decides the seat."],
    ["Every round, on WhatsApp", "Round results, upgrades, Freeze or Float, stray rounds — what to do next, the day it happens."],
    ["Fee talks with colleges", "Instalments, hostel and deposit terms — and any discount a college offers — agreed in writing before you pay."],
    ["Documents checked", "The certificates each counselling and college asks for, checked before reporting so nothing stops you at the desk."],
    ["Reporting and joining", "Dates, fee payment and joining formalities handled with you until you are in your seat."],
  ];

  const html = `<!doctype html><html lang="en-IN"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=block" rel="stylesheet">
<style>
:root{--navy:#2b4a6c;--navy2:#1d3550;--mint:#14d9a5;--mintd:#0a9c77;--mints:#e7fbf4;--ink:#13233a;--muted:#5b6b80;--line:#dde5ee}
*{box-sizing:border-box}html,body{margin:0}body{font:400 11px/1.5 Inter,Arial,sans-serif;color:var(--ink)}
.page{page-break-after:always;position:relative}.page:last-child{page-break-after:auto}
.top{display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:3px solid var(--mint)}
.top img{height:46px}.page:first-child .top img{height:64px}.tag{font:600 11px Inter;color:var(--navy);text-align:right}.tag b{display:block;font:800 13px Figtree;color:var(--mintd)}
h1{font:900 30px/1.12 Figtree,sans-serif;color:var(--navy2);margin:22px 0 6px;letter-spacing:-.01em}
h1 span{color:var(--mintd)}
.sub{font-size:13px;color:var(--muted);margin:0 0 16px}
h2{font:800 17px/1.2 Figtree,sans-serif;color:var(--navy2);margin:18px 0 8px}
h2 small{font:600 11px Inter;color:var(--muted);margin-left:6px}
.hero{background:linear-gradient(135deg,var(--navy2),var(--navy));border-radius:14px;color:#fff;padding:18px 20px;margin-top:6px}
.hero .lead{font:800 17px/1.35 Figtree;margin:0 0 12px}.hero .lead em{font-style:normal;color:var(--mint)}
.badges{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.badge{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:10px 12px}
.badge b{display:block;font:900 20px Figtree;color:var(--mint)}.badge span{font-size:10.5px;color:#d6e2ee}
.inside{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:14px}
.inside div{border:1px solid var(--line);border-radius:10px;padding:10px 12px}.inside b{display:block;font:800 13px Figtree;color:var(--navy2)}
.inside span{font-size:10.5px;color:var(--muted)}
.contact{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-top:16px;padding:14px 18px;border-radius:14px;background:var(--mints);border:2.5px solid var(--mint)}
.ct-title{font:900 17px Figtree;color:var(--navy2)}.ct-line{font-size:11px;color:var(--muted);max-width:76mm}
.ct-right{text-align:right}.ct-phone{display:flex;align-items:center;gap:8px;justify-content:flex-end;font:900 25px Figtree;color:var(--navy2)}
.ct-phone svg{color:var(--mintd)}.ct-sub{font:600 10.5px Inter;color:var(--mintd)}
.ct-web{display:flex;align-items:center;gap:6px;justify-content:flex-end;font:700 12px Inter;color:var(--navy);margin-top:3px}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
thead th{font:700 9.5px Inter;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);background:#f1f5f9}
tbody th{font-weight:600}td.num{text-align:right;white-space:nowrap}td.big{font:800 13px Figtree;color:var(--navy2)}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.card{border:1px solid var(--line);border-radius:12px;padding:12px 14px}.card b{display:block;font:900 22px Figtree;color:var(--navy2)}
.card span{font-size:10.5px;color:var(--muted)}
.teaser{margin-top:14px;border-radius:12px;padding:14px 16px;background:var(--navy2);color:#fff}
.teaser b{font:800 14px Figtree;color:var(--mint)}.teaser p{margin:6px 0 0;color:#d6e2ee;font-size:11px}
.ask{margin-top:14px;border:1px solid var(--line);border-radius:12px;padding:12px 16px}.ask b{font:800 13px Figtree;color:var(--navy2)}
ul{margin:6px 0 0;padding-left:16px}li{margin:3px 0}
.why{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.why div{border:1px solid var(--line);border-left:4px solid var(--mint);border-radius:10px;padding:10px 12px}
.why b{display:flex;align-items:center;gap:6px;font:800 13px Figtree;color:var(--navy2)}.why b svg{color:var(--mintd)}
.why span{font-size:10.5px;color:var(--muted)}
.counsellor{display:flex;gap:14px;align-items:center;margin-top:14px;border-radius:12px;padding:14px 16px;background:var(--mints)}
.counsellor .av{width:52px;height:52px;border-radius:50%;background:var(--navy2);color:var(--mint);display:grid;place-items:center;font:900 20px Figtree;flex-shrink:0}
.counsellor b{font:800 15px Figtree;color:var(--navy2)}.counsellor span{display:block;font-size:11px;color:var(--muted)}
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px}
.steps div{border:1px solid var(--line);border-radius:10px;padding:10px}.steps i{font:900 16px Figtree;color:var(--mintd);font-style:normal}
.steps b{display:block;font:800 12px Figtree;color:var(--navy2);margin:2px 0}.steps span{font-size:10px;color:var(--muted)}
.honest{font-size:10px;color:var(--muted);margin-top:10px}
.cave{font-size:9.5px;color:var(--muted);margin-top:8px}
</style></head><body>

<section class="page">
  <div class="top"><img src="${LOGO}" alt="Admission Hands"><div class="tag"><b>Guiding Your Medical Journey</b>NEET UG &amp; NEET PG counselling, all India</div></div>
  <h1>${esc(m.state)} NEET PG 2026-27<br><span>Fees, Stipend &amp; Bond Guide</span></h1>
  <p class="sub">What an MD/MS seat in ${esc(m.state)} really costs — by kind of college and seat — with the stipend, the service bond and the questions to ask before you pay.${date ? ` Updated ${esc(date)}.` : ""}</p>
  <div class="hero">
    <p class="lead">One wrong choice in counselling can cost a year — or lakhs in fees and bond. <em>Admission Hands' expert counsellors help you get every step right.</em></p>
    <div class="badges">
      <div class="badge"><b>${esc(team.years)} years</b><span>guiding medical admissions</span></div>
      <div class="badge"><b>${esc(team.students)}</b><span>students guided through counselling</span></div>
      ${counsellings ? `<div class="badge"><b>${counsellings}</b><span>counsellings followed every round — MCC and every state</span></div>` : ""}
      ${colleges ? `<div class="badge"><b>${esc(colleges)}</b><span>medical colleges known seat by seat</span></div>` : ""}
    </div>
  </div>
  <div class="inside">
    <div><b>${total} MD/MS colleges</b><span>${m.counts.government} government · ${m.counts.private} private · ${m.counts.deemed} deemed</span></div>
    <div><b>Fee by kind of seat</b><span>State quota, All India, management, NRI — the middle and the usual range</span></div>
    <div><b>Stipend &amp; bond</b><span>What residents are paid, and what the bond and leaving a seat cost</span></div>
  </div>
  <h2>Why families choose Admission Hands</h2>
  <div class="why">${why.map(([t, s]) => `<div><b>${svg(ICON.check, 15)}${esc(t)}</b><span>${esc(s)}</span></div>`).join("")}</div>
  ${contactBox("Talk to an expert counsellor", "Free rank check and first call. Get a college list made for your rank, category and budget.")}
</section>

<section class="page">
  <div class="top"><img src="${LOGO}" alt="Admission Hands"><div class="tag"><b>${esc(m.state)} at a glance</b>NEET PG 2026-27</div></div>
  <h2>The fee you can expect <small>a year, one figure per college</small></h2>
  <table><thead><tr><th>Colleges</th><th>Seat</th><th style="text-align:right">Middle</th><th style="text-align:right">Most colleges</th></tr></thead><tbody>${bandRows}</tbody></table>
  <div class="cards">
    ${stipend ? `<div class="card"><b>${money(stipend.median)} / month</b><span>Stipend in year 1, middle of ${stipend.colleges} colleges and hospitals${stipend.govtMedian ? ` · government ${money(stipend.govtMedian)}` : ""}</span></div>` : ""}
    ${bond && bond.govt.colleges ? `<div class="card"><b>${bond.govt.withBond} of ${bond.govt.colleges}</b><span>government colleges list a service bond${bond.govt.typicalYears ? `, usually ${bond.govt.typicalYears} year${bond.govt.typicalYears === 1 ? "" : "s"}` : ""}${bond.govt.penaltyMedian ? `; breaking it costs ${money(bond.govt.penaltyMedian)}` : ""}</span></div>` : ""}
  </div>
  <div class="teaser"><b>Your college-wise list — fee, bond and chance for your rank</b>
    <p>Every ${esc(m.state)} college, branch by branch, set against your rank, category and budget, with the seats worth locking first. Our counsellor prepares it for you and walks you through it on a call.</p></div>
  <div class="ask"><b>Ask these before you pay any college</b>
    <ul>
      <li>Is it the year's fee or the whole course's? What do hostel, mess and the caution deposit add?</li>
      <li>Which quota is the seat — state, All India, management, NRI? The same branch can cost several times more on another quota.</li>
      <li>Is there a service bond? For how long, and what does breaking it cost? Will the college keep your original certificates?</li>
      <li>What does leaving the seat cost in this round, under this year's notice?</li>
    </ul></div>
  ${contactBox("Get your personal college list", "Send your rank on WhatsApp — a counsellor replies with what fits you.")}
  <p class="cave">Fees: each college's own 2026-27 notice where published, else as listed for the 2026 counselling. Stipend and bond: as listed for the counselling, not an official notice. Confirm with ${auth ? esc(auth.authority) : "the state's counselling authority"} or the college before you pay or sign.</p>
</section>

<section class="page">
  <div class="top"><img src="${LOGO}" alt="Admission Hands"><div class="tag"><b>Why Admission Hands</b>Expert NEET counselling</div></div>
  <h2>What you get with Expert Counselling</h2>
  <div class="why">${services.map(([t, d]) => `<div><b>${svg(ICON.check, 15)}${esc(t)}</b><span>${esc(d)}</span></div>`).join("")}</div>
  <div class="counsellor"><div class="av">${esc((reviewer.name || "AH").split(/\s+/).map((w) => w[0]).join("").slice(0, 2))}</div>
    <div><b>${esc(reviewer.name)}</b><span>${esc(reviewer.role)}, Admission Hands — with a team of counsellors who handle NEET UG and NEET PG counselling across India.</span></div></div>
  <h2>How Expert Counselling works</h2>
  <div class="steps">
    <div><i>1</i><b>Free rank check &amp; call</b><span>Your rank, category, domicile and budget.</span></div>
    <div><i>2</i><b>Your strategy</b><span>The colleges and quotas that fit, in the right order.</span></div>
    <div><i>3</i><b>Every round</b><span>Choice filling, Freeze or Float, upgrades — round by round.</span></div>
    <div><i>4</i><b>Joining your college</b><span>Documents, fees and reporting, done right.</span></div>
  </div>
  ${contactBox("Start with a free call today", "WhatsApp your NEET PG rank now — counselling rounds do not wait.")}
  <p class="honest">${svg(ICON.pin, 11)} ${esc(CONTACT_INFO.address)} · ${esc(CONTACT_INFO.email)}<br>
  No one can promise a seat: counselling allots it. Your counsellor tells you the service fee before anything starts.</p>
</section>
</body></html>`;
  return { m, html, date, phone };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  const sql = APPLY ? postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 }) : null;
  try {
    for (const slug of STATES) {
      const b = await build(slug);
      if (!b) continue;
      const base = `${slug}-neet-pg-fees-stipend-bond-2026-27`;
      const htmlPath = join(OUT, `${base}.html`);
      writeFileSync(htmlPath, b.html);
      await tab.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
      await tab.evaluate(() => document.fonts.ready);
      const pdf = await tab.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "11mm", bottom: "15mm", left: "12mm", right: "12mm" },
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: `<div style="width:100%;padding:0 12mm;font-family:Inter,Arial,sans-serif;font-size:8px;color:#5b6b80;display:flex;justify-content:space-between;align-items:center">
          <span>Fees as listed or from college notices; stipend and bond as listed — confirm before you pay.</span>
          <span style="background:#e7fbf4;border:1px solid #14d9a5;border-radius:6px;padding:3px 8px;color:#1d3550;font-weight:700;font-size:9px">Admission Hands · WhatsApp / call ${esc(b.phone)} · ${SITE}</span></div>`,
      });
      const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      const pdfPath = join(OUT, `${base}.pdf`);
      writeFileSync(pdfPath, pdf);
      console.log(`${b.m.state}: ${pages} pages, ${Math.round(pdf.length / 1024)} KB → ${pdfPath}`);
      if (sql) {
        const token = randomBytes(16).toString("hex");
        await sql.begin(async (tx) => {
          await tx`UPDATE lead_pdfs SET active = false WHERE slug = ${slug} AND active`;
          await tx`INSERT INTO lead_pdfs (slug, state, ref, filename, token, content, pages, data_date)
                   VALUES (${slug}, ${b.m.state}, ${refFor(b.m.state)}, ${`${base}.pdf`}, ${token}, ${pdf}, ${pages}, ${b.m.updated})`;
        });
        console.log(`  stored as ${refFor(b.m.state)}-PDF`);
      }
    }
  } finally {
    await browser.close();
    await sql?.end();
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
