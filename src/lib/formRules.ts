/**
 * Names, emails and free text — the rules every form and route share.
 *
 * No imports, so client components check with the same rule the server
 * enforces. The server must enforce it regardless: a POST need not come from
 * the form, and every value here ends up in front of a counsellor.
 *
 * Before 2026-10-06 a name was "anything, trimmed, cut at 120": a phone
 * number typed into the name box, a link, or a page of text all reached the
 * lead list as somebody's name; email was never looked at; a message had no
 * length limit at all.
 */

export type TextCheck = { ok: true; value: string } | { ok: false; error: string };

/** Collapse runs of whitespace and strip control characters. */
export function tidy(raw: unknown, max: number): string {
  return String(raw ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * A person's name: 2–60 characters, letters in any script (Devanagari,
 * Tamil… not only A–Z), with spaces, dots, apostrophes and hyphens. At least
 * two letters, no digits, no links or email addresses.
 */
export function checkName(raw: unknown): TextCheck {
  const v = tidy(raw, 200);
  if (!v) return { ok: false, error: "Enter your name." };
  if (/\d/.test(v)) return { ok: false, error: "A name shouldn't have numbers in it." };
  if (/https?:|www\.|@|\.(com|in|net|org)\b/i.test(v)) return { ok: false, error: "Enter your name, not a link or email." };
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(v)) {
    return { ok: false, error: "Use letters only, with spaces, dots or hyphens." };
  }
  const letters = (v.match(/\p{L}/gu) || []).length;
  if (letters < 2) return { ok: false, error: "Enter your full name." };
  if (v.length > 60) return { ok: false, error: "That name is too long — 60 characters at most." };
  return { ok: true, value: v };
}

/** For the server: a clean name, or null when absent or not a name. */
export function nameOrNull(raw: unknown): string | null {
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;
  const r = checkName(raw);
  return r.ok ? r.value : null;
}

/** Optional email: empty is fine, otherwise something that can receive mail. */
export function checkEmail(raw: unknown): TextCheck {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return { ok: true, value: "" };
  if (v.length > 254 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(v) || /\.\./.test(v)) {
    return { ok: false, error: "Check the email address — it should look like name@example.com." };
  }
  return { ok: true, value: v };
}
