/**
 * JSON for a `<script type="application/ld+json">` block.
 *
 * `JSON.stringify` leaves `<` alone, so a string holding `</script><script>…` —
 * a college name from an import, a CMS heading, an FAQ answer — would close the
 * tag and run as code on the page. Escaping `<`, `>` and `&` (and the two line
 * separators JavaScript treats as newlines, U+2028 and U+2029) as `\uXXXX`
 * escapes keeps the JSON identical to any parser, Google's included, while
 * nothing in it can end the script.
 *
 * Import-free: server pages and client components both use it. Every JSON-LD
 * block on the site goes through this (2026-11-05).
 */
const UNSAFE: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [String.fromCharCode(0x2028)]: "\\u2028",
  [String.fromCharCode(0x2029)]: "\\u2029",
};
const UNSAFE_RE = new RegExp(`[<>&${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}]`, "g");

export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(UNSAFE_RE, (c) => UNSAFE[c]);
}
