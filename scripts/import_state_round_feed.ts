/**
 * A state's NEET PG round from the PG data session's round-closing feed into `state_round_cuts` (2026-11-17, owner: "4
 * karo" — the state Round 1 lists we did not hold yet). The feed (GET …/round-closing?c=<key>, X-AH-Sync-Key) gives one
 * line per college × branch × seat type × category with each round's closing and opening AIR and seats, built from the
 * state's own list (AIR joined from NBEMS where the list prints a state rank). Its `college_id` is our institutes.source_id
 * and its quota labels are ours, so lines map directly; PwD and in-service lines keep their flags (the read side leaves
 * them out of the open-merit figures). Only group figures over 3+ colleges ever reach a page (lib/stateRoundQueries.ts).
 *
 *   npx tsx --env-file=.env.local scripts/import_state_round_feed.ts "<feed key>" --round R1 \
 *       --counselling "<authority>" [--printed "<the board's title, date>"] [--note "<line for the page>"] \
 *       [--also "<second feed key of the same state>"] [--apply --backup <f>]
 *
 * The list's name on the page is the tool's `printed` (the board's own title and date, added 2026-11-25 — blank until the
 * tool has checked that file); --printed is used when it is blank, and always with --also.
 *
 * --also (2026-11-25): a state whose round comes as two lists (Tamil Nadu's Government and Management quota) is loaded in
 * one go — the import replaces the whole state × year × round, so loading them one after the other kept only the second.
 * Each line keeps the official file its list came from (the feed's round source) as `source_url`.
 *
 * Categories (2026-11-26): the feed carries each board's own codes — KEA's "GM", "2AG", "GMH"; Gujarat's "GQ-OP";
 * J&K's "OM"; CEE Kerala's "SM"; Tamil Nadu's "OC Open"; CENTAC's "UGE". The read side counts the open category as "GEN"
 * (and Karnataka's groups as "KA-2A" …), so the Round 2 lists loaded on 25 Nov showed no figures for Karnataka, Gujarat,
 * J&K and Kerala, and Tamil Nadu only its management seats. `normCategory` stores what the Round 1 adapters of
 * import_state_round.ts store for the same code; a code it does not know is kept as printed (out of every figure).
 *
 * Dry run by default (prints what maps and what does not). --apply replaces that state's year × round in one transaction.
 */
import { writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const key = args.find((a) => !a.startsWith("--"));
const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const round = opt("--round") ?? "R1";
const printed = opt("--printed");
const counselling = opt("--counselling");
const note = opt("--note") ?? null;
const also = opt("--also");
const apply = args.includes("--apply");
const backup = opt("--backup");
const YEAR = 2026;
if (!key || !counselling) throw new Error('usage: import_state_round_feed.ts "<key>" --counselling "…" [--printed "…"] [--note "…"] [--also "<key>"] [--apply --backup f]');
if (apply && !backup) throw new Error("--apply needs --backup <file>");

type Line = {
  college_id: number;
  college: string;
  state: string;
  type: string;
  branch: string;
  quota: string;
  quota_label: string;
  category: string;
  pwd: boolean;
  in_service: boolean;
  women_only: boolean;
  rounds: Record<string, { closing_air: number | null; opening_air: number | null; seats: number | null; label: string }>;
};

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const sync = (await sql<{ value: string }[]>`SELECT value FROM integrations WHERE key IN ('zyn.notices.key','counselor.sync_key') ORDER BY key DESC`)[0]?.value;
if (!sync) throw new Error("no sync key in integrations");
const FEED = "https://ah.aismartscan.in/api/integrations/website/round-closing";
const list = (await (await fetch(FEED, { headers: { "X-AH-Sync-Key": sync } })).json()) as {
  counsellings: { key: string; rounds: { round: string; source?: { url?: string; printed?: string } }[] }[];
};
// The board's own title and date (the tool's `printed`, 2026-11-25), filled once the tool has checked the file; "" until
// then — and after a newer file replaces it — so a hand title (--printed) is the fallback.
const feedPrinted = list.counsellings.find((c) => c.key === key)?.rounds.find((r) => r.round === round)?.source?.printed?.trim() || null;
// Two lists loaded together (--also) are named by hand: the feed names each list on its own.
const roundPrinted = also ? printed : (feedPrinted ?? printed);
if (!roundPrinted) throw new Error(`no title for ${key} ${round}: the feed's printed is empty — pass --printed "<the board's title, date>"`);
console.log(`  list named: ${roundPrinted}${also || !feedPrinted ? " (hand title)" : " (the feed's printed)"}`);
// Only a real address is kept: Haryana's "url" is the portal followed by where on it the file sits.
const sourceOf = (k: string) =>
  list.counsellings.find((c) => c.key === k)?.rounds.find((r) => r.round === round)?.source?.url?.match(/^https?:\/\/[^\s()]+/)?.[0] ?? null;
const lines: (Line & { source: string | null })[] = [];
for (const k of [key, ...(also ? [also] : [])]) {
  const res = await fetch(`${FEED}?c=${encodeURIComponent(k)}`, { headers: { "X-AH-Sync-Key": sync } });
  if (!res.ok) throw new Error(`feed answered ${res.status} for ${k}`);
  const feed = (await res.json()) as { counselling: string; label: string; lines: Line[] };
  const mine = feed.lines.filter((l) => l.rounds?.[round]?.closing_air);
  console.log(`  ${k}: ${mine.length} ${round} lines`);
  lines.push(...mine.map((l) => ({ ...l, source: sourceOf(k) })));
}
const named = [...new Set(lines.map((l) => l.state))];
if (named.length > 1) throw new Error(`the lists name more than one state: ${named.join(", ")}`);
const stateName = lines[0]?.state;
if (!stateName) throw new Error(`no ${round} lines for ${key}`);

const state = (await sql<{ id: number }[]>`SELECT id FROM states WHERE name = ${stateName}`)[0];
if (!state) throw new Error(`no state ${stateName}`);
const inst = new Map(
  (await sql<{ id: number; source_id: number }[]>`SELECT id, source_id FROM institutes WHERE level = 'pg' AND source_id IN ${sql([...new Set(lines.map((l) => l.college_id))])}`).map((r) => [r.source_id, r.id]),
);
const courses = new Map((await sql<{ id: number; name: string }[]>`SELECT id, name FROM courses WHERE level = 'pg'`).map((r) => [r.name, r.id]));

/**
 * The board's category code as the Round 1 adapters (scripts/import_state_round.ts) store it, per state. `additional`
 * marks a separate list that stays out of the open-merit figures (KEA's H-suffix list, CENTAC's freedom-fighter and
 * ex-serviceman lists); `pwd` a disability seat the code alone names (Gujarat's "-PH").
 */
function normCategory(stateName: string, code: string, quota = ""): { category: string; pwd?: boolean; additional?: string } {
  const c = code.trim();
  switch (stateName) {
    case "Uttar Pradesh": {
      // As Round 1's adapter stores them: BC is OBC, "-PH" / "-PwD" carry the PwD flag, and BS / SS (the in-service
      // diploma lists) are BSOP / SSOP.
      if (c === "BS" || c === "SS") return { category: `${c}OP` };
      const m = c.match(/^(GEN|EWS|BC|OBC|SC|ST)(?:-(PH|PwD))?$/);
      if (m) return { category: m[1] === "BC" ? "OBC" : m[1], ...(m[2] ? { pwd: true } : {}) };
      return { category: c };
    }
    case "West Bengal": {
      // As Round 1's adapter stores them: "<cat>-In-Service" and "<cat>-PwD" carry their flag in the line already, and
      // MQ is the management merit list (open).
      if (c === "MQ") return { category: "GEN" };
      const m = c.match(/^(GEN|EWS|OBC|SC|ST)(?:-(In-Service|PwD))?$/);
      if (m) return { category: m[1], ...(m[2] === "PwD" ? { pwd: true } : {}) };
      return { category: c };
    }
    case "Punjab": {
      // 2025's BFUHS codes, as Round 1's adapter stores them: GEN-IP / EWS-IP are the general and EWS seats of the
      // Institutional Preference quota (the quota says so), BC is OBC, NRI-I / NRI-II the NRI lists, and CMC's
      // Category B minority seats are Christian minority seats.
      if (/CMC Minority/i.test(quota)) return { category: "Christian minority" };
      const m = c.match(/^(GEN|EWS|SC|BC)(-PwD)?(?:-IP)?$/);
      if (m) return { category: m[1] === "BC" ? "OBC" : m[1], ...(m[2] ? { pwd: true } : {}) };
      if (/^NRI(-I{1,2})?$/.test(c)) return { category: "NRI" };
      return { category: c };
    }
    case "Karnataka": {
      // GMP / OPN / MNG are the general merit of the private, open and institutional seats (the quota says which).
      if (/^GMPH?$/.test(c)) return { category: "GEN", ...(c === "GMPH" ? { additional: "H (KEA's H-suffix list)" } : {}) };
      if (c === "OPN" || c === "MNG") return { category: "GEN" };
      if (c === "NRI") return { category: "NRI" };
      // Minority codes stay as printed (MEH and MMH are minority codes, not the H list).
      if (/^(ME|MEH|MM|MMH|MU|MC|MA|RC[123])$/.test(c)) return { category: c };
      const h = /H$/.test(c) ? { additional: "H (KEA's H-suffix list)" } : {};
      const base = c.replace(/[GH]$/, "");
      const KA: Record<string, string> = { GM: "GEN", "1": "KA-1", "2A": "KA-2A", "2B": "KA-2B", "3A": "KA-3A", "3B": "KA-3B", ST: "ST" };
      return { category: KA[base] ?? c, ...h };
    }
    case "Gujarat": {
      // "GQ-OP", "UQ-SE", "MQ-MQ", "NQ-NRI", "GQ-EW-PH": seat type, then the category; OP open, SE SEBC, EW EWS; a
      // management seat's category is the management merit list itself (open).
      const parts = c.split("-");
      const CAT: Record<string, string> = { OP: "GEN", SE: "OBC", EW: "EWS", SC: "SC", ST: "ST", MQ: "GEN", NRI: "NRI" };
      const base = parts.length >= 2 ? parts[1] : c;
      return { category: CAT[base] ?? c, ...(parts.includes("PH") ? { pwd: true } : {}) };
    }
    case "Jammu and Kashmir":
      // OM open merit; MQ the management merit list (open), as in Round 1.
      return { category: c === "OM" || c === "MQ" ? "GEN" : c };
    case "Kerala":
      // SM state merit (open); NR / NC / NM the NRI seats.
      if (c === "SM") return { category: "GEN" };
      if (/^(NR|NC|NM)$/.test(c)) return { category: "NRI" };
      return { category: c };
    case "Tamil Nadu": {
      // "OC Open" is the open category of the open pool; "BC Open", "MBC Open"… the reserved categories of that pool.
      const m = c.match(/^(OC|BC|MBC|BCM|SCA|SC|ST)\s+Open$/);
      if (m) return { category: m[1] === "OC" ? "GEN" : m[1] };
      return { category: c };
    }
    case "Maharashtra": {
      // The tool writes the CET Cell's categories its own way: MGT the management (institutional) merit list (open);
      // VJ / NT1 / NT2 / NT3 are VJ(A), NT(B), NT(C), NT(D); "<cat>-In-Service", "<cat> Service" and "<cat>-PwD" carry
      // their flag in the line already.
      const MH: Record<string, string> = { GEN: "GEN", OPEN: "GEN", MGT: "GEN", OBC: "OBC", SC: "SC", ST: "ST", EWS: "EWS", SEBC: "SEBC", VJ: "VJA", NT1: "NTB", NT2: "NTC", NT3: "NTD" };
      const m = c.match(/^(\w+?)(?:[-\s](?:In-Service|Service|PwD))?$/);
      const base = m ? m[1] : c;
      return { category: MH[base] ?? c, ...(/-PwD$/.test(c) ? { pwd: true } : {}) };
    }
    case "Goa": {
      // "Group 1 - GEN"
      const m = c.match(/^Group\s*\d+\s*-\s*(.+)$/i);
      return { category: m ? m[1].trim() : c };
    }
    case "Pondicherry":
    case "Puducherry": {
      // CENTAC: U (UT seats) / A (management seats) + GE general, OB OBC, MB MBC, EB EBC, BM BC Muslim, BT, SC, ST;
      // "-FF" freedom fighters' and "-ESM" ex-servicemen's lists stay out of the figures.
      const m = c.match(/^[UA](GE|OB|MB|EB|BM|BT|SC|ST)(?:-(FF|ESM))?$/);
      if (!m) return { category: c };
      const CAT: Record<string, string> = { GE: "GEN", OB: "OBC", MB: "MBC", EB: "EBC", BM: "BCM", BT: "BT", SC: "SC", ST: "ST" };
      return { category: CAT[m[1]], ...(m[2] ? { additional: m[2] === "FF" ? "freedom fighter" : "ex-serviceman" } : {}) };
    }
    default:
      return { category: c };
  }
}

const noInst = new Map<string, number>();
const noCourse = new Map<string, number>();
const rows = lines.map((l) => {
  const r = l.rounds[round];
  const cat = normCategory(stateName, l.category, l.quota);
  const instituteId = inst.get(l.college_id) ?? null;
  const courseId = courses.get(l.branch) ?? null;
  if (!instituteId) noInst.set(`${l.college_id} ${l.college}`, (noInst.get(`${l.college_id} ${l.college}`) ?? 0) + 1);
  if (!courseId) noCourse.set(l.branch, (noCourse.get(l.branch) ?? 0) + 1);
  return {
    level: "pg",
    state_id: state.id,
    year: YEAR,
    round,
    round_printed: roundPrinted,
    counselling,
    source_url: l.source,
    institute_id: instituteId,
    college_printed: l.college,
    inst_code: null as string | null,
    course_id: courseId,
    course_printed: l.branch,
    quota: l.quota,
    seat_type_printed: l.quota_label,
    category: cat.category,
    category_printed: l.category,
    pwd: !!l.pwd || !!cat.pwd,
    additional_category: l.women_only ? "women" : cat.additional ?? null,
    in_service: !!l.in_service,
    seats_allotted: r.seats ?? null,
    opening_air: r.opening_air ?? null,
    closing_air: r.closing_air ?? null,
    opening_state_rank: null as number | null,
    closing_state_rank: null as number | null,
    note,
    note_url: null as string | null,
  };
});

console.log(`${[key, also].filter(Boolean).join(" + ")} (${stateName}) ${round}: ${lines.length} lines, ${new Set(lines.map((l) => l.college_id)).size} colleges`);
console.log(`  colleges not in our PG list (kept by name, no institute): ${noInst.size}`, [...noInst].slice(0, 10));
console.log(`  branch names not in our courses (kept as printed): ${noCourse.size}`, [...noCourse].slice(0, 10));
console.log(`  pwd lines ${rows.filter((r) => r.pwd).length}, in-service lines ${rows.filter((r) => r.in_service).length}`);
const catCount = new Map<string, number>();
for (const r of rows) catCount.set(r.category_printed === r.category ? r.category : `${r.category_printed}→${r.category}`, (catCount.get(r.category_printed === r.category ? r.category : `${r.category_printed}→${r.category}`) ?? 0) + 1);
const quotaCount = new Map<string, number>();
for (const r of rows) quotaCount.set(r.quota, (quotaCount.get(r.quota) ?? 0) + 1);
console.log(`  quotas: ${[...quotaCount].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", ")}`);
console.log(`  categories: ${[...catCount].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", ")}`);
const old = await sql`SELECT * FROM state_round_cuts WHERE level = 'pg' AND state_id = ${state.id} AND year = ${YEAR} AND round = ${round}`;
console.log(`  replaces ${old.length} existing rows${apply ? "" : " (dry run — pass --apply --backup <file>)"}`);

if (apply) {
  writeFileSync(backup!, JSON.stringify(old, null, 1));
  await sql.begin(async (tx) => {
    await tx`DELETE FROM state_round_cuts WHERE level = 'pg' AND state_id = ${state.id} AND year = ${YEAR} AND round = ${round}`;
    for (let i = 0; i < rows.length; i += 500) await tx`INSERT INTO state_round_cuts ${tx(rows.slice(i, i + 500))}`;
  });
  console.log(`  written; backup ${backup}. Refresh: bash scripts/revalidate_tags.sh --purge <the state-round tag>`);
}
await sql.end();
