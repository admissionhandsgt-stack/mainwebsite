/**
 * Tell Bing and the other IndexNow engines that pages changed, from inside the app (2026-10-20) —
 * the round-result pages ping it the moment a result goes live, instead of waiting for a person to
 * run scripts/indexnow.mjs. The key is public by design (public/<32 hex>.txt). Server only.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { logError } from "@/lib/logger";

const HOST = "www.admissionhands.com";

function key(): { key: string; file: string } | null {
  try {
    const dir = join(process.cwd(), "public");
    const file = readdirSync(dir).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
    return file ? { key: readFileSync(join(dir, file), "utf8").trim(), file } : null;
  } catch {
    return null;
  }
}

/** Paths ("/neet-pg-counselling/2026/round-1-result") or full URLs. Never throws. */
export async function pingIndexNow(paths: string[]): Promise<{ ok: boolean; status?: number }> {
  const k = key();
  if (!k || !paths.length) return { ok: false };
  const urlList = paths.map((p) => (p.startsWith("http") ? p : `https://${HOST}${p}`));
  try {
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: k.key, keyLocation: `https://${HOST}/${k.file}`, urlList }),
      signal: AbortSignal.timeout(20_000),
    });
    // 200 = accepted, 202 = accepted with the key check pending.
    return { ok: r.status === 200 || r.status === 202, status: r.status };
  } catch (error) {
    logError(error, { route: "indexNow" });
    return { ok: false };
  }
}
