/**
 * Builds each state's NEET PG fee & stipend PDF — the file the official WhatsApp number sends (lib/waPdf.ts) — from
 * the same live data as /md-ms-india/fees/<state> (fees, official 2026-27 notices first), the stipend pages and the
 * bond page. A4, light, page 1 stands alone (it is what gets forwarded to groups). No rank anywhere; group figures over
 * 3+ colleges; the "as listed for the counselling, not an official notice" caveat on every page.
 *
 *   npx tsx --tsconfig scripts/pdf/tsconfig.json --env-file=.env.local scripts/pdf/build_fee_pdfs.ts \
 *       --states maharashtra,karnataka,rajasthan,tamil-nadu,madhya-pradesh [--out <dir>] [--apply]
 *
 * Without --apply it only writes the PDFs (and their HTML) to --out for a person to read. With --apply each state's new
 * PDF goes into lead_pdfs (migration 0061) and the state's older rows are switched off; the pages' button appears within
 * ten minutes. Re-run after a fee, stipend or bond import.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { chromium } from "playwright";
import { getStateFeeMatrix, FAMILY_LABEL, type MatrixCollege, type MatrixRow, type Ownership } from "@/lib/pgFeeMatrix";
import { getStateStipend } from "@/lib/cutoffHubQueries";
import { getBondByState } from "@/lib/pgSeatData";
import { getStateAuthority } from "@/lib/stateAuthorities";
import { refFor } from "@/lib/feePdfRefs";

const arg = (k: string, d = "") => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : d;
};
const STATES = arg("states", "maharashtra").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = resolve(arg("out", "pdf_out"));
const APPLY = process.argv.includes("--apply");
const SITE = "admissionhands.com";
const PHONE = "+91 92206 26002";

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString("en-IN"));
const money = (v: number | null | undefined) => {
  if (v == null) return "—";
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  if (v >= 1e7) return `₹${trim(v / 1e7)} Cr`;
  if (v >= 1e5) return `₹${trim(v / 1e5)} L`;
  return `₹${n(v)}`;
};
const OWN: Record<Ownership, string> = { government: "Government colleges", private: "Private colleges", deemed: "Deemed universities" };
const SHORT_COURSE = (c: string) => c.replace(/^(MD|MS)\s+/, "$1 ").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();

function feeCell(r: MatrixRow): string {
  const amt = (inr: number, usd: number | null) => (r.usd && usd ? `US$ ${n(usd)}` : money(inr));
  const one = r.low.inr === r.high.inr && r.low.usd === r.high.usd;
  const body = one
    ? `${amt(r.low.inr, r.low.usd)}${r.branches > 1 ? ` <span class="m">(${r.branches} branches)</span>` : ` <span class="m">(${esc(SHORT_COURSE(r.low.course))})</span>`}`
    : `${amt(r.low.inr, r.low.usd)} <span class="m">${esc(SHORT_COURSE(r.low.course))}</span> – ${amt(r.high.inr, r.high.usd)} <span class="m">${esc(SHORT_COURSE(r.high.course))}</span>`;
  return `${body}${r.firstYear ? ' <span class="m">· year 1</span>' : ""}`;
}

/** A college's rows, with quotas that charge exactly the same on every branch shown once ("Govt Quota / AIQ"). */
function merged(rows: MatrixRow[]): MatrixRow[] {
  const by = new Map<string, MatrixRow>();
  for (const r of rows) {
    const k = `${r.low.inr}|${r.high.inr}|${r.low.usd}|${r.high.usd}|${r.branches}|${r.official}|${r.firstYear}`;
    const e = by.get(k);
    if (e) e.quotas = [...e.quotas, ...r.quotas];
    else by.set(k, { ...r, quotas: [...r.quotas] });
  }
  return [...by.values()];
}
const SAYS_FAMILY = /manag|mgmt|nri|aiq|all india|paid|institutional|govt|government|state|quota/i;

function collegeRows(list: MatrixCollege[]): string {
  return list
    .map((c) =>
      merged(c.rows)
        .map(
          (r, i, all) => `<tr${i === 0 ? ' class="first"' : ""}>
  ${i === 0 ? `<th rowspan="${all.length}">${esc(c.short)}${c.place && !c.short.toLowerCase().includes(c.place.toLowerCase()) ? `<span class="m">, ${esc(c.place)}</span>` : ""}</th>` : ""}
  <td>${esc(r.quotas.slice(0, 3).join(" / "))}${r.quotas.some((q) => SAYS_FAMILY.test(q)) ? "" : `<span class="m"> · ${esc(FAMILY_LABEL[r.family])}</span>`}</td>
  <td class="fee">${feeCell(r)}</td>
  <td class="src">${r.official ? "2026-27 notice" : "as listed*"}</td>
</tr>`,
        )
        .join("\n"),
    )
    .join("\n");
}

async function build(slug: string) {
  const m = await getStateFeeMatrix(slug);
  if (!m) {
    console.warn(`! ${slug}: no fee matrix (fewer than 3 colleges with a yearly fee) — skipped`);
    return null;
  }
  const [stipend, bondAll, authority] = await Promise.all([
    getStateStipend(m.state).catch(() => null),
    getBondByState().catch(() => null),
    getStateAuthority(m.state).catch(() => null),
  ]);
  const bond = bondAll?.states.find((s) => s.state === m.state) ?? null;
  const auth = authority && authority.scope === "UG and PG" ? authority : null;
  const date = m.updated ? new Date(`${m.updated}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
  const total = m.colleges.length;

  const bandRows = (["government", "private", "deemed"] as Ownership[])
    .flatMap((own) =>
      (["state", "aiq", "management", "nri"] as const)
        .filter((f) => m.bands[own][f])
        .map((f) => {
          const b = m.bands[own][f]!;
          return `<tr><th>${OWN[own]}</th><td>${esc(FAMILY_LABEL[f])}</td><td class="num">${money(b.median)}</td><td class="num">${b.p10 != null && b.p90 != null ? `${money(b.p10)} – ${money(b.p90)}` : "—"}</td><td class="num">${b.colleges}</td></tr>`;
        }),
    )
    .join("");

  const ext = m.extremes.private_management ?? m.extremes.deemed_management;
  const stipendRows = stipend
    ? stipend.list
        .slice(0, 60)
        .map((s) => `<tr><th>${esc(s.name.replace(/,.*$/, ""))}</th><td>${esc(s.ownership === "government" ? "Govt" : s.ownership === "deemed" ? "Deemed" : "Private")}</td><td class="num">${money(s.y1)}</td><td class="num">${money(s.y2)}</td><td class="num">${money(s.y3)}</td></tr>`)
        .join("")
    : "";
  const bondRows = bond
    ? bond.govt.list
        .map((c) => `<tr><th>${esc(c.name.replace(/,.*$/, ""))}</th><td>${c.bondYears ? `${c.bondYears} yr` : c.bondYears === 0 ? "No bond" : "—"}</td><td class="num">${c.bondYears ? money(c.bondPenalty) : "—"}</td><td class="num">${money(c.exitPenalty)}</td></tr>`)
        .join("")
    : "";

  const section = (own: Ownership) => {
    const list = m.colleges.filter((c) => c.ownership === own);
    if (!list.length) return "";
    return `<h2>${OWN[own]} <span class="m">· ${list.length}</span></h2>
<table class="fees"><thead><tr><th>College</th><th>Seat</th><th>Fee a year (lowest – highest branch)</th><th>Source</th></tr></thead>
<tbody>${collegeRows(list)}</tbody></table>`;
  };

  const html = `<!doctype html><html lang="en-IN"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@700;800&family=Inter:wght@400;500;600;700&display=block" rel="stylesheet">
<style>
:root{--ink:#0f1b2d;--muted:#5d6c82;--line:#dfe6ee;--brand:#0e7490;--soft:#ecfeff;--accent:#15803d}
*{box-sizing:border-box}body{margin:0;font:400 10.5px/1.45 Inter,Arial,sans-serif;color:var(--ink)}
h1{font:800 27px/1.15 Figtree,Inter,sans-serif;margin:10px 0 8px;letter-spacing:-.01em}
h2{font:800 15px/1.2 Figtree,Inter,sans-serif;margin:18px 0 6px;color:var(--brand)}
h3{font:700 12px/1.3 Inter,sans-serif;margin:12px 0 4px}
.m{color:var(--muted);font-weight:400}
.brand{display:flex;align-items:center;gap:8px;font:800 14px Figtree,sans-serif;color:var(--brand)}
.brand b{width:22px;height:22px;border-radius:6px;background:var(--brand);display:inline-block}
.lede{font-size:12.5px;color:var(--ink);max-width:150mm}
.cave{border:1px solid var(--line);background:#f8fafc;border-radius:8px;padding:8px 10px;color:var(--muted);font-size:9.5px;margin:10px 0}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.card{border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.card .v{font:800 20px Figtree,sans-serif;color:var(--brand)}
.card .l{color:var(--muted);font-size:10px}
table{width:100%;border-collapse:collapse;margin-top:4px}
th,td{text-align:left;vertical-align:top;padding:4px 6px;border-bottom:1px solid var(--line)}
thead th{font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);background:#f1f5f9}
tbody th{font-weight:600}
tr{page-break-inside:avoid}
td.num{text-align:right;white-space:nowrap}
td.fee{white-space:normal}
td.src{white-space:nowrap;color:var(--muted);font-size:9.5px}
table.fees tr.first th,table.fees tr.first td{border-top:1px solid #c9d4df}
ul{margin:4px 0 0;padding-left:16px}li{margin:3px 0}
.box{border:1.5px solid var(--accent);border-radius:10px;padding:10px 12px;margin-top:12px}
.box h3{margin-top:0;color:var(--accent)}
.break{page-break-before:always}
.cta{display:flex;justify-content:space-between;gap:12px;margin-top:12px;padding:10px 12px;border-radius:10px;background:var(--soft);font-weight:600}
</style></head><body>

<section>
  <div class="brand"><b></b>Admission Hands</div>
  <h1>${esc(m.state)} NEET PG 2026-27: fees, stipend and bond, college by college</h1>
  <p class="lede">${total} MD/MS colleges — ${m.counts.government} government, ${m.counts.private} private, ${m.counts.deemed} deemed university — every kind of seat and its yearly fee, the stipend and the service bond, in one file.${date ? ` Updated ${esc(date)}.` : ""}</p>
  <div class="cave">Fees: each college's own 2026-27 notice where it has published one (marked "2026-27 notice"); otherwise as listed for the 2026 counselling (marked *). Stipend and bond: as listed for the counselling — not an official notice. Whole-course figures and DNB seats are left out. Confirm with ${auth ? esc(auth.authority) : "the state's counselling authority"} or the college before you pay a fee or sign a bond.</div>

  <h2>The fee in the middle, by kind of seat</h2>
  <table><thead><tr><th>Colleges</th><th>Seat</th><th style="text-align:right">Middle, a year</th><th style="text-align:right">Middle 80%</th><th style="text-align:right">Colleges</th></tr></thead><tbody>${bandRows}</tbody></table>
  <p class="m" style="margin-top:4px">One figure per college — the middle of its branches on that kind of seat. ${
    ext ? `Lowest management seat: ${money(ext.low.inr)} (${esc(ext.low.college)}, ${esc(SHORT_COURSE(ext.low.course))}); highest: ${money(ext.high.inr)} (${esc(ext.high.college)}, ${esc(SHORT_COURSE(ext.high.course))}).` : ""
  }</p>

  <div class="grid">
    ${stipend ? `<div class="card"><div class="v">${money(stipend.median)} /month</div><div class="l">Stipend, year 1, middle of ${stipend.colleges} colleges and hospitals${stipend.govtMedian ? ` · government ${money(stipend.govtMedian)}` : ""}${stipend.privateMedian ? ` · private ${money(stipend.privateMedian)}` : ""}</div></div>` : ""}
    ${bond && bond.govt.colleges ? `<div class="card"><div class="v">${bond.govt.withBond} of ${bond.govt.colleges}</div><div class="l">government colleges list a service bond${bond.govt.typicalYears ? `, usually ${bond.govt.typicalYears} year${bond.govt.typicalYears === 1 ? "" : "s"}` : ""}${bond.govt.penaltyMedian ? `; breaking it ${money(bond.govt.penaltyMedian)} in the middle` : ""}${bond.govt.exitMedian ? `; leaving the seat ${money(bond.govt.exitMedian)}` : ""}</div></div>` : ""}
  </div>

  <div class="box">
    <h3>Ask these before you pay</h3>
    <ul>
      <li>Is the figure the year's fee or the whole course's? What do hostel, mess and the caution deposit add?</li>
      <li>Which quota is the seat — state, All India, management, NRI? The same branch costs several times more on another quota.</li>
      <li>Is there a service bond, for how long, and what does breaking it cost? Does the college keep your original certificates?</li>
      <li>What does leaving the seat after joining cost, in this round, under this year's notice?</li>
      <li>Is the stipend paid from the first month, and what is deducted from it?</li>
    </ul>
  </div>
  <div class="cta"><span>Every college, live: ${SITE}/md-ms-india/fees/${esc(m.slug)}</span><span>Counsellor on WhatsApp: ${PHONE}</span></div>
</section>

<section class="break">
  ${section("government")}
  ${section("private")}
  ${section("deemed")}
  <p class="m">* As listed for the 2026 counselling — confirm with the college before you pay.</p>
</section>

${stipendRows || bondRows ? `<section class="break">
  ${stipendRows ? `<h2>Stipend, college by college <span class="m">· a month</span></h2>
  <table><thead><tr><th>College</th><th>Type</th><th style="text-align:right">Year 1</th><th style="text-align:right">Year 2</th><th style="text-align:right">Year 3</th></tr></thead><tbody>${stipendRows}</tbody></table>` : ""}
  ${bondRows ? `<h2>Service bond at government colleges</h2>
  <table><thead><tr><th>College</th><th>Bond</th><th style="text-align:right">To break it</th><th style="text-align:right">Leaving the seat</th></tr></thead><tbody>${bondRows}</tbody></table>
  <p class="m">As listed for the 2026 counselling, not an official notice. The state's own notice for your year is the final word.</p>` : ""}
</section>` : ""}

<section class="break">
  <h2>Where a counsellor helps</h2>
  <ul>
    <li><b>The order of your choices.</b> A seat is allotted at the first choice still open at your rank — the order is the strategy.</li>
    <li><b>Freeze or Float, round by round.</b> An upgrade cancels your old seat at once; leaving a seat after round 1 can cost the deposit.</li>
    <li><b>Home state or All India.</b> Which quota your rank, domicile and budget fit, and when to hold both.</li>
    <li><b>Fees, bond and documents before you report.</b> What the college will ask for, and what a seat will really cost over three years.</li>
  </ul>
  <p>No one can promise a seat: counselling allots it. The counsellor tells you the service fee before anything starts.</p>
  <h2>Sources</h2>
  <ul>
    <li>Fees: each college's 2026-27 fee notice where published; otherwise the fee listed for the 2026 counselling.</li>
    <li>Stipend, bond and seat-leaving terms: as listed for the 2026 counselling — not an official notice.</li>
    ${auth ? `<li>State counselling: ${esc(auth.authority)} — ${esc(auth.url)}</li>` : ""}
    <li>All India Quota, deemed universities and DNB: Medical Counselling Committee (MCC) — mcc.nic.in</li>
  </ul>
  <div class="cta"><span>${SITE} · free rank check: ${SITE}/neet-college-predictor</span><span>WhatsApp / call: ${PHONE}</span></div>
</section>
</body></html>`;
  return { m, html, date };
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
        margin: { top: "12mm", bottom: "14mm", left: "11mm", right: "11mm" },
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: `<div style="width:100%;font:500 7.5px Inter,Arial,sans-serif;color:#5d6c82;padding:0 11mm;display:flex;justify-content:space-between">
          <span>Admission Hands · ${esc(b.m.state)} NEET PG 2026-27 · fees as listed or from college notices; stipend and bond as listed — confirm before you pay</span>
          <span>${PHONE} · page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
      });
      const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      const pdfPath = join(OUT, `${base}.pdf`);
      writeFileSync(pdfPath, pdf);
      console.log(`${b.m.state}: ${b.m.colleges.length} colleges, ${pages} pages, ${Math.round(pdf.length / 1024)} KB → ${pdfPath}`);
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
