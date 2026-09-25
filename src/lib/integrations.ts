/**
 * Settings for outside services, owned by the admin rather than the deploy.
 *
 * The point of this file is that a non-technical admin can change the WhatsApp
 * verification number, rotate the webhook secret or repoint the gateway
 * without anyone touching an environment variable or redeploying.
 *
 * **Server only.** These values include API keys, and everything in
 * `site_settings` reaches the browser through `SiteShell`. Nothing here may be
 * added to the allow-list in `/api/content/[resource]`, and no client
 * component may import this file.
 *
 * Environment variables still win where they are set, so a deploy can pin a
 * value the admin must not be able to change — and so the existing `.env.local`
 * setup keeps working with nothing to migrate.
 */

import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export type IntegrationKey =
  | "whatsapp.verify.enabled"
  | "whatsapp.verify.number"
  | "whatsapp.gateway.url"
  | "whatsapp.gateway.api_key"
  | "whatsapp.webhook.secret";

/**
 * The environment variable that overrides each key, where one exists.
 *
 * Checked first: an operator setting these deliberately should not have them
 * silently overridden from a web form.
 */
const ENV_OVERRIDE: Partial<Record<IntegrationKey, string>> = {
  "whatsapp.verify.number": "WHATSAPP_VERIFY_NUMBER",
  "whatsapp.webhook.secret": "WAHA_WEBHOOK_SECRET",
  "whatsapp.gateway.url": "WAHA_GATEWAY_URL",
  "whatsapp.gateway.api_key": "WAHA_API_KEY",
};

/**
 * Short-lived cache.
 *
 * Every verification request reads these, and they change perhaps twice a
 * year. Thirty seconds keeps the database out of the hot path while keeping a
 * rotation from taking effect so slowly that someone thinks it failed.
 */
const TTL_MS = 30_000;
let cache: { at: number; values: Map<string, string> } | null = null;

async function load(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.values;

  const values = new Map<string, string>();
  try {
    const rows = (await db.execute(sql`
      SELECT key, value FROM integrations
    `)) as unknown as { key: string; value: string | null }[];
    for (const r of rows) if (r.value) values.set(r.key, r.value);
  } catch (error) {
    // A database blip must not take the gate down in the open position. An
    // empty map means "not configured", which disables the WhatsApp path and
    // makes the webhook refuse everything.
    console.error("[integrations] read failed:", error);
    if (cache) return cache.values;
  }

  cache = { at: Date.now(), values };
  return values;
}

/** Drops the cache so the next read sees a write made in this isolate. */
export function invalidateIntegrations() {
  cache = null;
}

export async function getIntegration(key: IntegrationKey): Promise<string | null> {
  const envName = ENV_OVERRIDE[key];
  const fromEnv = envName ? process.env[envName] : undefined;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  const values = await load();
  const v = values.get(key);
  return v && v.trim() ? v.trim() : null;
}

export async function getIntegrationFlag(key: IntegrationKey): Promise<boolean> {
  const v = await getIntegration(key);
  return v === "true" || v === "1";
}

/** Which keys are currently pinned by the environment, for the admin to show. */
export async function envPinnedKeys(): Promise<IntegrationKey[]> {
  return (Object.keys(ENV_OVERRIDE) as IntegrationKey[]).filter((k) => {
    const name = ENV_OVERRIDE[k];
    return Boolean(name && process.env[name]?.trim());
  });
}

export interface IntegrationRow {
  key: string;
  value: string | null;
  isSecret: boolean;
  updatedAt: string | null;
}

/** Every row, for the admin screen. Secrets are masked by the caller. */
export async function listIntegrations(prefix: string): Promise<IntegrationRow[]> {
  const rows = (await db.execute(sql`
    SELECT key, value, is_secret, updated_at
      FROM integrations
     WHERE key LIKE ${prefix + "%"}
     ORDER BY key
  `)) as unknown as Record<string, unknown>[];

  return rows.map((r) => ({
    key: r.key as string,
    value: (r.value as string) ?? null,
    isSecret: Boolean(r.is_secret),
    updatedAt: r.updated_at ? new Date(r.updated_at as string).toISOString() : null,
  }));
}

/**
 * Writes a value.
 *
 * Upserts rather than updates so a key added in a later release starts working
 * the moment the admin saves it, without needing its seed row to exist first.
 */
export async function setIntegration(key: IntegrationKey, value: string, isSecret = false) {
  await db.execute(sql`
    INSERT INTO integrations (key, value, is_secret, updated_at)
    VALUES (${key}, ${value}, ${isSecret}, now())
    ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = now()
  `);
  invalidateIntegrations();
}

/** Shows enough of a secret to recognise it, never enough to use it. */
export function maskSecret(value: string | null): string {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `••••••••${value.slice(-4)}`;
}
