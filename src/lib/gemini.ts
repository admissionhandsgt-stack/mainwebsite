/**
 * Gemini, for the search answers our own data cannot give (lib/officialAnswer.ts) — 2026-11-11, owner: "Gemini key to
 * already hai humpe… ache lowe model use mat karna, middle karna… 4 gemini keys hai to rotate bhi kar sakte hai".
 *
 * - The keys are the owner's, up to four, pasted in Admin → Outreach (`ai.gemini.keys`, write-only, comma-separated);
 *   never in code, never logged. Each call takes the next key in turn; a key that answers 429 / quota is skipped for
 *   that call and the next one is tried.
 * - The model is the middle tier, Flash (`gemini-flash-latest`, Google's alias for its current Flash — not Flash-Lite,
 *   not Pro); `ai.gemini.model` overrides it.
 * - At most `DAILY_CAP` calls a day across the keys (`ai.gemini.used`), so the free tiers are never the limit we hit.
 * - JSON out (responseMimeType + responseSchema), temperature 0: the answer is copied from official text, not written.
 * Server only.
 */
import { getIntegration, setIntegration } from "@/lib/integrations";

export const DAILY_CAP = 60;
const MODEL = "gemini-flash-latest";
let turn = 0;

const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

async function keys(): Promise<string[]> {
  const raw = (await getIntegration("ai.gemini.keys")) ?? "";
  return raw.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 4);
}

export async function geminiReady(): Promise<boolean> {
  return (await keys()).length > 0;
}

/** Today's calls; false when the day's cap is reached. */
async function takeCall(): Promise<boolean> {
  const raw = await getIntegration("ai.gemini.used").catch(() => null);
  let used = { day: today(), n: 0 };
  try {
    const j = raw ? (JSON.parse(raw) as { day?: string; n?: number }) : null;
    if (j?.day === used.day) used = { day: used.day, n: Number(j.n) || 0 };
  } catch {
    /* a fresh count */
  }
  if (used.n >= DAILY_CAP) return false;
  await setIntegration("ai.gemini.used", JSON.stringify({ day: used.day, n: used.n + 1 }));
  return true;
}

export type Schema = Record<string, unknown>;

/** One structured call. Null when there is no key, the day's cap is reached, or every key refused. */
export async function geminiJson<T>(prompt: string, schema: Schema): Promise<T | null> {
  const list = await keys();
  if (!list.length || !(await takeCall())) return null;
  const model = ((await getIntegration("ai.gemini.model")) ?? MODEL).trim() || MODEL;
  for (let i = 0; i < list.length; i++) {
    const key = list[(turn + i) % list.length];
    let r: Response;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: schema },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      continue;
    }
    if (r.status === 429 || r.status === 403 || r.status === 503) continue; // that key's quota or a busy model: next key
    if (!r.ok) return null;
    turn = (turn + i + 1) % list.length;
    const j = (await r.json().catch(() => null)) as { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null;
    const text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }
  return null;
}
