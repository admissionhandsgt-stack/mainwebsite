/**
 * Sending a WhatsApp message through our own gateways.
 *
 * One implementation, used by everything that sends: the sign-in code
 * (`otp.ts`) and the alerts the team gets when a lead or a document arrives
 * (`whatsappService.ts`). They had separate copies of this, which is how two
 * senders end up disagreeing about a timeout or a chat-id format.
 *
 * **More than one number, rolling over** (since 2026-10-06). Which numbers
 * exist, which are healthy and which goes first is `waSenders.ts`. This walks
 * that list: a number that answers 463 (WhatsApp's reach-out lock) is marked
 * locked and the next one sends; one that cannot be reached is skipped for a
 * minute. The visitor never waits on a number that is out.
 *
 * **Alerts to the team are a different risk from codes to strangers.** The ban
 * models that make outbound OTP dangerous — every recipient a stranger, nobody
 * ever replies — do not apply to messaging the same staff numbers all day.
 * That traffic looks like an ordinary conversation, which is why the caps live
 * on sign-in codes only.
 */

import { getIntegration } from "@/lib/integrations";
import { logError } from "@/lib/logger";
import { pickSenders, listSenders, senderHealth, markLocked, markDown, type Purpose, type Sender } from "@/lib/waSenders";

const TIMEOUT_MS = 15_000;

/**
 * Errors that are about the person we are writing to, not the number writing.
 * "no LID for user" is WhatsApp saying the number has no WhatsApp account — seen
 * in the logs on 2026-10-02 and 10-04.
 */
const RECIPIENT_PROBLEM = /no LID|not (on|registered|a) WhatsApp|does not exist|invalid (jid|chat)|not.*exist/i;

export interface GatewayResult {
  sent: boolean;
  /** Which number sent it: 0 is the primary, otherwise wa_senders.id. */
  senderId?: number;
  /** Why not, for an admin screen to show. Never shown to a visitor. */
  error?: string;
}

/** Whether any gateway is configured at all. */
export async function gatewayConfigured(): Promise<boolean> {
  return Boolean(await getIntegration("whatsapp.gateway.url")) || (await listSenders()).length > 0;
}

/**
 * The phone number behind a WhatsApp LID, digits only — or null.
 *
 * WhatsApp now identifies many senders by a "linked ID" (`250706065916148@lid`)
 * instead of their number. The inbound handler took those digits for a phone
 * number, so a visitor who sent us their code was "verified" as +250706065916148
 * — which no account, session or counsellor can use. From 2026-09-29 to 10-06
 * four leads reached the team with LIDs for phone numbers, and every visitor
 * whose message arrived as a LID was verified and then never signed in.
 * WAHA keeps the LID → number mapping (`/api/{session}/lids/{lid}`); any of our
 * gateways can answer, since the mapping belongs to the WhatsApp account.
 */
export async function resolveLid(jid: string): Promise<string | null> {
  const lid = jid.includes("@") ? jid : `${jid}@lid`;
  for (const s of await listSenders()) {
    try {
      const res = await fetch(
        `${s.url.replace(/\/+$/, "")}/api/${encodeURIComponent(s.session)}/lids/${encodeURIComponent(lid)}`,
        { headers: s.apiKey ? { "X-Api-Key": s.apiKey } : {}, signal: AbortSignal.timeout(5_000) },
      );
      if (!res.ok) continue;
      const j = (await res.json()) as { pn?: string | null };
      const pn = String(j?.pn ?? "");
      if (pn.endsWith("@c.us")) return pn.split("@")[0].replace(/\D/g, "");
    } catch {
      /* try the next gateway */
    }
  }
  return null;
}

/** Whether some number can send a sign-in code right now (connected, unlocked, under its cap). */
export async function canSendCodes(): Promise<boolean> {
  return (await pickSenders("otp")).length > 0;
}

async function sendVia(s: Sender, chatId: string, text: string): Promise<{ ok: boolean; locked?: boolean; detail?: string }> {
  try {
    const res = await fetch(`${s.url.replace(/\/+$/, "")}/api/sendText`, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Content-Type": "application/json", ...(s.apiKey ? { "X-Api-Key": s.apiKey } : {}) },
      body: JSON.stringify({ session: s.session, chatId, text }),
    });
    if (res.ok) return { ok: true };
    const detail = (await res.text()).slice(0, 200);
    return { ok: false, locked: /error 463/.test(detail), detail: `${res.status}: ${detail}` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message.slice(0, 200) : "Could not reach the gateway." };
  }
}

/**
 * Sends one text message from the first number that can.
 *
 * Returns rather than throws: every caller is doing this alongside something
 * that already succeeded, and a failed notification must never fail the thing
 * it was notifying about.
 */
export async function sendText(
  phone: string,
  text: string,
  /**
   * `via`: send from this number only — a reply belongs in the chat the
   * person is already in, not in a new one from a different number.
   */
  opts: { purpose?: Purpose; via?: number } = {},
): Promise<GatewayResult> {
  // WAHA addresses a person as `<digits>@c.us`, with no `+` and with the
  // country code. A ten-digit Indian number needs the 91 putting back.
  const digits = String(phone ?? "").replace(/\D/g, "");
  const full = digits.length === 10 ? `91${digits}` : digits;
  if (full.length < 10) return { sent: false, error: `Not a usable number: ${phone}` };

  const purpose = opts.purpose ?? "alert";
  const senders = (await pickSenders(purpose)).filter((s) => opts.via === undefined || s.id === opts.via);
  if (!senders.length) return { sent: false, error: "No WhatsApp number can send right now." };

  const errors: string[] = [];
  for (const s of senders) {
    const r = await sendVia(s, `${full}@c.us`, text);
    if (r.ok) return { sent: true, senderId: s.id };
    errors.push(`${s.label}: ${r.detail}`);
    logError(new Error(`WAHA sendText via ${s.label} ${r.detail}`), { route: "waGateway" });
    if (r.locked) {
      // WhatsApp's reach-out lock: remember it now so the next visitor does not
      // land on this number, then try the next one.
      markLocked(s.id);
      void senderHealth(s, true);
    } else if (RECIPIENT_PROBLEM.test(r.detail ?? "")) {
      // The *recipient* is the problem — not on WhatsApp, or not a valid chat.
      // Every other number would fail the same way, and marking this one down
      // would push the next visitor off a perfectly good sender.
      break;
    } else {
      markDown(s.id, r.detail ?? "send failed");
    }
  }
  return { sent: false, error: errors.join(" | ").slice(0, 400) };
}
