// A student's college-options poster (owner's request, 2026-11-05: "Admission Hands ke poster par banake do … for Dr …,
// colleges options and strategy as per MCC Round 1"). One branch, the colleges a counsellor shortlisted from an MCC
// round's result, grouped by state, each with the AIRs that took its seat — then last year's movement through the rounds
// and the next round's dates, as strategy.
//
//   node --env-file=.env.local scripts/poster/options_poster.mjs <spec.json> <out-dir>
//
// The spec (kept OUT of this public repo — it names a student) lists the colleges and ranks exactly as the counsellor
// chose them; see the shape in `main`. Every rank is checked against mcc_allotments (that year, round and course, All India
// Quota, an Open seat, a college whose MCC name contains `match`) and the poster is refused if one does not match. Last
// year's movement is computed from mcc_allotments too: the last AIR on an All India open seat in each round.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { esc, num, icon, I, logo, headerHtml, footerHtml, page, openBrowser, load, shoot } from "./kit.mjs";

const [specPath, outDir] = process.argv.slice(2);
if (!specPath || !outDir) {
  console.error("usage: options_poster.mjs <spec.json> <out-dir>");
  process.exit(1);
}
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

/* ------------------------------------------------------------------ check every rank against MCC's result */

const problems = [];
for (const s of spec.states) {
  for (const c of s.colleges) {
    for (const rank of c.ranks) {
      const rows = await sql`
        SELECT mcc_college_name, allotted_category, candidate_category FROM mcc_allotments
         WHERE year = ${spec.year} AND round = ${spec.round} AND mcc_course = ${spec.mccCourse}
           AND quota = 'All India' AND rank = ${rank}`;
      const hit = rows.find((r) => r.mcc_college_name.toLowerCase().includes(c.match.toLowerCase()));
      if (!hit) problems.push(`${rank} ${c.name}: MCC has ${rows.map((r) => r.mcc_college_name.slice(0, 60)).join(" | ") || "no such allotment"}`);
      else if (!/^Open$/i.test(hit.allotted_category)) problems.push(`${rank} ${c.name}: seat is ${hit.allotted_category}, not Open`);
    }
  }
}
if (problems.length) {
  console.error("Not drawn — these do not match MCC's result:\n  " + problems.join("\n  "));
  await sql.end();
  process.exit(1);
}

/* ------------------------------------------------------------------ last year's rounds */

const lastYear = spec.year - 1;
const moves = (
  await sql`
    SELECT round, max(rank)::int AS last FROM mcc_allotments
     WHERE year = ${lastYear} AND mcc_course = ${spec.lastYearCourse} AND quota = 'All India' AND allotted_category = 'Open'
     GROUP BY round`
).filter((r) => /^Round \d$|^Stray Vacancy Round$/.test(r.round));
const ORDER = ["Round 1", "Round 2", "Round 3", "Stray Vacancy Round"];
moves.sort((a, b) => ORDER.indexOf(a.round) - ORDER.indexOf(b.round));
await sql.end();
const shortRound = (r) => (r === "Stray Vacancy Round" ? "Stray" : r.replace("Round ", "Round "));

/* ------------------------------------------------------------------ figures */

const all = spec.states.flatMap((s) => s.colleges.flatMap((c) => c.ranks));
const colleges = spec.states.reduce((n, s) => n + s.colleges.length, 0);
const lo = Math.min(...all);
const hi = Math.max(...all);
const r1 = moves.find((m) => m.round === "Round 1");
const r2 = moves.find((m) => m.round === "Round 2");
const maxMove = Math.max(...moves.map((m) => m.last));

/* ------------------------------------------------------------------ the poster */

const css = `
.for{position:relative;display:inline-flex;align-items:center;gap:12px;padding:10px 26px 10px 12px;border-radius:999px;background:#fff;
  border:1.5px solid #cfe0f0;box-shadow:0 6px 16px rgba(11,36,71,.08);font:600 22px/1 Inter,sans-serif;color:var(--muted)}
.for .av{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#1fd8ae,#12b5c9)}
.for .av svg{width:24px;height:24px;color:#06302b}
.for b{font:900 27px/1 Figtree,sans-serif;color:var(--navy);letter-spacing:.2px}
h1.ch{margin-top:16px;font:900 112px/0.95 Figtree,sans-serif;letter-spacing:-4px;color:var(--navy)}
h1.ch span{color:var(--teal)}

.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 16px 0}
.st{background:#fff;border:1px solid #d9e2ee;border-radius:16px;padding:14px 16px;text-align:center}
.st b{display:block;font:900 34px/1 Figtree,sans-serif;color:var(--navy);letter-spacing:-.5px}
.st span{display:block;margin-top:6px;font:600 13.5px/1.2 Inter,sans-serif;color:var(--muted)}

.sh{display:flex;align-items:center;gap:12px;margin:28px 18px 0}
.sh .n{flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--navy);color:#fff;font:900 20px/1 Figtree,sans-serif}
.sh h2{font:900 34px/1.05 Figtree,sans-serif;color:var(--navy);letter-spacing:-.6px}
.sub{margin:8px 20px 0;font:500 15px/1.45 Inter,sans-serif;color:#3b4a62}
.sub b{color:var(--navy)}

.cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;margin:16px 16px 0}
.col{display:flex;flex-direction:column;gap:14px}
.card{background:#fff;border:1px solid #d9e2ee;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(11,36,71,.05)}
.card .h{display:flex;align-items:center;justify-content:space-between;padding:11px 16px;background:linear-gradient(90deg,#0b2447,#123a66);color:#fff}
.card .h b{font:800 19px/1 Figtree,sans-serif;letter-spacing:.2px}
.card .h span{font:700 12.5px/1 Inter,sans-serif;color:#a6efdc;letter-spacing:.4px}
.row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 16px;border-top:1px solid var(--line)}
.row:first-of-type{border-top:0}
.cn{font:700 15.5px/1.25 Inter,sans-serif;color:var(--ink)}
.chips{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:5px}
.chip{font:700 16px/1 'Roboto Condensed',sans-serif;letter-spacing:.3px;padding:6px 10px;border-radius:9px;background:#eef3fa;color:#33425a}
.chip.top{background:#e0f7f1;color:#06574d;box-shadow:inset 0 0 0 1.5px #7fdcc5}

.move{margin:16px 16px 0;background:#fff;border:1px solid #d9e2ee;border-radius:18px;padding:18px 20px 16px}
.move .t{font:800 18px/1.3 Figtree,sans-serif;color:var(--navy)}
.move .t span{font-weight:600;color:var(--muted);font-family:Inter,sans-serif;font-size:14px}
.bars{margin-top:14px;display:grid;gap:10px}
.br{display:grid;grid-template-columns:96px 1fr;align-items:center;gap:12px}
.br .l{font:700 15px/1 Inter,sans-serif;color:#33425a}
.br .tr{position:relative;height:34px;border-radius:0 8px 8px 0;background:#f1f5fa}
.br .f{height:100%;border-radius:0 6px 6px 0;display:flex;align-items:center;justify-content:flex-end;padding-right:10px;
  font:700 17px/1 'Roboto Condensed',sans-serif;color:#fff;letter-spacing:.3px}
.move .note{margin-top:12px;font:500 14px/1.45 Inter,sans-serif;color:#3b4a62}
.move .note b{color:var(--navy)}

.tips{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 16px 0}
.tip{background:#fff;border:1px solid #d9e2ee;border-radius:16px;padding:16px 18px;display:flex;gap:14px}
.tip .k{flex:none;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#e0f7f1;color:#06574d;font:900 18px/1 Figtree,sans-serif}
.tip b{display:block;font:800 18px/1.2 Figtree,sans-serif;color:var(--navy)}
.tip p{margin-top:6px;font:500 14.5px/1.45 Inter,sans-serif;color:#33425a}

.dates{margin:14px 16px 0;border-radius:18px;padding:16px 18px 18px;color:#fff;background:linear-gradient(90deg,#0b2447,#123a66)}
.dates .t{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.dates .t b{font:900 22px/1 Figtree,sans-serif}
.dates .t span{font:600 12.5px/1 Inter,sans-serif;color:#bccbe0}
.dg{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:14px}
.d{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px 10px 11px}
.d span{display:block;font:700 11.5px/1.2 Inter,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#a6efdc}
.d b{display:block;margin-top:6px;font:800 15.5px/1.25 Figtree,sans-serif}
.d.hl{background:linear-gradient(135deg,#1fd8ae,#12b5c9);border-color:transparent}
.d.hl span{color:#06302b}.d.hl b{color:#06302b}
`;

const stateCard = (s) => `    <div class="card">
      <div class="h"><b>${esc(s.state)}</b><span>${s.colleges.length} ${s.colleges.length === 1 ? "COLLEGE" : "COLLEGES"}</span></div>
${s.colleges
  .map((c) => {
    const ranks = [...c.ranks].sort((a, b) => b - a);
    return `      <div class="row"><div class="cn">${esc(c.name)}</div><div class="chips">${ranks
      .map((r, i) => `<span class="chip${i === 0 ? " top" : ""}">${num(r)}</span>`)
      .join("")}</div></div>`;
  })
  .join("\n")}
    </div>`;

// Two columns of state cards with no blank under the shorter one: each card goes to the shorter column, in the
// counsellor's order. A card's height ≈ its header plus a line per row (two for a row with two ranks or a long name).
const cardWeight = (s) => 1 + s.colleges.reduce((n, c) => n + 0.25 + Math.max(c.ranks.length, c.name.length > 46 ? 2 : 1), 0);
const columns = [[], []];
const heights = [0, 0];
for (const s of spec.states) {
  const i = heights[0] <= heights[1] ? 0 : 1;
  columns[i].push(s);
  heights[i] += cardWeight(s);
}

// Teal, light to dark by round: one hue, magnitude only.
const SHADES = ["#7fdcc5", "#2fc0a5", "#0c9c8b", "#0a6f66"];
const bars = moves
  .map((m, i) => `      <div class="br"><span class="l">${esc(shortRound(m.round))}</span><div class="tr"><div class="f" style="width:${Math.max(18, (m.last / maxMove) * 100).toFixed(1)}%;background:${SHADES[i] ?? SHADES[3]}">${num(m.last)}</div></div></div>`)
  .join("\n");

const tips = [
  ["Seats move after Round 1", r1 && r2
    ? `Last year the last open seat in ${esc(spec.course)} went ${num(r2.last - r1.last)} ranks further in Round 2 than in Round 1. Stay in the counselling — keep your registration and fill choices again.`
    : `Later rounds bring fresh and upgrade vacancies. Stay in the counselling and fill choices again.`],
  ["Fill by preference, not by rank", "MCC gives you the highest choice on your list that is still open at your rank. Put the college you want most first — a choice lower down can never beat one above it."],
  ["Aim a little higher", "Add the colleges you would prefer even where Round 1 closed before your rank. Upgrades in Round 2 free those seats for the next candidate in line."],
  ["Holding a Round 1 seat?", "An upgrade in Round 2 releases your Round 1 seat. Fill only colleges you would genuinely rather join than the one you hold."],
];

const body = `${headerHtml(logo())}
  <section class="title">
    <div class="for"><span class="av">${icon(I.stethoscope)}</span>Prepared for <b>${esc(spec.name)}</b></div>
    <h1 class="ch">${esc(spec.course.replace(/^(MD|MS)\s+/, "$1 "))}</h1>
    <div class="ribbon"><span class="l">MCC Counselling · All India Quota</span><span class="r">${esc(spec.round)} · ${spec.year}</span></div>
    <div class="prov">${icon(I.megaphone)}College options &amp; strategy, as per MCC ${esc(spec.round)} ${spec.year}</div>
  </section>

  <div class="stats">
    <div class="st"><b>${colleges}</b><span>colleges</span></div>
    <div class="st"><b>${all.length}</b><span>seats allotted</span></div>
    <div class="st"><b>${spec.states.length}</b><span>states</span></div>
    <div class="st"><b>${num(lo)}–${num(hi)}</b><span>AIR range</span></div>
  </div>

  <div class="sh"><span class="n">1</span><h2>Your college options</h2></div>
  <p class="sub">Open seats in <b>${esc(spec.course)}</b> (All India Quota) given to General-category candidates in MCC's ${esc(spec.round)} ${spec.year}, and the <b>AIR of each candidate who got the seat</b>. The highlighted rank is how far that college's seat went.</p>
  <div class="cols">
${columns.map((col) => `    <div class="col">\n${col.map(stateCard).join("\n")}\n    </div>`).join("\n")}
  </div>

  <div class="sh"><span class="n">2</span><h2>Strategy for Round 2</h2></div>
  <div class="move">
    <div class="t">How far the last All India open seat in ${esc(spec.course)} went, round by round <span>· NEET PG ${lastYear}</span></div>
    <div class="bars">
${bars}
    </div>
    <p class="note">This year Round 1 already reached <b>AIR ${num(hi)}</b> on the colleges above. Last year Round 1 stopped at <b>${r1 ? num(r1.last) : "—"}</b>, and each round after it went further.</p>
  </div>
  <div class="tips">
${tips.map(([h, p], i) => `    <div class="tip"><span class="k">${i + 1}</span><div><b>${esc(h)}</b><p>${p}</p></div></div>`).join("\n")}
  </div>

  <div class="dates">
    <div class="t"><b>MCC Round 2 dates, NEET PG ${spec.year}</b><span>MCC's tentative schedule — confirm on mcc.nic.in</span></div>
    <div class="dg">
${spec.round2.map(([k, v], i) => `      <div class="d${i === 1 ? " hl" : ""}"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("\n")}
    </div>
  </div>

  <p class="src">Source: MCC's NEET PG ${spec.year} ${esc(spec.round)} result, All India Quota (each rank checked against it); NEET PG ${lastYear}: MCC's round results. A rank shown is the AIR of the candidate allotted that seat — not a prediction of the next round.</p>
${footerHtml()}`;

mkdirSync(outDir, { recursive: true });
const slug = spec.course.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const htmlPath = join(outDir, `options-${slug}.html`);
const pngPath = join(outDir, `options-${slug}.png`);
writeFileSync(htmlPath, page({ title: `${spec.course} options`, css, body }));

const { browser, tab } = await openBrowser();
const missing = await load(tab, htmlPath);
if (missing.length) console.warn("fonts not loaded:", missing.join(", "));
await shoot(tab, pngPath);
await browser.close();
console.log(`checked ${all.length} ranks at ${colleges} colleges against MCC's ${spec.year} ${spec.round}; last year: ${moves.map((m) => `${shortRound(m.round)} ${m.last}`).join(", ")}`);
console.log(pngPath);
