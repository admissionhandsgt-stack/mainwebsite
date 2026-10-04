/**
 * The few Cloudflare API calls the operational scripts share.
 *
 * Needs CLOUDFLARE_API_TOKEN in .env.local, scoped to the admissionhands.com
 * zone only (DNS edit, Cache Rules edit, Cache Purge). Nothing here touches any
 * other zone, and zone() refuses to guess if the token can see none.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

const T = process.env.CLOUDFLARE_API_TOKEN;

export async function cf(method, path, body) {
  if (!T) throw new Error("CLOUDFLARE_API_TOKEN is not set in .env.local");
  const r = await fetch("https://api.cloudflare.com/client/v4" + path, {
    method,
    headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return {
    status: r.status,
    ok: j.success === true,
    result: j.result,
    errors: (j.errors || []).map((e) => `${e.code} ${e.message}`).join("; "),
  };
}

export async function zone() {
  const z = (await cf("GET", "/zones?name=admissionhands.com")).result?.[0];
  if (!z) throw new Error("The token cannot see the admissionhands.com zone.");
  return z;
}

export async function purgeEverything() {
  const z = await zone();
  return cf("POST", `/zones/${z.id}/purge_cache`, { purge_everything: true });
}
