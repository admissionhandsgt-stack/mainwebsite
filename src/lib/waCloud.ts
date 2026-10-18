/**
 * The official WhatsApp sender: Meta's Cloud API, authentication templates.
 *
 * Why this exists: the unofficial gateway (WAHA, a linked device) sends a code
 * to a stranger on every sign-in, which is the pattern WhatsApp bans — the
 * primary number, 917023081792, was blocked on 2026-10-11. An authentication
 * template is the sanctioned way to send exactly that message: Meta approves
 * the wording once, the code goes in a field, and the number is not at risk for
 * doing what it was registered to do. About ₹0.145 a message in India.
 *
 * Configured from Admin → WhatsApp Official API (rows in `integrations`, the
 * token stored as a secret), so nothing here needs a redeploy to change.
 *
 * **Server only** — the token can send as the business. Never import this from
 * a client component.
 */

import { getIntegration, getIntegrationFlag } from "@/lib/integrations";
import { recordOutbound, type MessageKind } from "@/lib/waLog";

/** Meta's current Graph API version in its WhatsApp examples (2026-10). */
export const GRAPH = "https://graph.facebook.com/v25.0";
export const DEFAULT_TEMPLATE = "ah_login_code";
/** Must match TTL_MINUTES in otp.ts: the footer tells the reader how long the code lasts. */
export const CODE_MINUTES = 10;

export interface CloudConfig {
  token: string;
  wabaId: string | null;
  phoneNumberId: string | null;
  template: string;
}

export async function cloudConfig(): Promise<CloudConfig | null> {
  const token = await getIntegration("whatsapp.cloud.token");
  if (!token) return null;
  return {
    token,
    wabaId: await getIntegration("whatsapp.cloud.waba_id"),
    phoneNumberId: await getIntegration("whatsapp.cloud.phone_number_id"),
    template: (await getIntegration("whatsapp.cloud.template")) || DEFAULT_TEMPLATE,
  };
}

/**
 * Site-wide ceilings on official sends. Every one is billed, and the per-number
 * caps in otp.ts do nothing against somebody cycling through many numbers from
 * many addresses — this is what bounds the bill. Admin-editable in
 * `integrations`; a blank or nonsense value falls back to the default.
 */
export const DEFAULT_HOURLY_CAP = 60;
export const DEFAULT_DAILY_CAP = 400;

export async function cloudCaps(): Promise<{ hour: number; day: number }> {
  const read = async (key: "whatsapp.cloud.hourly_cap" | "whatsapp.cloud.daily_cap", fallback: number) => {
    const n = Number.parseInt((await getIntegration(key)) ?? "", 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    hour: await read("whatsapp.cloud.hourly_cap", DEFAULT_HOURLY_CAP),
    day: await read("whatsapp.cloud.daily_cap", DEFAULT_DAILY_CAP),
  };
}

/** Switched on, and with everything a send needs. */
export async function cloudReady(): Promise<boolean> {
  if (!(await getIntegrationFlag("whatsapp.cloud.enabled"))) return false;
  const c = await cloudConfig();
  return Boolean(c?.token && c.phoneNumberId);
}

type GraphResult = { ok: boolean; status: number; body: Record<string, unknown> };

export async function graph(
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<GraphResult> {
  try {
    const res = await fetch(`${GRAPH}${path}`, {
      method: init.method ?? "GET",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: { error: { message: String((error as Error)?.message ?? error) } } };
  }
}

/** Meta's own error text, which names the missing permission or field. */
export function graphError(r: GraphResult): string {
  const e = (r.body?.error ?? {}) as { message?: string; error_user_msg?: string; code?: number };
  return e.error_user_msg || e.message || `Meta answered ${r.status || "nothing"}.`;
}

/**
 * Sends a sign-in code through the approved authentication template.
 * `phone` is +91XXXXXXXXXX; Meta wants the digits alone.
 */
export async function sendCloudCode(
  phone: string,
  code: string,
  otpId?: number | null,
): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const c = await cloudConfig();
  if (!c?.phoneNumberId) return { ok: false, error: "The official sender is not set up." };
  const r = await graph(c.token, `/${c.phoneNumberId}/messages`, {
    method: "POST",
    body: {
      messaging_product: "whatsapp",
      to: phone.replace(/\D/g, ""),
      type: "template",
      template: {
        name: c.template,
        language: { code: "en" },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          // The copy-code button carries the same code.
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    },
  });
  const id = r.ok ? ((r.body.messages as { id?: string }[] | undefined) ?? [])[0]?.id ?? null : null;
  // The digits never go in the log: staff reading it must not be able to sign in as the student.
  await recordOutbound({ wamid: id, phone, kind: "otp", template: c.template, body: "Sign-in code", otpId, error: r.ok ? null : graphError(r) });
  if (!r.ok) return { ok: false, error: graphError(r) };
  return { ok: true, id };
}

/** Submits the sign-in template for Meta's approval — usually minutes for authentication. */
export async function createAuthTemplate(c: CloudConfig): Promise<GraphResult> {
  return graph(c.token, `/${c.wabaId}/message_templates`, {
    method: "POST",
    body: {
      name: c.template,
      language: "en",
      category: "authentication",
      components: [
        { type: "body", add_security_recommendation: true },
        { type: "footer", code_expiration_minutes: CODE_MINUTES },
        { type: "buttons", buttons: [{ type: "otp", otp_type: "copy_code", text: "Copy code" }] },
      ],
    },
  });
}

export interface CloudStatus {
  account: { name?: string; id?: string } | null;
  phones: { id: string; display_phone_number?: string; verified_name?: string; quality_rating?: string; code_verification_status?: string; name_status?: string; status?: string }[];
  template: { name?: string; status?: string; language?: string } | null;
  errors: string[];
}

/** What the admin screen shows: the account, its numbers, and the template's approval. */
export async function cloudStatus(c: CloudConfig): Promise<CloudStatus> {
  const errors: string[] = [];
  const out: CloudStatus = { account: null, phones: [], template: null, errors };
  if (!c.wabaId) {
    errors.push("Add the WhatsApp Business Account ID.");
    return out;
  }
  const [acct, phones, tpl] = await Promise.all([
    graph(c.token, `/${c.wabaId}?fields=name`),
    graph(c.token, `/${c.wabaId}/phone_numbers?fields=display_phone_number,verified_name,quality_rating,code_verification_status,name_status,status`),
    graph(c.token, `/${c.wabaId}/message_templates?name=${encodeURIComponent(c.template)}&fields=name,status,language`),
  ]);
  if (acct.ok) out.account = { name: acct.body.name as string, id: acct.body.id as string };
  else errors.push(`Account: ${graphError(acct)}`);
  if (phones.ok) out.phones = (phones.body.data as CloudStatus["phones"]) ?? [];
  else errors.push(`Numbers: ${graphError(phones)}`);
  if (tpl.ok) out.template = ((tpl.body.data as CloudStatus["template"][]) ?? [])[0] ?? null;
  else errors.push(`Template: ${graphError(tpl)}`);
  return out;
}

/* ------------------------------------------------- adding a phone number */

/** Step 1: add the number to the account. Returns the new phone number ID. */
export async function addPhoneNumber(c: CloudConfig, national10: string, verifiedName: string): Promise<GraphResult> {
  return graph(c.token, `/${c.wabaId}/phone_numbers`, {
    method: "POST",
    body: { cc: "91", phone_number: national10, verified_name: verifiedName },
  });
}

/** Step 2: Meta sends a code to that SIM by SMS or voice call. */
export async function requestPhoneCode(c: CloudConfig, phoneId: string, method: "SMS" | "VOICE"): Promise<GraphResult> {
  return graph(c.token, `/${phoneId}/request_code`, { method: "POST", body: { code_method: method, language: "en" } });
}

/** Step 3: the code the SIM received. */
export async function verifyPhoneCode(c: CloudConfig, phoneId: string, code: string): Promise<GraphResult> {
  return graph(c.token, `/${phoneId}/verify_code`, { method: "POST", body: { code } });
}

/** Step 4: register for the Cloud API, with a six-digit two-step PIN chosen here. */
export async function registerPhone(c: CloudConfig, phoneId: string, pin: string): Promise<GraphResult> {
  return graph(c.token, `/${phoneId}/register`, { method: "POST", body: { messaging_product: "whatsapp", pin } });
}

/**
 * Sends an approved template with positional body parameters — the follow-ups
 * (lib/followups.ts). `phone` is +91XXXXXXXXXX; Meta wants the digits alone.
 */
export async function sendTemplate(
  phone: string,
  template: string,
  bodyParams: string[],
  kind: MessageKind = "other",
): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const c = await cloudConfig();
  if (!c?.phoneNumberId) return { ok: false, error: "The official sender is not set up." };
  const r = await graph(c.token, `/${c.phoneNumberId}/messages`, {
    method: "POST",
    body: {
      messaging_product: "whatsapp",
      to: phone.replace(/\D/g, ""),
      type: "template",
      template: {
        name: template,
        language: { code: "en" },
        components: bodyParams.length
          ? [{ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) }]
          : [],
      },
    },
  });
  const id = r.ok ? ((r.body.messages as { id?: string }[] | undefined) ?? [])[0]?.id ?? null : null;
  await recordOutbound({
    wamid: id,
    phone,
    kind,
    template,
    body: bodyParams.length ? `${template} · ${bodyParams.join(" · ")}` : template,
    error: r.ok ? null : graphError(r),
  });
  if (!r.ok) return { ok: false, error: graphError(r) };
  return { ok: true, id };
}
