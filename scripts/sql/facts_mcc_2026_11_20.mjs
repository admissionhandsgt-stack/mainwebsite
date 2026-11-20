// Rules and conditions corrected against MCC's own 2026 bulletins (2026-11-20, owner: "baki website par aise hi facts,
// rules, required documents checklist, conditions etc check karo kahi kuch galat to posted nahi hai").
//   NEET PG: Information Bulletin 2026 — 2.10 (deposit forfeited from round 2), FAQ 18–19 (Float keeps the round 1 seat
//            unless upgraded), the round 3 rules (no resignation or upgrade once joined; stray only for candidates holding
//            no seat), "Additional rounds if any … as directed by MoHFW or court", 2.29 (MCC may alter its schedule),
//            Ch. 10 ("The Counselling for In-service seats of DNB is not conducted by MCC"), 12.2 vi (internship by 30 Sep).
//   NEET UG: Information Bulletin 2026 — 100% deemed seats counselled by MCC; NRI categories I–IV and their documents;
//            documents uploaded at registration and checked online by MCC's NRI committee; JIPMER's Puducherry seats;
//            AMU's NRI seats and AIIMS's foreign-national seats. NRI notice of 06.08.2026 (NRI chosen at registration).
// Each change replaces an exact sentence, only while the row still holds it — an admin's own edit is never overwritten.
// The code's shipped fallbacks say the same in this release.
//   node --env-file=.env.local scripts/sql/facts_mcc_2026_11_20.mjs [--apply --backup <file>]
import fs from "node:fs";
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");
const backupAt = process.argv.includes("--backup") ? process.argv[process.argv.indexOf("--backup") + 1] : null;
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

/** site_settings: key → [old sentence, new sentence][] (or a whole-value swap when old === the whole value). */
const SETTINGS = {
  "page.pg_round3.points": [
    ["An expert call at every result: join, upgrade or walk away, without losing your deposit", "An expert call at every result: join or upgrade, knowing exactly what leaving would cost"],
  ],
  "page.pg_round3.steps": [
    ["Join, upgrade or walk away, protecting your deposit and your next round.", "Join or upgrade, knowing what each choice costs: from Round 2, a seat you do not join forfeits the security deposit."],
  ],
  "page.pg_round3.faq": [
    ["Round 3, your state's next rounds, the stray round and special stray rounds are still ahead.", "Round 3, your state's next rounds and the stray vacancy round are still ahead (MCC adds a special stray round only if MoHFW or a court directs)."],
  ],
  "page.pg_round3.situations": [
    ["Round 3, your state's next round, the stray round and special stray rounds are still ahead.", "Round 3, your state's next round and the stray vacancy round are still ahead."],
  ],
  "page.pg_round3.subtitle": [
    ["Round 3, the state rounds, the stray vacancy round and special stray rounds still release seats,", "Round 3, the state rounds and the stray vacancy round still release seats,"],
  ],
  "page.pg_in_service.answer": [
    ["Government and PSU doctors also have DNB sponsored seats through MCC.", "DNB in-service (sponsored) seats are not part of MCC's counselling — MCC's bulletin says so — so a doctor sponsored by a government or PSU employer asks NBEMS or the sponsoring department."],
  ],
  "page.pg_in_service.dnb_intro": [
    ["MCC's counselling also allots DNB seats sponsored for doctors in government or PSU service — {sponsored_colleges} hospitals in {sponsored_states} states in the latest results.", "DNB seats sponsored for doctors in government or PSU service are allotted outside MCC's counselling (MCC's bulletin says it does not counsel them) — {sponsored_colleges} hospitals in {sponsored_states} states in the latest results we hold."],
  ],
  "page.pg_in_service.dnb_eyebrow": [["Through MCC", "Outside MCC's counselling"]],
  "page.pg_round.body.decide_body_pending": [
    ["Once the result is out you have days, not weeks, to report — and to decide whether to keep your seat or try for a better one in the next round.", "Once the result is out you have days, not weeks, to report — and after rounds 1 and 2, to decide whether to keep your seat or try for a better one; a round 3 seat, once joined, can be neither resigned nor upgraded."],
  ],
  "page.nri.eligibility.g1_docs": [
    ["NRI status certificate, passport copies, visa stamps, bank statements showing foreign transactions.", "NRI certificate from the Indian embassy or consulate, your valid passport, a notarised affidavit by the NRI parent, brother or sister to pay the whole course fee backed by an NRE passbook, and the relationship verified by a revenue officer (Tehsildar), with your Class 10 and 12 certificates and NEET score card."],
  ],
  "page.nri.eligibility.g2_def": [
    ["Indian nationals who are sponsored by an NRI relative (blood relations only).", "Indian nationals sponsored by an NRI legal guardian — the nearest NRI relation who has looked after them — with legal proof of guardianship under the Guardian and Wards Act 1890 (an NRI parent, brother or sister is the first group)."],
  ],
  "page.nri.eligibility.g2_docs": [
    ["Sponsor's NRI proof, affidavit of relation, sponsorship letter, NEET scorecard.", "The guardian's valid passport and NRI certificate, legal proof of guardianship, a notarised affidavit to pay the whole course fee backed by an NRE passbook, your valid passport and NEET score card."],
  ],
  "page.nri.eligibility.g3_docs": [
    ["OCI/PIO card, foreign passport, 10+2 mark sheets, NEET score card (if applicable)", "OCI or PIO card, valid passport, Class 10 and 12 mark sheets and certificates, NEET UG score card"],
  ],
  "page.nri.eligibility.g4_docs": [
    ["Foreign passport, visa, 10+2 equivalent mark sheets, NEET score card (if applicable)", "Foreign passport, visa, residence or work permit, Class 10 and 12 mark sheets (AIU equivalence for a foreign board), NEET UG score card"],
  ],
  "page.nri.eligibility.general_points": [["English language proficiency", "Physics, Chemistry, Biology and English passed in Class 12"]],
  "page.counsel_ug.route_mcc": [
    ["and central institutions such as AIIMS and JIPMER — open to students from every state.", "and AIIMS, JIPMER and the central universities — open to students from every state, apart from the domicile and internal seats some keep (JIPMER's Puducherry seats, the central universities' internal quotas)."],
  ],
};

/** content_blocks: id → { field: [old, new][] }; `data.<k>` edits a key inside the jsonb. */
const BLOCKS = {
  36: { body: [["MCC does not extend joining dates, which is why we track every deadline with you.", "Plan for MCC's joining date as printed — MCC changes it only by a notice — which is why we track every deadline with you."]] },
  39: { body: [["No. MCC's NRI seats are in the deemed universities;", "No. MCC allots NRI seats at the deemed universities and at AMU, and foreign-national seats at AIIMS;"]] },
  68: { body: [["Private medical colleges and Deemed Universities conduct counselling through MCC or their own processes.", "Deemed universities fill all their seats through MCC's counselling, in the same rounds as the All India Quota; private colleges fill theirs through the state's counselling."]] },
  69: {
    body: [["A percentage of seats in private colleges are reserved under Management and NRI quotas. These require separate applications and often have different fee structures.", "A share of seats in private colleges are management and NRI quota seats, allotted through the same counselling — the state's for private colleges, MCC's for deemed universities. NRI seats need NRI documents verified first, and their fees differ from state-quota seats."]],
    "data.strategy": [["We negotiate and verify legitimacy to ensure a transparent, hassle-free admission.", "We get the college's fees in writing and negotiate payment terms where the college allows — the seat itself comes only through the counselling."]],
  },
  113: { body: [["1-year compulsory rotating internship must be completed before counselling. Completion certificate mandatory.", "The 1-year compulsory rotating internship must be complete by 30 September 2026 (MCC's cut-off this year): the completion certificate, or the head of institution's certificate that it will be complete by then."]] },
  141: { body: [["NRI status proof, your sponsor's passport and visa, proof of relationship and the affidavits the bulletin lists — gathered before registration opens.", "Your passport, the NRI certificate from the Indian embassy or consulate, the sponsor's affidavit backed by an NRE passbook and the relationship verified by a revenue officer — the documents MCC's bulletin lists for your category, ready before registration opens."]] },
  143: { body: [["List colleges in order of preference, round by round. NRI documents are checked before an allotment is confirmed — a missing paper at that point can cost the seat.", "Upload the NRI documents when you register; MCC's NRI committee checks them online before choice filling, and NRI seats appear in your list only once your category is converted. Then list colleges in order of preference, round by round."]] },
  189: { "data.detail": [["Miss it and the seat is gone — there is no extension.", "Miss it and the seat is gone; MCC changes its dates only by a notice, so plan for the date as printed."]] },
  190: { "data.detail": [["If you hold a round-1 seat you choose between keeping it and entering round 2 for something better. Entering means the round-1 seat goes back into the pool.", "If you hold a round-1 seat you choose Freeze (keep it, no upgrade) or Float (stay in for an upgrade in round 2). Floating keeps your round-1 seat; it is released only if you are upgraded."]] },
  196: { body: [["and the deadline does not move.", "and plan for the date as printed — MCC changes it only by a notice."]] },
  205: { body: [["Deemed and private medical colleges have their own counselling calendars, fee structures, and seat matrices.", "Deemed universities fill their seats through MCC's counselling and private colleges through the state's, each with its own fee structure and seat matrix."]] },
};

const backup = { settings: {}, blocks: {} };
const plan = [];
for (const [key, swaps] of Object.entries(SETTINGS)) {
  const [r] = await sql`SELECT value FROM site_settings WHERE key = ${key}`;
  if (!r) { console.log(`- ${key}: no row`); continue; }
  let v = r.value;
  for (const [o, n] of swaps) if (v.includes(o)) v = v.replace(o, n); else console.log(`- ${key}: sentence not found (edited?) — "${o.slice(0, 50)}…"`);
  if (v !== r.value) { backup.settings[key] = r.value; plan.push(["s", key, v]); console.log(`✓ ${key}`); }
}
for (const [id, fields] of Object.entries(BLOCKS)) {
  const [r] = await sql`SELECT body, data FROM content_blocks WHERE id = ${Number(id)}`;
  if (!r) { console.log(`- block ${id}: no row`); continue; }
  let body = r.body;
  let data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
  if (typeof data === "string") data = JSON.parse(data);
  const before = JSON.stringify({ body, data });
  for (const [field, swaps] of Object.entries(fields)) {
    for (const [o, n] of swaps) {
      if (field === "body") { if (body?.includes(o)) body = body.replace(o, n); else console.log(`- block ${id} body: not found — "${o.slice(0, 50)}…"`); }
      else { const k = field.slice(5); if (data?.[k]?.includes(o)) data[k] = data[k].replace(o, n); else console.log(`- block ${id} ${field}: not found — "${o.slice(0, 50)}…"`); }
    }
  }
  if (JSON.stringify({ body, data }) !== before) { backup.blocks[id] = JSON.parse(before); plan.push(["b", Number(id), body, data]); console.log(`✓ block ${id}`); }
}
console.log(`\n${plan.length} rows to change`);
if (!APPLY) { console.log("dry run — pass --apply --backup <file>"); await sql.end(); process.exit(0); }
if (!backupAt) throw new Error("--apply needs --backup <file>");
fs.writeFileSync(backupAt, JSON.stringify(backup, null, 1));
await sql.begin(async (tx) => {
  for (const p of plan) {
    if (p[0] === "s") await tx`UPDATE site_settings SET value = ${p[2]}, updated_at = now() WHERE key = ${p[1]}`;
    else await tx`UPDATE content_blocks SET body = ${p[2]}, data = ${tx.json(p[3] ?? {})}, updated_at = now() WHERE id = ${p[1]}`;
  }
});
console.log("applied; backup:", backupAt);
await sql.end();
