/**
 * The pages that sit on the seat data, and the two things a test looks for.
 *
 * In one place because the gate is spread across several page families and a
 * new one is easy to add without noticing it needs gating. If a surface is
 * missing from this list it is untested, and an untested surface is how the
 * 40-row leak of 2026-09-26 happened.
 */

export interface Surface {
  path: string;
  /** What the page is, for the test name. */
  label: string;
  /** Some pages show a fee column and some cannot — see the UG fee note. */
  hasFee: boolean;
  /**
   * How many gated blocks the page carries.
   *
   * The quota pages carry two — one for PG seats and one for MBBS, which have
   * different columns because UG publishes no per-seat fee. Asserting "exactly
   * one" was a bug in this list, not in the page.
   */
  blocks: number;
}

export const GATED_SURFACES: Surface[] = [
  { path: "/md-ms-india/branches/md-general-medicine", label: "PG branch (General Medicine)", hasFee: true, blocks: 1 },
  { path: "/md-ms-india/branches/md-radio-diagnosis", label: "PG branch (Radiodiagnosis)", hasFee: true, blocks: 1 },
  { path: "/nri-quota/fees", label: "NRI quota", hasFee: true, blocks: 2 },
  { path: "/management-quota", label: "Management quota", hasFee: true, blocks: 2 },
  { path: "/md-ms-india/colleges/sms-medical-college-jaipur", label: "PG college page", hasFee: false, blocks: 1 },
  {
    path: "/mbbs-india/colleges/a-j-institute-of-medical-sciences-research-centre-mangalore-ug",
    label: "UG college page",
    hasFee: false,
    blocks: 1,
  },
];

/** Pages that must never gate anything — the hook that feeds the gate. */
export const OPEN_SURFACES: Surface[] = [
  { path: "/md-ms-india/colleges", label: "PG college directory", hasFee: true, blocks: 0 },
  { path: "/mbbs-india/colleges", label: "UG college directory", hasFee: false, blocks: 0 },
  { path: "/md-ms-india/branches", label: "PG branch index", hasFee: false, blocks: 0 },
];

/** The real seat table. Present only when the caller may see rows. */
export const SEAT_TABLE = '[data-testid="seat-table"]';

/** What stands in its place otherwise. */
export const LOCKED_SUMMARY = '[data-testid="locked-summary"]';

/**
 * A column heading only the seat table's own `<thead>` carries.
 *
 * A second, independent signal, because asserting `SEAT_TABLE` has count 0 is
 * **vacuously true** the moment somebody drops the `data-testid` — the table
 * could be on the page in full and the assertion would still pass. The third leg
 * is `signed-in.spec.ts`, which asserts the hook *does* match when the gate
 * opens, so the hook cannot quietly disappear either.
 *
 * Scoped to `thead` on purpose. The first version searched the whole page for
 * "Widest" and failed on the college pages, where the prose explains what the
 * word means: *"Widest" is the furthest the cut reached in any round that year*.
 * That is copy doing its job, not a leak — a canary that cannot tell the
 * difference is a canary nobody will keep.
 */
export const SEAT_TABLE_HEADING = /R1 close/;

/**
 * A crawler's headers, as a spoofer would send them.
 *
 * The forged `X-Forwarded-For` is the part that matters: Caddy appends the real
 * address rather than replacing it, so a left-most hop of Google's own IP used
 * to be read as the client. Both halves of that fix have to keep holding.
 */
export const SPOOFED_CRAWLERS = [
  {
    name: "Googlebot",
    userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    forwarded: "66.249.66.1",
  },
  {
    name: "bingbot",
    userAgent: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    forwarded: "157.55.39.1, 40.77.167.1",
  },
];
