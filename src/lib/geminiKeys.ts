/**
 * Reading the Gemini keys the owner pastes (Admin → Outreach). Import-free: the form shows the same count the server
 * saves. Any separator works (comma, space, new line, ; |), quotes and labels ("Key 1:") are dropped, and a key is any
 * single word of 30–200 letters, digits, dots, dashes or underscores — not only the "AIza…" shape, which refused the
 * owner's keys on 2026-11-11. Whether a key works is Google's answer ("Test Gemini keys"), not this shape.
 */
export function parseGeminiKeys(raw: string): string[] {
  const words = raw.replace(/["'`]/g, " ").split(/[\s,;|]+/).map((w) => w.trim());
  return [...new Set(words.filter((w) => w.length >= 30 && w.length <= 200 && /^[A-Za-z0-9._-]+$/.test(w)))].slice(0, 4);
}
