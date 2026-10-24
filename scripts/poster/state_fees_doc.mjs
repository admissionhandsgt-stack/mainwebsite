// A state's NEET PG fees, college by college (owner, 2026-10-24: "maharashtra ke sare colleges ka 2026 session ki
// fees … all branches … all seat types like gen, mgm, NRI … ek badhiya sa Document"). An A4 PDF: a front page with
// every seat type's typical fee, then every college — government, private, deemed, DNB/NBE — with the fee per seat
// type and the branches it applies to.
//
//   node --env-file=.env.local scripts/poster/state_fees_doc.mjs [--state Maharashtra] [--out <dir>]
//   node --env-file=.env.local scripts/poster/state_fees_doc.mjs --json <file>   (the data only, for the Excel
//                                                    workbook: python scripts/poster/state_fees_xlsx.py <file> <xlsx>)
//
// Source: pg_seat_terms — fees "as listed for the 2026 counselling", a compilation, never an official notice. The
// document carries the site's caveat (confirm with the counselling notice or the college before paying) and never
// calls the figures official or verified; the source does not say for every figure whether it is per year or for
// the whole course, so neither does the document. Most rows give one fee per college and seat type for every
// branch; where a college's fee differs by branch, each fee is printed with the branches it applies to.

import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { esc, logo, FONTS_HEAD, openBrowser, load } from "./kit.mjs";

const require = createRequire(import.meta.url);
const postgres = require("postgres");

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const STATE = arg("state", "Maharashtra");
const OUT = resolve(arg("out", "."));

const rupees = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
};

// Seat types in the order a family meets them, with plain names. A state's own quota names start with the state.
const SEATS = [
  { key: "Govt Quota", label: "State Govt Quota", sub: "CET Cell", kind: "gen" },
  { key: "AIQ", label: "All India Quota", sub: "MCC", kind: "gen" },
  { key: "Management Quota", label: "Management Quota", sub: "CET Cell", kind: "mgmt" },
  { key: "NRI Quota", label: "NRI Quota", sub: "CET Cell", kind: "nri" },
  { key: "Minority Quota", label: "Minority Quota", sub: "CET Cell", kind: "mgmt" },
  { key: "MNG", label: "Paid / Management seat", sub: "MCC · deemed", kind: "mgmt" },
  { key: "NRI", label: "NRI seat", sub: "MCC · deemed", kind: "nri" },
  { key: "DNB Post MBBS", label: "DNB (post-MBBS)", sub: "MCC", kind: "gen" },
  { key: "NBE Diploma", label: "NBE Diploma", sub: "MCC", kind: "gen" },
  { key: "DNB Sponsored Seats", label: "DNB Sponsored", sub: "in-service", kind: "gen" },
];
const seatOf = (t) => {
  const k = t.replace(new RegExp(`^${STATE}\\s+`, "i"), "");
  return SEATS.find((s) => s.key.toLowerCase() === k.toLowerCase()) ?? { key: t, label: t, sub: "", kind: "gen" };
};
const SECTIONS = [
  { id: "govt", title: "Government medical colleges", test: (t) => t === "Government Institute" },
  { id: "private", title: "Private medical colleges", test: (t) => /^Private Institute/i.test(t) },
  { id: "deemed", title: "Deemed universities", test: (t) => t === "Deemed" },
  { id: "nbe", title: "DNB / NBE hospitals", test: (t) => /^NBE/i.test(t) },
];

// A hospital's name without its address: no bracketed notes, no segment with a number or an address word, no
// segment that is only the state ("…, Sector 22, Kharghar, Navi Mumbai, Maharashtra-410210" → "…, Kharghar, Navi Mumbai").
const ADDRESS = /\b(?:road|rd|marg|street|lane|sector|block|plot|no|post|p\.?o|village|vill|dist|district|tehsil|taluk|near|opp|highway|nh)\b/i;
const cleanName = (n) => {
  const segs = n.replace(/\s*\([^)]*\)/g, "").split(",").map((x) => x.replace(/\s{2,}/g, " ").trim()).filter(Boolean);
  const keep = segs.slice(1).filter((x) => !/\d/.test(x) && !ADDRESS.test(x) && x.toLowerCase() !== STATE.toLowerCase());
  return [segs[0], ...keep].join(", ");
};
// ------------------------------------------------------------------ data
const sql = postgres(process.env.DATABASE_URL, { max: 1, idle_timeout: 5 });
const rows = await sql`
  SELECT college_name, institute_type, seat_type, counselling, course, degree, fee_inr, fee_session, fetched_on,
         hostel_fee_min_inr, hostel_fee_max_inr, hostel_fee_period, hostel_included_in_fee, hostel_includes_mess,
         institute_id, course_id
    FROM pg_seat_terms WHERE state ILIKE ${STATE}`;
await sql.end();
if (!rows.length) throw new Error(`no rows for ${STATE}`);
const asOf = rows.map((r) => r.fetched_on).filter(Boolean).sort().pop();
const asOfText = asOf ? new Date(asOf).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";

// college -> { section, seats: Map(seatKey -> [{course, fee, session}]), hostel: one entry per seat type as listed }
const colleges = new Map();
for (const r of rows) {
  const section = SECTIONS.find((s) => s.test(r.institute_type ?? ""))?.id ?? "nbe";
  const key = `${section}|${r.college_name}`;
  const c = colleges.get(key) ?? { name: cleanName(r.college_name), type: r.institute_type, section, seats: new Map(), hostel: new Map(), ids: new Set() };
  if (r.institute_id) c.ids.add(r.institute_id);
  const seat = seatOf(r.seat_type);
  if (!c.hostel.has(seat.key))
    c.hostel.set(seat.key, { min: r.hostel_fee_min_inr, max: r.hostel_fee_max_inr, period: r.hostel_fee_period,
      included: r.hostel_included_in_fee, mess: r.hostel_includes_mess });
  const list = c.seats.get(seat.key) ?? [];
  list.push({ course: r.course, fee: r.fee_inr > 0 ? Number(r.fee_inr) : null, session: r.fee_session });
  c.seats.set(seat.key, list);
  colleges.set(key, c);
}

// The front page's table: every seat type, its colleges, and the middle 80% of its fees.
const bySeat = new Map();
for (const r of rows) {
  const s = seatOf(r.seat_type);
  const x = bySeat.get(s.key) ?? { seat: s, colleges: new Set(), fees: [] };
  x.colleges.add(r.college_name);
  if (r.fee_inr > 0) x.fees.push(Number(r.fee_inr));
  bySeat.set(s.key, x);
}
const seatRows = SEATS.map((s) => bySeat.get(s.key)).filter(Boolean).concat([...bySeat.values()].filter((x) => !SEATS.includes(x.seat)));

// ------------------------------------------------------------------ html
const shortCourse = (c) => c.replace(/^(MD|MS|DNB|Diploma in|Diploma|NBE Diploma in|DM|MCh)\s+/i, (m) => m.trim() + " ");
// The names a counsellor says: "Dermatology", not "Dermatology, Venereology & Leprosy".
const SHORT = [
  [/Dermatology,? Venereology (?:&|and) Leprosy|Dermatology & Venereology/i, "Dermatology"],
  [/Tuberculosis & Respiratory Diseases|Respiratory Medicine|^Respiratory Diseases$/i, "Respiratory Med."],
  [/Tuberculosis & Chest Diseases/i, "TB & Chest"], [/^Orthopa?edics(?: Surgery)?$/i, "Orthopaedics"],
  [/Oto-Rhino-Laryngology/i, "ENT"], [/Immuno Hematology & Transfusion Medicine/i, "IHBT"],
  [/Social & Preventive Medicine|Community Medicine/i, "Community Med."], [/Obstetrics & Gynaecology/i, "OBG"],
  [/Physical Medicine & Rehabilitation/i, "PMR"], [/Radio ?-?Diagnosis/i, "Radiology"], [/Bio-Chemistry/i, "Biochemistry"],
  [/Immuno Haematology & Blood Transfusion/i, "IHBT"], [/Anaesthesiology/i, "Anaesthesia"], [/Forensic Medicine/i, "Forensic Med."],
  [/Emergency Medicine/i, "Emergency Med."], [/Hospital Administration/i, "Hospital Admin."], [/Radiation Oncology/i, "Radiation Oncology"],
];
const DEGREE = /^(MD|MS|DNB|NBE Diploma|Diploma|DM|MCh)\s+(?:in\s+)?/i;
const brief = (c) => SHORT.reduce((t, [re, to]) => t.replace(re, to), c.replace(DEGREE, "").replace(/-NBE$/i, ""));
const degreeOf = (c) => (DEGREE.exec(c)?.[1] ?? "Other").replace(/^nbe diploma$/i, "NBE Diploma");
// "MD: Anaesthesia, Anatomy … · MS: ENT, OBG …" — branches grouped by degree, bold for a college's whole list,
// plain for the few branches one fee applies to.
// MD before MS before diplomas, and branches A–Z by the name printed (the source sorts "Social & Preventive
// Medicine" under S, which put "Community Med." after Radiology).
const DEGREE_ORDER = ["MD", "MS", "DNB", "Diploma", "NBE Diploma", "DM", "MCh", "Other"];
const byCourse = (a, b) => DEGREE_ORDER.indexOf(degreeOf(a)) - DEGREE_ORDER.indexOf(degreeOf(b)) || brief(a).localeCompare(brief(b));
const byDegree = (courses) => {
  const by = new Map();
  for (const c of [...courses].sort(byCourse)) by.set(degreeOf(c), [...(by.get(degreeOf(c)) ?? []), brief(c)]);
  return [...by];
};
const branchList = (courses) => byDegree(courses).map(([d, list]) => `<b>${esc(d)}:</b> ${list.map(esc).join(", ")}`).join(" &nbsp;·&nbsp; ");
const someBranches = (courses) => byDegree(courses).map(([d, list]) => `${esc(d)}: ${list.map(esc).join(", ")}`).join(" · ");
const named = (c) => `${degreeOf(c)} ${brief(c)}`;
const chip = (s) => `<span class="chip ${s.kind}">${esc(s.label)}<small>${esc(s.sub)}</small></span>`;

// A seat type's fees at one college: one line when every branch pays the same, else each fee with its branches.
function feeLines(list, allCourses) {
  const groups = new Map();
  for (const x of list) {
    const k = x.fee == null ? "none" : String(x.fee);
    const g = groups.get(k) ?? { fee: x.fee, courses: [], sessions: new Set() };
    g.courses.push(x.course);
    if (x.session) g.sessions.add(String(x.session));
    groups.set(k, g);
  }
  const known = [...groups.values()].filter((g) => g.fee != null).map((g) => g.fee);
  const med = known.length >= 3 ? pct(known, 0.5) : null;
  const byFee = [...groups.values()].sort((a, b) => (a.fee ?? Infinity) - (b.fee ?? Infinity));
  const biggest = byFee.length > 1 && list.length === allCourses.length ? byFee.reduce((m, g) => (g.courses.length > m.courses.length ? g : m)) : null;
  // The named exceptions first, cheapest first; "All other branches" reads last.
  const ordered = biggest ? byFee.filter((g) => g !== biggest).concat(biggest) : byFee;
  return ordered.map((g) => {
    const flag = med != null && g.fee != null && g.fee < med / 10 ? `<sup title="confirm">†</sup>` : "";
    const old = g.sessions.size && ![...g.sessions].includes("2026") ? ` <span class="old">(${[...g.sessions].join(", ")} fee)</span>` : "";
    const fee = g.fee == null ? `<span class="na">not listed</span>` : `${rupees(g.fee)}${flag}${old}`;
    const all = new Set(allCourses);
    const these = new Set(g.courses);
    let which;
    if (ordered.length === 1 && these.size === all.size) which = `<span class="all">${these.size === 1 ? "Its one branch" : `All ${these.size} branches`}</span>`;
    else if (ordered.length === 1 && all.size - these.size <= 3)
      which = `<span class="all">All branches except</span> ${someBranches([...all].filter((c) => !these.has(c)))}`;
    else if (g === biggest) which = `<span class="all">All other branches</span>`;
    else which = someBranches(g.courses);
    return { fee, which };
  });
}

// Government and private colleges: one table, a row per college and a column per seat type. Most colleges charge
// one fee per seat type for every branch, so a cell is usually one figure; where it varies, each fee with its branches.
function sectionTable(list) {
  const keys = SEATS.map((x) => x.key).filter((k) => list.some((c) => c.seats.has(k)));
  const head = `<tr><th>College · branches</th>${keys.map((k) => `<th>${chip(seatOf(k))}</th>`).join("")}</tr>`;
  const body = list
    .map((c) => {
      const allCourses = [...new Set([...c.seats.values()].flat().map((x) => x.course))].sort();
      const cells = keys
        .map((k) => {
          if (!c.seats.has(k)) return `<td class="fee"><span class="na">–</span></td>`;
          const lines = feeLines(c.seats.get(k), allCourses);
          const uniform = lines.length === 1 && /class="all"/.test(lines[0].which);
          return `<td class="fee">${lines.map((l) => (uniform ? l.fee : `<div class="part">${l.fee}<span>${l.which}</span></div>`)).join("")}</td>`;
        })
        .join("");
      return `<tr><td class="cn"><b>${esc(c.name)}</b><span>${allCourses.length} branch${allCourses.length === 1 ? "" : "es"} — ${branchList(allCourses)}</span></td>${cells}</tr>`;
    })
    .join("");
  // The fee columns need ~120px each; the name and branch list take the rest of the A4 width.
  const nameWidth = Math.max(250, 700 - 120 * keys.length);
  return `<table class="ft st"><colgroup><col style="width:${nameWidth}px">${keys.map(() => "<col>").join("")}</colgroup><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

// Deemed universities price nearly every branch differently: one table, branch by branch, a column per seat type.
function deemedCard(c) {
  const seats = [...c.seats.keys()].sort((a, b) => SEATS.findIndex((s) => s.key === a) - SEATS.findIndex((s) => s.key === b));
  const courses = [...new Set([...c.seats.values()].flat().map((x) => x.course))].sort(byCourse);
  const feeFor = (k, course) => c.seats.get(k).find((x) => x.course === course);
  const meds = Object.fromEntries(seats.map((k) => {
    const f = c.seats.get(k).map((x) => x.fee).filter((v) => v != null);
    return [k, f.length >= 3 ? pct(f, 0.5) : null];
  }));
  const rowsHtml = courses
    .map((course) => `<tr><td class="br">${esc(named(course))}</td>${seats.map((k) => {
      const x = feeFor(k, course);
      if (!x) return `<td class="fee"><span class="na">–</span></td>`;
      if (x.fee == null) return `<td class="fee"><span class="na">not listed</span></td>`;
      const flag = meds[k] != null && x.fee < meds[k] / 10 ? `<sup>†</sup>` : "";
      const old = x.session && String(x.session) !== "2026" ? ` <span class="old">(${x.session})</span>` : "";
      return `<td class="fee">${rupees(x.fee)}${flag}${old}</td>`;
    }).join("")}</tr>`)
    .join("");
  return `<section class="card"><h3>${esc(c.name)}</h3>
    <table class="ft deemed"><thead><tr><th>Branch</th>${seats.map((k) => `<th>${chip(seatOf(k))}</th>`).join("")}</tr></thead><tbody>${rowsHtml}</tbody></table></section>`;
}

function nbeTable(list) {
  const rowsHtml = list
    .map((c) => {
      // Fee -> the seat types that list it at this hospital (every DNB/NBE seat lists one fee here, but say so per row).
      const byFee = new Map();
      for (const [k, items] of c.seats) for (const x of items) {
        const f = x.fee == null ? "not listed" : rupees(x.fee);
        byFee.set(f, new Set([...(byFee.get(f) ?? []), seatOf(k).label]));
      }
      const fees = [...byFee].map(([f, seats]) => `<div class="nf">${f}<span>${[...seats].map(esc).join(" · ")}</span></div>`).join("");
      const courses = [...new Set([...c.seats.values()].flat().map((x) => x.course))].sort(byCourse);
      return `<tr><td class="hn">${esc(c.name)}</td><td class="fee">${fees}</td><td class="br">${branchList(courses)}</td></tr>`;
    })
    .join("");
  return `<table class="ft nbe"><thead><tr><th>Hospital</th><th>Fee · seat type</th><th>Branches</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

const sectionLists = SECTIONS.map((s) => ({ ...s, list: [...colleges.values()].filter((c) => c.section === s.id).sort((a, b) => a.name.localeCompare(b.name)) }));
const count = (id) => sectionLists.find((s) => s.id === id).list.length;
// Degree × subject as printed: MS Orthopaedics and DNB Orthopaedics are two courses.
const branchCount = new Set(rows.map((r) => named(r.course))).size;

// --json: the same colleges, cleaned names and short branch names, for the Excel workbook. Nothing rendered.
const JSON_OUT = arg("json", null);
if (JSON_OUT) {
  const data = {
    state: STATE,
    asOf: asOfText,
    seats: SEATS,
    courses: [...new Set(rows.map((r) => r.course))].sort(byCourse).map((c) => ({
      course: c, name: named(c), degree: degreeOf(c), course_id: rows.find((r) => r.course === c && r.course_id)?.course_id ?? null,
    })),
    colleges: sectionLists.flatMap((s) => s.list).map((c) => ({
      name: c.name, type: c.type, section: c.section, institute_ids: [...c.ids],
      seats: Object.fromEntries([...c.seats].map(([k, list]) => [k, [...list].sort((a, b) => byCourse(a.course, b.course))])),
      hostel: Object.fromEntries(c.hostel),
    })),
  };
  writeFileSync(resolve(JSON_OUT), JSON.stringify(data, null, 1));
  console.log(`${STATE}: ${data.colleges.length} colleges, ${data.courses.length} courses → ${resolve(JSON_OUT)}`);
  process.exit(0);
}

const CSS = `
:root{--navy:#0b2447;--navy-2:#123a66;--ink:#16243b;--muted:#5d6c82;--line:#dfe6ef;--mint:#1fd8ae;--teal:#0c9c8b}
*{box-sizing:border-box;margin:0;padding:0}
body{font:400 10.5px/1.45 Inter,sans-serif;color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.brand{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-radius:12px;color:#fff;
  background:radial-gradient(90% 160% at 0% 0%,#16507f 0%,#0b2447 55%,#071a36 100%)}
.brand .l{display:flex;align-items:center;gap:12px}
.brand img{width:54px;height:54px}
.brand .w1{font:800 24px/1 Montserrat,sans-serif;letter-spacing:.5px}
.brand .w2{font:300 20px/1.1 Montserrat,sans-serif;letter-spacing:2px}
.brand .w3{font:700 7.5px/1 Inter,sans-serif;letter-spacing:3px;color:#a6efdc;margin-top:5px}
.brand .r{text-align:right;font:800 18px/1.1 Figtree,sans-serif}
.brand .r small{display:block;font:500 10px/1.3 Inter,sans-serif;color:#bccbe0}
h1{margin:18px 0 4px;font:900 30px/1.1 Figtree,sans-serif;color:var(--navy);letter-spacing:-.5px}
h1 span{color:var(--teal)}
.lede{font:500 12px/1.5 Inter,sans-serif;color:#33425a;max-width:640px}
.facts{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:14px 0}
.facts div{padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:#f7f9fc}
.facts b{display:block;font:800 20px/1 Figtree,sans-serif;color:var(--navy)}
.facts span{display:block;margin-top:4px;font:600 9px/1.25 Inter,sans-serif;color:var(--muted);text-transform:uppercase;letter-spacing:.4px}
.note{margin:10px 0;padding:10px 12px;border-radius:10px;border:1px solid #f0d7a8;background:#fffaf0;font:500 10.5px/1.5 Inter,sans-serif;color:#5a4416}
.note b{color:#3d2c08}
h2{margin:18px 0 8px;padding-bottom:5px;border-bottom:2px solid var(--navy);font:800 17px/1.2 Figtree,sans-serif;color:var(--navy)}
h2 small{font:600 11px/1 Inter,sans-serif;color:var(--muted);margin-left:8px}
.sec{break-before:page}
table{width:100%;border-collapse:collapse}
.ov th,.ov td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.ov th{font:700 9.5px/1.2 Inter,sans-serif;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);border-bottom:2px solid var(--line)}
.ov td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.chip{display:inline-block;padding:2px 7px;border-radius:6px;border:1px solid;font:700 10px/1.3 Inter,sans-serif;white-space:nowrap}
.chip small{display:block;font:500 8.5px/1.2 Inter,sans-serif;opacity:.8}
.chip.gen{border-color:#9fd3ca;background:#effaf7;color:#0b5d55}
.chip.mgmt{border-color:#b9c7dc;background:#f2f5fa;color:#1b3a63}
.chip.nri{border-color:#f0c39e;background:#fff4ea;color:#8a3d0a}
.card{margin:0 0 12px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;break-inside:avoid}
.card h3{font:800 13px/1.25 Figtree,sans-serif;color:var(--navy)}
.card .branches{margin:3px 0 7px;font:500 9.5px/1.45 Inter,sans-serif;color:var(--muted)}
.card .branches b{color:var(--ink)}
.ft th{padding:4px 6px;text-align:left;font:700 9px/1.2 Inter,sans-serif;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);border-bottom:1px solid var(--line);vertical-align:bottom}
.ft td{padding:5px 6px;border-bottom:1px solid #edf1f6;vertical-align:top}
.ft tr:last-child td{border-bottom:0}
.ft td.seat{width:150px}
.ft td.fee{width:120px;font:700 11.5px/1.3 'Roboto Condensed',sans-serif;font-variant-numeric:tabular-nums;color:var(--navy);white-space:nowrap}
.ft td.br{font:500 9.5px/1.45 Inter,sans-serif;color:#33425a}
.ft .all{font-weight:700;color:var(--ink)}
.ft .na{color:#9aa8ba;font-weight:400}
.ft .old{font:500 8.5px/1 Inter,sans-serif;color:#a4450b}
.ft sup{color:#b8510c;font-weight:800}
.st{table-layout:fixed}
.st td.cn b{display:block;font:700 11px/1.3 Figtree,sans-serif;color:var(--navy)}
.st td.cn span{display:block;margin-top:2px;font:500 8.5px/1.4 Inter,sans-serif;color:var(--muted)}
.st td.cn span b{display:inline;font:700 8.5px/1.4 Inter,sans-serif;color:var(--ink)}
.st th{text-align:left}
.st td.fee{width:auto;white-space:normal}
.st .part + .part{margin-top:4px}
.st .part span{display:block;font:500 8.5px/1.35 Inter,sans-serif;color:var(--muted)}
.st tbody tr{break-inside:avoid}
.st tbody tr:nth-child(even) td{background:#f7f9fc}
.deemed td.br{width:auto}
.deemed td.fee,.deemed th{text-align:right}
.deemed th:first-child{text-align:left}
.deemed tbody tr:nth-child(even) td{background:#f7f9fc}
.nbe td.hn{width:230px;font:600 10px/1.35 Inter,sans-serif;color:var(--navy)}
.nbe td.fee{width:150px;white-space:normal}
.nbe .nf span{display:block;font:500 8.5px/1.35 Inter,sans-serif;color:var(--muted)}
.nbe .nf + .nf{margin-top:3px}
.nbe tbody tr:nth-child(even) td{background:#f7f9fc}
.nbe .chip{margin:0 4px 2px 0}
.nbe tbody tr{break-inside:avoid}
.foot{margin-top:10px;font:500 9px/1.45 Inter,sans-serif;color:var(--muted)}
`;

const overview = `<table class="ov"><thead><tr><th>Seat type</th><th>Counselling</th><th style="text-align:right">Colleges</th><th style="text-align:right">Typical fee (middle 80%)</th><th style="text-align:right">Median</th></tr></thead><tbody>${seatRows
  .map((x) => `<tr><td>${chip(x.seat)}</td><td>${esc(x.seat.sub)}</td><td class="n">${x.colleges.size}</td><td class="n">${!x.fees.length ? "–" : pct(x.fees, 0.1) === pct(x.fees, 0.9) ? rupees(pct(x.fees, 0.1)) : `${rupees(pct(x.fees, 0.1))} – ${rupees(pct(x.fees, 0.9))}`}</td><td class="n">${x.fees.length ? rupees(pct(x.fees, 0.5)) : "–"}</td></tr>`)
  .join("")}</tbody></table>`;

const caveat = `<div class="note"><b>Before you pay:</b> these are the fees <b>as listed for the 2026 NEET PG counselling</b>${asOfText ? ` (as of ${asOfText})` : ""} — not an official notice.
  Fees change; confirm the figure with the CET Cell or MCC notice, or with the college, before you pay a fee or sign a bond. The listing does not say for every
  figure whether it is a year's fee or the whole course's — ask the college. <b>†</b> = far below this college's other fees for the same seat type (pre-clinical
  seats are often discounted) — confirm. A hospital with MD/MS seats and DNB seats appears in both lists.</div>`;

const logoB64 = logo();
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(STATE)} NEET PG 2026 fees — college-wise</title>${FONTS_HEAD}<style>${CSS}</style></head><body>
  <div class="brand"><div class="l"><img src="data:image/png;base64,${logoB64}" alt=""><div><div class="w1">ADMISSION</div><div class="w2">HANDS</div><div class="w3">YOUR MEDICAL ADMISSION PARTNER</div></div></div>
    <div class="r">9310301949<small>www.admissionhands.com</small></div></div>
  <h1>${esc(STATE)} NEET PG 2026: <span>fees, college by college</span></h1>
  <p class="lede">Every ${esc(STATE)} college and hospital admitting MD, MS, DNB and diploma students in the 2026 counselling — the fee for each seat type
    (government quota, All India Quota, management, NRI, minority, deemed paid and NRI seats, DNB) and the branches it applies to.</p>
  <div class="facts">
    <div><b>${count("govt")}</b><span>Government colleges</span></div>
    <div><b>${count("private")}</b><span>Private colleges</span></div>
    <div><b>${count("deemed")}</b><span>Deemed universities</span></div>
    <div><b>${count("nbe")}</b><span>DNB / NBE hospitals</span></div>
    <div><b>${branchCount}</b><span>MD, MS, DNB &amp; diploma courses</span></div>
  </div>
  ${caveat}
  <h2>Seat types and what they cost<small>across ${esc(STATE)}, 2026 session</small></h2>
  ${overview}
  <p class="foot">Middle 80% = the range between the 10th and 90th percentile of the listed fees, so a stray figure at either end does not stretch it.
    Government quota seats at private colleges carry the state's fixed fee for that college; the All India Quota and DNB seats are allotted by MCC, the rest by the CET Cell.</p>
  ${sectionLists
    .map((s) => `<div class="sec"><h2>${esc(s.title)}<small>${s.list.length} · A–Z</small></h2>${
      s.id === "nbe" ? nbeTable(s.list) : s.id === "deemed" ? s.list.map(deemedCard).join("") : sectionTable(s.list)
    }</div>`)
    .join("")}
</body></html>`;

// ------------------------------------------------------------------ render
mkdirSync(OUT, { recursive: true });
const base = `${STATE.toLowerCase().replace(/\s+/g, "-")}-neet-pg-2026-fees-college-wise`;
const htmlPath = join(OUT, `${base}.html`);
writeFileSync(htmlPath, html);
const { browser, tab } = await openBrowser();
await tab.setViewportSize({ width: 794, height: 1123 });
const fonts = await load(tab, htmlPath);
if (fonts.length) console.warn("! fonts not loaded:", fonts.join(", "));
const pdfPath = join(OUT, `${base}.pdf`);
await tab.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "12mm", bottom: "14mm", left: "11mm", right: "11mm" },
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: `<div style="width:100%;font:500 8px Inter,Arial,sans-serif;color:#5d6c82;padding:0 11mm;display:flex;justify-content:space-between">
    <span>Admission Hands · ${esc(STATE)} NEET PG 2026 fees · as listed for the 2026 counselling — confirm before paying</span>
    <span>9310301949 · page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
});
await tab.emulateMedia({ media: "print" });
await tab.screenshot({ path: join(OUT, `${base}-preview.png`), fullPage: true });
await browser.close();

const feeRows = rows.filter((r) => r.fee_inr > 0).length;
console.log(
  `${STATE}: ${rows.length} rows (${feeRows} with a fee) · ${colleges.size} entries — govt ${count("govt")}, private ${count("private")}, deemed ${count("deemed")}, nbe ${count("nbe")} · ${branchCount} courses`,
);
console.log(pdfPath);
