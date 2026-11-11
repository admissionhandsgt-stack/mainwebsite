/**
 * The OCR bridge for the AH tool (zyn-3c's Telegram poster bot), 2026-11-11 — owner: "OCR de do lekin public url etc par
 * expose na ho, sirf secret tarike se encrypted bridge type something wo use kar sake proper".
 *
 * Google Cloud Vision (DOCUMENT_TEXT_DETECTION; the script detected by itself — Hindi, English and the regional languages) reads a PUBLIC counselling notice (a scanned PDF of up
 * to 5 pages, or a photo) and returns its text, so the bot checks every date on a poster against the notice's own words.
 * Vision runs as the site's own service account (lib/google.ts) on project admissionhands-seo-1008; no new key exists.
 *
 * Not a public endpoint in practice: `POST /api/bridge/ocr` answers 404 — the same as a path that does not exist — to
 * every request that is not, all at once,
 *   1. from an address in `ocr.bridge.allow_ips` (the AH tool's server; the visitor's address the edge vouches for),
 *   2. sealed with AES-256-GCM under a key derived (HKDF-SHA256) from the shared sync key — the key itself is never sent,
 *      and Cloudflare, which terminates TLS on the way, sees only ciphertext,
 *   3. fresh (timestamp within 5 minutes) and never seen before (nonce), so a captured request cannot be replayed.
 * The answer is sealed the same way. Limits: 900 pages a calendar month (Vision's free tier is 1,000 units; the project's
 * billing must never be reached — owner: no spending before Dec 2026) and 10 calls a minute. The document and its text
 * are never stored or logged.
 *
 * Wire format (both directions JSON):
 *   request  { v: 1, ts: <unix seconds>, nonce: <16+ random bytes, base64url>, iv: <12 bytes b64url>, ct: <b64url> }
 *            ct = AES-256-GCM(key, iv, aad = `${ts}.${nonce}`, plaintext = JSON { mime, data_b64, max_pages, langs? }) ‖ 16-byte tag
 *   response { v: 1, iv, ct }   ct = AES-256-GCM(key, iv, aad = `res.${nonce}`, JSON { ok, pages?, pages_used?, month_used?, month_cap?, error? })
 *   key      = HKDF-SHA256(ikm = sync key (UTF-8), salt = "admissionhands-ocr-bridge", info = "v1", 32 bytes)
 * Server only.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { getIntegration, setIntegration } from "@/lib/integrations";
import { googleToken } from "@/lib/google";

export const MONTH_CAP = 900;
const PER_MINUTE = 10;
const MAX_BYTES = 15 * 1024 * 1024;
const SKEW_S = 300;
const DEFAULT_ALLOW = "130.210.53.166";
const MIMES = new Set(["application/pdf", "image/jpeg", "image/png"]);

const b64u = (b: Buffer) => b.toString("base64url");
const unb64u = (s: unknown) => (typeof s === "string" && /^[A-Za-z0-9_-]+={0,2}$/.test(s) ? Buffer.from(s, "base64url") : null);

async function bridgeKey(): Promise<Buffer | null> {
  const sync = await getIntegration("counselor.sync_key");
  if (!sync) return null;
  return Buffer.from(hkdfSync("sha256", Buffer.from(sync, "utf8"), Buffer.from("admissionhands-ocr-bridge"), Buffer.from("v1"), 32));
}

/** Is this caller allowed to be told the bridge exists? (Enabled, and from an allowed address.) */
export async function bridgeOpenTo(ip: string | null): Promise<boolean> {
  if ((await getIntegration("ocr.bridge.enabled")) === "false") return false;
  const allow = ((await getIntegration("ocr.bridge.allow_ips")) ?? DEFAULT_ALLOW).split(/[\s,]+/).filter(Boolean);
  return Boolean(ip && allow.includes(ip));
}

/* ---------------------------------------------------------------- sealing --- */

const seen = new Map<string, number>(); // nonce → when it may be forgotten

export type Opened = { nonce: string; payload: { mime?: unknown; data_b64?: unknown; max_pages?: unknown; langs?: unknown } };

/** The request's payload, or null for anything not sealed with our key, stale or replayed. */
export async function openRequest(body: unknown): Promise<Opened | null> {
  const key = await bridgeKey();
  if (!key || !body || typeof body !== "object") return null;
  const { v, ts, nonce, iv, ct } = body as Record<string, unknown>;
  if (v !== 1 || typeof ts !== "number" || typeof nonce !== "string" || nonce.length < 16 || nonce.length > 64) return null;
  if (Math.abs(Date.now() / 1000 - ts) > SKEW_S) return null;
  const now = Date.now();
  for (const [k, until] of seen) if (until < now) seen.delete(k);
  if (seen.has(nonce)) return null;
  const ivb = unb64u(iv);
  const ctb = unb64u(ct);
  if (!ivb || ivb.length !== 12 || !ctb || ctb.length < 17) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", key, ivb);
    d.setAAD(Buffer.from(`${ts}.${nonce}`));
    d.setAuthTag(ctb.subarray(ctb.length - 16));
    const plain = Buffer.concat([d.update(ctb.subarray(0, ctb.length - 16)), d.final()]);
    seen.set(nonce, now + 2 * SKEW_S * 1000);
    return { nonce, payload: JSON.parse(plain.toString("utf8")) };
  } catch {
    return null;
  }
}

export async function sealResponse(nonce: string, data: unknown): Promise<{ v: 1; iv: string; ct: string }> {
  const key = (await bridgeKey())!;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(`res.${nonce}`));
  const ct = Buffer.concat([c.update(Buffer.from(JSON.stringify(data), "utf8")), c.final(), c.getAuthTag()]);
  return { v: 1, iv: b64u(iv), ct: b64u(ct) };
}

/* ----------------------------------------------------------------- limits --- */

const calls: number[] = [];
const month = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 7);

async function used(): Promise<number> {
  try {
    const j = JSON.parse((await getIntegration("ocr.bridge.used")) ?? "{}") as { month?: string; pages?: number };
    return j.month === month() ? Number(j.pages) || 0 : 0;
  } catch {
    return 0;
  }
}
const addUsed = async (pages: number) => setIntegration("ocr.bridge.used", JSON.stringify({ month: month(), pages: (await used()) + pages }));

/* ------------------------------------------------------------------- OCR --- */

export type OcrResult =
  | { status: 200; body: { ok: true; pages: { page: number; text: string }[]; pages_used: number; month_used: number; month_cap: number } }
  | { status: 400 | 413 | 429 | 503; body: { ok: false; error: string; month_used?: number; month_cap?: number } };

export async function runOcr(p: Opened["payload"]): Promise<OcrResult> {
  const mime = typeof p.mime === "string" ? p.mime : "";
  if (!MIMES.has(mime)) return { status: 400, body: { ok: false, error: "mime must be application/pdf, image/jpeg or image/png" } };
  if (typeof p.data_b64 !== "string" || !p.data_b64.length) return { status: 400, body: { ok: false, error: "data_b64 is missing" } };
  const data = p.data_b64.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return { status: 400, body: { ok: false, error: "data_b64 is not base64" } };
  if (Math.floor((data.length * 3) / 4) > MAX_BYTES) return { status: 413, body: { ok: false, error: "the document is over 15 MB" } };
  const pdf = mime === "application/pdf";
  const maxPages = pdf ? Math.max(1, Math.min(5, Math.floor(Number(p.max_pages) || 5))) : 1;

  const now = Date.now();
  while (calls.length && calls[0] < now - 60_000) calls.shift();
  if (calls.length >= PER_MINUTE) return { status: 429, body: { ok: false, error: "10 calls a minute — try again shortly" } };
  const before = await used();
  if (before + maxPages > MONTH_CAP) return { status: 429, body: { ok: false, error: "this month's page cap is reached", month_used: before, month_cap: MONTH_CAP } };
  calls.push(now);

  const token = await googleToken(["https://www.googleapis.com/auth/cloud-vision"]).catch(() => null);
  if (!token) return { status: 503, body: { ok: false, error: "Vision is not reachable" } };
  // No language hint by default: Vision detects the script itself, which Google recommends and which read Kannada, Tamil,
  // Telugu, Gujarati, Marathi, Bengali, Malayalam, Odia, Punjabi, Hindi and English notices (test, 11 Nov 2026); a
  // wrong hint can hurt. The caller may pass `langs` (ISO codes) for a notice it knows.
  const langs = Array.isArray(p.langs) ? p.langs.filter((x): x is string => typeof x === "string" && /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(x)).slice(0, 8) : [];
  const feature = { features: [{ type: "DOCUMENT_TEXT_DETECTION" }], ...(langs.length ? { imageContext: { languageHints: langs } } : {}) };
  const url = pdf ? "https://vision.googleapis.com/v1/files:annotate" : "https://vision.googleapis.com/v1/images:annotate";
  const body = pdf
    ? { requests: [{ inputConfig: { content: data, mimeType: mime }, ...feature, pages: Array.from({ length: maxPages }, (_, i) => i + 1) }] }
    : { requests: [{ image: { content: data }, ...feature }] };
  let r: Response;
  try {
    r = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    return { status: 503, body: { ok: false, error: "Vision did not answer" } };
  }
  type Page = { fullTextAnnotation?: { text?: string }; error?: { message?: string }; context?: { pageNumber?: number } };
  const j = (await r.json().catch(() => null)) as { responses?: (Page & { responses?: Page[] })[]; error?: { message?: string } } | null;
  if (r.status >= 500) return { status: 503, body: { ok: false, error: "Vision is down" } };
  if (!r.ok) return { status: 400, body: { ok: false, error: `Vision refused the document: ${(j?.error?.message ?? String(r.status)).slice(0, 200)}` } };
  const top = j?.responses?.[0];
  const list: Page[] = pdf ? top?.responses ?? [] : top ? [top] : [];
  const bad = list.find((x) => x.error?.message) ?? (top?.error?.message ? top : null);
  if (!list.length && bad) return { status: 400, body: { ok: false, error: `Vision could not read it: ${bad.error!.message!.slice(0, 200)}` } };
  const pages = list.map((x, i) => ({ page: x.context?.pageNumber ?? i + 1, text: x.fullTextAnnotation?.text ?? "" }));
  // Vision bills a PDF by the pages it read, an image as one.
  const billed = pdf ? Math.max(1, list.length) : 1;
  await addUsed(billed);
  return { status: 200, body: { ok: true, pages, pages_used: billed, month_used: before + billed, month_cap: MONTH_CAP } };
}
