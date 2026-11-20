// Rule statements corrected after checking them against the official texts (2026-11-20, owner: "sahi se dekho kahi
// bhi kuch galti na ho"):
//   /counselling — PGMER-2023 reg. 4.3 says counselling is "based on the merit list of respective exams": AIIMS, JIPMER,
//                  PGIMER, NIMHANS and SCTIMST fill their PG seats through INI-CET, not NEET PG.
//   /neet-pg-choice-filling — the bulletin's AFMS FAQs 64–65 do name a bar: three years from AFMS institutions for
//                  Priority III–V candidates who failed to report for, or vacated, a seat that lapsed. And the
//                  Centre–state data rule (Ch. 12, d) is about removal before MCC's stray round only.
//   /md-ms-india/bond — the MCC box's "e.g. Punjab Rs 20 lakh/2 yrs, HP Rs 40 lakh/2 yrs" is not in MCC's bulletin
//                  (2.14 / Q23 say only that terms vary) and contradicted the same page's state rows.
//   /md-ms-india/stipend (Hinglish) — the count is MD/MS colleges only since DNB rates left the listing figure, and the
//                  government-college leader is the counselling listing's median (the official state rates are below it).
// Each change only where the row still holds the old sentence.
//   node --env-file=.env.local scripts/sql/facts_legal_2026_11_20.mjs [--apply]
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const SETTINGS = {
  "page.counsel_expert.fraud_lead": [
    [
      "is allotted through counselling on the NEET PG merit list, by MCC or the state's counselling authority.",
      "is allotted through counselling on the entrance exam's merit list — NEET PG, or INI-CET for AIIMS, JIPMER, PGIMER, NIMHANS and SCTIMST — by the central or state counselling authority.",
    ],
  ],
  "page.pg_choice_filling.body.faq9_a": [
    [
      "MCC's 2026 bulletin names no such bar: what it names is forfeiture of the deposit and, after round 3, being out of further MCC rounds.",
      "MCC's 2026 bulletin names no bar from next year's NEET PG. What it names is forfeiture of the deposit, removal from further MCC rounds after an unjoined round 3 seat, and — for AFMS institutions only — a three-year bar for Priority III–V candidates who failed to report for, or vacated, a seat that then lapsed.",
    ],
  ],
  "site.faq_hinglish.stipend": [
    ["Jo {colleges} colleges aur DNB hospitals stipend publish karte hain", "Jo {colleges} MD/MS colleges stipend publish karte hain"],
    [
      "Sirf government colleges ka median dekhein to {govt_top_state} sabse aage hai: {govt_top_median} mahina.",
      "Counselling ki listing mein sirf government colleges ka median dekhein to {govt_top_state} sabse aage hai: {govt_top_median} mahina. Har state ka official government rate neeche ki table mein hai.",
    ],
  ],
};
const BOND_OLD = " (AIQ seats in state Govt colleges carry that state's bond, e.g. Punjab Rs 20 lakh/2 yrs, HP Rs 40 lakh/2 yrs.)";
const BOND_NEW = " (An AIQ seat in a state government college carries that state's bond where the state's rules say so — see that state's row.)";

for (const [key, swaps] of Object.entries(SETTINGS)) {
  const [r] = await sql`SELECT value FROM site_settings WHERE key = ${key}`;
  if (!r) { console.log(`- ${key}: no row (the code default applies)`); continue; }
  let v = r.value;
  for (const [o, n] of swaps) if (v.includes(o)) v = v.replace(o, n); else console.log(`- ${key}: not found — ${o.slice(0, 60)}`);
  if (v !== r.value) { console.log(`✓ ${key}`); if (APPLY) await sql`UPDATE site_settings SET value = ${v}, updated_at = now() WHERE key = ${key}`; }
}
const [b] = await sql`SELECT data::text AS t FROM pg_bond_rules WHERE slug = 'mcc'`;
// The text sits inside a JSON string: compare on its JSON-escaped form.
const esc = (s) => JSON.stringify(s).slice(1, -1);
if (b?.t.includes(esc(BOND_OLD))) {
  console.log("✓ pg_bond_rules mcc");
  if (APPLY) await sql`UPDATE pg_bond_rules SET data = ${b.t.replace(esc(BOND_OLD), esc(BOND_NEW))}::jsonb WHERE slug = 'mcc'`;
} else console.log("- pg_bond_rules mcc: not found");
console.log(APPLY ? "applied" : "dry run — pass --apply");
await sql.end();
