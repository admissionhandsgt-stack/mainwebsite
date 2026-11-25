/**
 * What leaving a seat costs, from the official 2026-27 rules only (owner, 2026-11-25: "galat claim na ho and khali bhi na
 * rahe … bich ka rasta"). A doctor called the Jalaun DNB hospital, which said it has no penalty, while its page showed the
 * listing's "₹5 L penalty · stipend paid back". That listing (pg_seat_terms, a third-party compilation) carried rupee
 * penalties no official 2026 document backs: ₹5 L + stipend on 1,307 DNB lines, Goa's ₹50 L, Jharkhand's ₹30 L. So no
 * public surface prints the listing's seat-leaving terms any more, and none is left empty either:
 *   - a seat filled by MCC (AIQ, deemed, central universities, DNB Post MBBS, NBE diploma) → MCC's 2026 rules;
 *   - a seat filled by a state's counselling (incl. "Open States" private seats) whose rules are in the official file →
 *     that state's course-leaving rule, or its last round-by-round rule, with a link to its bond page;
 *   - anything else → "not in an official 2026-27 document we hold", and what to ask for in writing.
 * A state's course-leaving penalty is about its MD/MS and diploma seats; on a DNB seat only its round rule is shown.
 */
import { clean, type Json, type JsonObject, type OfficialState } from "@/lib/officialBond";

export interface LeavingRule {
  value: string;
  sub: string;
  href: string | null;
  hrefLabel: string | null;
}

export const LEAVING_FALLBACK: LeavingRule = {
  value: "Not in an official 2026-27 document we hold",
  sub: "Ask the college or the counselling authority for the seat-leaving terms in writing before you join. Our counsellors check them for your seat.",
  href: null,
  hrefLabel: null,
};

const str = (v: Json | undefined): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const isObj = (v: Json | undefined): v is JsonObject => !!v && typeof v === "object" && !Array.isArray(v);

/** The researchers' own pointers ("(see government_service_bond.lead_not_verified …)") never reach a page. */
const tidy = (t: string) =>
  clean(t)
    .replace(/\s*\([^()]*\b[a-z]+_[a-z_.]+\b[^()]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

/** The whole text when short, else its first sentence (never cut inside a list of amounts), else nothing. */
function shortText(t: string, max = 360): string | null {
  const x = tidy(t);
  if (x.length <= max) return x;
  const first = x.match(/^.+?\.(?=\s+[A-Z]|$)/)?.[0];
  return first && first.length <= max ? first : null;
}

const rupees = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

/** MCC's own rules (the official file's "mcc" entry): free exit in Round 1, the deposit forfeited from Round 2. */
export function mccLeaving(mcc: OfficialState | null): LeavingRule {
  const dep = isObj(mcc?.data.security_deposit_inr) ? (mcc!.data.security_deposit_inr as JsonObject) : null;
  const n = (k: string) => (dep && typeof dep[k] === "number" ? (dep[k] as number) : null);
  const open = n("AIQ / Central Universities - UR/EWS");
  const reserved = n("AIQ / Central Universities - SC/ST/OBC/PwD");
  const deemed = n("Deemed Universities - all categories");
  const amounts =
    open && reserved && deemed
      ? ` (${rupees(open)} for AIQ open and EWS seats, ${rupees(reserved)} for SC, ST, OBC and PwD, ${rupees(deemed)} for deemed seats)`
      : "";
  return {
    value: "MCC's 2026 rules: free exit in Round 1",
    sub:
      `From Round 2, not joining or resigning forfeits the security deposit${amounts}. A joined Round 3 or stray seat cannot ` +
      "be resigned. MCC sets no money penalty for leaving the course later; ask the institution in writing for any terms of its own.",
    href: "/md-ms-india/bond#mcc",
    hrefLabel: "MCC's rules in full",
  };
}

/** A state's official rule for leaving one of its counselling's seats. */
export function stateLeaving(state: OfficialState, opts: { privateCollege: boolean; dnb: boolean }): LeavingRule {
  const name = state.state;
  const link = { href: `/md-ms-india/bond/${state.slug}`, hrefLabel: `${name}'s rules in full` };
  const c = state.data.course_leaving_penalty;
  const courseText = str(c as Json) ?? (isObj(c as Json) ? str((c as JsonObject).text) ?? str((c as JsonObject).government) : null);
  const rows = Array.isArray(state.data.seat_leaving) ? (state.data.seat_leaving as Json[]).filter(isObj) : [];
  // The row for leaving late (before completing the course, after the last round); else the latest row that says something
  // — a row that only says "not stated" is skipped.
  const said = (r: JsonObject): string | null => {
    const own = str(opts.privateCollege ? r.private : r.government);
    const other = str(opts.privateCollege ? r.government : r.private);
    const text = own && !/^same\.?$/i.test(own) ? own : other && !/^same\.?$/i.test(other) ? other : null;
    return text && !/^not stated/i.test(tidy(text)) ? text : null;
  };
  const late =
    rows.find((r) => /complet|any time|before the end|after the (stray|last|final|mop)/i.test(str(r.when) ?? "") && said(r)) ??
    [...rows].reverse().find((r) => said(r));
  let roundText: string | null = null;
  if (late) {
    const text = said(late)!;
    const when = str(late.when);
    roundText = shortText(when ? `${when}: ${text}` : text);
  }
  if (opts.dnb) {
    // The state's own words about DNB first (West Bengal: "No discontinuation bond for DNB courses at present."); a round
    // rule that names a sum without saying DNB is the degree seats' bond ("Rs 5L Degree / Rs 2L Diploma"), not this seat's.
    const dnbCourse = courseText ? dnbSentences(tidy(courseText)) : null;
    const dnbCourseText = dnbCourse ? shortText(dnbCourse) : null;
    if (dnbCourseText) return { value: `${name}'s 2026-27 rules`, sub: dnbCourseText, ...link };
    if (roundText && /(Rs\.?|₹)\s?[\d,.]+|\blakh\b|crore/i.test(roundText) && !dnbSentences(roundText)) roundText = null;
    if (!roundText) return { ...LEAVING_FALLBACK, ...link };
    return {
      value: `${name}'s 2026-27 rules`,
      sub: `${roundText.replace(/\.?$/, ".")} Leaving a DNB course later: the hospital's own terms are not in an official document we hold, so ask for them in writing.`,
      ...link,
    };
  }
  const course = courseText ? shortText(courseText) : null;
  // "Not stated …" (Jharkhand, Goa, Gujarat, Uttarakhand): the round rule is what the documents do set, and the absence of a
  // course-leaving penalty is said as the documents' own finding.
  const notStated = !!courseText && /^not stated/i.test(tidy(courseText));
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const sub = notStated
    ? roundText
      ? `${roundText.replace(/\.?$/, ".")} No penalty for leaving the course later is stated in its 2026-27 documents.`
      : course
        ? cap(course)
        : null
    : course
      ? cap(course)
      : roundText;
  if (!sub) return { ...LEAVING_FALLBACK, ...link };
  return { value: `${name}'s 2026-27 rules`, sub, ...link };
}

/**
 * The college's own official terms inside a per-seat row ("… The college's own terms (2026-27): …"), as one short
 * sentence to add — never a "not found / ask the college" note.
 */
function ownTerms(text: string): string | null {
  const m = text.match(/The college's own terms \(([^)]*)\):\s*([\s\S]+)$/);
  if (!m || /not found|ask the college|not stated/i.test(m[2])) return null;
  const body = shortText(m[2], 260);
  return body ? `The college's own terms (${m[1]}): ${body}` : null;
}
const beforeOwn = (text: string) => text.replace(/\s*The college's own terms \([^)]*\):[\s\S]*$/, "").trim();

/**
 * On a DNB seat, only the sentences about DNB. A state's row can set a PG degree / diploma penalty and then say DNB has
 * none — West Bengal's "Rs 5 lakh for PG Degree seats, Rs 2 lakh for PG Diploma seats. No discontinuation bond for DNB
 * courses at present." — and a DNB hospital's page must not lead with the degree seats' ₹5 lakh (the Jalaun call).
 */
function dnbSentences(text: string): string | null {
  const keep = text.split(/(?<=\.)\s+(?=[A-Z])/).filter((s) => /\b(DNB|DrNB|NBE|NBEMS|National Board)\b/i.test(s));
  return keep.length ? keep.join(" ") : null;
}

/**
 * The rule for one listed seat: by the counselling the listing names. MCC → MCC; a state named in the counselling (or
 * "Open States", the college's own state's counselling) → that state's rules when the official file holds them.
 * `perSeat` (2026-11-25, lib/seatLeaving.ts): the official words for this college × seat type, from the PG tool session's
 * research, win over the state-level rule where they say something — the state's or the college's own 2026-27 terms for
 * that seat. MCC seats keep MCC's fuller rule, with the college's own terms added; a "none stated" row keeps the state rule
 * (its wording reads better), plus the college's own terms; a not-confirmed row is never used.
 */
export function leavingFor(
  t: { counselling: string | null; seatType: string; family?: string },
  ctx: {
    mcc: OfficialState | null;
    states: OfficialState[];
    collegeState: string | null;
    privateCollege: boolean;
    perSeat?: Record<string, { status: string; text: string }>;
  },
): LeavingRule {
  const counselling = t.counselling ?? "";
  const row = ctx.perSeat?.[t.seatType.trim().toLowerCase()];
  const usable = row && row.text && row.status !== "not_confirmed" ? row : null;
  const own = usable ? ownTerms(usable.text) : null;
  const plus = (r: LeavingRule) => (own ? { ...r, sub: `${r.sub.replace(/\.?$/, ".")} ${own}` } : r);
  if (/\bMCC\b/i.test(counselling)) return plus(mccLeaving(ctx.mcc));
  if (/DNB Sponsored/i.test(counselling)) return LEAVING_FALLBACK;
  const dnb = t.family === "dnb" || /\b(DNB|DrNB|NBE)\b/i.test(t.seatType);
  const named = ctx.states.find((s) => counselling.toLowerCase().includes(s.state.toLowerCase()));
  const state = named ?? (/open states/i.test(counselling) && ctx.collegeState ? ctx.states.find((s) => s.state === ctx.collegeState) : undefined);
  if (usable && (usable.status === "official" || usable.status === "dnb_no_sum_set")) {
    // A DNB seat with no sentence about DNB in its row takes the state's round rule below, as every other DNB seat does.
    const body = dnb && usable.status === "official" ? dnbSentences(beforeOwn(usable.text)) : beforeOwn(usable.text);
    const main = body ? shortText(body, 460) : null;
    if (main) {
      const cap = main.charAt(0).toUpperCase() + main.slice(1);
      return plus({
        value: state ? `${state.state}'s 2026-27 rules` : "Official 2026-27 terms",
        sub: cap,
        href: state ? `/md-ms-india/bond/${state.slug}` : null,
        hrefLabel: state ? `${state.state}'s rules in full` : null,
      });
    }
  }
  return plus(state ? stateLeaving(state, { privateCollege: ctx.privateCollege, dnb }) : LEAVING_FALLBACK);
}
