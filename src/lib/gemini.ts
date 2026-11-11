/**
 * Gemini, for the search answers our own data cannot give (lib/officialAnswer.ts) — 2026-11-11, owner: "Gemini key to
 * already hai humpe… ache lowe model use mat karna, middle karna… 4 gemini keys hai to rotate bhi kar sakte hai", then
 * "sahi model set kardo + rotation, gemini 3 flash reliable rahega?".
 *
 * - The keys are the owner's, up to four, pasted in Admin → Outreach (`ai.gemini.keys`, write-only); never in code,
 *   never logged.
 * - Model: the middle tier, Flash — never Flash-Lite or Pro. `gemini-3.6-flash` first: Google's stable (GA) Flash and the
 *   replacement its own deprecations table names for `gemini-3-flash-preview`; on the owner's keys (11 Nov 2026) it
 *   answered a test in ~2 s where `gemini-3.8-flash` took 108 s. 3.8-flash is the fallback when every key is out of 3.6's
 *   quota (each model has its own). Pinned names, not `gemini-flash-latest`, which Google swaps with each release.
 *   `ai.gemini.model` overrides the first.
 * - Rotation: each call starts at the next key in turn; a key that answers 429 (quota) is rested 15 minutes on that
 *   model, 403 (API off / not allowed) 6 hours, 503 (busy) is just passed over; then the next key, then the next model.
 * - Settings per Google's Gemini 3 guide: temperature, top_p and top_k left at their defaults (below 1.0 "may lead to
 *   looping or degraded performance"), thinkingLevel "low" (copying from a document, not reasoning), JSON out
 *   (responseMimeType + responseSchema). The code checks every figure against the page anyway.
 * - At most `DAILY_CAP` calls a day across the keys (`ai.gemini.used`), so the free tiers are never the limit we hit.
 * Server only.
 */
import { getIntegration, setIntegration } from "@/lib/integrations";

export const DAILY_CAP = 60;
export const MODELS = ["gemini-3.6-flash", "gemini-3.8-flash"] as const;
const MODEL = MODELS[0];
let turn = 0;
/** "<key index>|<model>" → when that key may be tried again on that model (this process). */
const rest = new Map<string, number>();

const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

async function keys(): Promise<string[]> {
  const raw = (await getIntegration("ai.gemini.keys")) ?? "";
  return raw.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 4);
}

async function models(): Promise<string[]> {
  const first = ((await getIntegration("ai.gemini.model")) ?? "").trim();
  return [...new Set([first && /flash/i.test(first) && !/lite/i.test(first) ? first : MODEL, ...MODELS])];
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

/** One structured call. Null when there is no key, the day's cap is reached, or every key and model refused. */
export async function geminiJson<T>(prompt: string, schema: Schema): Promise<T | null> {
  const list = await keys();
  if (!list.length || !(await takeCall())) return null;
  const start = turn;
  turn = (turn + 1) % list.length;
  for (const model of await models()) {
    for (let i = 0; i < list.length; i++) {
      const k = (start + i) % list.length;
      const restKey = `${k}|${model}`;
      if ((rest.get(restKey) ?? 0) > Date.now()) continue;
      let r: Response;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": list[k] },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", responseSchema: schema, thinkingConfig: { thinkingLevel: "low" } },
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(45_000),
        });
      } catch {
        continue; // timed out or no answer: the next key
      }
      if (r.status === 429) rest.set(restKey, Date.now() + 15 * 60_000);
      if (r.status === 403) rest.set(restKey, Date.now() + 6 * 3600_000);
      if (r.status === 429 || r.status === 403 || r.status === 503 || r.status === 500) continue;
      if (!r.ok) return null; // 400: the request itself is wrong — another key would refuse it too
      const j = (await r.json().catch(() => null)) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] } | null;
      const text = j?.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
      try {
        return JSON.parse(text) as T;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Admin → Outreach "Test Gemini keys": each saved key's answer to a metadata request for the model (free — it spends no
 * generation quota). Returns only a number and a verdict per key; the keys themselves never leave the server.
 */
export async function testGeminiKeys(): Promise<{ n: number; ok: boolean; note: string }[]> {
  const list = await keys();
  const model = ((await getIntegration("ai.gemini.model")) ?? MODEL).trim() || MODEL;
  return Promise.all(
    list.map(async (key, i) => {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, {
          headers: { "x-goog-api-key": key },
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        });
        if (r.ok) return { n: i + 1, ok: true, note: "works" };
        const j = (await r.json().catch(() => null)) as { error?: { status?: string; details?: { reason?: string }[] } } | null;
        const reason = j?.error?.details?.map((d) => d.reason).find(Boolean) ?? j?.error?.status ?? "";
        const note =
          reason === "API_KEY_INVALID" ? "not a valid key (copy it again from AI Studio)"
          : r.status === 403 ? "refused — the Generative Language API is off for this key's project"
          : r.status === 429 ? "valid, but out of quota right now"
          : `refused (HTTP ${r.status}${reason ? `, ${reason}` : ""})`;
        return { n: i + 1, ok: r.status === 429, note };
      } catch {
        return { n: i + 1, ok: false, note: "no answer from Google" };
      }
    }),
  );
}
