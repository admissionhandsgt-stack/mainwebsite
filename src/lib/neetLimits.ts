/**
 * What a NEET rank or score can be — one place, updated once a year.
 *
 * No imports, so the forms use the same rule as the routes behind them.
 *
 * Every route used to accept any rank from 1 to 2,000,000 whatever the exam,
 * so a PG "rank" of 15,00,000 was stored and searched with when only 2,65,960
 * people sat NEET PG 2026. And the parsing stripped every non-digit, so
 * "1.5 lakh" became 15, "-5" became 5 and "12,345.6" became 123456.
 *
 * The ceiling is the number of candidates who *appeared*: a rank is a position
 * among them, so nobody can be ranked past the last of them.
 *
 * Sources (check these when the next cycle's results are out):
 * - NEET UG 2026 (re-examination, 21 June 2026): 22,79,743 registered,
 *   19,99,895 appeared — NTA press release, 16 July 2026.
 * - NEET PG 2026 (30 August, plus the 5 September re-test in Jaipur):
 *   2,63,544 + 2,416 = 2,65,960 appeared — NBEMS, 24 September 2026.
 * - Marks: both papers are 180 questions at +4 / −1 since NEET PG 2026 went
 *   from 200 questions to 180, so 720 at the top and −180 at the bottom.
 */

export type NeetLevel = "ug" | "pg";

export const NEET_LIMITS = {
  ug: { exam: "NEET UG 2026", appeared: 1_999_895, maxMarks: 720, minMarks: -180 },
  pg: { exam: "NEET PG 2026", appeared: 265_960, maxMarks: 720, minMarks: -180 },
} as const;

const fmt = (n: number) => n.toLocaleString("en-IN");

export type RankCheck = { ok: true; value: number } | { ok: false; error: string };

/**
 * A rank as somebody types it: digits, with Indian or Western grouping
 * (1,23,456 or 123,456) and spaces allowed. Anything else — a decimal point,
 * a minus sign, "lakh", "k" — is refused with a reason rather than guessed at.
 * Without a level, the wider (UG) ceiling applies.
 */
export function checkRank(raw: unknown, level?: NeetLevel | null): RankCheck {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: false, error: "Enter your rank." };
  if (/lakh|lac|k$/i.test(s)) return { ok: false, error: "Type the rank in full, e.g. 1,50,000 rather than 1.5 lakh." };
  if (/[.\-]/.test(s)) return { ok: false, error: "A rank is a whole number, like 45,210." };
  if (!/^[\d,\s]+$/.test(s)) return { ok: false, error: "Use digits only, like 45,210." };
  const n = Number(s.replace(/[,\s]/g, ""));
  if (!Number.isSafeInteger(n) || n < 1) return { ok: false, error: "A rank starts at 1." };
  const lim = NEET_LIMITS[level ?? "ug"];
  if (n > lim.appeared) {
    return {
      ok: false,
      error: `${lim.exam} had ${fmt(lim.appeared)} candidates, so no rank is higher than that. Check the number on your scorecard.`,
    };
  }
  return { ok: true, value: n };
}

/** For the server: the rank, or null when it is absent or impossible. */
export function rankOrNull(raw: unknown, level?: NeetLevel | null): number | null {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const r = checkRank(raw, level);
  return r.ok ? r.value : null;
}

/** A NEET score: a whole number of marks between −180 and 720. */
export function checkScore(raw: unknown, level?: NeetLevel | null): RankCheck {
  const s = String(raw ?? "").trim();
  if (!/^-?\d+$/.test(s)) return { ok: false, error: "Enter your marks as a whole number, like 512." };
  const n = Number(s);
  const lim = NEET_LIMITS[level ?? "ug"];
  if (n > lim.maxMarks) return { ok: false, error: `${lim.exam} is out of ${lim.maxMarks} marks.` };
  if (n < lim.minMarks) return { ok: false, error: `The lowest possible score is ${lim.minMarks}.` };
  return { ok: true, value: n };
}
