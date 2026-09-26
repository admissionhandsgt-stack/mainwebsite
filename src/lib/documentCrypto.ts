/**
 * Encryption for the counselling document vault.
 *
 * These are identity documents — Aadhaar, PAN, marksheets, caste and domicile
 * certificates — belonging to people who are not our staff. They sit in a
 * `bytea` column, and that column goes into the nightly `pg_dump` alongside
 * everything else. A dump is a single 4 MB file that is easy to copy by
 * accident: to a laptop while debugging, into a cloud bucket, onto a USB stick
 * when someone migrates the box. Access control does not travel with it.
 *
 * So the bytes are sealed before they are stored and opened only when they are
 * served. A leaked dump then yields the metadata — who uploaded what and when —
 * and nothing readable of the documents themselves.
 *
 * **What this does not protect against.** Anyone who can read
 * `/opt/admissionhands/.env` on the box can decrypt everything, because the key
 * is there. That is deliberate: the app has to be able to serve a download
 * without a human present, so the key must live where the app runs. This
 * defends the copy that leaves the machine, which is the leak that actually
 * happens, not the machine itself.
 *
 * AES-256-GCM: authenticated, so a tampered blob fails to open rather than
 * decrypting to something else. Server-only — it must never be imported from a
 * client component.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * `AHD1` — so an unsealed blob is recognisable.
 *
 * The vault is empty today, but a format that cannot say what it is leaves no
 * way to introduce a second one later, and no way to tell a plaintext row from
 * a sealed one during any future re-key.
 */
const MAGIC = Buffer.from("AHD1", "ascii");
const IV_BYTES = 12; // GCM's own nonce size; anything else is a footgun.
const TAG_BYTES = 16;
const HEADER = MAGIC.length + IV_BYTES + TAG_BYTES;

let cached: Buffer | null | undefined;

/**
 * The key, or null when none is configured.
 *
 * Accepts base64 or hex and insists on exactly 32 bytes. A short key is a
 * configuration mistake that would otherwise become a weak cipher silently.
 */
function key(): Buffer | null {
  if (cached !== undefined) return cached;

  const raw = (process.env.DOCUMENT_KEY ?? "").trim();
  if (!raw) {
    cached = null;
    return cached;
  }

  const decoded = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");

  if (decoded.length !== 32) {
    // Loud, and at the first upload rather than at the first download. A
    // half-configured key must not become a silently unencrypted vault.
    throw new Error(
      `DOCUMENT_KEY must be 32 bytes (got ${decoded.length}). Generate one with: openssl rand -base64 32`,
    );
  }

  cached = decoded;
  return cached;
}

/** Whether uploads can be stored at all. The upload route checks this first. */
export function documentEncryptionReady(): boolean {
  return key() !== null;
}

/**
 * Seal bytes for storage.
 *
 * Throws when no key is configured. **Failing closed is the point**: the
 * alternative is storing a student's Aadhaar scan in the clear because an
 * environment variable was missed during a deploy, and nobody would find out.
 */
export function sealDocument(plain: Buffer): Buffer {
  const k = key();
  if (!k) {
    throw new Error("DOCUMENT_KEY is not set, so documents cannot be stored.");
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
}

/**
 * Open a stored blob.
 *
 * A blob without the header is returned untouched. The vault has no such rows
 * today, but the check costs nothing and means an older row could still be
 * downloaded rather than 500ing.
 */
export function openDocument(stored: Buffer): Buffer {
  if (stored.length < HEADER || !stored.subarray(0, MAGIC.length).equals(MAGIC)) {
    return stored;
  }

  const k = key();
  if (!k) {
    throw new Error("DOCUMENT_KEY is not set, so this document cannot be read.");
  }

  const iv = stored.subarray(MAGIC.length, MAGIC.length + IV_BYTES);
  const tag = stored.subarray(MAGIC.length + IV_BYTES, HEADER);
  const decipher = createDecipheriv("aes-256-gcm", k, iv);
  decipher.setAuthTag(tag);
  // Throws on a bad tag, which is what we want — a document that has been
  // altered in the database is not a document to hand back.
  return Buffer.concat([decipher.update(stored.subarray(HEADER)), decipher.final()]);
}
