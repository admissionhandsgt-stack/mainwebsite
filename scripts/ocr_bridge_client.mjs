/**
 * Reference client for the OCR bridge (src/lib/ocrBridge.ts) — what the AH tool's poster bot sends. Node 18+, no
 * dependencies. The sync key is read from the environment (AH_SYNC_KEY); it is never sent, printed or logged — only a
 * key derived from it seals the request.
 *
 *   AH_SYNC_KEY=… node scripts/ocr_bridge_client.mjs <file.pdf|.jpg|.png> [max_pages] [url]
 *
 * The bridge answers 404 to every address it does not know and to anything not sealed with the key, so run this from
 * the allowed server. Exports seal/open for tests.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

export const bridgeKey = (syncKey) =>
  Buffer.from(hkdfSync("sha256", Buffer.from(syncKey, "utf8"), Buffer.from("admissionhands-ocr-bridge"), Buffer.from("v1"), 32));

export function sealRequest(key, payload) {
  const ts = Math.floor(Date.now() / 1000);
  const nonce = randomBytes(18).toString("base64url");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(`${ts}.${nonce}`));
  const ct = Buffer.concat([c.update(Buffer.from(JSON.stringify(payload), "utf8")), c.final(), c.getAuthTag()]);
  return { body: { v: 1, ts, nonce, iv: iv.toString("base64url"), ct: ct.toString("base64url") }, nonce };
}

export function openResponse(key, nonce, res) {
  const iv = Buffer.from(res.iv, "base64url");
  const ct = Buffer.from(res.ct, "base64url");
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAAD(Buffer.from(`res.${nonce}`));
  d.setAuthTag(ct.subarray(ct.length - 16));
  return JSON.parse(Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]).toString("utf8"));
}

const MIME = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  const [file, maxPages = "5", url = "https://www.admissionhands.com/api/bridge/ocr"] = process.argv.slice(2);
  if (!file || !process.env.AH_SYNC_KEY) {
    console.error("usage: AH_SYNC_KEY=… node scripts/ocr_bridge_client.mjs <file> [max_pages] [url]");
    process.exit(2);
  }
  const key = bridgeKey(process.env.AH_SYNC_KEY);
  const mime = MIME[file.split(".").pop().toLowerCase()];
  const { body, nonce } = sealRequest(key, { mime, data_b64: readFileSync(file).toString("base64"), max_pages: Number(maxPages) });
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (r.status === 404) {
    console.log("404 — this address is not on the bridge's list, or the key does not match.");
    process.exit(1);
  }
  const out = openResponse(key, nonce, await r.json());
  console.log(`HTTP ${r.status}`, JSON.stringify({ ...out, pages: out.pages?.map((p) => ({ page: p.page, first: p.text.split("\n").slice(0, 2) })) }, null, 1));
}
