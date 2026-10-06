/**
 * Phone numbers: one rule, used by every form and every route.
 *
 * No imports, so client components can use it — the forms check as the
 * visitor types, and the server checks again because a POST need not come
 * from the form.
 *
 * What it fixed (2026-10-06):
 * - The sign-in screen took `digits.slice(-10)`: the *last ten* digits of
 *   whatever was typed. Somebody who typed eleven digits by mistake was sent a
 *   code at a stranger's number — which is also exactly the "messaging
 *   strangers" pattern that gets the WhatsApp number locked.
 * - /api/leads accepted any ten or more digits, so `1234567890` was stored as
 *   +911234567890 and counsellors were handed numbers nobody can call.
 * - A leading 0 — how a lot of people write their own number — was refused.
 *
 * Indian mobile numbers are ten digits starting 6, 7, 8 or 9. Accepted as
 * typed: spaces, dashes, dots, brackets, a +91 / 91 / 0 prefix. Refused: wrong
 * length (never trimmed to fit), and numbers nobody owns — one digit repeated,
 * or a straight run such as 9876543210 or 9123456789.
 *
 * International numbers are allowed only where a form says so (NRI families),
 * and only written with their own +country code, so a mistyped Indian number
 * is never mistaken for a foreign one.
 */

export type PhoneCheck =
  | { ok: true; e164: string; national: string | null }
  | { ok: false; error: string };

const INDIAN_HINT = "Enter your 10-digit mobile number, like 98765 12345.";

/** Ten digits that look typed by a person rather than invented to get past a form. */
function looksInvented(n: string): boolean {
  if (/^(\d)\1{9}$/.test(n)) return true; // 9999999999
  // Eight or more steps of +1 or -1 in a row: 9876543210, 9123456789, 9012345678.
  let run = 0;
  let best = 0;
  let dir = 0;
  for (let i = 1; i < n.length; i++) {
    const step = Number(n[i]) - Number(n[i - 1]);
    if ((step === 1 || step === -1) && (run === 0 || step === dir)) {
      dir = step;
      run++;
    } else if (step === 1 || step === -1) {
      dir = step;
      run = 1;
    } else {
      run = 0;
    }
    best = Math.max(best, run);
  }
  if (best >= 8) return true;
  // One digit filling eight of the ten places: 9000000000, 9999999998.
  const counts = new Map<string, number>();
  for (const d of n) counts.set(d, (counts.get(d) ?? 0) + 1);
  return Math.max(...counts.values()) >= 8;
}

export function checkIndianMobile(raw: unknown): PhoneCheck {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: false, error: INDIAN_HINT };
  if (/[^\d\s+\-().]/.test(s)) return { ok: false, error: "Use digits only. " + INDIAN_HINT };

  let d = s.replace(/\D/g, "");
  if (s.startsWith("+")) {
    if (!d.startsWith("91")) return { ok: false, error: "Use an Indian mobile number (+91)." };
    d = d.slice(2);
  } else if (d.length === 12 && d.startsWith("91")) {
    d = d.slice(2);
  } else if (d.length === 11 && d.startsWith("0")) {
    d = d.slice(1);
  } else if (d.length === 13 && d.startsWith("091")) {
    d = d.slice(3);
  }

  if (d.length < 10) return { ok: false, error: `That is ${d.length} digit${d.length === 1 ? "" : "s"} — a mobile number has 10.` };
  if (d.length > 10) return { ok: false, error: "That is more than 10 digits. Check the number." };
  if (!/^[6-9]/.test(d)) return { ok: false, error: "Indian mobile numbers start with 6, 7, 8 or 9." };
  if (looksInvented(d)) return { ok: false, error: "That doesn't look like a real mobile number." };
  return { ok: true, e164: `+91${d}`, national: d };
}

/**
 * An Indian mobile, or — where `allowInternational` — a number written with
 * its own +country code (8 to 15 digits, E.164). +91 always goes through the
 * Indian rule, so "+91 12345" is refused rather than waved through as foreign.
 */
export function checkPhone(raw: unknown, opts: { allowInternational?: boolean } = {}): PhoneCheck {
  const s = String(raw ?? "").trim();
  if (opts.allowInternational && s.startsWith("+") && !s.replace(/[^\d]/g, "").startsWith("91")) {
    if (/[^\d\s+\-().]/.test(s)) return { ok: false, error: "Use digits only, with your country code first." };
    const d = s.replace(/\D/g, "");
    if (d.length < 8 || d.length > 15) {
      return { ok: false, error: "Check the number — with the country code it should be 8 to 15 digits." };
    }
    if (/^(\d)\1+$/.test(d.slice(-7))) return { ok: false, error: "That doesn't look like a real number." };
    return { ok: true, e164: `+${d}`, national: null };
  }
  return checkIndianMobile(s);
}
