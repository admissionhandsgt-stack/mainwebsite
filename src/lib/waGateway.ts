/**
 * Sending a WhatsApp message through our own gateway.
 *
 * One implementation, used by everything that sends: the sign-in code
 * (`otp.ts`) and the alerts the team gets when a lead or a document arrives
 * (`whatsappService.ts`). They had separate copies of this, which is how two
 * senders end up disagreeing about a timeout or a chat-id format.
 *
 * The gateway is WAHA on the VPS, configured from `/admin/whatsapp` and paired
 * to a number that is not the business line. It is reached over localhost, so
 * nothing here crosses the internet except the message itself.
 *
 * **Alerts to the team are a different risk from codes to strangers.** The ban
 * models that make outbound OTP dangerous — every recipient a stranger, nobody
 * ever replies — do not apply to messaging the same two staff numbers all day.
 * That traffic looks like an ordinary conversation, which is why the caps in
 * `otp.ts` live there and not here.
 */

import { getIntegration } from "@/lib/integrations";
import { logError } from "@/lib/logger";

/** The WAHA session name, as the admin screen creates it. */
const SESSION = "default";

const TIMEOUT_MS = 15_000;

export interface GatewayResult {
  sent: boolean;
  /** Why not, for an admin screen to show. Never shown to a visitor. */
  error?: string;
}

/** Whether a gateway address is configured at all. */
export async function gatewayConfigured(): Promise<boolean> {
  return Boolean(await getIntegration("whatsapp.gateway.url"));
}

export interface ReachoutLock {
  active: boolean;
  /** When WhatsApp says it lifts, if it said. */
  until: Date | null;
  /** WhatsApp's own name for it, e.g. RESTRICT_ALL_COMPANIONS. */
  type: string | null;
}

/**
 * Is WhatsApp refusing to let this number start new chats?
 *
 * WhatsApp answers a linked device that messages strangers too often with a
 * "reach-out timelock": existing chats keep working, but any message to
 * somebody new is refused with error 463 until the lock lifts. A sign-in code
 * always goes to somebody new, so during a lock every code fails — that is
 * what happened on 2026-10-06 (`RESTRICT_ALL_COMPANIONS`, about nine hours).
 *
 * Asked *before* sending, because sending into a lock is worse than useless:
 * the visitor waits for a refusal, their hourly allowance is spent on a code
 * that never arrives, and WAHA notes that each 463 refreshes the lock. WAHA
 * reports it on the session as `me.reachoutTimelock`.
 *
 * Cached for a minute (one process — see CLAUDE.md on the rate limiters), and
 * a 463 from `sendText` sets it at once. A gateway that cannot be asked counts
 * as unlocked: the send itself is then the test, and it falls back on failure.
 */
const LOCK_TTL_MS = 60_000;
let lockCache: { at: number; lock: ReachoutLock } | null = null;
const UNLOCKED: ReachoutLock = { active: false, until: null, type: null };

export async function reachoutLock(): Promise<ReachoutLock> {
  if (lockCache && Date.now() - lockCache.at < LOCK_TTL_MS) return lockCache.lock;
  const [base, key] = await Promise.all([
    getIntegration("whatsapp.gateway.url"),
    getIntegration("whatsapp.gateway.api_key"),
  ]);
  if (!base) return UNLOCKED;
  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/sessions/${SESSION}`, {
      headers: key ? { "X-Api-Key": key } : {},
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return UNLOCKED;
    const s = (await res.json()) as {
      me?: { reachoutTimelock?: { isActive?: boolean; timeEnforcementEnds?: number; enforcementType?: string } };
    };
    const t = s.me?.reachoutTimelock;
    const until = t?.timeEnforcementEnds ? new Date(t.timeEnforcementEnds * 1000) : null;
    const active = Boolean(t?.isActive) && (!until || until.getTime() > Date.now());
    const lock: ReachoutLock = { active, until: active ? until : null, type: active ? t?.enforcementType ?? null : null };
    lockCache = { at: Date.now(), lock };
    return lock;
  } catch {
    return UNLOCKED;
  }
}

/**
 * Sends one text message.
 *
 * Returns rather than throws: every caller is doing this alongside something
 * that already succeeded, and a failed notification must never fail the thing
 * it was notifying about.
 */
export async function sendText(phone: string, text: string): Promise<GatewayResult> {
  const [base, key] = await Promise.all([
    getIntegration("whatsapp.gateway.url"),
    getIntegration("whatsapp.gateway.api_key"),
  ]);
  if (!base) return { sent: false, error: "No gateway address is configured." };

  // WAHA addresses a person as `<digits>@c.us`, with no `+` and with the
  // country code. A ten-digit Indian number needs the 91 putting back.
  const digits = String(phone ?? "").replace(/\D/g, "");
  const full = digits.length === 10 ? `91${digits}` : digits;
  if (full.length < 10) return { sent: false, error: `Not a usable number: ${phone}` };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/sendText`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "X-Api-Key": key } : {}),
      },
      body: JSON.stringify({ session: SESSION, chatId: `${full}@c.us`, text }),
    });
    clearTimeout(timer);

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      // 463 is WhatsApp's reach-out lock. Remember it now, so the next visitor
      // goes straight to the inbound path instead of into the same refusal.
      if (/error 463/.test(detail)) {
        lockCache = { at: Date.now(), lock: { active: true, until: null, type: "463" } };
      }
      logError(new Error(`WAHA sendText ${res.status}: ${detail}`), { route: "waGateway" });
      return { sent: false, error: `Gateway returned ${res.status}. ${detail}` };
    }
    return { sent: true };
  } catch (error) {
    logError(error, { route: "waGateway" });
    return {
      sent: false,
      error: error instanceof Error ? error.message.slice(0, 200) : "Could not reach the gateway.",
    };
  }
}
