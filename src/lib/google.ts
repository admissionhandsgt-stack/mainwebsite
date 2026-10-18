/**
 * Google APIs as the site's service account
 * (search-console@admissionhands-seo-1008), for the counsellors' lead sheet.
 *
 * The key is a row in `integrations` (`google.service_account`, a secret) so the
 * server needs no file mounted; `GSC_SA_KEY` (a path) is the fallback the dev
 * machine's scripts already use. The sheet itself belongs to
 * Admissionhands.gt@gmail.com and is shared with the account as an editor.
 *
 * Server only.
 */

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { getIntegration } from "@/lib/integrations";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
let cached: { token: string; until: number } | null = null;

async function serviceAccount(): Promise<{ client_email: string; private_key: string } | null> {
  const fromDb = await getIntegration("google.service_account");
  if (fromDb) return JSON.parse(fromDb);
  if (process.env.GSC_SA_KEY) return JSON.parse(readFileSync(process.env.GSC_SA_KEY, "utf8"));
  return null;
}

export async function googleToken(): Promise<string | null> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const key = await serviceAccount();
  if (!key) return null;
  const b64 = (v: unknown) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: "RS256", typ: "JWT" });
  const claims = b64({ iss: key.client_email, scope: SCOPES.join(" "), aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const sig = createSign("RSA-SHA256").update(`${head}.${claims}`).sign(key.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claims}.${sig}` }),
    cache: "no-store",
  });
  const j = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new Error(`Google token refused: ${r.status}`);
  cached = { token: j.access_token, until: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return j.access_token;
}

/** One Sheets API call. Throws with Google's own message, which names the problem. */
export async function sheets<T = Record<string, unknown>>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await googleToken();
  if (!token) throw new Error("No Google service account is configured.");
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    method: init.method ?? "GET",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const j = (await r.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!r.ok) throw new Error(`Sheets ${r.status}: ${j.error?.message ?? "no message"}`);
  return j;
}
